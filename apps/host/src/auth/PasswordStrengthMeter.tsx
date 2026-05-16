import { passwordStrength } from './passwordStrength'

/**
 * Compact strength meter rendered under the password field.
 *  - 4 segment bars that fill to the score in the bucket color.
 *  - Single inline row: label + collapsed checklist of rules. Failed
 *    rules show in muted text, passing rules in success green with a
 *    small dot prefix. Saves vertical space versus the original
 *    two-column grid so the signup form fits in one viewport.
 */
export default function PasswordStrengthMeter({ password }: { password: string }) {
  const { score, label, color, rules } = passwordStrength(password)

  return (
    <div className="mt-2" aria-live="polite">
      {/* Bars */}
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((tier) => (
          <span
            key={tier}
            className="flex-1 rounded-full transition-colors"
            style={{
              height: 4,
              background: tier <= score ? color : 'rgba(20,20,19,0.10)',
            }}
            aria-hidden
          />
        ))}
      </div>

      <div className="flex items-center flex-wrap gap-x-2 gap-y-1 mt-1.5">
        <span
          className="text-[11px] font-medium"
          style={{ color: password ? color : 'rgba(20,20,19,0.55)' }}
        >
          {password ? label : 'Add a password'}
        </span>
        <span className="text-[10px] text-muted">·</span>
        {rules.map((r) => (
          <span
            key={r.id}
            className={`inline-flex items-center gap-1 text-[10.5px] ${
              r.ok ? 'text-success' : 'text-muted'
            }`}
          >
            <span
              aria-hidden
              className={`w-1.5 h-1.5 rounded-full ${
                r.ok ? 'bg-success' : 'bg-muted-soft/60'
              }`}
            />
            {r.label}
          </span>
        ))}
      </div>
    </div>
  )
}
