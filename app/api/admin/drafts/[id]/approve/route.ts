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

  try {
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
  } catch (err) {
      console.error("[APPROVE FAILED]", err);

        const error = err as {
          message?: string;
          code?: string;
          details?: string;
          hint?: string;
        };

        return NextResponse.json(
          {
            error: error.message || String(err),
            code: error.code,
            details: error.details,
            hint: error.hint,
          },
          { status: 500 }
        );
  }
}
