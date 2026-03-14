"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import PageLoader from "@/components/ui/PageLoader";
import { AppShellProvider, useAppShell } from "@/components/ui/AppShellContext";
import { Role, getSession, redirectByRole } from "@/lib/auth";
import "@/components/ui/shell.css";

function InnerShell({
  children,
  basePath,
  allow,
}: {
  children: React.ReactNode;
  basePath: string;
  allow: Role[];
}) {
  const r = useRouter();
  const path = usePathname();
  const [ok, setOk] = useState(false);
  const [checking, setChecking] = useState(true);
  const { sidebarOpen, setSidebarOpen, sidebarCollapsed } = useAppShell();

  useEffect(() => {
    const s = getSession();

    if (!s) {
      setOk(false);
      setChecking(false);
      r.replace("/login");
      return;
    }

    if (!allow.includes(s.role)) {
      setOk(false);
      setChecking(false);
      r.replace(redirectByRole(s.role));
      return;
    }

    setOk(true);
    setChecking(false);
  }, [r, path, allow]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [path, setSidebarOpen]);

  const contentMode = useMemo(() => {
    if (path?.includes("/monitor")) return "monitor";
    if (path?.includes("/cars") || path?.includes("/stats") || path?.includes("/statistics")) {
      return "wide";
    }
    return "default";
  }, [path]);



  return (
    <div className={`shell ${sidebarCollapsed ? "shellCollapsed" : ""} ${sidebarOpen ? "sidebarOpen" : ""}`}>
      <Sidebar basePath={basePath} />
      <div className="shellBackdrop" onClick={() => setSidebarOpen(false)} />

      <main className="shellMain">
        <Topbar />
        <section className={`pageSurface pageSurface--${contentMode}`}>{children}</section>
      </main>
    </div>
  );
}

export default function RoleShell(props: { children: React.ReactNode; basePath: string; allow: Role[] }) {
  return (
    <AppShellProvider>
      <InnerShell {...props} />
    </AppShellProvider>
  );
}
