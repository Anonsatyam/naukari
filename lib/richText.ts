export interface RichTextSegment {
  text: string;
  url?: string;
}

const INLINE_LINK_PATTERN = /\[([^\]]+)\]\(([^)]+)\)/g;

export function parseInlineLinks(text: string): RichTextSegment[] {
  const segments: RichTextSegment[] = [];
  let lastIndex = 0;
  const pattern = new RegExp(INLINE_LINK_PATTERN.source, "g");
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) segments.push({ text: text.slice(lastIndex, match.index) });
    segments.push({ text: match[1], url: match[2] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) segments.push({ text: text.slice(lastIndex) });
  return segments;
}

export function insertInlineLink(
  text: string,
  selectionStart: number,
  selectionEnd: number,
  url: string
): { text: string; cursor: number } {
  const before = text.slice(0, selectionStart);
  const selected = text.slice(selectionStart, selectionEnd) || "link text";
  const after = text.slice(selectionEnd);
  const inserted = `[${selected}](${url})`;
  return { text: before + inserted + after, cursor: before.length + inserted.length };
}
