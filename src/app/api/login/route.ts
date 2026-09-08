import { NextRequest, NextResponse } from "next/server";
import { accessCode } from "@/lib/store";
import { COOKIE_NAME } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Нэвтрэх код шалгаж, httpOnly cookie тавина. */
export async function POST(req: NextRequest) {
  const expected = accessCode();
  if (!expected) return NextResponse.json({ ok: true });

  let given = "";
  try {
    const body = (await req.json()) as { code?: unknown };
    given = String(body?.code ?? "").trim();
  } catch {
    /* хоосон үлдэнэ */
  }

  if (given !== expected) {
    return NextResponse.json({ error: "code_required" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, expected, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 180
  });
  return res;
}
