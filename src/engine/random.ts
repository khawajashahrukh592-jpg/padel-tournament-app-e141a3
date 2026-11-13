/** Small deterministic hash used for reproducible tie-breaking. */
export function hash(...parts: Array<string | number>): number {
  let h = 2166136261
  const s = parts.join('|')
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  // final avalanche
  h ^= h >>> 13
  h = Math.imul(h, 0x5bd1e995)
  h ^= h >>> 15
  return h >>> 0
}

/** Deterministic value in [0, 1). */
export function unit(...parts: Array<string | number>): number {
  return hash(...parts) / 4294967296
}
