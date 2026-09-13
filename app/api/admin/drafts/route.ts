import { NextRequest, NextResponse } from "next/server";
import { getDraftsPage } from "@/lib/server/data";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page")) || 1;
  const pageSize = Number(searchParams.get("pageSize")) || undefined;
  const search = searchParams.get("search") ?? undefined;
  const sortBy = searchParams.get("sortBy") ?? undefined;
  const sortDir = searchParams.get("sortDir") === "asc" ? "asc" : "desc";

  const result = await getDraftsPage({ page, pageSize, search, sortBy, sortDir });
  return NextResponse.json(result);
}
