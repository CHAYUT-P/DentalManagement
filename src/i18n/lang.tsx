"use client";

import { createContext, useContext, useEffect, useSyncExternalStore } from "react";
import { dict, type Dict, type Lang } from "./dict";

const KEY = "dk:lang";

/* localStorage is the store, so the chosen language survives a reload of the
   LIFF webview. It is read through useSyncExternalStore rather than copied into
   state in an effect: the server (and the hydration pass) always sees Thai, and
   a stored English choice arrives as a normal store update straight after. */

let chosen: Lang | null = null;
const listeners = new Set<() => void>();

function snapshot(): Lang {
  if (chosen) return chosen;
  try {
    const saved = window.localStorage.getItem(KEY);
    if (saved === "th" || saved === "en") return saved;
  } catch {
    /* storage blocked: Thai it is */
  }
  return "th";
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  // another tab of the same app switched language
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function setLang(next: Lang) {
  chosen = next;
  try {
    window.localStorage.setItem(KEY, next);
  } catch {
    /* private mode: the choice just does not outlive the session */
  }
  for (const onChange of listeners) onChange();
}

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: Dict };

const LangCtx = createContext<Ctx>({ lang: "th", setLang, t: dict.th });

export function LangProvider({ children }: { children: React.ReactNode }) {
  const lang = useSyncExternalStore(subscribe, snapshot, serverSnapshot);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return <LangCtx.Provider value={{ lang, setLang, t: dict[lang] }}>{children}</LangCtx.Provider>;
}

/** Thai is what the server renders, always */
function serverSnapshot(): Lang {
  return "th";
}

export function useLang() {
  return useContext(LangCtx);
}

/** shorthand for the string table in the language now showing */
export function useT() {
  return useContext(LangCtx).t;
}
