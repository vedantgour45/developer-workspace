import { memo } from 'react'
import type { HeatmapData } from '../lib/analytics'

interface Props {
  data: HeatmapData
}

function colorFor(value: number, max: number): string {
  if (value < 0) return 'transparent'
  if (value === 0) return '#252320'
  if (max <= 0) return '#252320'
  const t = value / max
  if (t < 0.25) return '#3d2f28'
  if (t < 0.5) return '#7a4530'
  if (t < 0.75) return '#cc785c'
  return '#e89070'
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function fullDate(iso: string): string {
  const d = new Date(iso)
  return `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

const CELL = 13
const GAP = 4
const COL = CELL + GAP

function HeatmapInner({ data }: Props) {
  const weeks = data.weeks.length
  const gridWidth = weeks * COL - GAP

  return (
    <div className="overflow-x-auto -mx-1 px-1 pb-1">
      <div className="inline-block" style={{ minWidth: gridWidth }}>
        {/* Grid */}
        <div className="flex" style={{ gap: GAP }}>
          {data.weeks.map((week, ci) => (
            <div key={ci} className="flex flex-col" style={{ gap: GAP }}>
              {week.cells.map((cell, ri) => {
                if (cell.count < 0 || !cell.date) {
                  return (
                    <span
                      key={ri}
                      style={{ width: CELL, height: CELL }}
                      aria-hidden
                    />
                  )
                }
                const isToday = cell.date === data.rangeEnd
                return (
                  <span
                    key={cell.date}
                    role="img"
                    aria-label={`${fullDate(cell.date)}: ${cell.count} ${cell.count === 1 ? 'task' : 'tasks'} completed`}
                    title={`${fullDate(cell.date)} · ${cell.count} ${cell.count === 1 ? 'task completed' : 'tasks completed'}`}
                    className="rounded-[3px] transition-shadow cursor-default hover:ring-2 hover:ring-primary/60"
                    style={{
                      width: CELL,
                      height: CELL,
                      background: colorFor(cell.count, data.max),
                      boxShadow: isToday ? 'inset 0 0 0 1px rgba(250,249,245,0.55)' : undefined,
                    }}
                  />
                )
              })}
            </div>
          ))}
        </div>

        {/* Month-label band — absolute-positioned below the grid, one label per column where the 1st of a month falls */}
        <div className="relative" style={{ height: 20, marginTop: 8, width: gridWidth }}>
          {data.monthLabels.map((m) => (
            <span
              key={`${m.col}-${m.label}`}
              className="absolute text-[11px] text-on-dark-soft font-medium"
              style={{ left: m.col * COL, top: 0 }}
            >
              {m.label}
            </span>
          ))}
        </div>

        {/* Color legend */}
        <div className="flex items-center gap-1.5 mt-5 text-[11px] text-on-dark-soft">
          <span>Less</span>
          {[0, (data.max || 1) * 0.25, (data.max || 1) * 0.5, (data.max || 1) * 0.75, data.max || 1].map((v, i) => (
            <span
              key={i}
              className="rounded-[3px]"
              style={{
                width: CELL,
                height: CELL,
                background: colorFor(v, data.max || 1),
              }}
            />
          ))}
          <span>More</span>
        </div>
      </div>
    </div>
  )
}

export default memo(HeatmapInner)
