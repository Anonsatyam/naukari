import { NextRequest, NextResponse } from "next/server";
import { getAdmitCardBySlug } from "@/lib/server/data";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const admitCard = getAdmitCardBySlug(slug);
  if (!admitCard) {
    return NextResponse.json({ error: "Admit card not found" }, { status: 404 });
  }
  return NextResponse.json({ admitCard });
}
