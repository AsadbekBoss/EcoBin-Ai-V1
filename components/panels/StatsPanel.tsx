"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Style from "./StatsPanel.module.css";
import { apiFetch } from "@/lib/api/client";
import Pagination from "@/components/ui/Pagination";

type Status = "MOVING" | "STOPPED" | "OFFLINE";
type Filter = "ALL" | Status;

type Car = {
  id: number;
  name: string;
  lat: number;
  lng: number;
  speed: number;
  time: number | null; // seconds
  mileage: number | null;
};

type CarRow = Car & {
  status: Status;
};

const REFRESH_SEC = 10;

function fmtClock(ms: number) {
  const d = new Date(ms);
  return d.toLocaleTimeString("uz-UZ", { hour12: false });
}

function fmtSignal(sec: number | null) {
  if (!sec) return "—";
  const d = new Date(sec * 1000);
  return d.toLocaleString("uz-UZ", {
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatus(car: Car): Status {
  const nowSec = Date.now() / 1000;
  if (!car.time || nowSec - car.time > 300) return "OFFLINE";
  if ((car.speed ?? 0) > 1) return "MOVING";
  return "STOPPED";
}

function statusText(status: Status) {
  if (status === "MOVING") return "Harakatda";
  if (status === "STOPPED") return "To‘xtagan";
  return "Offline";
}

export default function StatsPanel() {
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [filter, setFilter] = useState<Filter>("ALL");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  const [lastUpdatedAt, setLastUpdatedAt] = useState<number>(0);
  const [tick, setTick] = useState(0);

  const refreshRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function loadCars(reason: "manual" | "auto" = "manual") {
    try {
      if (reason === "manual") setLoading(true);
      setErr("");

      const r = await apiFetch("/api/units", { cache: "no-store" });
      const j = await r.json();

      if (!r.ok || !j?.ok) {
        throw new Error(j?.error || j?.message || "API xato");
      }

      const nextCars = Array.isArray(j?.cars) ? j.cars : [];
      setCars(nextCars);
      setLastUpdatedAt(Date.now());
      setTick(0);
    } catch (e: any) {
      setErr(e?.message || "Xatolik yuz berdi");
      setCars([]);
    } finally {
      if (reason === "manual") setLoading(false);
    }
  }

  useEffect(() => {
    loadCars("manual");

    refreshRef.current = setInterval(() => {
      loadCars("auto");
    }, REFRESH_SEC * 1000);

    tickRef.current = setInterval(() => {
      setTick((prev) => (prev >= REFRESH_SEC ? REFRESH_SEC : prev + 1));
    }, 1000);

    return () => {
      if (refreshRef.current) clearInterval(refreshRef.current);
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  const rows = useMemo<CarRow[]>(() => {
    return cars.map((c) => ({
      ...c,
      status: getStatus(c),
    }));
  }, [cars]);

  const stats = useMemo(() => {
    const total = rows.length;
    const moving = rows.filter((c) => c.status === "MOVING").length;
    const stopped = rows.filter((c) => c.status === "STOPPED").length;
    const offline = rows.filter((c) => c.status === "OFFLINE").length;
    const maxSpeed = Math.max(0, ...rows.map((c) => c.speed || 0));

    return { total, moving, stopped, offline, maxSpeed };
  }, [rows]);

  const filteredRows = useMemo(() => {
    const s = q.trim().toLowerCase();

    return rows.filter((c) => {
      const passFilter = filter === "ALL" ? true : c.status === filter;
      if (!passFilter) return false;

      if (!s) return true;

      return (
        c.name.toLowerCase().includes(s) ||
        String(c.id).includes(s) ||
        String(c.speed).includes(s)
      );
    });
  }, [rows, q, filter]);

  function toggleFilter(next: Filter) {
    setFilter((cur) => (cur === next ? "ALL" : next));
  }

  const PAGE_SIZE = 10;
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const pagedRows = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [filteredRows, currentPage]);

  useEffect(() => {
    setPage(1);
  }, [filter, q]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const progress = Math.min(100, Math.round((tick / REFRESH_SEC) * 100));

  return (
    <div className={Style.wrap}>
      <div className={Style.head}>
        <div className={Style.headLeft}>
          <h2 className={Style.title}>Super Dashboard</h2>
          <p className={Style.sub}>Real vaqt monitoring statistikasi</p>

          <div className={Style.metaRow}>
            <span className={Style.metaItem}>
              Ko‘rinmoqda: <b>{filteredRows.length}</b> / <b>{rows.length}</b> • Sahifa <b>{currentPage}</b> / <b>{totalPages}</b>
            </span>

            <span className={Style.metaDivider}>•</span>

            <span className={Style.metaItem}>
              {loading ? (
                <span className={Style.liveWrap}>
                  <span className={Style.liveDot} />
                  Yangilanmoqda...
                </span>
              ) : lastUpdatedAt ? (
                <>
                  Yangilandi: <b>{fmtClock(lastUpdatedAt)}</b>
                </>
              ) : (
                "—"
              )}
            </span>

            <span className={Style.metaDivider}>•</span>

            <span className={Style.metaItem}>
              Auto refresh: <b>{REFRESH_SEC}s</b>
            </span>
          </div>

          <div
            className={Style.progressTrack}
            title={`Auto refresh: ${REFRESH_SEC} sekund`}
          >
            <div
              className={Style.progressBar}
              style={{ width: `${progress}%` }}
            />
          </div>

          {err ? <div className={Style.err}>{err}</div> : null}
        </div>

        <div className={Style.headRight}>
          <button
            className={Style.btnPrimary}
            onClick={() => loadCars("manual")}
            disabled={loading}
          >
            {loading ? "Yuklanmoqda..." : "⟳ Refresh"}
          </button>
        </div>
      </div>

      <div className={Style.grid}>
        <button
          className={`${Style.kpi} ${filter === "ALL" ? Style.kpiActive : ""}`}
          onClick={() => setFilter("ALL")}
          type="button"
        >
          <div className={Style.kpiKey}>Jami mashina</div>
          <div className={Style.kpiVal}>{stats.total}</div>
          <div className={Style.kpiSub}>Barcha unitlar</div>
        </button>

        <button
          className={`${Style.kpi} ${filter === "MOVING" ? Style.kpiActive : ""}`}
          onClick={() => toggleFilter("MOVING")}
          type="button"
        >
          <div className={Style.kpiKey}>Harakatda</div>
          <div className={Style.kpiVal}>{stats.moving}</div>
          <div className={Style.kpiSub}>Faol holat</div>
        </button>

        <button
          className={`${Style.kpi} ${filter === "STOPPED" ? Style.kpiActive : ""}`}
          onClick={() => toggleFilter("STOPPED")}
          type="button"
        >
          <div className={Style.kpiKey}>To‘xtagan</div>
          <div className={Style.kpiVal}>{stats.stopped}</div>
          <div className={Style.kpiSub}>Signal bor, tezlik 0</div>
        </button>

        <button
          className={`${Style.kpi} ${filter === "OFFLINE" ? Style.kpiActive : ""}`}
          onClick={() => toggleFilter("OFFLINE")}
          type="button"
        >
          <div className={Style.kpiKey}>Offline</div>
          <div className={Style.kpiVal}>{stats.offline}</div>
          <div className={Style.kpiSub}>So‘nggi signal eski</div>
        </button>

        <div className={`${Style.kpi} ${Style.kpiStatic}`}>
          <div className={Style.kpiKey}>Maks tezlik</div>
          <div className={Style.kpiVal}>{stats.maxSpeed}</div>
          <div className={Style.kpiSub}>km/h</div>
        </div>
      </div>

      <div className={Style.panel}>
        <div className={Style.panelHead}>
          <div>
            <div className={Style.panelTitle}>Mashinalar ro‘yxati</div>
            <div className={Style.panelSub}>
              Filter: <b>{filter}</b>
            </div>
          </div>

          <div className={Style.panelActions}>
            <div className={Style.searchWrap}>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Qidirish (nom, ID, tezlik)..."
                className={Style.search}
              />

              {q ? (
                <button
                  className={Style.clearBtn}
                  onClick={() => setQ("")}
                  type="button"
                  title="Tozalash"
                >
                  ✕
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {/* Desktop table */}
        <div className={Style.desktopTable}>
          <div className={Style.tableWrap}>
            <table className={Style.table}>
              <thead className={Style.stickyHead}>
                <tr>
                  <th className={Style.th}>#</th>
                  <th className={Style.th}>Mashina</th>
                  <th className={Style.th}>Status</th>
                  <th className={Style.th}>Tezlik</th>
                  <th className={Style.th}>Koordinata</th>
                  <th className={Style.th}>Mileage</th>
                  <th className={Style.th}>So‘nggi signal</th>
                </tr>
              </thead>

              <tbody>
                {pagedRows.map((c, idx) => (
                  <tr key={c.id} className={Style.tr}>
                    <td className={Style.td}>{(currentPage - 1) * PAGE_SIZE + idx + 1}</td>

                    <td className={Style.td}>
                      <div className={Style.nameCell}>
                        <div className={Style.avatar}>{(currentPage - 1) * PAGE_SIZE + idx + 1}</div>
                        <div>
                          <div className={Style.name}>{c.name}</div>
                          <div className={Style.nameMeta}>ID: {c.id}</div>
                        </div>
                      </div>
                    </td>

                    <td className={Style.td}>
                      <span
                        className={`${Style.statusPill} ${
                          c.status === "MOVING"
                            ? Style.statusMoving
                            : c.status === "STOPPED"
                              ? Style.statusStopped
                              : Style.statusOffline
                        }`}
                      >
                        <span className={Style.statusDot} />
                        {statusText(c.status)}
                      </span>
                    </td>

                    <td className={Style.td}>
                      <span className={Style.valuePill}>{c.speed} km/h</span>
                    </td>

                    <td className={Style.td}>
                      <div className={Style.coords}>
                        <span>lat {c.lat.toFixed(4)}</span>
                        <span>lng {c.lng.toFixed(4)}</span>
                      </div>
                    </td>

                    <td className={Style.td}>
                      {c.mileage != null ? `${c.mileage} km` : "—"}
                    </td>

                    <td className={Style.td}>{fmtSignal(c.time)}</td>
                  </tr>
                ))}

                {!filteredRows.length && (
                  <tr>
                    <td className={Style.empty} colSpan={7}>
                      Mashina topilmadi. Filter yoki qidiruvni o‘zgartirib
                      ko‘ring.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile cards */}
        <div className={Style.mobileCards}>
          {pagedRows.map((c, idx) => (
            <div key={c.id} className={Style.mobileCard}>
              <div className={Style.mobileTop}>
                <div className={Style.mobileIdentity}>
                  <div className={Style.avatar}>{(currentPage - 1) * PAGE_SIZE + idx + 1}</div>
                  <div>
                    <div className={Style.name}>{c.name}</div>
                    <div className={Style.nameMeta}>ID: {c.id}</div>
                  </div>
                </div>

                <span
                  className={`${Style.statusPill} ${
                    c.status === "MOVING"
                      ? Style.statusMoving
                      : c.status === "STOPPED"
                        ? Style.statusStopped
                        : Style.statusOffline
                  }`}
                >
                  <span className={Style.statusDot} />
                  {statusText(c.status)}
                </span>
              </div>

              <div className={Style.mobileGrid}>
                <div className={Style.infoBox}>
                  <span className={Style.infoKey}>Tezlik</span>
                  <span className={Style.infoVal}>{c.speed} km/h</span>
                </div>

                <div className={Style.infoBox}>
                  <span className={Style.infoKey}>Mileage</span>
                  <span className={Style.infoVal}>
                    {c.mileage != null ? `${c.mileage} km` : "—"}
                  </span>
                </div>

                <div className={Style.infoBox}>
                  <span className={Style.infoKey}>Latitude</span>
                  <span className={Style.infoVal}>lat {c.lat.toFixed(4)}</span>
                </div>

                <div className={Style.infoBox}>
                  <span className={Style.infoKey}>Longitude</span>
                  <span className={Style.infoVal}>lng {c.lng.toFixed(4)}</span>
                </div>
              </div>

              <div className={Style.mobileFooter}>
                <span className={Style.infoKey}>So‘nggi signal:</span>
                <span className={Style.infoVal}>{fmtSignal(c.time)}</span>
              </div>
            </div>
          ))}

          {!filteredRows.length && (
            <div className={Style.emptyCard}>
              Mashina topilmadi. Filter yoki qidiruvni o‘zgartirib ko‘ring.
            </div>
          )}
        </div>

        <Pagination
          page={currentPage}
          totalPages={totalPages}
          onChange={setPage}
        />
      </div>
    </div>
  );
}
