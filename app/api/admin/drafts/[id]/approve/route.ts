import { NextRequest, NextResponse } from "next/server";
import { approveDraft } from "@/lib/server/data";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let edits: Record<string, unknown> = {};
  try {
    edits = await request.json();
  } catch {
    // No body provided — approve using the bot's extracted fields as-is.
  }

  const approved = await approveDraft(id, edits);
  if (!approved) {
    return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  }
  // Keep `job` in the response for backward compatibility with any
  // existing caller that only ever expected job approvals, and add the
  // generic `approved` shape (which carries the type) for the UI to use.
  return NextResponse.json({
    approved,
    job: approved.type === "job" ? approved.entity : undefined,
  });
}
