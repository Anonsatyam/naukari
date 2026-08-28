export const categories = [
  "All",
  "Police",
  "Teaching",
  "Banking",
  "Engineering",
  "Healthcare",
  "Administrative",
  "Judiciary",
];

export const departments = [
  "All",
  "Bihar Police",
  "Bihar Education Department",
  "BPSC",
  "BSSC",
  "Bihar Health Department",
  "Bihar PWD",
  "Patna High Court",
];

export const qualifications = [
  "All",
  "10th Pass",
  "12th Pass",
  "Diploma",
  "Graduate",
  "Post Graduate",
  "B.Tech / B.E.",
  "B.Ed",
];

// Minimum-education ordering — used by the eligibility checker to
// compare a job's required qualification against whatever the user
// selected. B.Tech/B.E. and B.Ed sit at the same rank as Graduate
// (all three are "some kind of degree"), not because they're
// interchangeable, but because there's no single site-wide ordering
// between a general degree and a professional one worth asserting.
export const qualificationRank: Record<string, number> = {
  "10th Pass": 1,
  "12th Pass": 2,
  Diploma: 3,
  Graduate: 4,
  "B.Tech / B.E.": 4,
  "B.Ed": 4,
  "Post Graduate": 5,
};

// Ordered highest-to-lowest so free text that mentions more than one
// level (a notification's eligibility section routinely reads like
// "Graduate, OR 12th + Diploma") resolves to the binding minimum a
// candidate actually has to clear — the highest one mentioned — rather
// than whichever happens to appear first in the text.
const QUALIFICATION_PATTERNS: { label: string; keywords: string[] }[] = [
  {
    label: "Post Graduate",
    keywords: ["post graduate", "postgraduate", "पोस्ट ग्रेजुएट", "स्नातकोत्तर", "master's degree", "masters degree", "pg degree"],
  },
  { label: "B.Ed", keywords: ["b.ed", "bed degree", "बी.एड", "बीएड"] },
  {
    label: "B.Tech / B.E.",
    keywords: ["b.tech", "b.e.", "बी.टेक", "bachelor of engineering", "bachelor of technology"],
  },
  {
    label: "Graduate",
    keywords: ["graduate", "graduation", "स्नातक", "bachelor's degree", "bachelor degree", "any degree", "degree from a recognized"],
  },
  { label: "Diploma", keywords: ["diploma", "डिप्लोमा", "iti", "आईटीआई"] },
  { label: "12th Pass", keywords: ["12th", "intermediate", "10+2", "बारहवीं", "इंटरमीडिएट", "higher secondary"] },
  { label: "10th Pass", keywords: ["10th", "matric", "matriculation", "दसवीं", "मैट्रिक"] },
];

/**
 * Classifies a job's qualification requirement (title text, or —
 * ideally — its full Eligibility section) into one of the taxonomy
 * buckets above, purely by keyword match. Returns undefined when
 * nothing recognizable is present, which callers should treat as
 * "unknown", not as "no requirement" — silently defaulting an unknown
 * requirement to the lowest rank is what let the eligibility checker
 * mark every candidate as meeting a qualification the bot never
 * actually managed to identify in the first place.
 */
export function classifyQualification(text: string | undefined | null): string | undefined {
  if (!text) return undefined;
  const lower = text.toLowerCase();
  for (const { label, keywords } of QUALIFICATION_PATTERNS) {
    if (keywords.some((kw) => lower.includes(kw.toLowerCase()))) return label;
  }
  return undefined;
}
