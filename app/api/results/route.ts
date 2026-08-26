import { NextRequest, NextResponse } from "next/server";
import { getResults } from "@/lib/server/data";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? undefined;
  return NextResponse.json({ results: await getResults(q) });
}
