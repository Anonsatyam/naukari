const NAMED_ENTITIES: Record<string, string> = {
  amp: "&", nbsp: " ", quot: '"', apos: "'", lt: "<", gt: ">",
  ldquo: "\u201C", rdquo: "\u201D", lsquo: "\u2018", rsquo: "\u2019",
  hellip: "\u2026", mdash: "\u2014", ndash: "\u2013",
};

export function stripDecorativeEmoji(text: string): string {
  return text.replace(/\u{1F525}️?/gu, "").replace(/[ \t]{2,}/g, " ").trim();
}

export function decodeHtmlEntities(text: string): string {
  return stripDecorativeEmoji(
    text
      .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
      .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
      .replace(/&([a-z]+);/gi, (m, name) => NAMED_ENTITIES[name.toLowerCase()] ?? m)
  );
}

export function deepDecodeEntities<T>(value: T): T {
  if (typeof value === "string") return decodeHtmlEntities(value) as unknown as T;
  if (Array.isArray(value)) return value.map((v) => deepDecodeEntities(v)) as unknown as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = deepDecodeEntities(v);
    }
    return out as T;
  }
  return value;
}