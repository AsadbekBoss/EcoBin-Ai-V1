import { NextResponse } from "next/server";
import { authExpiredJson, isAuthStatus } from "@/lib/server/monitorAuth";
import { getBearerToken } from "@/lib/auth-token";

export async function GET(req: Request) {
  try {
    const base = process.env.API_BASE || process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8082";

    const token = getBearerToken(req);

    if (!token) {
      return authExpiredJson({ ok: false, message: "Token topilmadi" }, 401);
    }

    const upstream = await fetch(`${base}/api/statistics/drivers`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
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
          {
            ok: false,
            message: data?.message || "Sessiya tugagan",
            upstreamStatus: upstream.status,
            debug: data,
          },
          upstream.status
        );
      }

      return NextResponse.json(
        {
          ok: false,
          upstreamStatus: upstream.status,
          base,
          hasToken: !!token,
          debug: data,
        },
        { status: upstream.status }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        base,
        count: Array.isArray(data) ? data.length : null,
        data,
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
