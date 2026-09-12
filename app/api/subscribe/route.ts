import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabaseClient";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: NextRequest) {
  let body: { name?: string; email?: string; mobile?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = body.name?.trim();
  const email = body.email?.trim().toLowerCase();
  const mobile = body.mobile?.trim() || null;

  if (!name) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }
  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("subscribers").insert({ name, email, mobile });
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
