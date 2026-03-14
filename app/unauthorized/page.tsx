"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSession, redirectByRole } from "@/lib/auth";

export default function UnauthorizedPage() {
  const [to, setTo] = useState("/login");

  useEffect(() => {
    const s = getSession();
    if (!s) setTo("/login");
    else setTo(redirectByRole(s.role));
  }, []);

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <div className="card" style={{ padding: 18, maxWidth: 520, width: "100%" }}>
        <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 8 }}>Kirish taqiqlangan</div>
        <div style={{ color: "var(--muted)", marginBottom: 14 }}>
          Sizda bu sahifani ko‘rish huquqi yo‘q.
        </div>
        <Link className="btn" href={to}>O‘z panelimga qaytish</Link>
      </div>
    </div>
  );
}
