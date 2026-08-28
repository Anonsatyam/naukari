import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal } from "./loadEnv";

loadEnvLocal();
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!);

async function main() {
  const { data, error } = await supabase
    .from("jobs")
    .select("title, post_details_text, vacancy_breakdown, total_vacancies")
    .ilike("title", "%SBI%Form Online%")
    .limit(1);
  if (error) throw error;
  console.log(JSON.stringify(data, null, 2));
}
main();
