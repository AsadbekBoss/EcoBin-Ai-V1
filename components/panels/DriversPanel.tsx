"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getSession, Role } from "@/lib/auth";
import Style from "./drivers.module.css";
import { apiFetch } from "@/lib/api/client";
import Pagination from "@/components/ui/Pagination";

type UserRow = {
  id: number;
  fullname: string;
  username: string;
  role: Role;
  email?: string | null;
};

function pickList(data: any): UserRow[] {
  if (data && Array.isArray(data.content)) return data.content as UserRow[];
  if (Array.isArray(data)) return data as UserRow[];
  return [];
}

const ROLE_OPTIONS: Role[] = ["DRIVER", "ADMIN"];

const ROLE_META: Record<Role, { label: string; desc: string; dotClass: string }> = {
  DRIVER: {
    label: "DRIVER",
    desc: "Haydovchi roli",
    dotClass: Style.roleDotDriver,
  },
  ADMIN: {
    label: "ADMIN",
    desc: "Boshqaruv roli",
    dotClass: Style.roleDotAdmin,
  },
  SUPER_ADMIN: {
    label: "SUPER ADMIN",
    desc: "To‘liq ruxsat",
    dotClass: Style.roleDotAdmin,
  },
};

export default function DriversPanel() {
  const [meRole, setMeRole] = useState<Role>("DRIVER");
  const [rows, setRows] = useState<UserRow[]>([]);
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");
  const [page, setPage] = useState(1);

  const [form, setForm] = useState({
    fullname: "",
    username: "",
    password: "",
    email: "",
    role: "DRIVER" as Role,
  });

  const [editing, setEditing] = useState<UserRow | null>(null);
  const [roleOpen, setRoleOpen] = useState(false);
  const roleRef = useRef<HTMLDivElement | null>(null);

  const canEdit = meRole === "ADMIN" || meRole === "SUPER_ADMIN";
  const canDelete = meRole === "SUPER_ADMIN";

  useEffect(() => {
    const s = getSession();
    setMeRole(s?.role ?? "DRIVER");
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!roleRef.current) return;
      if (!roleRef.current.contains(e.target as Node)) {
        setRoleOpen(false);
      }
    }

    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function load() {
    setErr("");

    try {
      const res = await apiFetch("/api/drivers?page=0&size=1000", {
        cache: "no-store",
      });

      const text = await res.text().catch(() => "");
      const data = text ? JSON.parse(text) : {};

      if (!res.ok) {
        setErr((data as any)?.message || "Userlarni yuklashda xato");
        setRows([]);
        return;
      }

      const all = pickList(data);
      const only = all.filter((u) => u.role === "DRIVER" || u.role === "ADMIN");
      setRows(only);
    } catch {
      setErr("Server bilan ulanishda xato");
      setRows([]);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;

    return rows.filter((x) =>
      [x.fullname, x.username, x.email ?? "", x.role]
        .join(" ")
        .toLowerCase()
        .includes(t)
    );
  }, [rows, q]);

  const PAGE_SIZE = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const pagedRows = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  useEffect(() => {
    setPage(1);
  }, [q]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  async function createUser() {
    setErr("");

    try {
      const res = await apiFetch("/api/drivers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullname: form.fullname,
          username: form.username,
          password: form.password,
          role: form.role,
          email: form.email,
        }),
      });

      const text = await res.text().catch(() => "");
      const data = text ? JSON.parse(text) : {};

      if (!res.ok) {
        setErr((data as any)?.message || "Yaratishda xato");
        return;
      }

      setForm({
        fullname: "",
        username: "",
        password: "",
        email: "",
        role: "DRIVER",
      });

      setRoleOpen(false);
      await load();
    } catch {
      setErr("Yaratishda server xatosi");
    }
  }

  async function saveEdit() {
    if (!editing) return;

    setErr("");

    try {
      const res = await apiFetch(`/api/drivers/${editing.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editing),
      });

      const text = await res.text().catch(() => "");
      const data = text ? JSON.parse(text) : {};

      if (!res.ok) {
        setErr((data as any)?.message || "Update xato");
        return;
      }

      setEditing(null);
      await load();
    } catch {
      setErr("Saqlashda server xatosi");
    }
  }

  async function deleteRow(id: number) {
    if (!canDelete) return;

    try {
      const del = await apiFetch(`/api/drivers/${id}`, {
        method: "DELETE",
      });

      if (del.status === 204) {
        await load();
        return;
      }

      const text = await del.text().catch(() => "");
      const data = text ? JSON.parse(text) : {};

      if (!del.ok) {
        setErr(data?.message || "Delete xato");
        return;
      }

      await load();
    } catch {
      setErr("O‘chirishda server xatosi");
    }
  }

  function pillClass(role: Role) {
    if (role === "ADMIN" || role === "SUPER_ADMIN") {
      return `${Style.pill} ${Style.pillAdmin}`;
    }
    return `${Style.pill} ${Style.pillDriver}`;
  }

  return (
    <div className={Style.wrap}>
      <div className={Style.card}>
        <div className={Style.top}>
          <div className={Style.titleWrap}>
            <h2 className={Style.title}>Foydalanuvchilar</h2>
            <p className={Style.sub}>ADMIN va DRIVER ro‘yxati, qidiruv va boshqaruv</p>
          </div>

          <div className={Style.tools}>
            <span className={Style.badge}>{filtered.length} ta foydalanuvchi • {currentPage}/{totalPages} sahifa</span>

            <input
              className={`${Style.input} ${Style.search}`}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Qidirish: ism, username, email..."
            />
          </div>
        </div>

        {err && <div className={Style.alert}>{err}</div>}

        {canEdit && (
          <div className={Style.form}>
            <input
              className={Style.input}
              placeholder="Full name"
              value={form.fullname}
              onChange={(e) =>
                setForm((p) => ({ ...p, fullname: e.target.value }))
              }
            />

            <input
              className={Style.input}
              placeholder="Username"
              value={form.username}
              onChange={(e) =>
                setForm((p) => ({ ...p, username: e.target.value }))
              }
            />

            <input
              className={Style.input}
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={(e) =>
                setForm((p) => ({ ...p, password: e.target.value }))
              }
            />

            <input
              className={Style.input}
              placeholder="Email"
              value={form.email}
              onChange={(e) =>
                setForm((p) => ({ ...p, email: e.target.value }))
              }
            />

            <div className={Style.roleWrap} ref={roleRef}>
              <button
                type="button"
                className={`${Style.roleButton} ${roleOpen ? Style.roleButtonOpen : ""}`}
                onClick={() => setRoleOpen((p) => !p)}
              >
                <span className={Style.roleButtonLeft}>
                  <span
                    className={`${Style.roleDot} ${ROLE_META[form.role].dotClass}`}
                  />
                  <span className={Style.roleText}>{ROLE_META[form.role].label}</span>
                </span>

                <span className={`${Style.chevron} ${roleOpen ? Style.chevronOpen : ""}`}>
                  ▾
                </span>
              </button>

              {roleOpen && (
                <div className={Style.roleMenu}>
                  {ROLE_OPTIONS.map((role) => {
                    const active = form.role === role;

                    return (
                      <button
                        key={role}
                        type="button"
                        className={`${Style.roleOption} ${active ? Style.roleOptionActive : ""}`}
                        onClick={() => {
                          setForm((p) => ({ ...p, role }));
                          setRoleOpen(false);
                        }}
                      >
                        <span className={Style.roleOptionMain}>
                          <span
                            className={`${Style.roleDot} ${ROLE_META[role].dotClass}`}
                          />
                          <span>
                            <div className={Style.roleOptionLabel}>
                              {ROLE_META[role].label}
                            </div>
                            <div className={Style.roleOptionDesc}>
                              {ROLE_META[role].desc}
                            </div>
                          </span>
                        </span>

                        {active && <span className={Style.roleCheck}>✓</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <button className={Style.btn} onClick={createUser}>
              Qo‘shish
            </button>
          </div>
        )}
      </div>

      <div className={`${Style.card} ${Style.tableWrap}`}>
        <div className={Style.tableToolbar}>
          <div className={Style.tableMeta}>Ro‘yxat natijasi: {filtered.length} ta • Sahifa {currentPage}/{totalPages}</div>
        </div>

        <table className={Style.table}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Fullname</th>
              <th>Username</th>
              <th>Email</th>
              <th>Role</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {pagedRows.map((x) => {
              const isEdit = editing?.id === x.id;

              return (
                <tr key={x.id}>
                  <td>{x.id}</td>

                  <td>
                    {isEdit ? (
                      <input
                        className={Style.input}
                        value={editing!.fullname}
                        onChange={(e) =>
                          setEditing({
                            ...editing!,
                            fullname: e.target.value,
                          })
                        }
                      />
                    ) : (
                      x.fullname
                    )}
                  </td>

                  <td>
                    {isEdit ? (
                      <input
                        className={Style.input}
                        value={editing!.username}
                        onChange={(e) =>
                          setEditing({
                            ...editing!,
                            username: e.target.value,
                          })
                        }
                      />
                    ) : (
                      x.username
                    )}
                  </td>

                  <td className={Style.emailCell}>{x.email ?? "-"}</td>

                  <td>
                    <span className={pillClass(x.role)}>{x.role}</span>
                  </td>

                 <td className={Style.actionsCell}>
  <div className={Style.actions}>
    {canEdit && !isEdit && (
      <button
        className={Style.btnGhost}
        onClick={() => setEditing(x)}
      >
        Edit
      </button>
    )}

    {canEdit && isEdit && (
      <>
        <button className={Style.btn} onClick={saveEdit}>
          Save
        </button>

        <button
          className={Style.btnGhost}
          onClick={() => setEditing(null)}
        >
          Cancel
        </button>
      </>
    )}

    {canDelete && (
      <button
        className={Style.btnDanger}
        onClick={() => deleteRow(x.id)}
      >
        Delete
      </button>
    )}
  </div>
</td>
                </tr>
              );
            })}

            {!filtered.length && (
              <tr>
                <td colSpan={6} className={Style.empty}>
                  Hech narsa topilmadi
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <Pagination
          page={currentPage}
          totalPages={totalPages}
          onChange={setPage}
        />
      </div>
    </div>
  );
}
