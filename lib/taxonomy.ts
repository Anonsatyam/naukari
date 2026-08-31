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

export const states = [
  "All",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
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

export const qualificationRank: Record<string, number> = {
  "10th Pass": 1,
  "12th Pass": 2,
  Diploma: 3,
  Graduate: 4,
  "B.Tech / B.E.": 4,
  "B.Ed": 4,
  "Post Graduate": 5,
};

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

export function classifyQualification(text: string | undefined | null): string | undefined {
  if (!text) return undefined;
  const lower = text.toLowerCase();
  for (const { label, keywords } of QUALIFICATION_PATTERNS) {
    if (keywords.some((kw) => lower.includes(kw.toLowerCase()))) return label;
  }
  return undefined;
}
