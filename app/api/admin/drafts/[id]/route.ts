import { NextResponse } from "next/server";
import { getDraftById, deleteDraft } from "@/lib/server/data";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const draft = await getDraftById(id);
  if (!draft) {
    return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  }
  return NextResponse.json({ draft });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const draft = await getDraftById(id);
  if (!draft) {
    return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  }
  try {
    await deleteDraft(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE DRAFT FAILED]", err);
    const error = err as { message?: string };
    return NextResponse.json({ error: error.message || "Could not delete this draft." }, { status: 500 });
  }
}
