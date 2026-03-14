"use client";

import { useEffect, useMemo, useState } from "react";

type Car = {
  id: number;
  name: string;
  lat: number;
  lng: number;
  speed: number;
  time?: number | null;
  mileage?: number | null; // ✅ qo‘sh
};

function fmtTime(ts?: number | null) {
  if (!ts) return "—";
  const d = ts > 10_000_000_000 ? new Date(ts) : new Date(ts * 1000);
  return d.toLocaleString("uz-UZ", { hour12: false });
}
function todayKey() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function getDailyKm(unitId: number, mileage?: number | null) {
  if (mileage == null) return null;

  const key = `daily_start_${unitId}_${todayKey()}`;
  let startStr = localStorage.getItem(key);

  if (!startStr) {
    // bugun birinchi marta ko‘ryapmiz — start qilib qo‘yamiz
    localStorage.setItem(key, String(mileage));
    startStr = String(mileage);
  }

  const start = Number(startStr);
  const diff = mileage - start;
  return diff > 0 ? Number(diff.toFixed(2)) : 0;
}

function ageMinutes(ts?: number | null) {
  if (!ts) return Infinity;
  const ms = ts > 10_000_000_000 ? ts : ts * 1000;
  return (Date.now() - ms) / 60000;
}

type Filter = "all" | "moving" | "stopped" | "offline";

export default function CarsPage() {
  const [cars, setCars] = useState<Car[]>([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

async function load() {
  const res = await fetch("/api/smartgps/units", { cache: "no-store" });
  const data = await res.json();

  const arr = Array.isArray(data?.cars) ? data.cars : [];

  const cleaned = arr.map((c: any) => ({
    id: Number(c?.id),
    name: String(c?.name ?? c?.title ?? `CAR-${c?.id ?? "?"}`),
    lat: Number(c?.lat),
    lng: Number(c?.lng),
    speed: Number(c?.speed ?? 0),
    time: c?.time == null ? null : Number(c.time),
    mileage: c?.mileage == null ? null : Number(c.mileage), // 👈 mana shu muhim
  }));

  setCars(cleaned);
}

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  const enriched = useMemo(() => {
    return cars.map((c) => {
      const mins = ageMinutes(c.time ?? null);
      const offline = mins > 10; // 10 min
      const moving = !offline && (c.speed || 0) > 2;
      const stopped = !offline && !moving;
      const status: "offline" | "moving" | "stopped" = offline ? "offline" : moving ? "moving" : "stopped";
      return { ...c, status, mins };
    });
  }, [cars]);

  const stats = useMemo(() => {
    const total = enriched.length;
    const moving = enriched.filter((c) => c.status === "moving").length;
    const stopped = enriched.filter((c) => c.status === "stopped").length;
    const offline = enriched.filter((c) => c.status === "offline").length;
    return { total, moving, stopped, offline };
  }, [enriched]);

  const shown = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return enriched
      .filter((c) => {
        if (!qq) return true;
        return `${c.name} ${c.id}`.toLowerCase().includes(qq);
      })
      .filter((c) => {
        if (filter === "all") return true;
        if (filter === "moving") return c.status === "moving";
        if (filter === "stopped") return c.status === "stopped";
        return c.status === "offline";
      })
      .sort((a, b) => {
        // moving yuqorida, keyin stopped, keyin offline
        const w = (s: string) => (s === "moving" ? 0 : s === "stopped" ? 1 : 2);
        return w(a.status) - w(b.status);
      });
  }, [enriched, q, filter]);

  const badge = (s: string) => {
    if (s === "moving") return { text: "HARAKATDA", bg: "rgba(34,197,94,.12)", bd: "rgba(34,197,94,.35)" };
    if (s === "stopped") return { text: "TO‘XTAGAN", bg: "rgba(239,68,68,.10)", bd: "rgba(239,68,68,.35)" };
    return { text: "OFFLINE", bg: "rgba(15,23,42,.08)", bd: "rgba(15,23,42,.20)" };
  };

  return (
    <div className="card listCard">
      <div className="listHead">
        <div className="listTitle">Mashinalar</div>
        <div className="listHint">Oxirgi yangilanish: 5s</div>
      </div>

      <div style={{ padding: 12, display: "grid", gap: 10 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
          <div className="kpiBox">
            <div className="kpiL">Jami</div>
            <div className="kpiV">{stats.total}</div>
          </div>
          <div className="kpiBox green">
            <div className="kpiL">Harakatda</div>
            <div className="kpiV">{stats.moving}</div>
          </div>
          <div className="kpiBox red">
            <div className="kpiL">To‘xtagan</div>
            <div className="kpiV">{stats.stopped}</div>
          </div>
          <div className="kpiBox">
            <div className="kpiL">Offline</div>
            <div className="kpiV">{stats.offline}</div>
          </div>
        </div>

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Qidirish: nom yoki ID..."
          style={{
            width: "100%",
            padding: "12px 14px",
            borderRadius: 14,
            border: "1px solid rgba(15,23,42,.12)",
            outline: "none",
          }}
        />

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
  {(["all", "moving", "stopped", "offline"] as Filter[]).map((f) => (
    <button
      key={f}
      onClick={() => setFilter(f)}
      className={`pillBtn ${filter === f ? "active" : ""}`}
      type="button"
    >
      {f === "all" ? "Barchasi" : f === "moving" ? "Harakatda" : f === "stopped" ? "To‘xtagan" : "Offline"}
    </button>
  ))}

  <button className="pillBtn" type="button" onClick={load}>
    ⟳ Yangilash
  </button>
</div>
      </div>

      <div className="list" style={{ padding: 12, display: "grid", gap: 10 }}>
        {shown.map((c) => {
          const b = badge(c.status);
          return (
            <div
              key={c.id}
              className="cardItem"
              style={{ cursor: "pointer" }}
              onClick={() => {
                // @ts-ignore
                window?.SmartGPS?.focusCar?.(c.id);
                // @ts-ignore
                window?.SmartGPS?.openCar?.(c.id);
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <div>
                  <div className="cardTitle">{c.name}</div>
                  <div className="cardMeta">
  Speed: <b>{Math.round(c.speed || 0)} km/soat</b> • {fmtTime(c.time ?? null)}
  {" • "}
  Bugungi:{" "}
  <b>
    {c.mileage == null ? "—" : `${getDailyKm(c.id, c.mileage) ?? 0} km`}
  </b>
</div>
                  <div className="cardCoord">{c.lat.toFixed(5)}, {c.lng.toFixed(5)}</div>
                </div>

                <div
                  style={{
                    height: "fit-content",
                    padding: "6px 10px",
                    borderRadius: 999,
                    background: b.bg,
                    border: `1px solid ${b.bd}`,
                    fontWeight: 900,
                    fontSize: 12,
                    whiteSpace: "nowrap",
                  }}
                >
                  {b.text}
                </div>
              </div>
<div className="carActions">
  <button
    className="miniBtn"
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      window.dispatchEvent(new CustomEvent("smartgps:focus", { detail: { id: c.id } }));
    }}
  >
    📍 Ko‘rsat
  </button>

  <button
    className="miniBtn"
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      window.dispatchEvent(new CustomEvent("smartgps:track24h", { detail: { id: c.id } }));
    }}
  >
    🧵 24 soat
  </button>

  <button
    className="miniBtn"
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      window.dispatchEvent(new CustomEvent("smartgps:open", { detail: { id: c.id } }));
    }}
  >
    ℹ️ Info
  </button>
</div>
            </div>
          );
        })}

        {!shown.length && (
          <div style={{ opacity: 0.7, padding: 12 }}>Hech narsa topilmadi.</div>
        )}
      </div>
    </div>
  );
}