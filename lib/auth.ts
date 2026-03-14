import { clearStoredToken, setStoredToken } from "@/lib/auth-token";

export type Role = "SUPER_ADMIN" | "ADMIN" | "DRIVER";

export type AppUser = {
  id: string;
  username: string;
  password: string;
  role: Role;
  fullName?: string;
  createdAt: number;
};

export type Session = {
  userId: string;
  username: string;
  role: Role;
  fullName?: string;
  createdAt: number;
};

const USERS_KEY = "monitor_users";
const SESSION_KEY = "monitor_session";
const SESSION_KEY_PERSIST = "monitor_session_persist";

function isBrowser() {
  return typeof window !== "undefined";
}

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function normalizeRole(input: unknown): Role {
  const r = String(input ?? "")
    .trim()
    .toUpperCase();

  if (r === "SUPER_ADMIN" || r === "ROLE_SUPER_ADMIN") return "SUPER_ADMIN";
  if (r === "ADMIN" || r === "ROLE_ADMIN") return "ADMIN";
  if (r === "DRIVER" || r === "ROLE_DRIVER") return "DRIVER";

  throw new Error(`Noto‘g‘ri role keldi: ${String(input)}`);
}

/* =========================
   Seed users (demo)
========================= */
export function seedUsersIfEmpty() {
  if (!isBrowser()) return;

  const raw = localStorage.getItem(USERS_KEY);
  if (raw) return;

  // const seed: AppUser[] = [
  //   {
  //     id: uid(),
  //     username: "super",
  //     password: "12345",
  //     role: "SUPER_ADMIN",
  //     fullName: "Super Admin",
  //     createdAt: Date.now(),
  //   },
  //   {
  //     id: uid(),
  //     username: "admin",
  //     password: "12345",
  //     role: "ADMIN",
  //     fullName: "Admin",
  //     createdAt: Date.now(),
  //   },
  //   {
  //     id: uid(),
  //     username: "driver",
  //     password: "12345",
  //     role: "DRIVER",
  //     fullName: "Driver",
  //     createdAt: Date.now(),
  //   },
  // ];

  // localStorage.setItem(USERS_KEY, JSON.stringify(seed));
}

/* =========================
   Users CRUD (demo/local)
========================= */
export function getUsers(): AppUser[] {
  if (!isBrowser()) return [];

  seedUsersIfEmpty();

  const raw = localStorage.getItem(USERS_KEY);
  try {
    return raw ? (JSON.parse(raw) as AppUser[]) : [];
  } catch {
    return [];
  }
}

function setUsers(users: AppUser[]) {
  if (!isBrowser()) return;
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function createUser(input: Omit<AppUser, "id" | "createdAt">): AppUser {
  if (!isBrowser()) throw new Error("createUser can run only in browser");

  const users = getUsers();
  const username = input.username.trim();

  if (!username) throw new Error("Username bo‘sh bo‘lmasligi kerak");

  const exists = users.some((u) => u.username.toLowerCase() === username.toLowerCase());
  if (exists) throw new Error("Bunday username allaqachon bor");

  const user: AppUser = {
    id: uid(),
    createdAt: Date.now(),
    ...input,
    username,
    role: normalizeRole(input.role),
  };

  setUsers([user, ...users]);
  return user;
}

export function updateUser(
  id: string,
  patch: Partial<Omit<AppUser, "id" | "createdAt">>
): AppUser {
  if (!isBrowser()) throw new Error("updateUser can run only in browser");

  const users = getUsers();
  const idx = users.findIndex((u) => u.id === id);

  if (idx === -1) throw new Error("User topilmadi");

  if (patch.username) {
    const nextUsername = patch.username.trim();
    if (!nextUsername) throw new Error("Username bo‘sh bo‘lmasligi kerak");

    const taken = users.some(
      (u) => u.id !== id && u.username.toLowerCase() === nextUsername.toLowerCase()
    );
    if (taken) throw new Error("Bunday username allaqachon bor");
  }

  const updated: AppUser = {
    ...users[idx],
    ...patch,
    username: patch.username ? patch.username.trim() : users[idx].username,
    role: patch.role ? normalizeRole(patch.role) : users[idx].role,
  };

  const next = [...users];
  next[idx] = updated;

  setUsers(next);
  return updated;
}

export function deleteUser(id: string) {
  if (!isBrowser()) throw new Error("deleteUser can run only in browser");

  const users = getUsers();
  setUsers(users.filter((u) => u.id !== id));
}

/* =========================
   Session storage
========================= */
function readSessionRaw(): Session | null {
  if (!isBrowser()) return null;

  const s1 = sessionStorage.getItem(SESSION_KEY);
  const s2 = localStorage.getItem(SESSION_KEY_PERSIST);
  const raw = s1 || s2;

  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Session;
    return {
      ...parsed,
      role: normalizeRole(parsed.role),
    };
  } catch {
    return null;
  }
}

export function getSession(): Session | null {
  return readSessionRaw();
}

function saveSession(s: Session, remember: boolean) {
  if (!isBrowser()) return;

  sessionStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SESSION_KEY_PERSIST);

  const raw = JSON.stringify(s);

  if (remember) {
    localStorage.setItem(SESSION_KEY_PERSIST, raw);
  } else {
    sessionStorage.setItem(SESSION_KEY, raw);
  }
}

/* =========================
   BACKEND LOGIN
========================= */
export async function login(
  username: string,
  password: string,
  remember = false
): Promise<Session> {
  if (!isBrowser()) throw new Error("login can run only in browser");

  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: username.trim(),
      password,
    }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || !data?.ok) {
    throw new Error(data?.message || "Login yoki parol xato");
  }

  const token = String(data?.token || "").trim();

  if (!token) {
    throw new Error("Login javobida token kelmadi");
  }

  const role = normalizeRole(data?.role);

  const s: Session = {
    userId: String(data?.userId || data?.id || uid()),
    username: String(data?.username || username).trim(),
    role,
    fullName: data?.fullName ? String(data.fullName) : undefined,
    createdAt: Date.now(),
  };

  saveSession(s, remember);
  setStoredToken(token);
  return s;
}

export async function logout() {
  if (!isBrowser()) return;

  await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});

  sessionStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SESSION_KEY_PERSIST);
  clearStoredToken();
}

/* =========================
   Permissions
========================= */
export function canManageUsers(role: Role) {
  return role === "SUPER_ADMIN" || role === "ADMIN";
}

export function canSeeDashboard(role: Role) {
  return role === "SUPER_ADMIN" || role === "ADMIN" || role === "DRIVER";
}

export function redirectByRole(role: Role) {
  const normalized = normalizeRole(role);

  if (normalized === "SUPER_ADMIN") return "/super/monitor";
  if (normalized === "ADMIN") return "/admin/monitor";
  return "/driver/monitor";
}