"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { staffLogin } from "@/server/actions";

/**
 * The PIN screen shown by the staff layout until the device holds the staff
 * cookie. One shared clinic PIN (env STAFF_PIN); wrong tries are throttled
 * server-side.
 */
export function StaffLoginGate() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [err, setErr] = useState(false);
  const [busy, start] = useTransition();

  function submit() {
    start(async () => {
      const res = await staffLogin(pin);
      if (res.ok) {
        setPin("");
        router.refresh();
      } else {
        setErr(true);
        setPin("");
      }
    });
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        background: "var(--bg, #f6f4f8)",
        padding: 20,
      }}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        style={{
          width: "100%",
          maxWidth: 340,
          background: "#fff",
          border: "1px solid rgba(0,0,0,0.08)",
          borderRadius: 20,
          padding: "28px 24px",
          boxShadow: "0 12px 40px rgba(0,0,0,0.08)",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 34, marginBottom: 8 }}>🦷</div>
        <h1 style={{ fontSize: 17, fontWeight: 800, marginBottom: 4 }}>
          Denta Kids · เจ้าหน้าที่
        </h1>
        <p style={{ fontSize: 12, color: "rgba(0,0,0,0.5)", marginBottom: 18 }}>
          กรอกรหัส PIN ของคลินิกเพื่อเข้าใช้งาน
        </p>
        <input
          type="password"
          inputMode="numeric"
          autoComplete="off"
          placeholder="PIN"
          value={pin}
          onChange={(e) => {
            setPin(e.target.value);
            setErr(false);
          }}
          style={{
            width: "100%",
            fontSize: 18,
            letterSpacing: "0.3em",
            textAlign: "center",
            padding: "12px 14px",
            borderRadius: 12,
            border: `1.5px solid ${err ? "#e5484d" : "rgba(0,0,0,0.12)"}`,
            outline: "none",
            marginBottom: 10,
          }}
        />
        {err ? (
          <p style={{ fontSize: 12, color: "#e5484d", marginBottom: 10 }}>
            รหัสไม่ถูกต้อง หรือลองบ่อยเกินไป — รอสักครู่แล้วลองใหม่
          </p>
        ) : null}
        <button
          type="submit"
          disabled={busy || pin.length < 4}
          style={{
            width: "100%",
            padding: "12px",
            fontSize: 14,
            fontWeight: 700,
            color: "#fff",
            background: "#f2608c",
            border: 0,
            borderRadius: 12,
            cursor: busy || pin.length < 4 ? "default" : "pointer",
            opacity: busy || pin.length < 4 ? 0.5 : 1,
          }}
        >
          {busy ? "…" : "เข้าสู่ระบบ"}
        </button>
      </form>
    </div>
  );
}
