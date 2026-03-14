"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api/client";
import { useAppShell } from "@/components/ui/AppShellContext";

type Car = {
  id: number;
  name: string;
  lat: number;
  lng: number;
  speed: number;
  time?: number | null;
  mileage?: number | null;
};

declare global {
  interface Window {
    L: any;
    MonitoringApp?: any;
    SmartGPS?: {
      focusCar?: (id: number) => void;
      openCar?: (id: number) => void;
      trackCar24h?: (id: number) => void;
      cars?: any[];
    };
    map?: any;
  }
}

function fmtTime(ts?: number | null) {
  if (!ts) return "—";
  const d = ts > 10_000_000_000 ? new Date(ts) : new Date(ts * 1000);
  return d.toLocaleString("uz-UZ", { hour12: false });
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function degDist(aLat: number, aLng: number, bLat: number, bLng: number) {
  return Math.abs(aLat - bLat) + Math.abs(aLng - bLng);
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getDailyKm(unitId: number, mileage?: number | null) {
  if (mileage == null) return null;

  const key = `daily_start_${unitId}_${todayKey()}`;
  let startStr = localStorage.getItem(key);

  if (!startStr) {
    localStorage.setItem(key, String(mileage));
    startStr = String(mileage);
  }

  const start = Number(startStr);
  const diff = mileage - start;
  return diff > 0 ? Number(diff.toFixed(2)) : 0;
}

function escapeHtml(v: unknown) {
  return String(v ?? "").replace(/[&<>"']/g, (ch) => {
    const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return map[ch] || ch;
  });
}

export default function SmartGpsMarkers() {
  const { theme } = useAppShell();
  const [visible, setVisible] = useState(false);
  const [active, setActive] = useState<Car | null>(null);

  // Leaflet
  const layerRef = useRef<any>(null);
  const markersRef = useRef<Map<number, any>>(new Map());

  // Data cache
  const lastGoodCarsRef = useRef<Map<number, Car>>(new Map());
  const lastSeenAtRef = useRef<Map<number, number>>(new Map());
  const failStreakRef = useRef(0);

  // Timers
  const pollTimerRef = useRef<any>(null);

  // Track
  const trackLineRef = useRef<any>(null);

  // Animation
  const animRef = useRef<
    Map<
      number,
      { from: [number, number]; to: [number, number]; t0: number; dur: number }
    >
  >(new Map());
  const rafRef = useRef<number | null>(null);

  // Focused car highlight
  const focusMarkerRef = useRef<any>(null);
  const focusPopupRef = useRef<any>(null);
  const focusTimerRef = useRef<any>(null);

  const POLL_MS = 5000;
  const ANIM_MS = 900;
  const OFFLINE_AFTER_SEC = 120;
  const REMOVE_AFTER_MS = 90_000;
  const FAR_JUMP_DEG = 0.02;

  function ensureFocusStyles() {
    if (typeof document === "undefined") return;
    if (document.getElementById("smartgps-focus-style")) return;

    const style = document.createElement("style");
    style.id = "smartgps-focus-style";
    style.textContent = `
      .smartgpsFocusWrap{
        background: transparent !important;
        border: none !important;
      }

      .smartgpsFocusDot{
        position: relative;
        width: 30px;
        height: 30px;
        border-radius: 999px;
        background: #f59e0b;
        border: 4px solid #ffffff;
        box-shadow:
          0 0 0 6px rgba(245,158,11,.22),
          0 12px 26px rgba(0,0,0,.24);
      }

      .smartgpsFocusDot::after{
        content: "";
        position: absolute;
        inset: -10px;
        border-radius: 999px;
        border: 2px solid rgba(245,158,11,.55);
        animation: smartgpsPulse 1.15s ease-out infinite;
      }

      @keyframes smartgpsPulse{
        from{
          transform: scale(.72);
          opacity: .95;
        }
        to{
          transform: scale(1.65);
          opacity: 0;
        }
      }

      .smartgpsFocusPopup .leaflet-popup-content-wrapper{
        border-radius: 14px;
        padding: 0;
        box-shadow: 0 16px 36px rgba(15,23,42,.18);
      }

      .smartgpsFocusPopup .leaflet-popup-content{
        margin: 0;
      }

      .smartgpsFocusPopupInner{
        padding: 10px 12px;
        min-width: 170px;
      }

      .smartgpsFocusPopupInner b{
        display: block;
        font-size: 13px;
        color: #0f172a;
        margin-bottom: 3px;
      }

      .smartgpsFocusPopupInner span{
        display: block;
        font-size: 11px;
        color: #64748b;
      }
    `;
    document.head.appendChild(style);
  }

  const getCarIcon = () => {
    const L = window.L;
    return L.divIcon({
      className: "",
      html: `
        <div style="
          width:34px;height:34px;border-radius:14px;
          display:grid;place-items:center;
          background: rgba(37,99,235,.18);
          border:1px solid rgba(255,255,255,.70);
          box-shadow: 0 14px 28px rgba(0,0,0,.25);
          backdrop-filter: blur(6px);
        ">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M3 7h11v9H3V7Z" stroke="white" stroke-width="1.6" opacity=".95"/>
            <path d="M14 10h4l3 3v3h-7v-6Z" stroke="white" stroke-width="1.6" opacity=".95"/>
            <path d="M7 18a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" fill="white"/>
            <path d="M18 18a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" fill="white"/>
          </svg>
        </div>`,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    });
  };

  async function waitForMap(timeoutMs = 15000) {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      const L = window?.L;
      const map = window?.MonitoringApp?.map || window?.map;
      if (L && map) return { L, map };
      await new Promise((r) => setTimeout(r, 120));
    }
    return null;
  }

  function normalizeTimeSeconds(ts?: number | null) {
    if (!ts) return null;
    return ts > 10_000_000_000 ? Math.floor(ts / 1000) : Math.floor(ts);
  }

  function isOfflineByTime(ts?: number | null) {
    const tSec = normalizeTimeSeconds(ts);
    if (!tSec) return true;
    const nowSec = Math.floor(Date.now() / 1000);
    return nowSec - tSec > OFFLINE_AFTER_SEC;
  }

  function normalizeIncomingCar(raw: any): Car | null {
    if (!raw) return null;

    const car: Car = {
      id: Number(raw?.id),
      name: String(raw?.name ?? raw?.title ?? `CAR-${raw?.id ?? "?"}`),
      lat: Number(raw?.lat),
      lng: Number(raw?.lng),
      speed: Number(raw?.speed ?? 0),
      time: raw?.time == null ? null : Number(raw.time),
      mileage: raw?.mileage == null ? null : Number(raw.mileage),
    };

    if (
      !Number.isFinite(car.id) ||
      !Number.isFinite(car.lat) ||
      !Number.isFinite(car.lng)
    ) {
      return null;
    }

    return car;
  }

  function carFromDetail(detail: any): Car | null {
    const id = Number(detail?.id);
    if (Number.isFinite(id)) {
      const cached = lastGoodCarsRef.current.get(id);
      if (cached) return cached;
    }

    const byCar = normalizeIncomingCar(detail?.car);
    if (byCar) return byCar;

    const byDetail = normalizeIncomingCar(detail);
    if (byDetail) return byDetail;

    return null;
  }

  function syncSmartGPSApi() {
    if (typeof window === "undefined") return;

    if (!window.SmartGPS) window.SmartGPS = {};

    window.SmartGPS.cars = Array.from(lastGoodCarsRef.current.values());

    window.SmartGPS.focusCar = async (id: number) => {
      setVisible(true);

      let car = lastGoodCarsRef.current.get(Number(id));
      if (!car) {
        await drawCarsOnce();
        car = lastGoodCarsRef.current.get(Number(id));
      }

      if (car) {
        await highlightCarOnMap(car);
      }
    };

    window.SmartGPS.openCar = async (id: number) => {
      setVisible(true);

      let car = lastGoodCarsRef.current.get(Number(id));
      if (!car) {
        await drawCarsOnce();
        car = lastGoodCarsRef.current.get(Number(id));
      }

      if (car) {
        setActive(car);
        await highlightCarOnMap(car);
      }
    };

    window.SmartGPS.trackCar24h = async (id: number) => {
      setVisible(true);
      await drawTrack24h(Number(id));
    };
  }

  async function fetchCarsRobust(): Promise<Car[] | null> {
    try {
      const res = await apiFetch("/api/smartgps/units", { cache: "no-store" });
      if (!res.ok) {
        failStreakRef.current += 1;
        console.warn("SmartGPS units res not ok:", res.status);
        return null;
      }

      const data = await res.json();

      const carsCandidate =
        data?.cars ?? data?.units ?? data?.items ?? data?.data?.cars ?? null;

      if (!Array.isArray(carsCandidate)) {
        failStreakRef.current += 1;
        console.warn("SmartGPS units JSON format unexpected:", data);
        return null;
      }

      const cleaned: Car[] = carsCandidate
        .map((c: any) => ({
          mileage: c?.mileage == null ? null : Number(c.mileage),
          id: Number(c?.id),
          name: String(c?.name ?? c?.title ?? `CAR-${c?.id ?? "?"}`),
          lat: Number(c?.lat),
          lng: Number(c?.lng),
          speed: Number(c?.speed ?? 0),
          time:
            c?.time === undefined || c?.time === null ? null : Number(c.time),
        }))
        .filter(
          (c: Car) =>
            Number.isFinite(c.id) &&
            Number.isFinite(c.lat) &&
            Number.isFinite(c.lng)
        );

      if (cleaned.length === 0) {
        failStreakRef.current += 1;
        console.warn("SmartGPS units 200 but empty cars[]");
        return null;
      }

      failStreakRef.current = 0;
      return cleaned;
    } catch (e) {
      failStreakRef.current += 1;
      console.warn("SmartGPS units fetch error:", e);
      return null;
    }
  }

  async function clearTrack() {
    const ctx = await waitForMap();
    if (!ctx) return;
    const { map } = ctx;
    if (trackLineRef.current) {
      try {
        map.removeLayer(trackLineRef.current);
      } catch {}
      trackLineRef.current = null;
    }
  }

  async function drawTrack24h(unitId: number) {
    const ctx = await waitForMap();
    if (!ctx) return;
    const { L, map } = ctx;

    try {
      const res = await apiFetch(`/api/smartgps/track?unitId=${unitId}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        alert("Track server xato: " + res.status);
        return;
      }
      const data = await res.json();

      const pts = (data?.points || [])
        .filter((p: any) => Number.isFinite(p?.lat) && Number.isFinite(p?.lng))
        .filter((_: any, i: number) => i % 5 === 0)
        .map((p: any) => [Number(p.lat), Number(p.lng)] as [number, number]);

      if (!pts.length) {
        alert("Track topilmadi (24 soat).");
        return;
      }

      await clearTrack();

      trackLineRef.current = L.polyline(pts, { weight: 5 }).addTo(map);
      map.fitBounds(trackLineRef.current.getBounds(), { padding: [30, 30] });
    } catch (e) {
      console.warn("track error:", e);
      alert("Track chizishda xato.");
    }
  }

  function lerp(a: number, b: number, t: number) {
    return a + (b - a) * t;
  }

  function easeInOut(t: number) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  function startRafLoop() {
    if (rafRef.current) return;

    const tick = () => {
      const now = performance.now();

      for (const [id, anim] of animRef.current.entries()) {
        const m = markersRef.current.get(id);
        if (!m) {
          animRef.current.delete(id);
          continue;
        }

        const p = clamp((now - anim.t0) / anim.dur, 0, 1);
        const e = easeInOut(p);

        const lat = lerp(anim.from[0], anim.to[0], e);
        const lng = lerp(anim.from[1], anim.to[1], e);
        m.setLatLng([lat, lng]);

        if (p >= 1) animRef.current.delete(id);
      }

      if (animRef.current.size > 0) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        rafRef.current = null;
      }
    };

    rafRef.current = requestAnimationFrame(tick);
  }

  function animateMarkerTo(
    id: number,
    from: [number, number],
    to: [number, number],
    dur = ANIM_MS
  ) {
    animRef.current.set(id, { from, to, t0: performance.now(), dur });
    startRafLoop();
  }

  async function clearFocusedCar() {
    const ctx = await waitForMap(500);
    const map = ctx?.map;

    try {
      if (focusTimerRef.current) {
        clearTimeout(focusTimerRef.current);
        focusTimerRef.current = null;
      }
    } catch {}

    try {
      if (focusMarkerRef.current && map && map.hasLayer(focusMarkerRef.current)) {
        map.removeLayer(focusMarkerRef.current);
      }
    } catch {}
    focusMarkerRef.current = null;

    try {
      if (focusPopupRef.current && map) {
        map.closePopup(focusPopupRef.current);
      }
    } catch {}
    focusPopupRef.current = null;
  }

  async function highlightCarOnMap(car: Car) {
    const ctx = await waitForMap();
    if (!ctx) return;

    const { L, map } = ctx;
    ensureFocusStyles();
    await clearFocusedCar();

    map.flyTo([car.lat, car.lng], Math.max(map.getZoom(), 16), {
      animate: true,
      duration: 0.8,
    });

    focusMarkerRef.current = L.marker([car.lat, car.lng], {
      interactive: false,
      zIndexOffset: 9000,
      icon: L.divIcon({
        className: "smartgpsFocusWrap",
        html: `<div class="smartgpsFocusDot"></div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      }),
    }).addTo(map);

    const offline = isOfflineByTime(car.time ?? null);
    const stateText = offline
      ? "OFFLINE"
      : Math.round(car.speed || 0) > 2
      ? "HARAKATDA"
      : "TO‘XTAGAN";

    focusPopupRef.current = L.popup({
      closeButton: false,
      autoClose: true,
      closeOnClick: true,
      offset: [0, -18],
      className: "smartgpsFocusPopup",
    })
      .setLatLng([car.lat, car.lng])
      .setContent(`
        <div class="smartgpsFocusPopupInner">
          <b>${escapeHtml(car.name)}</b>
          <span>${Math.round(car.speed || 0)} km/soat • ${escapeHtml(stateText)}</span>
        </div>
      `);

    focusPopupRef.current.openOn(map);

    focusTimerRef.current = setTimeout(() => {
      clearFocusedCar();
    }, 5000);
  }

  function clearCarsLayer() {
    try {
      layerRef.current?.clearLayers?.();
    } catch {}
    markersRef.current.clear();
    lastSeenAtRef.current.clear();
    lastGoodCarsRef.current.clear();
    animRef.current.clear();
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }

  async function drawCarsOnce() {
    const ctx = await waitForMap();
    if (!ctx) return;

    const { L, map } = ctx;
    if (!layerRef.current) layerRef.current = L.layerGroup().addTo(map);

    const carsFresh = await fetchCarsRobust();

    const cars: Car[] = carsFresh ?? Array.from(lastGoodCarsRef.current.values());
    if (!cars.length) return;

    if (carsFresh) {
      lastGoodCarsRef.current.clear();
      carsFresh.forEach((c) => lastGoodCarsRef.current.set(c.id, c));
      syncSmartGPSApi();
    }

    const icon = getCarIcon();
    const now = performance.now();

    for (const c of cars) {
      let m = markersRef.current.get(c.id);

      lastSeenAtRef.current.set(c.id, now);

      if (!m) {
        m = L.marker([c.lat, c.lng], { icon, zIndexOffset: 5000 });

        m.on("click", async () => {
          const latest = lastGoodCarsRef.current.get(c.id) ?? c;
          setActive(latest);
          await highlightCarOnMap(latest);
        });

        m.addTo(layerRef.current);
        markersRef.current.set(c.id, m);
      } else {
        const prev = m.getLatLng();
        const jump = degDist(prev.lat, prev.lng, c.lat, c.lng);

        if (jump > FAR_JUMP_DEG || !carsFresh) {
          m.setLatLng([c.lat, c.lng]);
        } else {
          animateMarkerTo(c.id, [prev.lat, prev.lng], [c.lat, c.lng], ANIM_MS);
        }

        m.off("click");
        m.on("click", async () => {
          const latest = lastGoodCarsRef.current.get(c.id) ?? c;
          setActive(latest);
          await highlightCarOnMap(latest);
        });
      }
    }

    for (const [id, marker] of markersRef.current.entries()) {
      const lastSeen = lastSeenAtRef.current.get(id) ?? 0;
      if (now - lastSeen > REMOVE_AFTER_MS) {
        try {
          layerRef.current.removeLayer(marker);
        } catch {}
        markersRef.current.delete(id);
        lastSeenAtRef.current.delete(id);
        lastGoodCarsRef.current.delete(id);
        animRef.current.delete(id);
      }
    }

    syncSmartGPSApi();
  }

  useEffect(() => {
    ensureFocusStyles();
    syncSmartGPSApi();
  }, []);

  useEffect(() => {
    const onToggle = () => setVisible((v) => !v);
    window.addEventListener("smartgps:toggle", onToggle);
    return () => window.removeEventListener("smartgps:toggle", onToggle);
  }, []);

  useEffect(() => {
    const onFocus = async (e: any) => {
      const car = carFromDetail(e?.detail);
      if (!car) return;

      setVisible(true);
      setActive(null);
      await highlightCarOnMap(car);
    };

    const onOpen = async (e: any) => {
      const car = carFromDetail(e?.detail);
      if (!car) return;

      setVisible(true);
      setActive(car);
      await highlightCarOnMap(car);
    };

    const onTrack = async (e: any) => {
      const id = Number(e?.detail?.id);
      if (!Number.isFinite(id)) return;
      setVisible(true);
      await drawTrack24h(id);
    };

    const onHighlight = async (e: any) => {
      const car = carFromDetail(e?.detail);
      if (!car) return;

      setVisible(true);
      await highlightCarOnMap(car);
    };

    window.addEventListener("smartgps:focus", onFocus as any);
    window.addEventListener("smartgps:open", onOpen as any);
    window.addEventListener("smartgps:track24h", onTrack as any);
    window.addEventListener("smartgps:highlight", onHighlight as any);

    return () => {
      window.removeEventListener("smartgps:focus", onFocus as any);
      window.removeEventListener("smartgps:open", onOpen as any);
      window.removeEventListener("smartgps:track24h", onTrack as any);
      window.removeEventListener("smartgps:highlight", onHighlight as any);
    };
  }, []);

  useEffect(() => {
    (async () => {
      if (!visible) {
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
        await clearTrack();
        await clearFocusedCar();
        clearCarsLayer();
        return;
      }

      await drawCarsOnce();

      pollTimerRef.current = setInterval(() => {
        drawCarsOnce().catch(() => {});
      }, POLL_MS);
    })();

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    };
  }, [visible]);

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      clearTrack();
      clearFocusedCar();
      clearCarsLayer();
    };
  }, []);

  const activeOffline = active ? isOfflineByTime(active.time ?? null) : false;
  const activeSpeed = active ? Math.round(active.speed || 0) : 0;
  const activeStateText = !active
    ? ""
    : activeOffline
    ? "OFFLINE"
    : activeSpeed > 2
    ? "HARAKATDA"
    : "TO‘XTAGAN";

  const isDark = theme === "dark";
  const modalSurface = isDark ? "rgba(15,27,47,.96)" : "rgba(255,255,255,.96)";
  const modalBorder = isDark ? "1px solid rgba(255,255,255,.10)" : "1px solid rgba(255,255,255,.6)";
  const modalText = isDark ? "#edf4ff" : "#0f172a";
  const modalMuted = isDark ? "#9aa9c2" : "#475569";
  const headerBg = isDark
    ? "linear-gradient(90deg, rgba(37,99,235,.20), rgba(16,185,129,.16))"
    : "linear-gradient(90deg, rgba(37,99,235,.12), rgba(34,197,94,.10))";
  const softPanel = isDark ? "rgba(18,33,58,.94)" : "rgba(15,23,42,.06)";
  const strongPanel = isDark ? "rgba(18,33,58,.98)" : "#ffffff";
  const buttonText = isDark ? "#edf4ff" : "#0f172a";

  return (
    <>
      {active && (
        <div
          onClick={() => setActive(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: isDark ? "rgba(2,6,23,.72)" : "rgba(2,6,23,.55)",
            display: "grid",
            placeItems: "center",
            zIndex: 99999,
            padding: 16,
            color: modalText,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(560px, 100%)",
              background: modalSurface,
              color: modalText,
              borderRadius: 18,
              boxShadow: "0 24px 70px rgba(0,0,0,.35)",
              overflow: "hidden",
              border: modalBorder,
              backdropFilter: "blur(12px)",
            }}
          >
            <div
              style={{
                padding: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                background: headerBg,
                borderBottom: isDark ? "1px solid rgba(255,255,255,.08)" : "1px solid rgba(15,23,42,.06)",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: 900,
                    fontSize: 16,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    color: modalText,
                  }}
                >
                  {active.name}
                </div>
                <div style={{ opacity: 0.8, fontSize: 13, color: modalMuted }}>ID: {active.id}</div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    padding: "6px 10px",
                    borderRadius: 999,
                    fontWeight: 900,
                    fontSize: 12,
                    color: activeOffline ? "#fca5a5" : activeSpeed > 2 ? "#6ee7b7" : isDark ? "#cbd5e1" : "#334155",
                    background: activeOffline
                      ? (isDark ? "rgba(239,68,68,.18)" : "rgba(239,68,68,.14)")
                      : activeSpeed > 2
                      ? (isDark ? "rgba(34,197,94,.18)" : "rgba(34,197,94,.14)")
                      : (isDark ? "rgba(148,163,184,.16)" : "rgba(15,23,42,.08)"),
                    border: isDark ? "1px solid rgba(255,255,255,.10)" : "1px solid rgba(15,23,42,.10)",
                  }}
                >
                  {activeStateText}
                </div>

                <button
                  onClick={() => setActive(null)}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    border: isDark ? "1px solid rgba(255,255,255,.10)" : "1px solid rgba(15,23,42,.12)",
                    background: strongPanel,
                    color: buttonText,
                    cursor: "pointer",
                    fontSize: 18,
                  }}
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
            </div>

            <div style={{ padding: 16, display: "grid", gap: 10, color: modalText }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "140px 1fr",
                  gap: 10,
                }}
              >
                <div style={{ opacity: 0.82, color: modalMuted }}>Tezlik</div>
                <div style={{ fontWeight: 800, color: modalText }}>{activeSpeed} km/soat</div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "140px 1fr",
                  gap: 10,
                }}
              >
                <div style={{ opacity: 0.82, color: modalMuted }}>Koordinata</div>
                <div style={{ fontWeight: 700, color: modalText }}>
                  {active.lat.toFixed(6)}, {active.lng.toFixed(6)}
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "140px 1fr",
                  gap: 10,
                }}
              >
                <div style={{ opacity: 0.82, color: modalMuted }}>Oxirgi vaqt</div>
                <div style={{ fontWeight: 700, color: modalText }}>{fmtTime(active.time ?? null)}</div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "140px 1fr",
                  gap: 10,
                }}
              >
                <div style={{ opacity: 0.82, color: modalMuted }}>Bugungi masofa</div>
                <div style={{ fontWeight: 900, color: modalText }}>
                  {(() => {
                    const km = getDailyKm(active.id, active.mileage ?? null);
                    return km == null ? "—" : `${km} km`;
                  })()}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  marginTop: 6,
                  flexWrap: "wrap",
                }}
              >
                <button
                  onClick={async () => {
                    await highlightCarOnMap(active);
                  }}
                  style={{
                    flex: 1,
                    padding: "12px 14px",
                    borderRadius: 14,
                    border: isDark ? "1px solid rgba(255,255,255,.10)" : "1px solid rgba(15,23,42,.12)",
                    background: "linear-gradient(135deg,#3b82f6,#2563eb)",
                    color: "#ffffff",
                    cursor: "pointer",
                    fontWeight: 800,
                    minWidth: 160,
                  }}
                >
                  Mapda ko‘rsat
                </button>

                <button
                  onClick={() => drawTrack24h(active.id)}
                  style={{
                    flex: 1,
                    padding: "12px 14px",
                    borderRadius: 14,
                    border: isDark ? "1px solid rgba(255,255,255,.10)" : "1px solid rgba(15,23,42,.12)",
                    background: softPanel,
                    color: buttonText,
                    cursor: "pointer",
                    fontWeight: 900,
                    minWidth: 160,
                  }}
                >
                  24 soat track
                </button>

                <button
                  onClick={() => clearTrack()}
                  style={{
                    padding: "12px 14px",
                    borderRadius: 14,
                    border: isDark ? "1px solid rgba(255,255,255,.10)" : "1px solid rgba(15,23,42,.12)",
                    background: softPanel,
                    color: buttonText,
                    cursor: "pointer",
                    fontWeight: 800,
                    minWidth: 160,
                  }}
                >
                  Trackni o‘chirish
                </button>

                <button
                  onClick={() => setActive(null)}
                  style={{
                    padding: "12px 14px",
                    borderRadius: 14,
                    border: isDark ? "1px solid rgba(255,255,255,.10)" : "1px solid rgba(15,23,42,.12)",
                    background: softPanel,
                    color: buttonText,
                    cursor: "pointer",
                    fontWeight: 800,
                    minWidth: 160,
                  }}
                >
                  Yopish
                </button>
              </div>

              <div style={{ marginTop: 6, fontSize: 12, opacity: 0.72, color: modalMuted }}>
                So‘rov holati:{" "}
                {failStreakRef.current === 0
                  ? "OK"
                  : `muammo (${failStreakRef.current})`}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
