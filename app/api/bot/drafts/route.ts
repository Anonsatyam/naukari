import { NextRequest, NextResponse } from "next/server";
import { createDraft, draftExistsForSource, addBotLogEntry } from "@/lib/server/data";

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

  let body: {
    jobTitle?: string;
    organization?: string;
    sourceUrl?: string;
    confidence?: "high" | "medium" | "low";
    extractedFields?: Record<string, unknown>;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { jobTitle, organization, sourceUrl, confidence, extractedFields } = body;
  if (!jobTitle || !organization || !sourceUrl) {
    return NextResponse.json(
      { error: "jobTitle, organization and sourceUrl are required" },
      { status: 400 }
    );
  }

  if (draftExistsForSource(sourceUrl)) {
    addBotLogEntry("warning", `Skipped (already known): ${jobTitle}`);
    return NextResponse.json({
      skipped: true,
      reason: "A draft or job already exists for this source URL",
    });
  }

  const draft = createDraft({
    jobTitle,
    organization,
    sourceUrl,
    confidence: confidence ?? "medium",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    extractedFields: (extractedFields ?? {}) as any,
  });

  addBotLogEntry("success", `Draft created: ${jobTitle} (${confidence ?? "medium"} confidence)`);

  return NextResponse.json({ draft }, { status: 201 });
}
