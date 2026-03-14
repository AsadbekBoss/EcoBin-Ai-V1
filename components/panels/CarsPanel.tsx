"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Style from "./cars-panel.module.css";
import { apiFetch } from "@/lib/api/client";
import Pagination from "@/components/ui/Pagination";


type Car = {
  id: number;
  name: string;
  lat: number;
  lng: number;
  speed: number;
  time?: number | null;
  mileage?: number | null;
};

type Filter = "all" | "moving" | "stopped" | "offline";
type CarStatus = "moving" | "stopped" | "offline";

declare global {
  interface Window {
    SmartGPS?: {
      focusCar?: (id: number) => void;
      openCar?: (id: number) => void;
      trackCar24h?: (id: number) => void;
      cars?: any[];
    };
    MonitoringApp?: any;
  }
}

function fmtTime(ts?: number | null) {
  if (!ts) return "—";
  const d = ts > 10_000_000_000 ? new Date(ts) : new Date(ts * 1000);
  return d.toLocaleString("uz-UZ", { hour12: false });
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

function ageMinutes(ts?: number | null) {
  if (!ts) return Infinity;
  const ms = ts > 10_000_000_000 ? ts : ts * 1000;
  return (Date.now() - ms) / 60000;
}

function statusMeta(status: CarStatus) {
  if (status === "moving") {
    return {
      label: "Harakatda",
      badgeClass: Style.badgeMoving,
      dotClass: Style.dotMoving,
    };
  }

  if (status === "stopped") {
    return {
      label: "To‘xtagan",
      badgeClass: Style.badgeStopped,
      dotClass: Style.dotStopped,
    };
  }

  return {
    label: "Offline",
    badgeClass: Style.badgeOffline,
    dotClass: Style.dotOffline,
  };
}

export default function CarsPanel() {
  const [cars, setCars] = useState<Car[]>([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [page, setPage] = useState(1);

  const REFRESH_SEC = 5;
  const [tick, setTick] = useState(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function load() {
    try {
      setLoading(true);
      setErr("");

      const res = await apiFetch("/api/smartgps/units", { cache: "no-store" });
      const data = await res.json();

      const arr = Array.isArray(data?.cars) ? data.cars : [];

      const cleaned = arr
        .map((c: any) => ({
          id: Number(c?.id),
          name: String(c?.name ?? c?.title ?? `CAR-${c?.id ?? "?"}`),
          lat: Number(c?.lat),
          lng: Number(c?.lng),
          speed: Number(c?.speed ?? 0),
          time: c?.time == null ? null : Number(c.time),
          mileage: c?.mileage == null ? null : Number(c.mileage),
        }))
        .filter(
          (c: Car) =>
            Number.isFinite(c.id) &&
            Number.isFinite(c.lat) &&
            Number.isFinite(c.lng)
        );

      setCars(cleaned);
      setLastUpdatedAt(Date.now());
      setTick(0);
    } catch (e: any) {
      setErr(e?.message || "Mashinalarni yuklashda xato");
      setCars([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();

    const refreshTimer = setInterval(() => {
      load();
    }, REFRESH_SEC * 1000);

    tickRef.current = setInterval(() => {
      setTick((prev) => (prev >= REFRESH_SEC ? REFRESH_SEC : prev + 1));
    }, 1000);

    return () => {
      clearInterval(refreshTimer);
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  const enriched = useMemo(() => {
    return cars.map((c) => {
      const mins = ageMinutes(c.time ?? null);
      const offline = mins > 10;
      const moving = !offline && (c.speed || 0) > 2;

      const status: CarStatus = offline
        ? "offline"
        : moving
        ? "moving"
        : "stopped";

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
        return c.status === filter;
      })
      .sort((a, b) => {
        const weight = (s: string) =>
          s === "moving" ? 0 : s === "stopped" ? 1 : 2;
        return weight(a.status) - weight(b.status);
      });
  }, [enriched, q, filter]);

  const PAGE_SIZE = 8;
  const totalPages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const pagedCars = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return shown.slice(start, start + PAGE_SIZE);
  }, [shown, currentPage]);

  useEffect(() => {
    setPage(1);
  }, [q, filter]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const progress = Math.min(100, Math.round((tick / REFRESH_SEC) * 100));

  function scrollToMap() {
    const mapEl =
      document.getElementById("map") ||
      document.getElementById("carsMap") ||
      document.querySelector("[data-map-root='true']");

    if (mapEl) {
      mapEl.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }

  function emitCarHighlight(
    car: Car & { status?: CarStatus },
    mode: "focus" | "open" | "track24h"
  ) {
    const detail = {
      id: car.id,
      lat: car.lat,
      lng: car.lng,
      mode,
      car: {
        id: car.id,
        name: car.name,
        lat: car.lat,
        lng: car.lng,
        speed: car.speed,
        time: car.time ?? null,
        mileage: car.mileage ?? null,
        status: car.status ?? null,
      },
      at: Date.now(),
    };

    window.dispatchEvent(
      new CustomEvent("smartgps:highlight", {
        detail,
      })
    );

    return detail;
  }

  function focusCarOnPage(
    car: Car & { status?: CarStatus },
    mode: "focus" | "open" | "track24h" = "focus"
  ) {
    const detail = emitCarHighlight(car, mode);

    try {
      if (mode === "track24h") {
        if (typeof window?.SmartGPS?.trackCar24h === "function") {
          window.SmartGPS.trackCar24h(car.id);
        }

        window.dispatchEvent(
          new CustomEvent("smartgps:track24h", {
            detail,
          })
        );
      } else if (mode === "open") {
        if (typeof window?.SmartGPS?.focusCar === "function") {
          window.SmartGPS.focusCar(car.id);
        }

        if (typeof window?.SmartGPS?.openCar === "function") {
          window.SmartGPS.openCar(car.id);
        }

        window.dispatchEvent(
          new CustomEvent("smartgps:focus", {
            detail,
          })
        );

        window.dispatchEvent(
          new CustomEvent("smartgps:open", {
            detail,
          })
        );
      } else {
        if (typeof window?.SmartGPS?.focusCar === "function") {
          window.SmartGPS.focusCar(car.id);
        }

        window.dispatchEvent(
          new CustomEvent("smartgps:focus", {
            detail,
          })
        );
      }
    } catch (e) {
      console.error("Car focus/open error:", e);
    }

    scrollToMap();
  }

  return (
    <div className={Style.wrap}>
      <div className={Style.head}>
        <div>
          <h2 className={Style.title}>Mashinalar</h2>
          <p className={Style.sub}>
            Real vaqt SmartGPS kuzatuvi va tezkor boshqaruv paneli
          </p>

          <div className={Style.meta}>
            <span>
              Jami ko‘rinmoqda: <b>{shown.length}</b> / <b>{stats.total}</b> • Sahifa <b>{currentPage}</b> / <b>{totalPages}</b>
            </span>
            <span className={Style.sep}>•</span>
            <span>
              Yangilanish: <b>{REFRESH_SEC}s</b>
            </span>
            <span className={Style.sep}>•</span>
            <span>
              Oxirgi yangilanish:{" "}
              <b>{lastUpdatedAt ? fmtTime(lastUpdatedAt) : "—"}</b>
            </span>
          </div>

          <div
            className={Style.progressTrack}
            title={`Har ${REFRESH_SEC} sekundda avtomatik yangilanadi`}
          >
            <div
              className={Style.progressBar}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <button
          className={Style.refreshBtn}
          type="button"
          onClick={load}
          disabled={loading}
        >
          {loading ? "Yuklanmoqda..." : "⟳ Yangilash"}
        </button>
      </div>

      {err ? <div className={Style.alert}>{err}</div> : null}

      <div className={Style.kpiGrid}>
        <button
          type="button"
          className={`${Style.kpi} ${filter === "all" ? Style.kpiActive : ""}`}
          onClick={() => setFilter("all")}
        >
          <div className={Style.kpiLabel}>Jami</div>
          <div className={Style.kpiValue}>{stats.total}</div>
        </button>

        <button
          type="button"
          className={`${Style.kpi} ${filter === "moving" ? Style.kpiActive : ""}`}
          onClick={() => setFilter("moving")}
        >
          <div className={Style.kpiLabel}>Harakatda</div>
          <div className={Style.kpiValue}>{stats.moving}</div>
        </button>

        <button
          type="button"
          className={`${Style.kpi} ${filter === "stopped" ? Style.kpiActive : ""}`}
          onClick={() => setFilter("stopped")}
        >
          <div className={Style.kpiLabel}>To‘xtagan</div>
          <div className={Style.kpiValue}>{stats.stopped}</div>
        </button>

        <button
          type="button"
          className={`${Style.kpi} ${filter === "offline" ? Style.kpiActive : ""}`}
          onClick={() => setFilter("offline")}
        >
          <div className={Style.kpiLabel}>Offline</div>
          <div className={Style.kpiValue}>{stats.offline}</div>
        </button>
      </div>

      <div className={Style.toolbar}>
        <div className={Style.searchWrap}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Qidirish: nom yoki ID..."
            className={Style.search}
          />
        </div>

        <div className={Style.filters}>
          {(["all", "moving", "stopped", "offline"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`${Style.filterBtn} ${
                filter === f ? Style.filterBtnActive : ""
              }`}
              type="button"
            >
              {f === "all"
                ? "Barchasi"
                : f === "moving"
                ? "Harakatda"
                : f === "stopped"
                ? "To‘xtagan"
                : "Offline"}
            </button>
          ))}
        </div>
      </div>

      <div className={Style.list}>
        {pagedCars.map((c) => {
          const daily = c.mileage == null ? null : getDailyKm(c.id, c.mileage);
          const meta = statusMeta(c.status);

          return (
            <div
              key={c.id}
              className={Style.cardItem}
              onClick={() => focusCarOnPage(c, "open")}
            >
              <div className={Style.cardTop}>
                <div className={Style.identity}>
                  <div className={Style.avatar}>{String(c.name).slice(0, 1)}</div>

                  <div className={Style.identityText}>
                    <div className={Style.cardTitle}>{c.name}</div>
                    <div className={Style.cardMeta}>
                      ID: <b>{c.id}</b> • So‘nggi signal: <b>{fmtTime(c.time)}</b>
                    </div>
                  </div>
                </div>

                <div className={`${Style.badge} ${meta.badgeClass}`}>
                  <span className={`${Style.dot} ${meta.dotClass}`} />
                  {meta.label}
                </div>
              </div>

              <div className={Style.infoGrid}>
                <div className={Style.infoBox}>
                  <span className={Style.infoKey}>Tezlik</span>
                  <span className={Style.infoVal}>
                    {Math.round(c.speed || 0)} km/soat
                  </span>
                </div>

                <div className={Style.infoBox}>
                  <span className={Style.infoKey}>Bugungi yo‘l</span>
                  <span className={Style.infoVal}>
                    {daily == null ? "—" : `${daily} km`}
                  </span>
                </div>

                <div className={Style.infoBox}>
                  <span className={Style.infoKey}>Latitude</span>
                  <span className={Style.infoVal}>{c.lat.toFixed(5)}</span>
                </div>

                <div className={Style.infoBox}>
                  <span className={Style.infoKey}>Longitude</span>
                  <span className={Style.infoVal}>{c.lng.toFixed(5)}</span>
                </div>
              </div>

              <div className={Style.actions}>
                <button
                  className={Style.miniBtnPrimary}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    focusCarOnPage(c, "focus");
                  }}
                >
                  📍 Ko‘rish
                </button>

                <button
                  className={Style.miniBtn}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    focusCarOnPage(c, "track24h");
                  }}
                >
                  🧵 24 soat
                </button>

                <button
                  className={Style.miniBtn}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    focusCarOnPage(c, "open");
                  }}
                >
                  ℹ️ Info
                </button>
              </div>
            </div>
          );
        })}

        {!shown.length && (
          <div className={Style.empty}>Hech narsa topilmadi.</div>
        )}
      </div>

      <Pagination
        page={currentPage}
        totalPages={totalPages}
        onChange={setPage}
      />
    </div>
  );
}
