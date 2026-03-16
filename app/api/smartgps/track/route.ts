import { NextResponse } from "next/server";

async function fetchJsonSafe(r: Response) {
  const text = await r.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return { raw: text };
  }
}

async function loginToken(base: string, token: string) {
  const body = new URLSearchParams();
  body.set("params", JSON.stringify({ token }));

  const r = await fetch(`${base}/wialon/ajax.html?svc=token/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  return fetchJsonSafe(r);
}

async function wialonCall(base: string, sid: string, svc: string, params: any) {
  const body = new URLSearchParams();
  body.set("sid", sid);
  body.set("params", JSON.stringify(params));

  const r = await fetch(`${base}/wialon/ajax.html?svc=${svc}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  return fetchJsonSafe(r);
}

export async function GET(req: Request) {
  try {
    const base = process.env.SMARTGPS_BASE;
    const token = process.env.SMARTGPS_TOKEN;

    if (!base || !token) {
      return NextResponse.json(
        { ok: false, error: "ENV yo‘q: SMARTGPS_BASE yoki SMARTGPS_TOKEN" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(req.url);
    const unitId = Number(searchParams.get("unitId"));

    if (!unitId) {
      return NextResponse.json(
        { ok: false, error: "unitId kerak" },
        { status: 400 }
      );
    }

    const login = await loginToken(base, token);
    const sid = login?.eid || login?.sid;

    if (login?.error || !sid) {
      return NextResponse.json(
        { ok: false, error: "SmartGPS login failed", loginData: login },
        { status: 401 }
      );
    }

    const now = Math.floor(Date.now() / 1000);
    const from = now - 24 * 3600;

    const data = await wialonCall(base, sid, "messages/load_interval", {
      itemId: unitId,
      timeFrom: from,
      timeTo: now,
      flags: 1,
      flagsMask: 1,
      loadCount: 10000,
    });

    if (data?.error) {
      return NextResponse.json(
        { ok: false, error: "SmartGPS track error", data },
        { status: 502 }
      );
    }

    const msgs = Array.isArray(data?.messages) ? data.messages : [];

    const points = msgs
      .map((m: any) => {
        const p = m?.pos;
        if (!p) return null;

        return {
          lat: Number(p?.y),
          lng: Number(p?.x),
        };
      })
      .filter((p: any) => p && Number.isFinite(p.lat) && Number.isFinite(p.lng));

    return NextResponse.json({ ok: true, points });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "server error", message: String(e?.message || e) },
      { status: 500 }
    );
  }
}
