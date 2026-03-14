"use client";

import { useEffect, useMemo, useState } from "react";
import  Style  from "./user.module.css";
import {
  AppUser,
  Role,
  canManageUsers,
  createUser,
  deleteUser,
  getSession,
  getUsers,
  updateUser,
} from "@/lib/auth";
type RoleFilter = "ALL" | Role;

export default function UsersPage() {
  const [meRole, setMeRole] = useState<Role>("DRIVER");
  const [users, setUsers] = useState<AppUser[]>([]);
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("ALL");

  const [form, setForm] = useState({
    username: "",
    password: "",
    role: "DRIVER" as Role,
    fullName: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  function reload() {
    setUsers(getUsers());
  }

  useEffect(() => {
    const s = getSession();
    setMeRole((s?.role ?? "DRIVER") as Role);
    reload();
  }, []);

  const allowed = canManageUsers(meRole);
  const counts = useMemo(() => {
  const total = users.length;
  const superAdmins = users.filter(u => u.role === "SUPER_ADMIN").length;
  const admins = users.filter(u => u.role === "ADMIN").length;
  const drivers = users.filter(u => u.role === "DRIVER").length;
  return { total, superAdmins, admins, drivers };
}, [users]);

  const shown = useMemo(() => {
  const qq = q.trim().toLowerCase();

  return users
    .filter((u) => {
      if (!qq) return true;
      return `${u.username} ${u.fullName ?? ""} ${u.role}`.toLowerCase().includes(qq);
    })
    .filter((u) => {
      if (roleFilter === "ALL") return true;
      return u.role === roleFilter;
    });
}, [users, q, roleFilter]);

  const stats = useMemo(() => {
    const total = users.length;
    const superAdmin = users.filter((u) => u.role === "SUPER_ADMIN").length;
    const admin = users.filter((u) => u.role === "ADMIN").length;
    const driver = users.filter((u) => u.role === "DRIVER").length;
    return { total, superAdmin, admin, driver };
  }, [users]);

  function resetForm() {
    setEditingId(null);
    setForm({ username: "", password: "", role: "DRIVER", fullName: "" });
  }

  function onSubmit() {
    try {
      if (!form.username.trim()) return alert("Username kiriting");
      if (!form.password.trim()) return alert("Parol kiriting");

      if (editingId) {
        updateUser(editingId, {
          password: form.password,
          role: form.role,
          fullName: form.fullName,
        });
      } else {
        createUser({
          username: form.username.trim(),
          password: form.password,
          role: form.role,
          fullName: form.fullName,
        });
      }

      resetForm();
      reload();
    } catch (e: any) {
      alert(e?.message ?? "Xato");
    }
  }

  if (!allowed) {
    return (
      <div className="card listCard ">
        <div className="listHead">
          <div className="listTitle">Foydalanuvchilar</div>
          <div className="listHint">Ruxsat yo‘q</div>
        </div>
        <div className="usersEmpty">
          Bu bo‘lim faqat <b>SUPER_ADMIN</b> uchun.
        </div>
      </div>
    );
  }

  return (
    <div className="card listCard singlePageFull">
      <div className="listHead">
        <div className="listTitle">Foydalanuvchilar</div>
        <div className="listHint">SUPER_ADMIN: create/edit/delete</div>
      </div>

      {/* TOP GRID */}
      <div className="usersTop">
        {/* LEFT: FORM */}
        <div className="usersPanel">
          <div className="usersPanelHead">
            <div className="usersPanelTitle">
              {editingId ? "User tahrirlash" : "User yaratish"}
            </div>
            <div className="usersPanelSub">
              Username, parol va rolni belgilang
            </div>
          </div>

          <div className="usersForm">
            <div className="usersField">
              <label>Ism Familiya</label>
              <input
                value={form.fullName}
                onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
                placeholder="Ixtiyoriy"
              />
            </div>

            <div className="usersField">
              <label>Username</label>
              <input
                value={form.username}
                onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
                placeholder="Masalan: driver_01"
                disabled={!!editingId}
              />
            </div>

            <div className="usersField">
              <label>Parol</label>
              <input
                value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                placeholder="Masalan: 12345"
              />
            </div>

            <div className="usersField">
              <label>Role</label>
              <select
                value={form.role}
                onChange={(e) => setForm((p) => ({ ...p, role: e.target.value as Role }))}
              >
                <option value="ADMIN">ADMIN</option>
                <option value="DRIVER">DRIVER</option>
                <option value="SUPER_ADMIN">SUPER_ADMIN</option>
              </select>
            </div>

            <div className="usersBtns">
              <button className="uBtn primary" type="button" onClick={onSubmit}>
                {editingId ? "Saqlash" : "Yaratish"}
              </button>

              {editingId && (
                <button className="uBtn" type="button" onClick={resetForm}>
                  Bekor
                </button>
              )}

              <button className="uBtn" type="button" onClick={reload}>
                ⟳ Reload
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT: SEARCH + STATS */}
        <div className="usersSide">
          <div className="usersSearch">
            <div className="usersSearchTitle">Qidirish</div>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="username / role / ism..."
            />
          </div>

          <div className="usersStatsGrid">
  <button
    type="button"
    className={`statTile ${roleFilter === "ALL" ? "active" : ""}`}
    onClick={() => setRoleFilter("ALL")}
  >
    <div className="statK">Jami</div>
    <div className="statV">{counts.total}</div>
  </button>

  <button
    type="button"
    className={`statTile ${roleFilter === "SUPER_ADMIN" ? "active" : ""}`}
    onClick={() => setRoleFilter("SUPER_ADMIN")}
  >
    <div className="statK">SUPER_ADMIN</div>
    <div className="statV">{counts.superAdmins}</div>
  </button>

  <button
    type="button"
    className={`statTile ${roleFilter === "ADMIN" ? "active" : ""}`}
    onClick={() => setRoleFilter("ADMIN")}
  >
    <div className="statK">ADMIN</div>
    <div className="statV">{counts.admins}</div>
  </button>

  <button
    type="button"
    className={`statTile ${roleFilter === "DRIVER" ? "active" : ""}`}
    onClick={() => setRoleFilter("DRIVER")}
  >
    <div className="statK">DRIVER</div>
    <div className="statV">{counts.drivers}</div>
  </button>
</div>
        </div>
      </div>

      {/* LIST */}
      <div className="usersList">
        {shown.map((u) => (
          <div key={u.id} className="usersRow">
            <div className="usersRowLeft">
              <div className="usersAvatar">
                {(u.fullName?.[0] ?? u.username?.[0] ?? "U").toUpperCase()}
              </div>
              <div>
                <div className="usersName">{u.fullName ?? u.username}</div>
                <div className="usersMeta">
                  <b>{u.username}</b> • <span className={`rolePill ${u.role}`}>{u.role}</span>
                </div>
              </div>
            </div>

            <div className="usersRowRight">
              <button
                className="uBtn mini"
                type="button"
                onClick={() => {
                  setEditingId(u.id);
                  setForm({
                    username: u.username,
                    password: u.password,
                    role: u.role,
                    fullName: u.fullName ?? "",
                  });
                }}
              >
                ✏️ Edit
              </button>

              <button
                className="uBtn mini danger"
                type="button"
                onClick={() => {
                  if (u.role === "SUPER_ADMIN") return alert("SUPER_ADMIN ni o‘chira olmaysan.");
                  if (confirm(`O‘chirish: ${u.username}?`)) {
                    deleteUser(u.id);
                    reload();
                  }
                }}
              >
                🗑 Delete
              </button>
            </div>
          </div>
        ))}

        {!shown.length && <div className="usersEmpty">Hech narsa topilmadi.</div>}
      </div>
    </div>
  );
}