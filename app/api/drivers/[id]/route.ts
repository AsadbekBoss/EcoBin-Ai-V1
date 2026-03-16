import { NextResponse } from "next/server";
import {
  authExpiredJson,
  authExpiredText,
  isAuthStatus,
} from "@/lib/server/monitorAuth";
import { getBearerToken } from "@/lib/auth-token";

type Ctx = {
  params: Promise<{ id: string }>;
};

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

function normalizeId(raw: string) {
  const n = Number(raw);
  if (!raw || raw === "undefined" || !Number.isFinite(n)) return null;
  return String(n);
}

function getToken(req: Request) {
  return getBearerToken(req);
}

async function readTextSafe(res: Response) {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

export async function PUT(req: Request, ctx: Ctx) {
  try {
    const { id: raw } = await ctx.params;
    const id = normalizeId(raw);

    if (!id) {
      return bad(`ID noto‘g‘ri: ${String(raw)}`, 400);
    }

    const token = getToken(req);
    if (!token) {
      return authExpiredJson(
        { message: "Token topilmadi (monitor_token). Qayta login qiling." },
        401,
      );
    }

    const body = await req.text().catch(() => "");
    if (!body) {
      return bad("Body bo‘sh", 400);
    }

    const base = getBase();

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
    } catch (e: any) {
      return bad("Backendga ulanish xatosi", 502, {
        error: e?.message || "fetch failed",
      });
    }

    if (upstream.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    const text = await readTextSafe(upstream);
    const ct = upstream.headers.get("content-type") || "application/json";

    if (isAuthStatus(upstream.status)) {
      return authExpiredText(text, upstream.status, ct);
    }

    return new NextResponse(text, {
      status: upstream.status,
      headers: { "Content-Type": ct },
    });
  } catch (e: any) {
    return bad("drivers/[id] PUT proxy error", 500, {
      error: e?.message || "unknown error",
    });
  }
}

export async function DELETE(req: Request, ctx: Ctx) {
  try {
    const { id: raw } = await ctx.params;
    const id = normalizeId(raw);

    if (!id) {
      return bad(`ID noto‘g‘ri: ${String(raw)}`, 400);
    }

    const token = getToken(req);
    if (!token) {
      return authExpiredJson(
        { message: "Token topilmadi (monitor_token). Qayta login qiling." },
        401,
      );
    }

    const base = getBase();

    let upstream: Response;
    try {
      upstream = await fetch(`${base}/api/users/${id}`, {
        method: "DELETE",
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

    if (upstream.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    const text = await readTextSafe(upstream);
    const ct = upstream.headers.get("content-type") || "application/json";

    if (isAuthStatus(upstream.status)) {
      return authExpiredText(text, upstream.status, ct);
    }

    return new NextResponse(text, {
      status: upstream.status,
      headers: { "Content-Type": ct },
    });
  } catch (e: any) {
    return bad("drivers/[id] DELETE proxy error", 500, {
      error: e?.message || "unknown error",
    });
  }
}
