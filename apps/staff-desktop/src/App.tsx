import { useCallback, useEffect, useState } from "react";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";

import { LoginScreen } from "./components/LoginScreen";
import { StaffSidebar } from "./components/StaffSidebar";
import { hasStaffToken, staffBootstrap, type StaffBootstrap } from "./api";

import { StaffTopbar } from "@/components/staff/StaffTopbar";
import { StaffProvider } from "@/lib/staffStore";
import { LangProvider } from "@/i18n/lang";

import AppointmentsPage from "@/app/staff/appointments/page";
import DentistsPage from "@/app/staff/dentists/page";
import NotificationsPage from "@/app/staff/notifications/page";
import PatientsPage from "@/app/staff/patients/page";
import QueuePage from "@/app/staff/queue/page";
import ServicesPage from "@/app/staff/services/page";
import SettingsPage from "@/app/staff/settings/page";
import SchedulePage from "@/app/staff/page";

import "@/app/staff/staff.css";

/**
 * The staff console, standalone: same pages/sidebar/topbar/store the web
 * version renders, fed by /api/staff instead of server actions. No token →
 * the PIN screen; token → bootstrap once, then the store refreshes after
 * every mutation exactly like the web.
 */
export default function App() {
  const [authed, setAuthed] = useState(hasStaffToken());
  const [initial, setInitial] = useState<StaffBootstrap | null>(null);
  const [loadErr, setLoadErr] = useState(false);

  const load = useCallback(() => {
    staffBootstrap()
      .then(setInitial)
      .catch(() => {
        setInitial(null);
        setLoadErr(true);
        if (!hasStaffToken()) setAuthed(false); // token rejected → re-login
      });
  }, []);

  useEffect(() => {
    if (authed) load();
  }, [authed, load]);

  if (!authed) return <LoginScreen onLogin={() => setAuthed(true)} />;

  if (!initial) {
    return (
      <div style={{ minHeight: "100dvh", display: "grid", placeItems: "center", color: "#9aa4c4" }}>
        {loadErr ? "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ — ตรวจสอบอินเทอร์เน็ตแล้วเปิดใหม่" : "กำลังโหลด…"}
      </div>
    );
  }

  return (
    <LangProvider>
      <StaffProvider initial={initial}>
        <HashRouter>
          <div className="staff-root">
            <StaffSidebar />
            <div className="staff-main">
              <StaffTopbar />
              <Routes>
                <Route path="/" element={<SchedulePage />} />
                <Route path="/queue" element={<QueuePage />} />
                <Route path="/appointments" element={<AppointmentsPage />} />
                <Route path="/dentists" element={<DentistsPage />} />
                <Route path="/patients" element={<PatientsPage />} />
                <Route path="/services" element={<ServicesPage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </div>
        </HashRouter>
      </StaffProvider>
    </LangProvider>
  );
}
