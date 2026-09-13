import { NextResponse } from "next/server";
import { getAllJobsAdmin, deleteJobs } from "@/lib/server/data";

export async function GET() {
  return NextResponse.json({ jobs: await getAllJobsAdmin() });
}

export async function DELETE(request: Request) {
  let body: { ids?: unknown } = {};
  try {
    body = await request.json();
  } catch {
  }
  const ids = Array.isArray(body.ids) ? body.ids.filter((id): id is string => typeof id === "string") : [];
  if (ids.length === 0) {
    return NextResponse.json({ error: "No job ids provided." }, { status: 400 });
  }
  try {
    await deleteJobs(ids);
    return NextResponse.json({ ok: true, count: ids.length });
  } catch (err) {
    console.error("[BULK DELETE JOBS FAILED]", err);
    const error = err as { message?: string };
    return NextResponse.json({ error: error.message || "Could not delete these jobs." }, { status: 500 });
  }
}
