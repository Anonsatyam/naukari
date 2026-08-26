import { Job, ResultItem, AdmitCardItem, BotDraft, BotLogEntry } from "@/lib/types";
import {
  jobs as seedJobs,
  results as seedResults,
  admitCards as seedAdmitCards,
  botDrafts as seedDrafts,
} from "@/lib/mock-data";

/**
 * ⚠️ PHASE 3 ONLY — this is an in-memory store, not a real database.
 *
 * Phase 4 replaces the internals of this file with real Supabase queries.
 * Every function in lib/server/data.ts is written against a stable
 * interface so that swap doesn't touch any API route or page.
 *
 * IMPORTANT CAVEAT: on Vercel's serverless deployment, API routes can run
 * in different function instances between requests, so writes made here
 * (approve a draft, publish a job, etc.) are NOT guaranteed to persist
 * once this is deployed. This works reliably in local development
 * (`npm run dev` / `npm run start`), where one Node process stays alive
 * for the whole session — that's enough to fully test the Phase 3 flow
 * end-to-end locally. Real persistence arrives in Phase 4.
 */

interface Store {
  jobs: Job[];
  results: ResultItem[];
  admitCards: AdmitCardItem[];
  drafts: BotDraft[];
  botLog: BotLogEntry[];
}

// Stored on globalThis so the data survives Next.js dev-server hot reloads
// (each file edit re-evaluates modules, which would otherwise reset state
// on every save while developing).
const globalForStore = globalThis as unknown as { __biharJobsStore?: Store };

function seedStore(): Store {
  return {
    jobs: structuredClone(seedJobs),
    results: structuredClone(seedResults),
    admitCards: structuredClone(seedAdmitCards),
    drafts: structuredClone(seedDrafts),
    // Starts empty on purpose — this fills in with real entries once the
    // bot actually runs, rather than showing fabricated placeholder activity.
    botLog: [],
  };
}

export function getStore(): Store {
  if (!globalForStore.__biharJobsStore) {
    globalForStore.__biharJobsStore = seedStore();
  }
  return globalForStore.__biharJobsStore;
}
