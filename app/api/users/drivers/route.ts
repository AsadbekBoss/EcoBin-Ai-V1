import { NextResponse } from "next/server";
import { authExpiredJson, isAuthStatus } from "@/lib/server/monitorAuth";
import { getBearerToken } from "@/lib/auth-token";

function getBase() {
  const base = process.env.API_BASE || process.env.NEXT_PUBLIC_API_BASE;
  if (!base) {
    throw new Error("API_BASE topilmadi");
  }
  return base;
}

function json(status: number, payload: unknown) {
  return NextResponse.json(payload, { status });
}

function bad(message: string, code = 400, extra?: Record<string, unknown>) {
  return json(code, {
    ok: false,
    code,
    message,
    ...(extra || {}),
  });
}

async function readTextSafe(res: Response) {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

function parseJsonSafe(text: string) {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return { raw: text };
  }
}

export async function GET(req: Request) {
  try {
    const token = getBearerToken(req);

    if (!token) {
      return authExpiredJson(
        { message: "Token topilmadi. Qayta login qiling." },
        401,
      );
    }

    const base = getBase();

    let upstream: Response;
    try {
      upstream = await fetch(`${base}/api/users/drivers`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });
    } catch (e: any) {
      return bad("Backendga ulanish xatosi", 502, {
        error: e?.message || "fetch failed",
      });
    }

    const text = await readTextSafe(upstream);
    const data = parseJsonSafe(text);

    if (isAuthStatus(upstream.status)) {
      return authExpiredJson(
        {
          message: (data as any)?.message || "Sessiya tugagan",
          debug: data,
        },
        upstream.status,
      );
    }

    return json(upstream.status, data);
  } catch (e: any) {
    return bad("users/drivers GET proxy error", 500, {
      error: e?.message || "unknown error",
    });
  }
}
