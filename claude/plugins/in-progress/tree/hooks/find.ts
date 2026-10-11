/** Fuzzy path matching for the filter: every query character must appear in order; boundaries and runs score high. */

export type Match = { path: string; score: number; indices: number[] }

/** How many places the first character may start a match from; the best-scoring start wins. */
const MAX_STARTS = 8

const isBoundary = (p: string, i: number): boolean => i === 0 || '/._-'.includes(p[i - 1] ?? '')

/** Greedy match of `q` in `p` from `start`: a hit right after the previous one, else at a word boundary, else the nearest. */
const matchFrom = (q: string, p: string, start: number): { score: number; indices: number[] } | null => {
  const indices = [start]
  let score = isBoundary(p, start) ? 2 : 1
  let prev = start
  for (const ch of q.slice(1)) {
    let at = -1
    for (let i = p.indexOf(ch, prev + 1); i !== -1; i = p.indexOf(ch, i + 1)) {
      if (at === -1) at = i
      if (i === prev + 1 || isBoundary(p, i)) {
        at = i
        break
      }
    }
    if (at === -1) return null
    if (at === prev + 1) score += 3
    else if (isBoundary(p, at)) score += 2
    else score += 1
    if (at > prev + 1) score -= Math.min(2, (at - prev - 1) * 0.1)
    indices.push(at)
    prev = at
  }
  const slash = p.lastIndexOf('/')
  if (indices.some(i => i > slash)) score += 1 // part of the match lands in the file name
  score -= p.length * 0.01
  return { score, indices }
}

/**
 * Matches `query` against `path` as a subsequence, trying each place the first
 * character occurs and keeping the best-scoring match, so `prd` finds
 * `docs/PRD.md` by its name rather than by a stray `p` earlier in the path.
 * Returns the hit positions and a score, or null when a character is missing.
 */
export function fuzzyMatch(query: string, path: string): Match | null {
  const q = query.toLowerCase().replace(/\s+/g, '')
  const p = path.toLowerCase()
  if (q.length === 0) return { path, score: 0, indices: [] }
  const first = q[0] as string
  let best: { score: number; indices: number[] } | null = null
  let starts = 0
  for (let s = p.indexOf(first); s !== -1 && starts < MAX_STARTS; s = p.indexOf(first, s + 1), starts++) {
    const m = matchFrom(q, p, s)
    if (m && (best === null || m.score > best.score)) best = m
  }
  return best ? { path, ...best } : null
}

/** The best `limit` matches of `query` among `paths`, best first; every path when the query is empty. */
export function fuzzyFilter(query: string, paths: readonly string[], limit: number): Match[] {
  const out: Match[] = []
  for (const path of paths) {
    const m = fuzzyMatch(query, path)
    if (m) out.push(m)
  }
  out.sort((a, b) => b.score - a.score || (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
  return out.slice(0, limit)
}
