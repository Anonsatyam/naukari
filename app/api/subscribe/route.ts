import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabaseClient";
import { insertWithMissingColumnRetry } from "@/lib/server/data";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MOBILE_PATTERN = /^[6-9]\d{9}$/;
const MIN_NAME_LENGTH = 3;

export async function POST(request: NextRequest) {
  let body: { name?: string; email?: string; mobile?: string; sameOnWhatsapp?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = body.name?.trim();
  const email = body.email?.trim().toLowerCase();
  const mobile = body.mobile?.trim() || null;

  if (!name || name.length < MIN_NAME_LENGTH) {
    return NextResponse.json({ error: "Name must be at least 3 characters." }, { status: 400 });
  }
  if (!email || !EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }
  if (mobile && !MOBILE_PATTERN.test(mobile)) {
    return NextResponse.json({ error: "Please enter a valid 10-digit mobile number." }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { error } = await insertWithMissingColumnRetry(
      (row) => supabase.from("subscribers").insert(row),
      {
        name,
        email,
        mobile,
        same_on_whatsapp: mobile ? Boolean(body.sameOnWhatsapp) : false,
      }
    );
    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ success: true, alreadySubscribed: true });
      }
      throw error;
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[SUBSCRIBE FAILED]", err);
    const error = err as { message?: string };
    return NextResponse.json({ error: error.message || "Could not subscribe. Please try again." }, { status: 500 });
  }
}
