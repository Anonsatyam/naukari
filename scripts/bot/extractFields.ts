import { Candidate } from "./extract";
import { ExtractedStructuredFields } from "./extractStructuredFields";

export type DraftType = "job" | "result" | "admit_card";

const ADMIT_CARD_KEYWORDS = ["admit card", "e-admit", "call letter", "hall ticket", "download admit"];
const RESULT_KEYWORDS = ["result", "cut off", "cutoff", "merit list", "shortlist"];

/**
 * Rule-based classification of what kind of notification this is —
 * a genuinely new job posting, a declared result, or a released admit
 * card. This matters because each becomes a different kind of draft
 * with a different approval flow and lands in a different public
 * section of the site.
 */
export function classifyDraftType(title: string): DraftType {
  const lower = title.toLowerCase();
  if (ADMIT_CARD_KEYWORDS.some((kw) => lower.includes(kw))) return "admit_card";
  if (RESULT_KEYWORDS.some((kw) => lower.includes(kw))) return "result";
  return "job";
}

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
  draftType: DraftType;
  extractedFields: {
    category?: string;
    qualification?: string;
  } & ExtractedStructuredFields;
}

export function extractFields(candidate: Candidate, orgHint: string): ExtractedDraft {
  const draftType = classifyDraftType(candidate.title);
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
    draftType,
    extractedFields: {
      ...(category ? { category } : {}),
      ...(qualification ? { qualification } : {}),
    },
  };
}
