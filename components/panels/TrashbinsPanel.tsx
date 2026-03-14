"use client";

import { useEffect, useMemo, useState } from "react";
import Style from "./trashbins.module.css";
import { apiFetch } from "@/lib/api/client";
import Pagination from "@/components/ui/Pagination";

type BinStatus = "EMPTY" | "FULL";

type DriverShort = {
  id: number;
  fullname?: string;
  fullName?: string;
  username?: string;
};

type Trashbin = {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  fillLevel: number;
  status: BinStatus;
  imageUrl?: string | null;
  cameraId?: string | null;
  drivers?: DriverShort[];
};

type Driver = {
  id: number;
  fullname?: string;
  fullName?: string;
  username: string;
  role?: "SUPER_ADMIN" | "ADMIN" | "DRIVER" | string;
};

type FormState = {
  name: string;
  latitude: string;
  longitude: string;
  fillLevel: string;
  cameraId: string;
  driverIds: string[];
};

type TrashbinPayload = {
  name: string;
  latitude: number;
  longitude: number;
  fillLevel: number;
  cameraId?: string;
  status: BinStatus;
  driverIds: number[];
};

function num(v: unknown, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function pickList(j: unknown): any[] {
  if (Array.isArray(j)) return j;
  if (j && typeof j === "object") {
    const obj = j as Record<string, unknown>;
    if (Array.isArray(obj.items)) return obj.items as any[];
    if (Array.isArray(obj.content)) return obj.content as any[];
    if (Array.isArray(obj.data)) return obj.data as any[];
  }
  return [];
}

function normalizeRole(input: unknown): "SUPER_ADMIN" | "ADMIN" | "DRIVER" | "" {
  const r = String(input ?? "").trim().toUpperCase();
  if (r === "SUPER_ADMIN" || r === "ROLE_SUPER_ADMIN") return "SUPER_ADMIN";
  if (r === "ADMIN" || r === "ROLE_ADMIN") return "ADMIN";
  if (r === "DRIVER" || r === "ROLE_DRIVER") return "DRIVER";
  return "";
}

const EMPTY_FORM: FormState = {
  name: "",
  latitude: "",
  longitude: "",
  fillLevel: "0",
  cameraId: "",
  driverIds: [],
};

export default function TrashbinsPanel() {
  const [bins, setBins] = useState<Trashbin[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [driversErr, setDriversErr] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const [editing, setEditing] = useState<Trashbin | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  async function loadBins() {
    setLoading(true);
    setErr(null);

    try {
      const r = await apiFetch("/api/trashbins?page=0&size=1000", {
        cache: "no-store",
      });

      const j = await r.json().catch(() => ({}));

      if (!r.ok) {
        setErr((j as any)?.message || (j as any)?.error || `Trashbins error: ${r.status}`);
        setBins([]);
        return;
      }

      setBins(pickList(j) as Trashbin[]);
    } catch (e: any) {
      setErr(e?.message || "Network error");
      setBins([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadDriversMaybe() {
    setDriversErr(null);

    try {
      const r = await apiFetch("/api/users/drivers", { cache: "no-store" });
      const j = await r.json().catch(() => ({}));

      if (!r.ok) {
        setDrivers([]);
        setDriversErr((j as any)?.message || (j as any)?.error || `Drivers error: ${r.status}`);
        return;
      }

      const list = pickList(j) as Driver[];
      const onlyDrivers = list.filter((u) => {
        const role = normalizeRole(u?.role);
        return role === "DRIVER" || !role;
      });

      setDrivers(onlyDrivers);
    } catch (e: any) {
      setDrivers([]);
      setDriversErr(e?.message || "Drivers list load error");
    }
  }

  useEffect(() => {
    loadBins();
    loadDriversMaybe();
  }, []);

  useEffect(() => {
    if (!open) return;

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const stats = useMemo(() => {
    const total = bins.length;
    const full = bins.filter(
      (b) => String(b?.status || "") === "FULL" || num(b.fillLevel) >= 90
    ).length;
    const empty = total - full;
    return { total, full, empty };
  }, [bins]);

  const filteredBins = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return bins;

    return bins.filter((b) => {
      const driverNames = Array.isArray(b.drivers)
        ? b.drivers
            .map((d) => d.fullname || d.fullName || d.username || "")
            .join(" ")
        : "";

      return [
        String(b.id ?? ""),
        String(b.name ?? ""),
        String(b.cameraId ?? ""),
        String(b.status ?? ""),
        String(b.fillLevel ?? ""),
        driverNames,
      ]
        .join(" ")
        .toLowerCase()
        .includes(s);
    });
  }, [bins, q]);

  const PAGE_SIZE = 10;
  const totalPages = Math.max(1, Math.ceil(filteredBins.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const pagedBins = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredBins.slice(start, start + PAGE_SIZE);
  }, [filteredBins, currentPage]);

  useEffect(() => {
    setPage(1);
  }, [q]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  function resetForm() {
    setForm(EMPTY_FORM);
  }

  function closeModal() {
    if (saving) return;
    setOpen(false);
    setEditing(null);
    resetForm();
  }

  function openCreate() {
    setErr(null);
    setOkMsg(null);
    setEditing(null);
    resetForm();
    setOpen(true);
  }

  function openEdit(b: Trashbin) {
    setErr(null);
    setOkMsg(null);
    setEditing(b);

    setForm({
      name: b.name ?? "",
      latitude: String(b.latitude ?? ""),
      longitude: String(b.longitude ?? ""),
      fillLevel: String(b.fillLevel ?? "0"),
      cameraId: String(b.cameraId ?? ""),
      driverIds: Array.isArray(b.drivers) ? b.drivers.map((d) => String(d.id)) : [],
    });

    setOpen(true);
  }

  function toggleDriverForForm(id: string) {
    setForm((prev) => ({
      ...prev,
      driverIds: prev.driverIds.includes(id)
        ? prev.driverIds.filter((x) => x !== id)
        : [...prev.driverIds, id],
    }));
  }

  function buildCreatePayload(): TrashbinPayload {
    const driverIds = form.driverIds
      .map((id) => Number(id))
      .filter((id) => Number.isFinite(id) && id > 0);

    const fillLevel = num(form.fillLevel, NaN);

    return {
      name: form.name.trim(),
      latitude: num(form.latitude, NaN),
      longitude: num(form.longitude, NaN),
      fillLevel,
      cameraId: form.cameraId.trim(),
      status: fillLevel >= 90 ? "FULL" : "EMPTY",
      driverIds,
    };
  }

  function buildEditPayload(): TrashbinPayload | null {
    if (!editing) return null;

    const driverIds = form.driverIds
      .map((id) => Number(id))
      .filter((id) => Number.isFinite(id) && id > 0);

    const fillLevel = num(form.fillLevel, NaN);

    return {
      name: editing.name,
      latitude: Number(editing.latitude),
      longitude: Number(editing.longitude),
      fillLevel,
      cameraId: editing.cameraId || undefined,
      status: fillLevel >= 90 ? "FULL" : "EMPTY",
      driverIds,
    };
  }

  function validateCreatePayload(payload: TrashbinPayload) {
    if (!payload.name) return "Name kiriting";

    if (!Number.isFinite(payload.latitude) || !Number.isFinite(payload.longitude)) {
      return "Latitude/Longitude noto‘g‘ri";
    }

    if (
      !Number.isFinite(payload.fillLevel) ||
      payload.fillLevel < 0 ||
      payload.fillLevel > 100
    ) {
      return "Fill Level 0 dan 100 gacha bo‘lishi kerak";
    }

    if (!payload.cameraId) return "Camera ID kiriting";
    if (!payload.driverIds.length) return "Kamida bitta driver tanlang";

    return null;
  }

  function validateEditPayload(payload: TrashbinPayload) {
    if (
      !Number.isFinite(payload.fillLevel) ||
      payload.fillLevel < 0 ||
      payload.fillLevel > 100
    ) {
      return "Fill Level 0 dan 100 gacha bo‘lishi kerak";
    }

    if (!payload.driverIds.length) return "Kamida bitta driver tanlang";

    return null;
  }

  async function createBin() {
    if (saving) return;

    setSaving(true);
    setErr(null);
    setOkMsg(null);

    const payload = buildCreatePayload();
    const validationError = validateCreatePayload(payload);

    if (validationError) {
      setErr(validationError);
      setSaving(false);
      return;
    }

    try {
      const r = await apiFetch("/api/trashbins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const j = await r.json().catch(() => ({}));

      if (!r.ok) {
        setErr((j as any)?.message || (j as any)?.error || `Create error: ${r.status}`);
        return;
      }

      setOkMsg("✅ Trashbin yaratildi");
      closeModal();
      await loadBins();
    } catch (e: any) {
      setErr(e?.message || "Network error");
    } finally {
      setSaving(false);
    }
  }

  async function updateBin() {
    if (!editing || saving) return;

    setSaving(true);
    setErr(null);
    setOkMsg(null);

    const payload = buildEditPayload();
    if (!payload) {
      setErr("Edit ma’lumoti topilmadi");
      setSaving(false);
      return;
    }

    const validationError = validateEditPayload(payload);

    if (validationError) {
      setErr(validationError);
      setSaving(false);
      return;
    }

    try {
      const r = await apiFetch(`/api/trashbins/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const j = await r.json().catch(() => ({}));

      if (!r.ok) {
        setErr((j as any)?.message || (j as any)?.error || `Update error: ${r.status}`);
        return;
      }

      setOkMsg("✅ Trashbin yangilandi");
      closeModal();
      await loadBins();
    } catch (e: any) {
      setErr(e?.message || "Network error");
    } finally {
      setSaving(false);
    }
  }

  async function deleteBin(id: number) {
    const yes = confirm(`Trashbin #${id} ni o‘chirasanmi?`);
    if (!yes) return;

    setErr(null);
    setOkMsg(null);

    try {
      const r = await apiFetch(`/api/trashbins/${id}`, { method: "DELETE" });
      const j = await r.json().catch(() => ({}));

      if (!r.ok) {
        setErr((j as any)?.message || (j as any)?.error || `Delete error: ${r.status}`);
        return;
      }

      setOkMsg("🗑️ Trashbin o‘chirildi");
      await loadBins();
    } catch (e: any) {
      setErr(e?.message || "Network error");
    }
  }

  function getDriverDisplayName(driver: DriverShort) {
    return driver.fullname || driver.fullName || driver.username || `#${driver.id}`;
  }

  return (
    <div className={Style.wrap}>
      <div className={Style.headRow}>
        <div>
          <div className={Style.hTitle}>🗑️ Trashbins</div>
          <div className={Style.hSub}>Yaratish / ko‘rish / nazorat</div>
        </div>

        <div className={Style.headActions}>
          <input
            className={`${Style.input} ${Style.searchTop}`}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Qidirish: nomi, ID, camera, driver..."
          />

          <button className={Style.btnGhost} onClick={loadBins} disabled={loading}>
            ↻ Refresh
          </button>
          <button className={Style.btnPrimary} onClick={openCreate}>
            + Add Trashbin
          </button>
        </div>
      </div>

      <div className={Style.cardsRow}>
        <div className={Style.cardMini}>
          <div className={Style.cardMiniTop}>Jami</div>
          <div className={Style.cardMiniVal}>{stats.total}</div>
        </div>
        <div className={Style.cardMini}>
          <div className={Style.cardMiniTop}>FULL (≥90%)</div>
          <div className={Style.cardMiniVal}>{stats.full}</div>
        </div>
        <div className={Style.cardMini}>
          <div className={Style.cardMiniTop}>EMPTY (&lt;90%)</div>
          <div className={Style.cardMiniVal}>{stats.empty}</div>
        </div>
      </div>

      {err && <div className={Style.alertErr}>⚠️ {err}</div>}
      {okMsg && <div className={Style.alertOk}>✅ {okMsg}</div>}

      <div className={Style.card}>
        <div className={Style.cardHead}>
          <div>
            <div className={Style.cardTitle}>Ro‘yxat</div>
            <div className={Style.cardHint}>
              Backend’dan olinadi: <span className={Style.mono}>GET /api/trashbins</span> • Ko‘rinmoqda <span className={Style.mono}>{filteredBins.length}</span> / <span className={Style.mono}>{bins.length}</span>
            </div>
          </div>
          <div className={Style.cardHint}>Sahifa <span className={Style.mono}>{currentPage}/{totalPages}</span></div>
        </div>

        <div className={Style.tableWrap}>
          <table className={Style.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Nomi</th>
                <th>Status</th>
                <th>Fill</th>
                <th>Lat</th>
                <th>Lng</th>
                <th>Drivers</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className={Style.tEmpty}>
                    Yuklanmoqda…
                  </td>
                </tr>
              ) : bins.length === 0 ? (
                <tr>
                  <td colSpan={8} className={Style.tEmpty}>
                    Hozircha trashbin yo‘q
                  </td>
                </tr>
              ) : (
                pagedBins.map((b) => {
                  const isFull = b.status === "FULL" || num(b.fillLevel) >= 90;

                  return (
                    <tr key={b.id}>
                      <td className={Style.mono}>{b.id}</td>
                      <td>{b.name}</td>
                      <td>
                        <span className={isFull ? Style.badgeRed : Style.badgeGreen}>
                          {isFull ? "FULL" : "EMPTY"}
                        </span>
                      </td>
                      <td className={Style.mono}>{num(b.fillLevel)}%</td>
                      <td className={Style.mono}>{Number(b.latitude).toFixed(5)}</td>
                      <td className={Style.mono}>{Number(b.longitude).toFixed(5)}</td>
                      <td>
                        {b.drivers?.length ? (
                          <div className={Style.driverBadges}>
                            {b.drivers.map((driver) => (
                              <span key={driver.id} className={Style.driverBadge}>
                                {getDriverDisplayName(driver)}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className={Style.mono}>—</span>
                        )}
                      </td>
                      <td className={Style.actions}>
                        <button className={Style.btnSmall} onClick={() => openEdit(b)}>
                          ✏️ Edit
                        </button>
                        <button className={Style.btnDanger} onClick={() => deleteBin(b.id)}>
                          🗑️ Delete
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          page={currentPage}
          totalPages={totalPages}
          onChange={setPage}
        />
      </div>

      {open && (
        <div
          className={Style.backdrop}
          onMouseDown={() => {
            if (saving) return;
            closeModal();
          }}
        >
          <div
            className={Style.modal}
            onMouseDown={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className={Style.modalHead}>
              <div>
                <div className={Style.modalTitle}>
                  {editing ? "✏️ Edit Trashbin" : "+ Add Trashbin"}
                </div>
                <div className={Style.modalSub}>
                  {editing
                    ? "Faqat fill level va driverlar o‘zgaradi"
                    : "Yangi trashbin qo‘shish"}
                </div>
              </div>

              <button className={Style.iconBtn} onClick={closeModal} type="button">
                ✕
              </button>
            </div>

            {driversErr && (
              <div className={Style.note}>ℹ️ Driver ro‘yxatini olishda muammo bo‘ldi.</div>
            )}

            <div className={Style.modalBody}>
              <div className={Style.grid}>
                <div className={Style.field}>
                  <div className={Style.label}>Name</div>
                  <input
                    className={Style.input}
                    value={form.name}
                    onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                    placeholder="Bin-01"
                    disabled={!!editing}
                  />
                </div>

                <div className={Style.field}>
                  <div className={Style.label}>Camera ID</div>
                  <input
                    className={Style.input}
                    value={form.cameraId}
                    onChange={(e) => setForm((s) => ({ ...s, cameraId: e.target.value }))}
                    placeholder="CAM-001"
                    disabled={!!editing}
                  />
                </div>

                <div className={Style.field}>
                  <div className={Style.label}>Latitude</div>
                  <input
                    className={Style.input}
                    value={form.latitude}
                    onChange={(e) => setForm((s) => ({ ...s, latitude: e.target.value }))}
                    placeholder="41.3111"
                    disabled={!!editing}
                  />
                </div>

                <div className={Style.field}>
                  <div className={Style.label}>Longitude</div>
                  <input
                    className={Style.input}
                    value={form.longitude}
                    onChange={(e) => setForm((s) => ({ ...s, longitude: e.target.value }))}
                    placeholder="69.2797"
                    disabled={!!editing}
                  />
                </div>

                <div className={Style.field}>
                  <div className={Style.label}>Fill Level (0..100)</div>
                  <input
                    className={Style.input}
                    type="number"
                    min={0}
                    max={100}
                    value={form.fillLevel}
                    onChange={(e) => setForm((s) => ({ ...s, fillLevel: e.target.value }))}
                    placeholder="0"
                  />
                  <div className={Style.hint}>
                    Hozirgi status:{" "}
                    <span className={num(form.fillLevel) >= 90 ? Style.textRed : Style.textGreen}>
                      {num(form.fillLevel) >= 90 ? "FULL" : "EMPTY"}
                    </span>
                  </div>
                </div>

                <div className={Style.field}>
                  <div className={Style.label}>Drivers</div>

                  <div className={Style.driverPicker}>
                    {drivers.length === 0 ? (
                      <div className={Style.emptyDriverBox}>Driver topilmadi</div>
                    ) : (
                      drivers.map((d) => {
                        const name = d.fullname || d.fullName || d.username || "No name";
                        const checked = form.driverIds.includes(String(d.id));

                        return (
                          <label key={d.id} className={Style.driverItem}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleDriverForForm(String(d.id))}
                            />
                            <span>
                              #{d.id} • {name} ({d.username})
                            </span>
                          </label>
                        );
                      })
                    )}
                  </div>

                  <div className={Style.hint}>
                    Bir trashbinga bir nechta driver biriktirish mumkin.
                  </div>
                </div>
              </div>
            </div>

            <div className={Style.modalActions}>
              <button className={Style.btnGhost} onClick={closeModal} type="button">
                Cancel
              </button>

              <button
                className={Style.btnPrimary}
                onClick={editing ? updateBin : createBin}
                disabled={saving}
                type="button"
              >
                {saving ? "Saving..." : editing ? "Update" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
