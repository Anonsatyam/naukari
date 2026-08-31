import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabaseClient";
import { DOCUMENTS_BUCKET, ensureDocumentsBucket, getDocumentPublicUrl } from "@/lib/server/storage";

const MAX_FILE_SIZE = 20 * 1024 * 1024;

function slugifyFileName(name: string): string {
  const base = name.replace(/\.pdf$/i, "");
  const slug = base
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return slug || "document";
}

export async function POST(request: NextRequest) {
  let body: { fileName?: string; fileSize?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { fileName, fileSize } = body;
  if (!fileName?.trim() || !fileName.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "Only PDF files are allowed." }, { status: 400 });
  }
  if (typeof fileSize !== "number" || fileSize <= 0) {
    return NextResponse.json({ error: "File size is missing or invalid." }, { status: 400 });
  }
  if (fileSize > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "PDF must be under 20MB." }, { status: 400 });
  }

  try {
    await ensureDocumentsBucket();

    const path = `pdf-${Date.now()}-${slugifyFileName(fileName)}.pdf`;
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.storage.from(DOCUMENTS_BUCKET).createSignedUploadUrl(path);
    if (error) throw error;

    return NextResponse.json({
      bucket: DOCUMENTS_BUCKET,
      path,
      token: data.token,
      signedUrl: data.signedUrl,
      publicUrl: getDocumentPublicUrl(path),
    });
  } catch (err) {
    console.error("[PDF UPLOAD SIGN FAILED]", err);
    const error = err as { message?: string };
    return NextResponse.json({ error: error.message || "Could not prepare the upload." }, { status: 500 });
  }
}
