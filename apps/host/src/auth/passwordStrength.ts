/**
 * Lightweight password strength scoring. No external library (zxcvbn is
 * ~700KB gzipped, overkill for a portfolio project). The algorithm:
 *
 *   - Base score grows with length: 8/12/16 chars each add a point.
 *   - Character-class variety: 3 classes = +1, all 4 = +2.
 *   - Penalties: top-N common passwords drop the score to 1;
 *     same-char repeats and obvious sequential runs drop one point.
 *
 * The final score is clamped to 0..4 mapping to: Very weak, Weak, Fair,
 * Good, Strong. The form's Zod schema requires score >= 2 (Fair+) so
 * "password", "12345678", "qwerty", etc. don't slip through even if
 * they meet a naive 6-char minimum.
 */

export type StrengthScore = 0 | 1 | 2 | 3 | 4

export interface StrengthResult {
  score: StrengthScore
  label: string
  hint: string
  color: string
  /** Per-rule feedback so the UI can render a checklist. */
  rules: { id: string; label: string; ok: boolean }[]
}

// A tiny inline list of the top common passwords. Real apps should pair
// this with a service like haveibeenpwned, but for this build it catches
// the obvious ones.
const COMMON = new Set([
  'password',
  'password1',
  'password123',
  '123456',
  '12345678',
  '123456789',
  '1234567890',
  'qwerty',
  'qwerty123',
  'abc123',
  'iloveyou',
  'admin',
  'admin123',
  'letmein',
  'welcome',
  'welcome1',
  'monkey',
  'dragon',
  'sunshine',
  'princess',
  'football',
  'baseball',
  'master',
  '696969',
  '111111',
  '000000',
  'qazwsx',
  'zaq12wsx',
  '!@#$%^&*',
])

const SEQUENTIAL = [
  '0123456789',
  'abcdefghijklmnopqrstuvwxyz',
  'qwertyuiopasdfghjklzxcvbnm',
]

function hasSequentialRun(input: string, minLen = 4): boolean {
  const lower = input.toLowerCase()
  for (const seq of SEQUENTIAL) {
    for (let i = 0; i <= seq.length - minLen; i++) {
      const slice = seq.slice(i, i + minLen)
      if (lower.includes(slice)) return true
      if (lower.includes(slice.split('').reverse().join(''))) return true
    }
  }
  return false
}

const LABELS: Record<StrengthScore, string> = {
  0: 'Very weak',
  1: 'Weak',
  2: 'Fair',
  3: 'Good',
  4: 'Strong',
}

const COLORS: Record<StrengthScore, string> = {
  0: '#c64545', // error red
  1: '#cc785c', // coral
  2: '#d4a017', // amber
  3: '#5db872', // green
  4: '#3d8a7f', // teal
}

export function passwordStrength(p: string): StrengthResult {
  const rules = [
    { id: 'len', label: 'At least 8 characters', ok: p.length >= 8 },
    { id: 'case', label: 'Upper & lower case', ok: /[a-z]/.test(p) && /[A-Z]/.test(p) },
    { id: 'num', label: 'A number', ok: /\d/.test(p) },
    { id: 'sym', label: 'A symbol', ok: /[^a-zA-Z0-9]/.test(p) },
  ]

  if (!p) {
    return {
      score: 0,
      label: 'Empty',
      hint: 'Start typing to see your password strength.',
      color: COLORS[0],
      rules,
    }
  }

  let score = 0
  const len = p.length
  if (len >= 8) score += 1
  if (len >= 12) score += 1
  if (len >= 16) score += 1

  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^a-zA-Z0-9]/].filter((r) => r.test(p)).length
  if (classes >= 3) score += 1
  if (classes === 4) score += 1

  // Penalties
  if (COMMON.has(p.toLowerCase())) score = Math.min(score, 1)
  if (/(.)\1{2,}/.test(p)) score = Math.max(0, score - 1) // aaa, 111
  if (hasSequentialRun(p)) score = Math.max(0, score - 1)

  const clamped = Math.max(0, Math.min(4, score)) as StrengthScore
  const hint =
    clamped >= 3
      ? 'Looking solid.'
      : clamped === 2
        ? 'Add length, mixed case, numbers, or symbols.'
        : clamped === 1
          ? 'Too short or too common — keep going.'
          : 'Use 8+ characters with letters, numbers, and a symbol.'

  return {
    score: clamped,
    label: LABELS[clamped],
    hint,
    color: COLORS[clamped],
    rules,
  }
}
