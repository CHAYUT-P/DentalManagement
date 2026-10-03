/**
 * The LINE OA chat inside the staff app (full edition): the webhook saves
 * what families write, staff read and answer here, and each conversation is
 * tied to the family's bookings and patient file.
 */

import { and, desc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";

import { db } from "@/db/client";
import { appointment, child, guardian, lineContact, lineMessage } from "@/db/schema";

export interface ChatConversation {
  lineUserId: string;
  displayName: string;
  pictureUrl: string;
  lastText: string;
  lastAt: string;
  lastDirection: "in" | "out";
  unread: number;
  /** who this LINE account is in the clinic's records */
  patients: { childId: number | null; name: string; phone: string }[];
}

export interface ChatMessage {
  id: number;
  direction: "in" | "out";
  kind: string;
  text: string;
  staffName: string;
  at: string;
}

const preview = (kind: string, text: string) =>
  kind === "sticker" ? "[สติกเกอร์]" : kind === "image" ? "[รูปภาพ]" : kind === "other" ? "[ไฟล์/ข้อความอื่น]" : text;

/** LINE's profile for an account — name and picture (needs the channel token) */
async function fetchProfile(userId: string): Promise<{ displayName: string; pictureUrl: string } | null> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) return null;
  const res = await fetch(`https://api.line.me/v2/bot/profile/${encodeURIComponent(userId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => null);
  if (!res?.ok) return null;
  const p = (await res.json()) as { displayName?: string; pictureUrl?: string };
  return { displayName: p.displayName ?? "", pictureUrl: p.pictureUrl ?? "" };
}

/** the webhook calls this for every message a family sends */
export async function saveIncoming(userId: string, kind: string, text: string): Promise<void> {
  const k = ["text", "sticker", "image"].includes(kind) ? kind : "other";
  await db.insert(lineMessage).values({ lineUserId: userId, direction: "in", kind: k, text: text.slice(0, 4000) });
  const known = (await db.select().from(lineContact).where(eq(lineContact.lineUserId, userId)))[0];
  // refresh the name/picture at most once a day
  const stale = !known || Date.now() - known.updatedAt.getTime() > 864e5;
  const profile = stale ? await fetchProfile(userId) : null;
  await db
    .insert(lineContact)
    .values({ lineUserId: userId, displayName: profile?.displayName ?? "", pictureUrl: profile?.pictureUrl ?? "", lastMessageAt: new Date() })
    .onConflictDoUpdate({
      target: lineContact.lineUserId,
      set: {
        lastMessageAt: new Date(),
        ...(profile ? { displayName: profile.displayName, pictureUrl: profile.pictureUrl, updatedAt: new Date() } : {}),
      },
    });
}

export async function unreadCount(): Promise<number> {
  const [r] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(lineMessage)
    .where(and(eq(lineMessage.direction, "in"), isNull(lineMessage.readAt)));
  return r?.n ?? 0;
}

export async function listConversations(): Promise<ChatConversation[]> {
  const contacts = await db.select().from(lineContact).orderBy(desc(lineContact.lastMessageAt)).limit(200);
  if (!contacts.length) return [];
  const ids = contacts.map((c) => c.lineUserId);
  const [msgs, unread, appts, gs] = await Promise.all([
    // the newest message per account
    db
      .selectDistinctOn([lineMessage.lineUserId], { userId: lineMessage.lineUserId, kind: lineMessage.kind, text: lineMessage.text, direction: lineMessage.direction, at: lineMessage.createdAt })
      .from(lineMessage)
      .where(inArray(lineMessage.lineUserId, ids))
      .orderBy(lineMessage.lineUserId, desc(lineMessage.createdAt)),
    db
      .select({ userId: lineMessage.lineUserId, n: sql<number>`count(*)::int` })
      .from(lineMessage)
      .where(and(inArray(lineMessage.lineUserId, ids), eq(lineMessage.direction, "in"), isNull(lineMessage.readAt)))
      .groupBy(lineMessage.lineUserId),
    db
      .select({ line: appointment.lineUserId, lineName: appointment.lineName, name: appointment.childName, phone: appointment.phone, childId: appointment.childId })
      .from(appointment)
      .where(and(isNotNull(appointment.lineUserId), inArray(appointment.lineUserId, ids))),
    db.select({ id: guardian.id, line: guardian.lineUserId, name: guardian.name, phone: guardian.phone }).from(guardian).where(inArray(guardian.lineUserId, ids)),
  ]);
  const kids = gs.length ? await db.select({ id: child.id, guardianId: child.guardianId, name: child.name }).from(child).where(inArray(child.guardianId, gs.map((g) => g.id))) : [];

  return contacts.map((c) => {
    const last = msgs.find((m) => m.userId === c.lineUserId);
    const people = new Map<string, { childId: number | null; name: string; phone: string }>();
    for (const g of gs.filter((x) => x.line === c.lineUserId)) {
      for (const k of kids.filter((x) => x.guardianId === g.id)) people.set(`c${k.id}`, { childId: k.id, name: k.name, phone: g.phone });
    }
    for (const a of appts.filter((x) => x.line === c.lineUserId)) {
      const key = a.childId ? `c${a.childId}` : `${a.phone}|${a.name}`;
      if (!people.has(key)) people.set(key, { childId: a.childId, name: a.name, phone: a.phone });
    }
    return {
      lineUserId: c.lineUserId,
      // LINE's own name, else the name LINE gave at booking time
      displayName: c.displayName || appts.find((a) => a.line === c.lineUserId && a.lineName)?.lineName || "ผู้ใช้ LINE",
      pictureUrl: c.pictureUrl,
      lastText: last ? preview(last.kind, last.text) : "",
      lastAt: (last?.at ?? c.lastMessageAt).toISOString(),
      lastDirection: (last?.direction as "in" | "out") ?? "in",
      unread: unread.find((u) => u.userId === c.lineUserId)?.n ?? 0,
      patients: [...people.values()].slice(0, 6),
    };
  });
}

/** the thread with one account — opening it marks their messages read */
export async function listMessages(userId: string): Promise<ChatMessage[]> {
  await db
    .update(lineMessage)
    .set({ readAt: new Date() })
    .where(and(eq(lineMessage.lineUserId, userId), eq(lineMessage.direction, "in"), isNull(lineMessage.readAt)));
  const rows = await db.select().from(lineMessage).where(eq(lineMessage.lineUserId, userId)).orderBy(desc(lineMessage.createdAt)).limit(200);
  return rows.reverse().map((m) => ({
    id: m.id,
    direction: m.direction === "out" ? "out" : "in",
    kind: m.kind,
    text: preview(m.kind, m.text),
    staffName: m.staffName,
    at: m.createdAt.toISOString(),
  }));
}

/** answer from the app — a LINE push (counts toward the OA's monthly quota) */
export async function sendMessage(userId: string, text: string, staffName: string): Promise<"sent" | "not_configured" | "failed"> {
  const body = text.trim().slice(0, 2000);
  if (!body) return "failed";
  if (!process.env.LINE_CHANNEL_ACCESS_TOKEN) return "not_configured";
  const { pushLineText } = await import("@/server/line");
  if (!(await pushLineText(userId, body, staffName || "คลินิก").catch(() => false))) return "failed";
  await db.update(lineContact).set({ lastMessageAt: new Date() }).where(eq(lineContact.lineUserId, userId));
  return "sent";
}
