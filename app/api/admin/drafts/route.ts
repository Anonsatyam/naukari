import { NextResponse } from "next/server";
import { getAllDrafts } from "@/lib/server/data";

export async function GET() {
  const drafts = await getAllDrafts();
  return NextResponse.json({ drafts });
}
