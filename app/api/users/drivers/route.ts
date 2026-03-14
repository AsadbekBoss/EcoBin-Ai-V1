import { NextResponse } from "next/server";
import { authExpiredJson, isAuthStatus } from "@/lib/server/monitorAuth";
import { getBearerToken } from "@/lib/auth-token";

export async function GET(req: Request) {
  try {
    const base = process.env.API_BASE || process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8082";

    const token = getBearerToken(req);

    if (!token) {
      return authExpiredJson({ message: "Token topilmadi. Qayta login qiling." }, 401);
    }

    const upstream = await fetch(`${base}/api/users/drivers`, {
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

    if (isAuthStatus(upstream.status)) {
      return authExpiredJson(
        { message: data?.message || "Sessiya tugagan", debug: data },
        upstream.status
      );
    }

    return NextResponse.json(data, { status: upstream.status });
  } catch (e: any) {
    return NextResponse.json(
      { message: e?.message || "drivers proxy error" },
      { status: 500 }
    );
  }
}
