import { NextRequest, NextResponse } from "next/server";
import { getResultBySlug } from "@/lib/server/data";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const result = getResultBySlug(slug);
  if (!result) {
    return NextResponse.json({ error: "Result not found" }, { status: 404 });
  }
  return NextResponse.json({ result });
}
