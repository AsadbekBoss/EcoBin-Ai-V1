import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

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

  const url = `${base}/wialon/ajax.html?svc=token/login`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });

  return fetchJsonSafe(r);
}

async function wialonCall(base: string, sid: string, svc: string, params: any) {
  const body = new URLSearchParams();
  body.set("sid", sid);
  body.set("params", JSON.stringify(params));

  const url = `${base}/wialon/ajax.html?svc=${svc}`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });

  return fetchJsonSafe(r);
}

export async function GET() {
  try {
    const base = process.env.SMARTGPS_BASE!;
    const token = process.env.SMARTGPS_TOKEN!;

    if (!base || !token) {
      return NextResponse.json(
        { ok: false, error: "ENV yo‘q: SMARTGPS_BASE yoki SMARTGPS_TOKEN" },
        { status: 500 }
      );
    }

    // 1) LOGIN
    const loginData = await loginToken(base, token);
    const sid = loginData?.eid || loginData?.sid;

    if (loginData?.error || !sid) {
      return NextResponse.json(
        { ok: false, error: "SmartGPS login failed", loginData },
        { status: 401 }
      );
    }

    // 2) UNITS (mashinalar) olish
    const params = {
      spec: {
        itemsType: "avl_unit",
        propName: "sys_name",
        propValueMask: "*",
        sortType: "sys_name",
      },
      force: 1,
      // pos va last msg chiqishi uchun sizdagi kabi qoldirdik
      flags: 1025,
      from: 0,
      to: 0,
    };

    const unitsData = await wialonCall(base, sid, "core/search_items", params);

    if (unitsData?.error) {
      return NextResponse.json(
        { ok: false, error: "SmartGPS units error", unitsData },
        { status: 502 }
      );
    }

    const items = Array.isArray(unitsData?.items) ? unitsData.items : [];

    const cars = items
      .map((u: any) => {
        const p = u?.pos || u?.lmsg?.pos;
        if (!p) return null;

        const time = u?.lmsg?.t ?? null;

        const mileage =
          u?.mileage ??
          u?.lmsg?.mileage ??
          u?.lmsg?.p?.mileage ??
          u?.lmsg?.p?.odometer ??
          null;

        return {
          id: Number(u?.id),
          name: String(u?.nm ?? `CAR-${u?.id ?? "?"}`),
          lat: Number(p?.y),
          lng: Number(p?.x),
          speed: Number(p?.s ?? 0),
          time: time == null ? null : Number(time),
          mileage: mileage == null ? null : Number(mileage),
        };
      })
      .filter((c: any) => c && Number.isFinite(c.id) && Number.isFinite(c.lat) && Number.isFinite(c.lng));

    return NextResponse.json({ ok: true, cars });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "server error", message: String(e?.message || e) },
      { status: 500 }
    );
  }
}