"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Role, getSession, logout, canSeeDashboard } from "@/lib/auth";
import { useAppShell } from "@/components/ui/AppShellContext";

type NavItem = {
  href: string;
  label: string;
  icon: string;
};

function join(basePath: string, p: string) {
  const base = basePath?.trim() || "";
  const seg = p.startsWith("/") ? p : `/${p}`;
  return base ? `${base}${seg}` : seg;
}

export default function Sidebar({ basePath = "" }: { basePath?: string }) {
  const path = usePathname();
  const r = useRouter();

  const {
    sidebarCollapsed,
    setSidebarCollapsed,
    sidebarOpen,
    setSidebarOpen,
    isCompact,
    t,
  } = useAppShell();

  const [role, setRole] = useState<Role | null>(null);
  const [username, setUsername] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const s = getSession();

    if (!s?.role) {
      setRole(null);
      setUsername("");
      setReady(true);
      r.replace("/login");
      return;
    }

    setRole(s.role);
    setUsername(String(s.username || ""));
    setReady(true);
  }, [path, r]);

  const items: NavItem[] = useMemo(() => {
    if (!role) return [];

    const list: NavItem[] = [
      {
        href: join(basePath, "/monitor"),
        label: t("monitoring"),
        icon: "ri-radar-line",
      },
      {
        href: join(basePath, "/trashbins"),
        label: t("trashbins"),
        icon: "ri-delete-bin-6-line",
      },
      {
        href: join(basePath, "/cars"),
        label: t("cars"),
        icon: "ri-truck-line",
      },
    ];

    if (role !== "DRIVER" && canSeeDashboard(role)) {
      list.push({
        href: join(basePath, "/stats"),
        label: t("dashboard"),
        icon: "ri-pie-chart-2-line",
      });
    }

    if (role === "ADMIN" || role === "SUPER_ADMIN") {
      list.push({
        href: join(basePath, "/statistics"),
        label: t("statistics"),
        icon: "ri-bar-chart-box-line",
      });
    }

    if (role === "SUPER_ADMIN") {
      list.push({
        href: join(basePath, "/users"),
        label: t("users"),
        icon: "ri-user-3-line",
      });
    }

    return list;
  }, [role, basePath, t]);

  const isDesktopCollapsed = !isCompact && sidebarCollapsed;

  function closeCompactSidebar() {
    if (isCompact) setSidebarOpen(false);
  }

  async function handleLogout() {
    try {
      if (isCompact) setSidebarOpen(false);
      await logout();
    } finally {
      r.replace("/login");
    }
  }

  function handleSidebarButton() {
    if (isCompact) {
      setSidebarOpen(false);
    } else {
      setSidebarCollapsed(!sidebarCollapsed);
    }
  }

  if (!ready || !role) return null;

  return (
    <aside
      className={`shellSidebar ${sidebarCollapsed ? "isCollapsed" : ""} ${
        sidebarOpen ? "open" : ""
      }`}
      id="sidebar"
      aria-hidden={isCompact ? !sidebarOpen : false}
    >
      <div className="shellSidebarInner">
        <div className={`brandRow ${isDesktopCollapsed ? "onlyToggle" : ""}`}>
          {!isDesktopCollapsed && (
            <>
              <div className="brandLogo">🍃</div>

              <div className="brandCopy">
                <div className="brandTop">OBOD</div>
                <div className="brandBot">SHAHAR</div>
              </div>
            </>
          )}

          <button
            type="button"
            className="collapseToggle"
            title={
              isCompact
                ? sidebarOpen
                  ? t("collapse")
                  : t("expand")
                : sidebarCollapsed
                ? t("expand")
                : t("collapse")
            }
            onClick={handleSidebarButton}
            aria-label="Toggle sidebar"
          >
            <i
              className={
                isCompact
                  ? sidebarOpen
                    ? "ri-close-line"
                    : "ri-menu-line"
                  : sidebarCollapsed
                  ? "ri-menu-unfold-line"
                  : "ri-menu-fold-line"
              }
            />
          </button>
        </div>

        <nav className={`navList ${isDesktopCollapsed ? "collapsedNav" : ""}`}>
          {items.map((item) => {
            const active = path === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`navItem ${active ? "active" : ""} ${
                  isDesktopCollapsed ? "iconOnly" : ""
                }`}
                onClick={closeCompactSidebar}
                title={isDesktopCollapsed ? item.label : undefined}
                aria-label={item.label}
              >
                <i className={`${item.icon} navIco`} />
                {!isDesktopCollapsed && <span className="navTxt">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="navFooter">
          {isDesktopCollapsed ? (
            <button
              type="button"
              className="logoutBtn soloLogout"
              title={t("logout")}
              onClick={handleLogout}
              aria-label={t("logout")}
            >
              <i className="ri-logout-box-r-line" />
            </button>
          ) : (
            <div className="userCard">
              <div className="avatar">
                {(username?.[0] || "U").toUpperCase()}
              </div>

              <div className="uInfo">
                <div className="uName">{username || "User"}</div>
                <div className="uRole">{role}</div>
              </div>

              <button
                type="button"
                className="logoutBtn"
                title={t("logout")}
                onClick={handleLogout}
                aria-label={t("logout")}
              >
                <i className="ri-logout-box-r-line" />
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}