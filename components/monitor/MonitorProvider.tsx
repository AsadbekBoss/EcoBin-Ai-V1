"use client";

import { createContext, useContext, useMemo, useState } from "react";

export type SelectedBin = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  fill: number;
  color: "red" | "green";
  statusText: string;
  imageUrl: string | null;
  raw: any;
};

type Ctx = {
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  selectedBin: SelectedBin | null;
  setSelectedBin: (b: SelectedBin | null) => void;
};

const MonitorCtx = createContext<Ctx | null>(null);

export function MonitorProvider({ children }: { children: React.ReactNode }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedBin, setSelectedBin] = useState<SelectedBin | null>(null);

  const value = useMemo(
    () => ({ selectedId, setSelectedId, selectedBin, setSelectedBin }),
    [selectedId, selectedBin]
  );

  return <MonitorCtx.Provider value={value}>{children}</MonitorCtx.Provider>;
}

export function useMonitor() {
  const ctx = useContext(MonitorCtx);
  if (!ctx) throw new Error("useMonitor must be used inside MonitorProvider");
  return ctx;
}