/**
 * Staff accounts, roles and the audit log (full edition). With no accounts
 * the app runs open — everyone acts as the owner, exactly like before.
 */

import crypto from "node:crypto";

import { and, desc, eq, gte, isNull, lte } from "drizzle-orm";

import { db } from "@/db/client";
import { auditLog, dentist, staffUser, timeClock } from "@/db/schema";
import { todayISO } from "@/lib/dates";
import { can, type AuditRow, type ClockRow, type Perm, type Role, type StaffUserInfo, type WhoAmI } from "@/lib/roles";
import { currentUserToken, readUserToken, setUserCookie, signUserToken } from "@/server/staffAuth";

const ROLES: Role[] = ["owner", "frontdesk", "dentist", "assistant"];
const hash = (salt: string, pin: string) => crypto.createHash("sha256").update(`${salt}:${pin}`).digest("hex");

async function rows() {
  const [us, ds] = await Promise.all([
    db.select().from(staffUser).orderBy(staffUser.name),
    db.select({ id: dentist.id, slug: dentist.slug }).from(dentist),
  ]);
  const slug = new Map(ds.map((d) => [d.id, d.slug]));
  return us.map((u) => ({
    raw: u,
    info: {
      id: u.id,
      name: u.name,
      role: (ROLES.includes(u.role as Role) ? u.role : "frontdesk") as Role,
      dentistSlug: u.dentistId != null ? (slug.get(u.dentistId) ?? null) : null,
      isActive: u.isActive,
    } satisfies StaffUserInfo,
  }));
}

/** the person behind this request — or the open-mode owner when no accounts exist */
export async function currentUser(): Promise<StaffUserInfo | null> {
  const all = await rows();
  const active = all.filter((r) => r.info.isActive);
  if (active.length === 0) return { id: 0, name: "ผู้ดูแล", role: "owner", dentistSlug: null, isActive: true };
  const uid = readUserToken(await currentUserToken());
  return active.find((r) => r.info.id === uid)?.info ?? null;
}

/** throws unless the person signed in here may do this */
export async function requirePerm(perm: Perm): Promise<StaffUserInfo> {
  const u = await currentUser();
  if (!u || !can(u.role, perm)) throw new Error(`forbidden:${perm}`);
  return u;
}

export async function whoAmI(): Promise<WhoAmI> {
  const all = await rows();
  const active = all.filter((r) => r.info.isActive);
  const uid = readUserToken(await currentUserToken());
  return {
    accounts: active.length > 0,
    user: active.length ? (active.find((r) => r.info.id === uid)?.info ?? null) : null,
    users: active.map((r) => r.info),
  };
}

/** check a person's PIN; returns the token their device keeps */
export async function signIn(userId: number, pin: string): Promise<{ ok: boolean; token?: string; user?: StaffUserInfo }> {
  const hit = (await rows()).find((r) => r.info.id === userId && r.info.isActive);
  if (!hit) return { ok: false };
  const want = Buffer.from(hit.raw.pinHash);
  const got = Buffer.from(hash(hit.raw.salt, String(pin ?? "")));
  if (want.length !== got.length || !crypto.timingSafeEqual(want, got)) {
    await audit("เข้าสู่ระบบไม่สำเร็จ", hit.info.name, { id: 0, name: "?" });
    return { ok: false };
  }
  const token = signUserToken(hit.info.id);
  await setUserCookie(token);
  await audit("เข้าสู่ระบบ", "", hit.info);
  return { ok: true, token, user: hit.info };
}

export async function signOut(): Promise<void> {
  await setUserCookie("");
}

export async function listUsers(): Promise<StaffUserInfo[]> {
  return (await rows()).map((r) => r.info);
}

/**
 * Add or edit an account. The first account must be an owner, so the clinic
 * can never lock itself out of user management.
 */
export async function saveUser(input: {
  id?: number | null;
  name: string;
  role: Role;
  pin?: string;
  dentistSlug?: string | null;
  isActive?: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  const name = String(input.name ?? "").trim().slice(0, 60);
  const role = ROLES.includes(input.role) ? input.role : "frontdesk";
  const pin = String(input.pin ?? "");
  if (!name) return { ok: false, error: "name" };
  if (pin && !/^\d{4,8}$/.test(pin)) return { ok: false, error: "pin" };
  const all = await rows();
  const owners = all.filter((r) => r.info.isActive && r.info.role === "owner" && r.info.id !== input.id);
  const willBeOwner = role === "owner" && input.isActive !== false;
  if (owners.length === 0 && !willBeOwner) return { ok: false, error: "owner" };
  const ds = await db.select({ id: dentist.id, slug: dentist.slug }).from(dentist);
  const dentistId = input.dentistSlug ? (ds.find((d) => d.slug === input.dentistSlug)?.id ?? null) : null;
  if (input.id) {
    const salt = pin ? crypto.randomBytes(12).toString("hex") : undefined;
    await db
      .update(staffUser)
      .set({ name, role, dentistId, isActive: input.isActive !== false, ...(pin && salt ? { salt, pinHash: hash(salt, pin) } : {}) })
      .where(eq(staffUser.id, input.id));
  } else {
    if (!pin) return { ok: false, error: "pin" };
    const salt = crypto.randomBytes(12).toString("hex");
    await db.insert(staffUser).values({ name, role, dentistId, salt, pinHash: hash(salt, pin), isActive: input.isActive !== false });
  }
  return { ok: true };
}

/* ── audit ─────────────────────────────────────────────────────────────── */

export async function audit(action: string, detail = "", who?: Pick<StaffUserInfo, "id" | "name"> | null): Promise<void> {
  const u = who === undefined ? await currentUser().catch(() => null) : who;
  await db
    .insert(auditLog)
    .values({ userId: u?.id || null, userName: u?.name ?? "", action: action.slice(0, 80), detail: detail.slice(0, 400) })
    .catch(() => {});
}

export async function listAudit(limit = 300): Promise<AuditRow[]> {
  const r = await db.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(Math.min(1000, limit));
  return r.map((x) => ({ id: x.id, at: x.createdAt.toISOString(), userName: x.userName, action: x.action, detail: x.detail }));
}

/* ── time clock ────────────────────────────────────────────────────────── */

/**
 * Clock in, or out if already in — checked with the person's own PIN, so a
 * shared PC can't clock someone else.
 */
export async function punch(userId: number, pin: string): Promise<{ ok: boolean; action?: "in" | "out"; at?: string; name?: string }> {
  const hit = (await rows()).find((r) => r.info.id === userId && r.info.isActive);
  if (!hit) return { ok: false };
  const want = Buffer.from(hit.raw.pinHash);
  const got = Buffer.from(hash(hit.raw.salt, String(pin ?? "")));
  if (want.length !== got.length || !crypto.timingSafeEqual(want, got)) return { ok: false };
  const open = (await db.select().from(timeClock).where(and(eq(timeClock.userId, userId), isNull(timeClock.outAt))).orderBy(desc(timeClock.inAt)))[0];
  const now = new Date();
  if (open) {
    await db.update(timeClock).set({ outAt: now }).where(eq(timeClock.id, open.id));
    await audit("ลงเวลาออกงาน", "", hit.info);
    return { ok: true, action: "out", at: now.toISOString(), name: hit.info.name };
  }
  await db.insert(timeClock).values({ userId, date: todayISO(now), inAt: now });
  await audit("ลงเวลาเข้างาน", "", hit.info);
  return { ok: true, action: "in", at: now.toISOString(), name: hit.info.name };
}

export async function listClock(from: string, to: string): Promise<ClockRow[]> {
  const [entries, users] = await Promise.all([
    db.select().from(timeClock).where(and(gte(timeClock.date, from), lte(timeClock.date, to))).orderBy(desc(timeClock.inAt)),
    rows(),
  ]);
  const now = Date.now();
  return entries.map((e) => ({
    id: e.id,
    userId: e.userId,
    userName: users.find((u) => u.info.id === e.userId)?.info.name ?? "?",
    date: e.date,
    inAt: e.inAt.toISOString(),
    outAt: e.outAt ? e.outAt.toISOString() : null,
    minutes: Math.max(0, Math.round(((e.outAt ? e.outAt.getTime() : now) - e.inAt.getTime()) / 60000)),
  }));
}
