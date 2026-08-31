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
