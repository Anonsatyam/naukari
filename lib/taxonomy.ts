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

const categoryLabelsHi: Record<string, string> = {
  All: "सभी",
  Police: "पुलिस",
  Teaching: "शिक्षण",
  Banking: "बैंकिंग",
  Engineering: "इंजीनियरिंग",
  Healthcare: "स्वास्थ्य सेवा",
  Administrative: "प्रशासनिक",
  Judiciary: "न्यायपालिका",
};

const departmentLabelsHi: Record<string, string> = {
  All: "सभी",
  "Bihar Police": "बिहार पुलिस",
  "Bihar Education Department": "बिहार शिक्षा विभाग",
  BPSC: "बीपीएससी",
  BSSC: "बीएसएससी",
  "Bihar Health Department": "बिहार स्वास्थ्य विभाग",
  "Bihar PWD": "बिहार लोक निर्माण विभाग",
  "Patna High Court": "पटना उच्च न्यायालय",
};

const qualificationLabelsHi: Record<string, string> = {
  All: "सभी",
  "10th Pass": "10वीं पास",
  "12th Pass": "12वीं पास",
  Diploma: "डिप्लोमा",
  Graduate: "स्नातक",
  "Post Graduate": "स्नातकोत्तर",
  "B.Tech / B.E.": "बी.टेक / बी.ई.",
  "B.Ed": "बी.एड",
};

const stateLabelsHi: Record<string, string> = {
  All: "सभी",
  "Andhra Pradesh": "आंध्र प्रदेश",
  "Arunachal Pradesh": "अरुणाचल प्रदेश",
  Assam: "असम",
  Bihar: "बिहार",
  Chhattisgarh: "छत्तीसगढ़",
  Goa: "गोवा",
  Gujarat: "गुजरात",
  Haryana: "हरियाणा",
  "Himachal Pradesh": "हिमाचल प्रदेश",
  Jharkhand: "झारखंड",
  Karnataka: "कर्नाटक",
  Kerala: "केरल",
  "Madhya Pradesh": "मध्य प्रदेश",
  Maharashtra: "महाराष्ट्र",
  Manipur: "मणिपुर",
  Meghalaya: "मेघालय",
  Mizoram: "मिज़ोरम",
  Nagaland: "नागालैंड",
  Odisha: "ओडिशा",
  Punjab: "पंजाब",
  Rajasthan: "राजस्थान",
  Sikkim: "सिक्किम",
  "Tamil Nadu": "तमिलनाडु",
  Telangana: "तेलंगाना",
  Tripura: "त्रिपुरा",
  "Uttar Pradesh": "उत्तर प्रदेश",
  Uttarakhand: "उत्तराखंड",
  "West Bengal": "पश्चिम बंगाल",
};

export const taxonomyLabelMaps = {
  category: categoryLabelsHi,
  department: departmentLabelsHi,
  qualification: qualificationLabelsHi,
  state: stateLabelsHi,
} as const;

export function taxonomyLabel(
  value: string,
  locale: string,
  dimension: keyof typeof taxonomyLabelMaps
): string {
  if (locale !== "hi") return value;
  return taxonomyLabelMaps[dimension][value] ?? value;
}
