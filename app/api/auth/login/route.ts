import { NextResponse } from "next/server";

function normalizeRole(input: unknown): "SUPER_ADMIN" | "ADMIN" | "DRIVER" {
  const r = String(input ?? "").trim().toUpperCase();

  if (r === "SUPER_ADMIN" || r === "ROLE_SUPER_ADMIN") return "SUPER_ADMIN";
  if (r === "ADMIN" || r === "ROLE_ADMIN") return "ADMIN";
  if (r === "DRIVER" || r === "ROLE_DRIVER") return "DRIVER";

  throw new Error(`Noto‘g‘ri role: ${String(input)}`);
}

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { ok: false, message: "Username va password kerak" },
        { status: 400 }
      );
    }

    const base = process.env.API_BASE || process.env.NEXT_PUBLIC_API_BASE;
    if (!base) {
      return NextResponse.json(
        { ok: false, message: "API_BASE topilmadi (.env.local)" },
        { status: 500 }
      );
    }

    const upstream = await fetch(`${base}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const rawText = await upstream.text();
    let data: any = null;

    try {
      data = rawText ? JSON.parse(rawText) : null;
    } catch {
      data = { raw: rawText };
    }

    if (!upstream.ok) {
      return NextResponse.json(
        {
          ok: false,
          message: data?.message || "Login yoki parol xato",
        },
        { status: 401 }
      );
    }

    const token =
      data?.token ||
      data?.access_token ||
      data?.accessToken ||
      data?.data?.token ||
      data?.data?.accessToken;

    if (!token) {
      return NextResponse.json(
        {
          ok: false,
          message: "Backend javobidan token topilmadi",
          debug: data,
        },
        { status: 500 }
      );
    }

    const rawRole =
      data?.role ||
      data?.user?.role ||
      data?.data?.role ||
      data?.data?.user?.role;

    if (!rawRole) {
      return NextResponse.json(
        {
          ok: false,
          message: "Backend javobidan role topilmadi",
          debug: data,
        },
        { status: 500 }
      );
    }

    const role = normalizeRole(rawRole);

    return NextResponse.json({
      ok: true,
      token,
      role,
      username: data?.username || username,
      userId:
        data?.userId ||
        data?.id ||
        data?.user?.id ||
        data?.data?.userId ||
        data?.data?.id ||
        null,
      fullName:
        data?.fullName ||
        data?.user?.fullName ||
        data?.user?.fullname ||
        data?.data?.fullName ||
        data?.data?.user?.fullName ||
        null,
    });

  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message || "Server error" },
      { status: 500 }
    );
  }
}