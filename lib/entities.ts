// Shared HTML-entity decoding for text that traces back to a bot
// draft's extractedFields — scraped/CMS-authored markup routinely
// contains entity-coded punctuation (curly quotes in particular, e.g.
// a how-to-apply step quoting a UI label as
// "&#8220;Apply Online&#8221;") that never got decoded on the way in.
//
// This is a deliberate duplicate of the decoding added to the bot's
// own extractHtmlNotificationFields.ts, not a shared import — that
// script runs standalone via `tsx` outside this Next.js app, so it
// can't import from here. That fix stops NEW drafts from ever
// containing raw entity codes; this one cleans anything already
// sitting in bot_drafts from before that fix shipped, so approving an
// old draft doesn't carry the gibberish into the live site, and so the
// admin review screen doesn't show it while the draft is still pending.
const NAMED_ENTITIES: Record<string, string> = {
  amp: "&", nbsp: " ", quot: '"', apos: "'", lt: "<", gt: ">",
  ldquo: "\u201C", rdquo: "\u201D", lsquo: "\u2018", rsquo: "\u2019",
  hellip: "\u2026", mdash: "\u2014", ndash: "\u2013",
};

export function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&([a-z]+);/gi, (m, name) => NAMED_ENTITIES[name.toLowerCase()] ?? m);
}

/**
 * Recursively decodes HTML entities in every string found anywhere
 * inside a value — arrays and plain objects are walked, everything
 * else is returned as-is. Used to clean an entire extractedFields
 * object (or importantLinks[], howToApply[], etc.) in one call.
 */
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