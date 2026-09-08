import { NextRequest, NextResponse } from "next/server";
import { getStore, sanitize } from "@/lib/store";
import { isAuthed } from "@/lib/auth";
import { isValidPeriodKey } from "@/lib/period";

export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json({ error: "code_required" }, { status: 401 });
}

export async function GET(req: NextRequest) {
  if (!isAuthed()) return unauthorized();

  const { searchParams } = req.nextUrl;
  const period = searchParams.get("period");
  const month = searchParams.get("month");

  try {
    if (period) {
      if (!isValidPeriodKey(period)) {
        return NextResponse.json({ error: "bad_period" }, { status: 400 });
      }
      return NextResponse.json(await getStore().byPeriod(period));
    }
    if (month) {
      const m = Number(month);
      if (!Number.isInteger(m) || m < 1 || m > 12) {
        return NextResponse.json({ error: "bad_month" }, { status: 400 });
      }
      return NextResponse.json(await getStore().byMonth(m));
    }
    return NextResponse.json({ error: "period_or_month_required" }, { status: 400 });
  } catch (e) {
    console.error("[govi] унших алдаа:", e);
    return NextResponse.json({ error: "read_failed" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  if (!isAuthed()) return unauthorized();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const rec = sanitize(body);
  if (!rec) return NextResponse.json({ error: "bad_record" }, { status: 400 });

  try {
    await getStore().put(rec);
    return NextResponse.json({ ok: true, id: `${rec.period}-${rec.st}` });
  } catch (e) {
    console.error("[govi] бичих алдаа:", e);
    return NextResponse.json({ error: "write_failed" }, { status: 500 });
  }
}
