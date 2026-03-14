import { NextResponse } from "next/server";
import { authExpiredJson, authExpiredText, isAuthStatus } from "@/lib/server/monitorAuth";
import { getBearerToken } from "@/lib/auth-token";

const base = process.env.API_BASE || process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8082";

function json(status: number, payload: any) {
  return NextResponse.json(payload, { status });
}

function bad(message: string, code = 400) {
  return json(code, { code, message });
}

type Ctx = { params: Promise<{ id: string }> };

function normalizeId(raw: string) {
  const n = Number(raw);
  if (!raw || raw === "undefined" || !Number.isFinite(n)) return null;
  return String(n);
}

function getToken(req: Request) {
  return getBearerToken(req);
}

export async function PUT(req: Request, ctx: Ctx) {
  const { id: raw } = await ctx.params;
  const id = normalizeId(raw);
  if (!id) return bad(`ID noto‘g‘ri: ${String(raw)}`);

  const token = getToken(req);
  if (!token) {
    return authExpiredJson({ message: "Token topilmadi (monitor_token). Qayta login qiling." }, 401);
  }

  const body = await req.text().catch(() => "");
  if (!body) return bad("Body bo‘sh", 400);

  let upstream: Response;
  try {
    upstream = await fetch(`${base}/api/users/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body,
      cache: "no-store",
    });
  } catch {
    return bad("Backendga ulanish xatosi", 502);
  }

  if (upstream.status === 204) return new NextResponse(null, { status: 204 });

  const text = await upstream.text().catch(() => "");
  const ct = upstream.headers.get("content-type") || "application/json";

  if (isAuthStatus(upstream.status)) {
    return authExpiredText(text, upstream.status, ct);
  }

  return new NextResponse(text, {
    status: upstream.status,
    headers: { "Content-Type": ct },
  });
}

export async function DELETE(req: Request, ctx: Ctx) {
  const { id: raw } = await ctx.params;
  const id = normalizeId(raw);
  if (!id) return bad(`ID noto‘g‘ri: ${String(raw)}`);

  const token = getToken(req);
  if (!token) {
    return authExpiredJson({ message: "Token topilmadi (monitor_token). Qayta login qiling." }, 401);
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${base}/api/users/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
  } catch {
    return bad("Backendga ulanish xatosi", 502);
  }

  if (upstream.status === 204) return new NextResponse(null, { status: 204 });

  const text = await upstream.text().catch(() => "");
  const ct = upstream.headers.get("content-type") || "application/json";

  if (isAuthStatus(upstream.status)) {
    return authExpiredText(text, upstream.status, ct);
  }

  return new NextResponse(text, {
    status: upstream.status,
    headers: { "Content-Type": ct },
  });
}
