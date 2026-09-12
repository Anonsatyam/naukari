const DEDUP_STOPWORDS = new Set([
  "the", "for", "and", "of", "in", "to", "a", "an",
  "recruitment", "notification", "advertisement", "advt", "vacancy", "vacancies",
  "online", "form", "apply", "application", "post", "posts", "bharti", "job", "jobs",
  "exam", "examination", "name", "no", "last", "date", "various", "total",
  "2024", "2025", "2026", "2027", "2028", "2029", "2030",
]);

export function normalizeTitleTokens(text: string): Set<string> {
  const cleaned = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  const tokens = cleaned
    .split(" ")
    .filter((token) => token.length >= 3 && !DEDUP_STOPWORDS.has(token));

  return new Set(tokens);
}

export function titleSimilarity(a: string, b: string): number {
  const setA = normalizeTitleTokens(a);
  const setB = normalizeTitleTokens(b);
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}
