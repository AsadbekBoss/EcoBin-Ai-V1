import { NextResponse } from "next/server";
import { authExpiredJson, isAuthStatus } from "@/lib/server/monitorAuth";
import { getBearerToken } from "@/lib/auth-token";

function getBase() {
  const base = process.env.API_BASE || process.env.NEXT_PUBLIC_API_BASE;
  if (!base) throw new Error("API_BASE topilmadi");
  return base;
}

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;

    const base = getBase();
    const token = getBearerToken(req);

    if (!token) {
      return authExpiredJson(
        { ok: false, message: "Token yo‘q. Login qiling." },
        401,
      );
    }

    const body = await req.json();

    const upstream = await fetch(`${base}/api/trashbins/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
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
        upstream.status,
      );
    }

    return NextResponse.json(data, { status: upstream.status });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message || "Server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;

    const base = getBase();
    const token = getBearerToken(req);

    if (!token) {
      return authExpiredJson(
        { ok: false, message: "Token yo‘q. Login qiling." },
        401,
      );
    }

    const upstream = await fetch(`${base}/api/trashbins/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (!upstream.ok) {
      const text = await upstream.text();

      if (isAuthStatus(upstream.status)) {
        let data: any = null;
        try {
          data = text ? JSON.parse(text) : null;
        } catch {
          data = { raw: text };
        }

        return authExpiredJson(
          {
            ok: false,
            message: data?.message || "Sessiya tugagan",
            debug: data,
          },
          upstream.status,
        );
      }

      return NextResponse.json(
        {
          ok: false,
          message: `Backend status: ${upstream.status}`,
          debug: text,
        },
        { status: upstream.status },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message || "Server error" },
      { status: 500 },
    );
  }
}
