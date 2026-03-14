"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

import BinModal from "@/components/BinModal";
import CarModal from "@/components/CarModal";
import StatsModal from "@/components/StatsModal";
import SmartGpsMarkers from "@/components/SmartGpsMarkers";
import PageLoader from "@/components/ui/PageLoader";

export default function MapScaffold({
  children,
}: {
  children: React.ReactNode;
}) {
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    const onReady = () => setBooting(false);

    window.addEventListener("monitoring:ready", onReady);

    const t = setInterval(() => {
      // @ts-ignore
      if (window?.MonitoringApp?.start) {
        // @ts-ignore
        window.MonitoringApp.start();
        clearInterval(t);
      }
    }, 100);

    const hardStop = window.setTimeout(() => {
      setBooting(false);
    }, 15000);

    return () => {
      clearInterval(t);
      window.clearTimeout(hardStop);
      window.removeEventListener("monitoring:ready", onReady);
      // @ts-ignore
      window?.MonitoringApp?.stop?.();
    };
  }, []);

  return (
    <>
      <Script
        src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
        strategy="afterInteractive"
      />
      <Script
        src="https://cdn.jsdelivr.net/npm/chart.js"
        strategy="afterInteractive"
      />
      <Script src="/monitoring.js" strategy="afterInteractive" />

      <>
        <div className="card mapCard">
          {booting ? <PageLoader title="Harita yuklanmoqda..." overlay small /> : null}
          <div className="map" id="map"></div>

          <div className="mapTypeStack" role="group" aria-label="Map style">
            <button
              type="button"
              className="iconBtn segBtn active"
              data-style="light"
              title="Light"
              aria-label="Light"
            >
              ☀️
            </button>

            <button
              type="button"
              className="iconBtn segBtn"
              data-style="dark"
              title="Dark"
              aria-label="Dark"
            >
              🌙
            </button>

            <button
              type="button"
              className="iconBtn segBtn"
              data-style="sat"
              title="Satellite"
              aria-label="Satellite"
            >
              🛰️
            </button>
          </div>

          <div className="mapTools">
            <button className="iconBtn" id="infoBtn" title="Info">
              i
            </button>
            <button className="iconBtn" id="btnFit" title="Fit">
              ⤢
            </button>
            <button className="iconBtn" id="btnRefresh" title="Refresh">
              ⟳
            </button>
            <button className="iconBtn" id="toggleCar" title="Cars">
              🚚
            </button>

            <div className="zoom">
              <button className="iconBtn" id="zoomIn">
                +
              </button>
              <button className="iconBtn" id="zoomOut">
                −
              </button>
            </div>
          </div>

          <div className="kpi">
            <div className="kpiBox">
              <div className="kpiL">Jami</div>
              <div className="kpiV" id="kpiTotal">
                —
              </div>
            </div>
            <div className="kpiBox red">
              <div className="kpiL">Qizil</div>
              <div className="kpiV" id="kpiRed">
                —
              </div>
            </div>
            <div className="kpiFoot" id="updatedAt">
              Oxirgi: —
            </div>
          </div>
        </div>

        {children}
      </>

      <BinModal />
      <CarModal />
      <StatsModal />
      <SmartGpsMarkers />
    </>
  );
}
