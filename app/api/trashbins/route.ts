import { NextResponse } from "next/server";
import { authExpiredJson, isAuthStatus } from "@/lib/server/monitorAuth";
import { getBearerToken } from "@/lib/auth-token";

function getBase() {
  return process.env.API_BASE || process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8082";
}

export async function GET(req: Request) {
  try {
    const base = getBase();
    const token = getBearerToken(req);

    if (!token) {
      return authExpiredJson({ ok: false, message: "Token yo‘q. Login qiling." }, 401);
    }

    const url = new URL(req.url);
    const page = url.searchParams.get("page") ?? "0";
    const size = url.searchParams.get("size") ?? "1000";

    const upstream = await fetch(`${base}/api/trashbins?page=${page}&size=${size}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    const text = await upstream.text();
    let data: any = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text };
    }

    if (!upstream.ok) {
      if (isAuthStatus(upstream.status)) {
        return authExpiredJson(
          { ok: false, message: data?.message || "Sessiya tugagan", debug: data },
          upstream.status
        );
      }

      return NextResponse.json(
        { ok: false, message: `Backend status: ${upstream.status}`, debug: data },
        { status: upstream.status }
      );
    }

    const items =
      Array.isArray(data) ? data :
      Array.isArray(data?.content) ? data.content :
      Array.isArray(data?.items) ? data.items :
      Array.isArray(data?.data) ? data.data :
      [];

    return NextResponse.json({ ok: true, items });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const base = getBase();
    const token = getBearerToken(req);

    if (!token) {
      return authExpiredJson({ ok: false, message: "Token yo‘q. Login qiling." }, 401);
    }

    const body = await req.json();

    const upstream = await fetch(`${base}/api/trashbins`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const text = await upstream.text();
    let data: any = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text };
    }

    if (isAuthStatus(upstream.status)) {
      return authExpiredJson(
        { ok: false, message: data?.message || "Sessiya tugagan", debug: data },
        upstream.status
      );
    }

    return NextResponse.json(data, { status: upstream.status });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || "Server error" }, { status: 500 });
  }
}
