"use client";

import { SetupView } from "@/components/staff/settings/SetupView";

/** ตั้งค่า — roster, prices and every clinic setting behind one menu entry */
export default function StaffSettingsPage() {
  return <SetupView patientWebUrl="/" />;
}
