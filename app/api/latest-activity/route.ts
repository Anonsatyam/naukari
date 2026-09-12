import { NextResponse } from "next/server";
import { getLatestActivityAt } from "@/lib/server/data";

export async function GET() {
  try {
    const latestAt = await getLatestActivityAt();
    return NextResponse.json({ latestAt }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ latestAt: null }, { headers: { "Cache-Control": "no-store" } });
  }
}
