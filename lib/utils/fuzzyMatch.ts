/**
 * Tiny dependency-free fuzzy-matching helpers.
 *
 * Used by the Live Assist LocalPosterMatcher to tolerate STT typos (e.g.
 * "éclipsia" vs "eclypsia") when matching spoken words against poster titles.
 */

/**
 * Levenshtein edit distance (iterative, two-row — O(min(n,m)) memory).
 */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  let curr = new Array<number>(b.length + 1);

  for (let i = 0; i < a.length; i++) {
    curr[0] = i + 1;
    for (let j = 0; j < b.length; j++) {
      const cost = a[i] === b[j] ? 0 : 1;
      curr[j + 1] = Math.min(curr[j] + 1, prev[j + 1] + 1, prev[j] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}

/**
 * Normalized similarity in [0, 1]: `1 - distance / max(len)`. 1 = identical,
 * 0 = completely different. Two empty strings are considered identical (1).
 */
export function similarity(a: string, b: string): number {
  const max = Math.max(a.length, b.length);
  if (max === 0) return 1;
  return 1 - levenshtein(a, b) / max;
}
