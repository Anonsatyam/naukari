import { NextRequest, NextResponse } from "next/server";
import { getAllDrafts } from "@/lib/server/data";
import { BotDraft } from "@/lib/types";

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.searchParams.get("origin") as BotDraft["origin"] | null;
  const drafts = await getAllDrafts(origin ?? undefined);
  return NextResponse.json({ drafts });
}
