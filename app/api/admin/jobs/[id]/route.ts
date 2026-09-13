import { NextResponse } from "next/server";
import { deleteJob } from "@/lib/server/data";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await deleteJob(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE JOB FAILED]", err);
    const error = err as { message?: string };
    return NextResponse.json({ error: error.message || "Could not delete this job." }, { status: 500 });
  }
}
