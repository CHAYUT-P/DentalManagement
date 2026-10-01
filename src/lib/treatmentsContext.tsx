"use client";

import React, { createContext, useContext, useMemo } from "react";
import { treatmentLookup, type TreatmentInfo } from "./treatments";

/**
 * Hands the clinic's treatment list (from the DB) to every screen below it,
 * so names and icons come from one place — the staff store provides it in the
 * console, and patient pages that list or name treatments provide their own.
 * With no provider the built-in names and icons are used.
 */
const Ctx = createContext<TreatmentInfo[] | undefined>(undefined);

export function TreatmentsProvider({ list, children }: { list: TreatmentInfo[]; children: React.ReactNode }) {
  return <Ctx.Provider value={list}>{children}</Ctx.Provider>;
}

export function useTreatments() {
  const list = useContext(Ctx);
  return useMemo(() => ({ ...treatmentLookup(list), list: list ?? [] }), [list]);
}
