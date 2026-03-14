"use client";

import { useEffect, useMemo, useState } from "react";
import Style from "./driver-statistics.module.css";
import { apiFetch } from "@/lib/api/client";

type DriverStatEvent = {
  id: number;
  driverId: number;
  driverName: string;
  trashBinId: number;
  trashBinName: string;
  action: string;
  createdAt: string;
};

type RangeKey = "today" | "7d" | "30d" | "all";

type DriverSummary = {
  driverId: number;
  driverName: string;
  total: number;
  accepted: number;
  done: number;
  rejected: number;
  uniqueBins: number;
  lastActiveAt: string | null;
};

function pickList(j: unknown): DriverStatEvent[] {
  if (Array.isArray(j)) return j as DriverStatEvent[];

  if (j && typeof j === "object") {
    const obj = j as Record<string, unknown>;
    if (Array.isArray(obj.content)) return obj.content as DriverStatEvent[];
    if (Array.isArray(obj.items)) return obj.items as DriverStatEvent[];
    if (Array.isArray(obj.data)) return obj.data as DriverStatEvent[];
  }

  return [];
}

function formatDateTime(value: string | null) {
  if (!value) return "—";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;

  return d.toLocaleString("uz-UZ", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isInRange(dateStr: string, range: RangeKey) {
  if (range === "all") return true;

  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return false;

  const now = new Date();

  if (range === "today") {
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  }

  const diffMs = now.getTime() - d.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (range === "7d") return diffDays <= 7;
  if (range === "30d") return diffDays <= 30;

  return true;
}

function normalizeAction(action: string) {
  return String(action || "").trim().toUpperCase();
}

export default function DriverStatisticsPanel() {
  const [rows, setRows] = useState<DriverStatEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [range, setRange] = useState<RangeKey>("7d");
  const [selectedDriverId, setSelectedDriverId] = useState<number | null>(null);

  async function loadStats() {
    setLoading(true);
    setErr(null);

    try {
      const r = await apiFetch("/api/statistics/drivers", {
        cache: "no-store",
      });

      const j = await r.json().catch(() => ([]));

      if (!r.ok) {
        setErr(
          (j as any)?.message ||
            (j as any)?.error ||
            `Statistics error: ${r.status}`
        );
        setRows([]);
        return;
      }

      setRows(pickList(j));
    } catch (e: any) {
      setErr(e?.message || "Network error");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStats();
  }, []);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => isInRange(row.createdAt, range));
  }, [rows, range]);

  const summaries = useMemo<DriverSummary[]>(() => {
    const map = new Map<number, DriverSummary & { binsSet: Set<number> }>();

    for (const row of filteredRows) {
      const action = normalizeAction(row.action);

      if (!map.has(row.driverId)) {
        map.set(row.driverId, {
          driverId: row.driverId,
          driverName: row.driverName || `Driver #${row.driverId}`,
          total: 0,
          accepted: 0,
          done: 0,
          rejected: 0,
          uniqueBins: 0,
          lastActiveAt: null,
          binsSet: new Set<number>(),
        });
      }

      const item = map.get(row.driverId)!;

      item.total += 1;
      item.binsSet.add(row.trashBinId);

      if (action === "ACCEPTED") item.accepted += 1;
      if (action === "DONE") item.done += 1;
      if (action === "REJECTED") item.rejected += 1;

      if (!item.lastActiveAt || new Date(row.createdAt) > new Date(item.lastActiveAt)) {
        item.lastActiveAt = row.createdAt;
      }
    }

    return Array.from(map.values())
      .map((item) => ({
        driverId: item.driverId,
        driverName: item.driverName,
        total: item.total,
        accepted: item.accepted,
        done: item.done,
        rejected: item.rejected,
        uniqueBins: item.binsSet.size,
        lastActiveAt: item.lastActiveAt,
      }))
      .sort((a, b) => {
        if (b.total !== a.total) return b.total - a.total;
        if (b.done !== a.done) return b.done - a.done;
        return a.rejected - b.rejected;
      });
  }, [filteredRows]);

  const bestDrivers = summaries.slice(0, 5);
  const weakDrivers = [...summaries]
    .sort((a, b) => {
      if (a.total !== b.total) return a.total - b.total;
      return a.done - b.done;
    })
    .slice(0, 5);

  const totals = useMemo(() => {
    const accepted = filteredRows.filter(
      (x) => normalizeAction(x.action) === "ACCEPTED"
    ).length;
    const done = filteredRows.filter(
      (x) => normalizeAction(x.action) === "DONE"
    ).length;
    const rejected = filteredRows.filter(
      (x) => normalizeAction(x.action) === "REJECTED"
    ).length;

    const uniqueDrivers = new Set(filteredRows.map((x) => x.driverId)).size;
    const uniqueBins = new Set(filteredRows.map((x) => x.trashBinId)).size;

    return {
      totalEvents: filteredRows.length,
      accepted,
      done,
      rejected,
      uniqueDrivers,
      uniqueBins,
    };
  }, [filteredRows]);

  const selectedDriverRows = useMemo(() => {
    if (!selectedDriverId) return [];
    return filteredRows
      .filter((x) => x.driverId === selectedDriverId)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  }, [filteredRows, selectedDriverId]);

  const selectedSummary = useMemo(() => {
    if (!selectedDriverId) return null;
    return summaries.find((x) => x.driverId === selectedDriverId) || null;
  }, [summaries, selectedDriverId]);

  return (
    <div className={Style.wrap}>
      <div className={Style.hero}>
        <div className={Style.headRow}>
          <div className={Style.headLeft}>
            <div className={Style.hTitle}>📊 Driver Statistics</div>
            <div className={Style.hSub}>
              Super admin uchun driver faolligi, samaradorligi va oxirgi ishlari
            </div>
          </div>

          <div className={Style.headActions}>
            <button
              type="button"
              className={range === "today" ? Style.btnPrimary : Style.btnGhost}
              onClick={() => setRange("today")}
            >
              Bugun
            </button>
            <button
              type="button"
              className={range === "7d" ? Style.btnPrimary : Style.btnGhost}
              onClick={() => setRange("7d")}
            >
              7 kun
            </button>
            <button
              type="button"
              className={range === "30d" ? Style.btnPrimary : Style.btnGhost}
              onClick={() => setRange("30d")}
            >
              30 kun
            </button>
            <button
              type="button"
              className={range === "all" ? Style.btnPrimary : Style.btnGhost}
              onClick={() => setRange("all")}
            >
              Hammasi
            </button>
            <button
              type="button"
              className={Style.btnGhost}
              onClick={loadStats}
              disabled={loading}
            >
              ↻ Refresh
            </button>
          </div>
        </div>

        {err && <div className={Style.alertErr}>⚠️ {err}</div>}
      </div>

      <div className={Style.cardsRow}>
        <div className={`${Style.cardMini} ${Style.toneBlue}`}>
          <div className={Style.cardMiniTop}>Jami action</div>
          <div className={Style.cardMiniVal}>{totals.totalEvents}</div>
        </div>

        <div className={`${Style.cardMini} ${Style.toneIndigo}`}>
          <div className={Style.cardMiniTop}>Faol driverlar</div>
          <div className={Style.cardMiniVal}>{totals.uniqueDrivers}</div>
        </div>

        <div className={`${Style.cardMini} ${Style.toneSky}`}>
          <div className={Style.cardMiniTop}>Binlar</div>
          <div className={Style.cardMiniVal}>{totals.uniqueBins}</div>
        </div>

        <div className={`${Style.cardMini} ${Style.toneAmber}`}>
          <div className={Style.cardMiniTop}>Accepted</div>
          <div className={Style.cardMiniVal}>{totals.accepted}</div>
        </div>

        <div className={`${Style.cardMini} ${Style.toneGreen}`}>
          <div className={Style.cardMiniTop}>Done</div>
          <div className={Style.cardMiniVal}>{totals.done}</div>
        </div>

        <div className={`${Style.cardMini} ${Style.toneRed}`}>
          <div className={Style.cardMiniTop}>Rejected</div>
          <div className={Style.cardMiniVal}>{totals.rejected}</div>
        </div>
      </div>

      <div className={Style.grid2}>
        <div className={Style.card}>
          <div className={Style.cardHead}>
            <div className={Style.cardTitleWrap}>
              <div className={Style.cardTitle}>🏆 Eng yaxshi ishlagan driverlar</div>
              <div className={Style.cardHint}>Top 5 faol driver</div>
            </div>
          </div>

          <div className={Style.rankList}>
            {loading ? (
              <div className={Style.empty}>Yuklanmoqda…</div>
            ) : bestDrivers.length === 0 ? (
              <div className={Style.empty}>Ma’lumot yo‘q</div>
            ) : (
              bestDrivers.map((item, idx) => (
                <button
                  type="button"
                  key={item.driverId}
                  className={`${Style.rankItem} ${
                    selectedDriverId === item.driverId ? Style.selectedRankItem : ""
                  }`}
                  onClick={() => setSelectedDriverId(item.driverId)}
                >
                  <div className={Style.rankLeft}>
                    <div className={Style.rankNum}>{idx + 1}</div>
                    <div className={Style.rankContent}>
                      <div className={Style.rankName}>{item.driverName}</div>
                      <div className={Style.rankSub}>
                        {item.uniqueBins} ta bin • oxirgi faollik:{" "}
                        {formatDateTime(item.lastActiveAt)}
                      </div>
                    </div>
                  </div>
                  <div className={Style.rankVal}>{item.total}</div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className={Style.card}>
          <div className={Style.cardHead}>
            <div className={Style.cardTitleWrap}>
              <div className={Style.cardTitle}>📉 Past ishlagan driverlar</div>
              <div className={Style.cardHint}>Top 5 sust faoliyat</div>
            </div>
          </div>

          <div className={Style.rankList}>
            {loading ? (
              <div className={Style.empty}>Yuklanmoqda…</div>
            ) : weakDrivers.length === 0 ? (
              <div className={Style.empty}>Ma’lumot yo‘q</div>
            ) : (
              weakDrivers.map((item, idx) => (
                <button
                  type="button"
                  key={item.driverId}
                  className={`${Style.rankItem} ${
                    selectedDriverId === item.driverId ? Style.selectedRankItem : ""
                  }`}
                  onClick={() => setSelectedDriverId(item.driverId)}
                >
                  <div className={Style.rankLeft}>
                    <div className={Style.rankNum}>{idx + 1}</div>
                    <div className={Style.rankContent}>
                      <div className={Style.rankName}>{item.driverName}</div>
                      <div className={Style.rankSub}>
                        {item.uniqueBins} ta bin • oxirgi faollik:{" "}
                        {formatDateTime(item.lastActiveAt)}
                      </div>
                    </div>
                  </div>
                  <div className={Style.rankVal}>{item.total}</div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      <div className={Style.card}>
        <div className={Style.cardHead}>
          <div className={Style.cardTitleWrap}>
            <div className={Style.cardTitle}>👨‍🔧 Driverlar bo‘yicha umumiy jadval</div>
            <div className={Style.cardHint}>
              Driver ustiga bossang pastda batafsil log chiqadi
            </div>
          </div>
        </div>

        <div className={Style.tableWrap}>
          <table className={Style.table}>
            <thead>
              <tr>
                <th>Driver</th>
                <th>Jami</th>
                <th>Accepted</th>
                <th>Done</th>
                <th>Rejected</th>
                <th>Binlar</th>
                <th>Oxirgi faollik</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className={Style.tEmpty}>
                    Yuklanmoqda…
                  </td>
                </tr>
              ) : summaries.length === 0 ? (
                <tr>
                  <td colSpan={7} className={Style.tEmpty}>
                    Statistik ma’lumot yo‘q
                  </td>
                </tr>
              ) : (
                summaries.map((item) => (
                  <tr
                    key={item.driverId}
                    className={selectedDriverId === item.driverId ? Style.activeRow : ""}
                    onClick={() => setSelectedDriverId(item.driverId)}
                  >
                    <td className={Style.driverCell}>{item.driverName}</td>
                    <td>{item.total}</td>
                    <td>{item.accepted}</td>
                    <td>{item.done}</td>
                    <td>{item.rejected}</td>
                    <td>{item.uniqueBins}</td>
                    <td>{formatDateTime(item.lastActiveAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className={Style.card}>
        <div className={Style.cardHead}>
          <div className={Style.cardTitleWrap}>
            <div className={Style.cardTitle}>🧾 Batafsil log</div>
            <div className={Style.cardHint}>
              {selectedDriverId
                ? `Tanlangan driver ID: ${selectedDriverId}`
                : "Driver tanlang"}
            </div>
          </div>

          {selectedSummary && (
            <div className={Style.selectedStats}>
              <span className={Style.statChip}>Jami: {selectedSummary.total}</span>
              <span className={Style.statChip}>Done: {selectedSummary.done}</span>
              <span className={Style.statChip}>
                Binlar: {selectedSummary.uniqueBins}
              </span>
            </div>
          )}
        </div>

        <div className={Style.tableWrap}>
          <table className={Style.table}>
            <thead>
              <tr>
                <th>Vaqt</th>
                <th>Driver</th>
                <th>Bin</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {!selectedDriverId ? (
                <tr>
                  <td colSpan={4} className={Style.tEmpty}>
                    Yuqoridan driver tanlang
                  </td>
                </tr>
              ) : selectedDriverRows.length === 0 ? (
                <tr>
                  <td colSpan={4} className={Style.tEmpty}>
                    Shu driver bo‘yicha ma’lumot yo‘q
                  </td>
                </tr>
              ) : (
                selectedDriverRows.map((row) => (
                  <tr key={row.id}>
                    <td>{formatDateTime(row.createdAt)}</td>
                    <td>{row.driverName}</td>
                    <td>{row.trashBinName}</td>
                    <td>
                      <span
                        className={
                          normalizeAction(row.action) === "DONE"
                            ? Style.badgeGreen
                            : normalizeAction(row.action) === "ACCEPTED"
                            ? Style.badgeBlue
                            : Style.badgeRed
                        }
                      >
                        {row.action}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
