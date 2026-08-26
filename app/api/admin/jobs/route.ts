import { NextResponse } from "next/server";
import { getAllJobsAdmin } from "@/lib/server/data";

export async function GET() {
  return NextResponse.json({ jobs: getAllJobsAdmin() });
}
