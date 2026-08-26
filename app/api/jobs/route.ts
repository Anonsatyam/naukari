import { NextRequest, NextResponse } from "next/server";
import { getPublishedJobs } from "@/lib/server/data";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? undefined;
  const category = searchParams.getAll("category");
  const department = searchParams.getAll("department");
  const qualification = searchParams.getAll("qualification");

  const jobs = getPublishedJobs({ q, category, department, qualification });
  return NextResponse.json({ jobs });
}
