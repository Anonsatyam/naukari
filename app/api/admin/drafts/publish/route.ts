import { NextRequest, NextResponse } from "next/server";
import { createDraft, draftExistsForSource, approveDraft } from "@/lib/server/data";
import { notifySubscribersOfNewListing } from "@/lib/server/notifySubscribers";
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

    const approved = await approveDraft(draft.id, {});
    if (!approved) {
      return NextResponse.json({ error: "Could not publish this post." }, { status: 500 });
    }

    await notifySubscribersOfNewListing(approved);
    return NextResponse.json({ draft, approved });
  } catch (err) {
    console.error("[PUBLISH DIRECTLY FAILED]", err);
    const error = err as { message?: string };
    return NextResponse.json({ error: error.message || "Could not publish this post." }, { status: 500 });
  }
}
