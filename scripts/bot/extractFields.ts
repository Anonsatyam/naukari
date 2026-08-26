import { Candidate } from "./extract";

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Police: ["police", "constable", "sub inspector", " si "],
  Teaching: ["teacher", "stet", "tet", "shikshak"],
  Banking: ["bank", "gramin bank", "ibps"],
  Engineering: ["engineer", "junior engineer", " je "],
  Healthcare: ["nurse", "anm", "gnm", "health", "medical"],
  Administrative: ["bpsc", "bssc", "combined competitive", "officer"],
  Judiciary: ["court", "steno", "judicial"],
};

const QUALIFICATION_KEYWORDS: Record<string, string[]> = {
  "10th Pass": ["10th", "matric"],
  "12th Pass": ["12th", "intermediate", "+2"],
  Graduate: ["graduate", "degree", "bachelor"],
  "Post Graduate": ["post graduate", "master"],
  Diploma: ["diploma", "iti"],
};

function guessFromKeywords(title: string, table: Record<string, string[]>): string | undefined {
  const lower = ` ${title.toLowerCase()} `;
  for (const [value, keywords] of Object.entries(table)) {
    if (keywords.some((kw) => lower.includes(kw))) return value;
  }
  return undefined;
}

export interface ExtractedDraft {
  jobTitle: string;
  organization: string;
  sourceUrl: string;
  confidence: "high" | "medium" | "low";
  extractedFields: {
    category?: string;
    qualification?: string;
  };
}

export function extractFields(candidate: Candidate, orgHint: string): ExtractedDraft {
  const category = guessFromKeywords(candidate.title, CATEGORY_KEYWORDS);
  const qualification = guessFromKeywords(candidate.title, QUALIFICATION_KEYWORDS);
  const fieldsFound = [category, qualification].filter(Boolean).length;

  // Never claim "high" confidence from link-text scanning alone — that's
  // reserved for extraction that reads structured fields (dates,
  // vacancies, fees) out of the actual notification document, which this
  // pass deliberately doesn't attempt.
  const confidence: ExtractedDraft["confidence"] = fieldsFound >= 2 ? "medium" : "low";

  return {
    jobTitle: candidate.title,
    organization: orgHint,
    sourceUrl: candidate.url,
    confidence,
    extractedFields: {
      ...(category ? { category } : {}),
      ...(qualification ? { qualification } : {}),
    },
  };
}
