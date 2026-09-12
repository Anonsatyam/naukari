import { Resend } from "resend";
import { getSupabaseAdmin } from "./supabaseClient";
import { ApprovedEntity } from "./data";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://naukari-lac.vercel.app";
const FROM_ADDRESS = process.env.RESEND_FROM_EMAIL || "Sarkari Naukri <onboarding@resend.dev>";
const BATCH_SIZE = 100;

const TYPE_LABEL: Record<ApprovedEntity["type"], string> = {
  job: "New Job",
  result: "New Result",
  admit_card: "New Admit Card",
};

const TYPE_PATH: Record<ApprovedEntity["type"], string> = {
  job: "jobs",
  result: "results",
  admit_card: "admit-cards",
};

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export async function notifySubscribersOfNewListing(approved: ApprovedEntity): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[SUBSCRIBER NOTIFY] RESEND_API_KEY is not set — skipping email notification.");
    return;
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data: subscribers, error } = await supabase.from("subscribers").select("email, name");
    if (error) throw error;
    if (!subscribers || subscribers.length === 0) return;

    const { title, organization } = approved.entity;
    const url = `${SITE_URL}/${TYPE_PATH[approved.type]}/${approved.entity.slug}`;
    const label = TYPE_LABEL[approved.type];
    const subject = `${label}: ${title}`;

    const resend = new Resend(apiKey);

    for (const batch of chunk(subscribers, BATCH_SIZE)) {
      await resend.batch.send(
        batch.map((sub) => ({
          from: FROM_ADDRESS,
          to: sub.email,
          subject,
          html: `
            <p>Hi ${sub.name || "there"},</p>
            <p>A new listing was just published on Sarkari Naukri:</p>
            <p style="font-size:16px;font-weight:600;margin:12px 0 4px">${title}</p>
            <p style="color:#5e6475;margin:0 0 16px">${organization}</p>
            <p><a href="${url}" style="background:#3c44c2;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">View ${label}</a></p>
            <p style="color:#9298a8;font-size:12px;margin-top:24px">You're receiving this because you subscribed for new-listing alerts on Sarkari Naukri.</p>
          `,
        }))
      );
    }
  } catch (err) {
    console.error("[SUBSCRIBER NOTIFY FAILED]", err);
  }
}
