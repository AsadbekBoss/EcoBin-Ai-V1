import { NextResponse } from "next/server";
import { authExpiredJson, authExpiredText, isAuthStatus } from "@/lib/server/monitorAuth";
import { getBearerToken } from "@/lib/auth-token";

const base = process.env.API_BASE || process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8082";

export async function GET(req: Request) {
  const token = getBearerToken(req);
  

  if (!token) {
    return authExpiredJson({ message: "Token topilmadi. Qayta login qiling." }, 401);
  }

  const url = new URL(req.url);
  const page = url.searchParams.get("page") ?? "0";
  const size = url.searchParams.get("size") ?? "1000";

  const upstream = await fetch(`${base}/api/users?page=${page}&size=${size}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  const text = await upstream.text();
  const ct = upstream.headers.get("content-type") || "application/json";

  if (isAuthStatus(upstream.status)) {
    return authExpiredText(text, upstream.status, ct);
  }

  return new NextResponse(text, {
    status: upstream.status,
    headers: { "Content-Type": ct },
  });
}

export async function POST(req: Request) {
  const token = getBearerToken(req);
  const body = await req.text();

  if (!token) {
    return authExpiredJson({ message: "Token topilmadi. Qayta login qiling." }, 401);
  }

  const upstream = await fetch(`${base}/api/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body,
    cache: "no-store",
  });

  const text = await upstream.text();
  const ct = upstream.headers.get("content-type") || "application/json";

  if (isAuthStatus(upstream.status)) {
    return authExpiredText(text, upstream.status, ct);
  }

  return new NextResponse(text, {
    status: upstream.status,
    headers: { "Content-Type": ct },
  });
}
