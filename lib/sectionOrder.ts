// Turns a record's stored sectionOrder (see lib/types.ts's Job.sectionOrder
// comment) into a final, complete render order for one detail page —
// used identically by the Job/Result/Admit Card pages.
//
// Three guarantees this makes, in order of priority:
// 1. Every key actually named in sectionOrder renders in that exact
//    position (the whole point: matching the source's own order).
// 2. Every OTHER section the page knows how to render (its own fixed
//    default order) still renders — appended after, not dropped —
//    covering anything sectionOrder doesn't mention: a record
//    published before this feature existed (no sectionOrder at all),
//    an admin-added field with no heading of its own (Job's
//    syllabusSummary), or a stale/out-of-range generic-section index
//    (the source page changed shape since this was last extracted).
// 3. A "generic:<index>" key only renders if that index still exists
//    in the record's current additionalSections — never a crash, and
//    never a gap, on a mismatch between old and new data.
export function resolveSectionOrder(
  sectionOrder: string[] | undefined,
  defaultOrder: string[],
  additionalSectionsCount: number
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  const genericKeyPattern = /^generic:(\d+)$/;

  for (const key of sectionOrder ?? []) {
    if (seen.has(key)) continue;
    const genericMatch = key.match(genericKeyPattern);
    if (genericMatch) {
      const idx = Number(genericMatch[1]);
      if (idx < 0 || idx >= additionalSectionsCount) continue;
    } else if (!defaultOrder.includes(key)) {
      // Not one of this page's known sections (e.g. importantLinksRaw/
      // faqRaw/conclusionRaw, which are rendered elsewhere — the
      // sidebar, or always pinned to the very end — not as part of
      // this ordered main-content list).
      continue;
    }
    seen.add(key);
    result.push(key);
  }

  for (const key of defaultOrder) {
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(key);
  }

  for (let i = 0; i < additionalSectionsCount; i++) {
    const key = `generic:${i}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(key);
  }

  return result;
}

export function parseGenericKey(key: string): number | null {
  const match = key.match(/^generic:(\d+)$/);
  return match ? Number(match[1]) : null;
}
