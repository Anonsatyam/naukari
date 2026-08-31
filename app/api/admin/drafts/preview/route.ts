import { NextRequest, NextResponse } from "next/server";
import { previewDraftEntity } from "@/lib/server/data";
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
  if (!jobTitle?.trim() || !organization?.trim()) {
    return NextResponse.json({ error: "jobTitle and organization are required" }, { status: 400 });
  }

  try {
    const preview = await previewDraftEntity(
      {
        jobTitle: jobTitle.trim(),
        organization: organization.trim(),
        sourceUrl: sourceUrl?.trim() || "",
        draftType: draftType ?? "job",
        extractedFields: extractedFields ?? {},
      },
      {}
    );
    return NextResponse.json(preview);
  } catch (err) {
    console.error("[PREVIEW POST FAILED]", err);
    const error = err as { message?: string };
    return NextResponse.json({ error: error.message || "Could not build a preview." }, { status: 500 });
  }
}
