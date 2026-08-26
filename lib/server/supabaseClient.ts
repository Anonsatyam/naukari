import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Two separate clients, per the RLS design in the schema migration:
 *
 * - `supabasePublic` uses the publishable key (Supabase's current name
 *   for what used to be called the "anon" key) and respects Row Level
 *   Security. Used for public-facing reads (jobs, results, admit
 *   cards). Even if a future bug in our own query code forgot to
 *   filter by status, this client physically cannot see unpublished
 *   data — RLS enforces it at the database level.
 *
 * - `supabaseAdmin` uses the secret key (the current name for what used
 *   to be "service_role") and bypasses RLS entirely. Used only by admin
 *   API routes (already gated by the signed-cookie session in
 *   proxy.ts) and the bot ingestion routes (gated by BOT_API_SECRET).
 *   Never expose this client or its key to the browser.
 */

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set. Add it to your environment before using the database.`);
  }
  return value;
}

let publicClient: SupabaseClient | null = null;
let adminClient: SupabaseClient | null = null;

export function getSupabasePublic(): SupabaseClient {
  if (!publicClient) {
    publicClient = createClient(getEnv("SUPABASE_URL"), getEnv("SUPABASE_PUBLISHABLE_KEY"), {
      auth: { persistSession: false },
    });
  }
  return publicClient;
}

export function getSupabaseAdmin(): SupabaseClient {
  if (!adminClient) {
    adminClient = createClient(getEnv("SUPABASE_URL"), getEnv("SUPABASE_SECRET_KEY"), {
      auth: { persistSession: false },
    });
  }
  return adminClient;
}
