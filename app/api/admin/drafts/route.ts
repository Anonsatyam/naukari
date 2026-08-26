import { NextResponse } from "next/server";
import { getAllDrafts } from "@/lib/server/data";

export async function GET() {
  return NextResponse.json({ drafts: await getAllDrafts() });
}
