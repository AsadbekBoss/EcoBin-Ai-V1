"use client";

import Script from "next/script";
import { useEffect } from "react";

import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";

import BinModal from "@/components/BinModal";
import CarModal from "@/components/CarModal";
import StatsModal from "@/components/StatsModal";
import SmartGpsMarkers from "@/components/SmartGpsMarkers";
import { AppShellProvider } from "@/components/ui/AppShellContext";

function MapLayoutInner({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const t = setInterval(() => {
      // @ts-ignore
      if (window?.MonitoringApp?.start) {
        // @ts-ignore
        window.MonitoringApp.start();
        clearInterval(t);
      }
    }, 100);

    return () => {
      clearInterval(t);
      // @ts-ignore
      window?.MonitoringApp?.stop?.();
    };
  }, []);

  return (
    <>
      <Script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" strategy="afterInteractive" />
      <Script src="https://cdn.jsdelivr.net/npm/chart.js" strategy="afterInteractive" />
      <Script src="/monitoring.js" strategy="afterInteractive" />

      <div className="app">
        <Sidebar />

        <main className="main">
          <Topbar />

          <section className="content">
            <div className="card mapCard">
              <div className="map" id="map"></div>

              <div className="mapTools">
                <button className="iconBtn" id="infoBtn" title="Info">i</button>
                <button className="iconBtn" id="btnFit" title="Fit">⤢</button>
                <button className="iconBtn" id="btnRefresh" title="Refresh">⟳</button>
                <button className="iconBtn" id="toggleCar" title="Cars">🚚</button>

                <div className="zoom">
                  <button className="iconBtn" id="zoomIn">+</button>
                  <button className="iconBtn" id="zoomOut">−</button>
                </div>
              </div>

              <div className="kpi">
                <div className="kpiBox">
                  <div className="kpiL">Jami</div>
                  <div className="kpiV" id="kpiTotal">—</div>
                </div>
                <div className="kpiBox red">
                  <div className="kpiL">Qizil</div>
                  <div className="kpiV" id="kpiRed">—</div>
                </div>
                <div className="kpiFoot" id="updatedAt">Oxirgi: —</div>
              </div>
            </div>

            {children}
          </section>
        </main>
      </div>

      <BinModal />
      <CarModal />
      <StatsModal />
      <SmartGpsMarkers />
    </>
  );
}

export default function MapLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShellProvider>
      <MapLayoutInner>{children}</MapLayoutInner>
    </AppShellProvider>
  );
}
