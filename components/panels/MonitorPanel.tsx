"use client";

import { useEffect } from "react";
import { useAppShell } from "@/components/ui/AppShellContext";

export default function MonitorPanel() {
  const { t } = useAppShell();

  useEffect(() => {
    // @ts-ignore
    window?.MonitoringApp?.rebindMonitorUI?.();
  }, []);

  return (
    <div className="card listCard">
      <div className="listHead">
        <div className="listTitle">Hududlar</div>
        <div className="listHint">Qizillar yuqorida</div>
      </div>

      <div className="monitorSearchWrap">
        <input
          id="search"
          className="monitorSearchInput"
          placeholder={t("searchRegion")}
        />
      </div>

      <div className="list" id="items"></div>
    </div>
  );
}