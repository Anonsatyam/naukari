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
  }

  try {
    const approved = await approveDraft(id, edits);
    if (!approved) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }
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
