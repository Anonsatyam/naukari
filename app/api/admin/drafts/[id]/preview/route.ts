import { NextResponse } from "next/server";
import { previewDraft } from "@/lib/server/data";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let edits: Record<string, unknown> = {};
  try {
    edits = await request.json();
  } catch {
    edits = {};
  }

  try {
    const preview = await previewDraft(id, edits);
    if (!preview) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }
    return NextResponse.json(preview);
  } catch (err) {
    console.error("[PREVIEW DRAFT FAILED]", err);
    const error = err as { message?: string };
    return NextResponse.json({ error: error.message || "Could not build a preview." }, { status: 500 });
  }
}
