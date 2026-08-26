import { NextRequest, NextResponse } from "next/server";
import { addBotLogEntry } from "@/lib/server/data";

export async function POST(request: NextRequest) {
  const expected = process.env.BOT_API_SECRET;
  if (!expected) {
    return NextResponse.json(
      { error: "Server is not configured with BOT_API_SECRET." },
      { status: 500 }
    );
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { status?: "success" | "warning" | "error"; message?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.message) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  const entry = await addBotLogEntry(body.status ?? "success", body.message);
  return NextResponse.json({ entry }, { status: 201 });
}
