import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabaseClient";
import { DOCUMENTS_BUCKET } from "@/lib/server/storage";
import { watermarkPdf } from "@/lib/server/pdfWatermark";

export async function POST(request: NextRequest) {
  let body: { path?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const path = body.path;
  if (!path?.trim()) {
    return NextResponse.json({ error: "Missing file path." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  try {
    const { data, error: downloadError } = await supabase.storage.from(DOCUMENTS_BUCKET).download(path);
    if (downloadError) throw downloadError;

    const bytes = await data.arrayBuffer();

    let watermarked: Uint8Array;
    try {
      watermarked = await watermarkPdf(bytes);
    } catch (err) {
      console.error("[PDF WATERMARK FAILED]", err);
      return NextResponse.json(
        { error: "Uploaded, but this PDF couldn't be watermarked — it may be corrupted or password-protected." },
        { status: 422 }
      );
    }

    const { error: uploadError } = await supabase.storage.from(DOCUMENTS_BUCKET).upload(path, watermarked, {
      contentType: "application/pdf",
      upsert: true,
    });
    if (uploadError) throw uploadError;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[PDF WATERMARK ROUTE FAILED]", err);
    const error = err as { message?: string };
    return NextResponse.json({ error: error.message || "Could not process this PDF." }, { status: 500 });
  }
}
