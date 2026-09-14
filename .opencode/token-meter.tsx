/** @jsxImportSource @opentui/solid */
/**
 * opencode-token-meter (TUI plugin) — event-driven fork.
 * -------------------------------------------------------------------------
 * Renders a tokens/second readout natively in the TUI, inline in the prompt's
 * status/meta row — the same status cluster as the model name and the
 * context% / "ctrl+p commands" hints (the `session_prompt_right` slot).
 *
 * Why event-driven: polling `api.state.session.messages()` only refreshes on
 * message completion in opencode >= 1.18, so a state-polled meter can never
 * show a live estimate mid-stream. This version subscribes to the streaming
 * events instead:
 *   - `message.part.delta`  -> per-token deltas while streaming (live `~tok/s`)
 *   - `message.part.updated` with a `step-finish` part -> real token usage
 *     (exact tok/s on completion)
 *
 * How the rate is measured — ACTIVE generation time only:
 *   Elapsed time accumulates *only* between consecutive deltas that arrive
 *   close together (within `gapMs`). Longer gaps are idle and NOT counted:
 *     - time-to-first-token (nothing counts before the first delta),
 *     - command/tool execution (no deltas stream while a tool runs),
 *     - waiting on the user (permissions, prompts),
 *     - trailing finalization after the last delta.
 *
 *   Tokens:
 *     - On completion  -> EXACT count from real usage (output + reasoning).
 *     - While streaming -> estimated from streamed chars, calibrated from the
 *       last completed step's real tokens/char (never a fixed 4; 4 is only
 *       the cold-start fallback). Set liveEstimate=false to skip the estimate.
 *
 * Registered via `.opencode/tui.json`. Options:
 *   slot          "session_prompt_right" (default, inline in prompt footer) | "app_bottom" (own line below prompt)
 *   liveEstimate  boolean, show estimated tok/s while streaming (default true)
 *   charsPerToken number, force a fixed estimate divisor; 0 = auto-calibrate (default 0)
 *   gapMs         number, max ms between deltas still counted as active (default 1000)
 *   label         string, optional prefix shown before the readout
 */
import type { TuiPlugin, TuiPluginApi, TuiPluginModule } from "@opencode-ai/plugin/tui"
import { createSignal, Match, Show, Switch } from "solid-js"

type Options = {
  slot?: "app_bottom" | "session_prompt_right"
  liveEstimate?: boolean
  charsPerToken?: number
  gapMs?: number
  label?: string
}

// kind: "final" = exact real tokens; "live" = calibrated estimate
type Stat = { kind: "final" | "live"; tps: number; tokens: number; secs: number }

const FALLBACK_TOKENS_PER_CHAR = 1 / 4 // cold-start only, before any real usage is known
const MIN_WINDOW_SECONDS = 0.25 // ignore windows too short to yield a meaningful rate
const DEFAULT_GAP_MS = 1000 // gaps longer than this (tool/command/idle) are not counted

const oneDp = (n: number) => (Math.round(n * 10) / 10).toFixed(1)
const int = (n: number) => Math.round(n).toLocaleString()

function Meter(props: {
  api: TuiPluginApi
  shown: () => Stat | undefined
  label?: string
  compact?: boolean
}) {
  const theme = () => props.api.theme.current

  return (
    <Show
      when={props.shown()}
      fallback={
        <text fg={theme().textMuted} wrapMode="none">
          meter-idle
        </text>
      }
    >
      {(s) => (
        <box
          flexDirection="row"
          flexShrink={0}
          gap={1}
          width={props.compact ? undefined : "100%"}
          paddingLeft={props.compact ? 0 : 2}
          paddingRight={props.compact ? 0 : 2}
        >
          <Show when={props.label}>
            <text fg={theme().textMuted} wrapMode="none">
              {props.label}
            </text>
          </Show>
          <Switch>
            <Match when={true}>
              {/* Footer-matched style: value colored, unit muted (like "{ctrl+p} commands") */}
              <text fg={s().kind === "final" ? theme().success : theme().info} wrapMode="none">
                {s().kind === "final" ? "" : "~"}
                {oneDp(s().tps)} <span style={{ fg: theme().textMuted }}>tok/s</span>
              </text>
              <Show when={!props.compact}>
                <text fg={theme().textMuted} wrapMode="none">
                  {s().kind === "final" ? "" : "~"}
                  {int(s().tokens)} tok · {oneDp(s().secs)}s{s().kind === "final" ? "" : " · est"}
                </text>
              </Show>
            </Match>
          </Switch>
        </box>
      )}
    </Show>
  )
}

const tui: TuiPlugin = async (api, options) => {
  const opts = (options ?? {}) as Options
  const slot = opts.slot === "app_bottom" ? "app_bottom" : "session_prompt_right"
  const liveEstimate = opts.liveEstimate !== false
  const charsPerToken = typeof opts.charsPerToken === "number" && opts.charsPerToken > 0 ? opts.charsPerToken : 0
  const gapMs = typeof opts.gapMs === "number" && opts.gapMs > 0 ? opts.gapMs : DEFAULT_GAP_MS
  const label = typeof opts.label === "string" ? opts.label : undefined

  const [live, setLive] = createSignal<Stat | undefined>(undefined)
  const [final, setFinal] = createSignal<Stat | undefined>(undefined)
  const shown = () => live() ?? final()

  // tokens-per-char learned from the most recent step with real usage data.
  let calibrated: number | undefined
  const ratio = () => {
    if (charsPerToken > 0) return 1 / charsPerToken // explicit fixed override
    return calibrated ?? FALLBACK_TOKENS_PER_CHAR
  }

  // Current step accumulators (plain mutable state — updated from events).
  let stepOpen = false
  let stepChars = 0
  let activeMs = 0
  let lastSeenAt: number | undefined
  let wallStart = 0

  const resetStep = () => {
    stepOpen = false
    stepChars = 0
    activeMs = 0
    lastSeenAt = undefined
    wallStart = 0
  }

  // Per-token deltas arrive while the model streams — this is the live path.
  api.event.on("message.part.delta", (event) => {
    const delta = (event as unknown as { properties?: { delta?: unknown } })?.properties?.delta
    if (typeof delta !== "string" || delta.length === 0) return
    const now = Date.now()
    if (!stepOpen) {
      // A new step started: clear the previous exact reading.
      stepOpen = true
      stepChars = 0
      activeMs = 0
      lastSeenAt = undefined
      wallStart = now
      setFinal(undefined)
    }
    if (lastSeenAt !== undefined) {
      const d = now - lastSeenAt
      if (d > 0 && d <= gapMs) activeMs += d
    }
    lastSeenAt = now
    stepChars += delta.length
    if (!liveEstimate) return
    const secs = activeMs / 1000
    if (secs < MIN_WINDOW_SECONDS || stepChars <= 0) return
    const tokens = stepChars * ratio()
    setLive({ kind: "live", tps: tokens / secs, tokens, secs })
  })

  // A `step-finish` part carries the real token usage — this is the exact path.
  api.event.on("message.part.updated", (event) => {
    const part = (event as unknown as { properties?: { part?: any } })?.properties?.part
    if (!part || part.type !== "step-finish") return
    const tokens = (part.tokens?.output ?? 0) + (part.tokens?.reasoning ?? 0)
    let secs = activeMs / 1000
    // Fallback when streaming wasn't observed (mounted late / instant step).
    if (secs < MIN_WINDOW_SECONDS && wallStart > 0) {
      secs = Math.max((Date.now() - wallStart) / 1000, 0.001)
    }
    if (tokens > 0 && secs >= MIN_WINDOW_SECONDS) {
      setFinal({ kind: "final", tps: tokens / secs, tokens, secs })
      if (stepChars > 0) {
        const r = tokens / stepChars
        // Guard against tool-heavy steps where output tokens != visible text.
        if (r >= 0.1 && r <= 1.5) calibrated = r
      }
    }
    setLive(undefined)
    resetStep()
  })

  if (slot === "session_prompt_right") {
    api.slots.register({
      order: 100,
      slots: {
        session_prompt_right() {
          return <Meter api={api} shown={shown} label={label} compact />
        },
      },
    })
    return
  }

  api.slots.register({
    order: 100,
    slots: {
      app_bottom() {
        return <Meter api={api} shown={shown} label={label} />
      },
    },
  })
}

const plugin: TuiPluginModule & { id: string } = {
  id: "token-meter",
  tui,
}

export default plugin
