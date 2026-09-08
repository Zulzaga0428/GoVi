import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { isGated, isAuthed } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const info = getStore().info;
  return NextResponse.json({
    gated: isGated(),
    authed: isAuthed(),
    storage: info.kind,
    ephemeral: info.ephemeral
  });
}
