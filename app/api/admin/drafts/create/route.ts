import { NextRequest, NextResponse } from "next/server";
import { createDraft, draftExistsForSource } from "@/lib/server/data";
import { DraftType } from "@/lib/types";

export async function POST(request: NextRequest) {
  let body: {
    jobTitle?: string;
    organization?: string;
    sourceUrl?: string;
    draftType?: DraftType;
    extractedFields?: Record<string, unknown>;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { jobTitle, organization, sourceUrl, draftType, extractedFields } = body;
  if (!jobTitle?.trim() || !organization?.trim() || !sourceUrl?.trim()) {
    return NextResponse.json(
      { error: "jobTitle, organization and sourceUrl are required" },
      { status: 400 }
    );
  }

  if (await draftExistsForSource(sourceUrl)) {
    return NextResponse.json(
      { error: "A draft or published post already exists for this exact link." },
      { status: 409 }
    );
  }

  try {
    const draft = await createDraft({
      jobTitle: jobTitle.trim(),
      organization: organization.trim(),
      sourceUrl: sourceUrl.trim(),
      confidence: "high",
      draftType: draftType ?? "job",
      origin: "manual",
      extractedFields: extractedFields ?? {},
    });
    return NextResponse.json({ draft }, { status: 201 });
  } catch (err) {
    console.error("[CREATE POST FAILED]", err);
    const error = err as { message?: string };
    return NextResponse.json({ error: error.message || "Could not create this post." }, { status: 500 });
  }
}
