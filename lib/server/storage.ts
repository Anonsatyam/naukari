import { getSupabaseAdmin } from "./supabaseClient";

export const DOCUMENTS_BUCKET = "documents";

export async function ensureDocumentsBucket(): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) throw listError;

  const exists = (buckets ?? []).some((b) => b.name === DOCUMENTS_BUCKET);
  if (exists) return;

  const { error: createError } = await supabase.storage.createBucket(DOCUMENTS_BUCKET, {
    public: true,
    fileSizeLimit: "20MB",
    allowedMimeTypes: ["application/pdf"],
  });
  if (createError && !/already exists/i.test(createError.message)) throw createError;
}

export function getDocumentPublicUrl(path: string): string {
  const supabase = getSupabaseAdmin();
  return supabase.storage.from(DOCUMENTS_BUCKET).getPublicUrl(path).data.publicUrl;
}
