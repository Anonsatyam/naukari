import { NextResponse } from "next/server";
import { getAdminStats } from "@/lib/server/data";

export async function GET() {
  return NextResponse.json(await getAdminStats());
}
