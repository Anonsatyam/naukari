import { NextRequest, NextResponse } from "next/server";
import { getPublishedJobBySlug, getRelatedJobs } from "@/lib/server/data";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const job = await getPublishedJobBySlug(slug);
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }
  const relatedJobs = await getRelatedJobs(job, 3);
  return NextResponse.json({ job, relatedJobs });
}
