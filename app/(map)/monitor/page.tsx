"use client";
import { useEffect } from "react";

export default function MonitorPage() {
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

      <div style={{ padding: 12 }}>
        <input id="search" placeholder="Hudud qidirish..." style={{
          width: "100%", padding: "12px 14px", borderRadius: 14,
          border: "1px solid rgba(15,23,42,.12)", outline: "none",
        }} />
      </div>

      <div className="list" id="items"></div>
    </div>
  );
}