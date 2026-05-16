import { cls } from '../shared/format'

interface Props {
  label: string
  value: string | number
  hint?: string
  trend?: { delta: number; suffix?: string } | null
  tone?: 'default' | 'dark' | 'coral'
}

export default function StatCard({ label, value, hint, trend, tone = 'default' }: Props) {
  const wrapper = cls(
    'rounded-xl p-5 border',
    tone === 'default' && 'bg-canvas border-hairline',
    tone === 'dark' && 'bg-surface-dark text-on-dark border-surface-dark',
    tone === 'coral' && 'bg-primary text-on-primary border-primary',
  )
  const labelColor =
    tone === 'dark' ? 'text-on-dark-soft' : tone === 'coral' ? 'text-on-primary/80' : 'text-muted'
  const valueColor = tone === 'default' ? 'text-ink' : 'text-current'
  const hintColor =
    tone === 'dark' ? 'text-on-dark-soft' : tone === 'coral' ? 'text-on-primary/85' : 'text-muted'

  return (
    <div className={wrapper}>
      <p className={cls('text-[11px] uppercase tracking-[0.16em] font-medium', labelColor)}>
        {label}
      </p>
      <p className={cls('font-display text-4xl mt-2', valueColor)}>{value}</p>
      <div className="flex items-end justify-between mt-1.5">
        {hint && <p className={cls('text-xs', hintColor)}>{hint}</p>}
        {trend && (
          <span
            className={cls(
              'text-xs font-medium ml-auto inline-flex items-center gap-0.5',
              trend.delta >= 0
                ? tone === 'default'
                  ? 'text-success'
                  : 'text-current'
                : tone === 'default'
                  ? 'text-error'
                  : 'text-current',
            )}
          >
            {trend.delta >= 0 ? '▲' : '▼'} {Math.abs(trend.delta)}
            {trend.suffix}
          </span>
        )}
      </div>
    </div>
  )
}
