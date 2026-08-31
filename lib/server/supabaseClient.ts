import { createClient, SupabaseClient } from "@supabase/supabase-js";


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
