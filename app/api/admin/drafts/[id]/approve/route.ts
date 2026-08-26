import { NextRequest, NextResponse } from "next/server";
import { approveDraft } from "@/lib/server/data";
import { Job } from "@/lib/types";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let edits: Partial<Job> = {};
  try {
    edits = await request.json();
  } catch {
    // No body provided — approve using the bot's extracted fields as-is.
  }

  const job = approveDraft(id, edits);
  if (!job) {
    return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  }
  return NextResponse.json({ job });
}
