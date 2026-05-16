import { memo } from 'react'
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { PRIORITY_LABEL, STATUS_LABEL } from '../shared/types'

const STATUS_COLORS: Record<string, string> = {
  backlog: '#8e8b82',
  in_progress: '#5db8a6',
  in_review: '#e8a55a',
  done: '#5db872',
}

const PRIORITY_COLORS: Record<string, string> = {
  urgent: '#cc785c',
  high: '#e8a55a',
  medium: '#5db8a6',
  low: '#a09d96',
}

interface StatusProps {
  data: { status: string; value: number }[]
}
interface PriorityProps {
  data: { priority: string; value: number }[]
}

function StatusBreakdown({ data }: StatusProps) {
  return (
    <div className="w-full h-[200px]">
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="status"
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={80}
            paddingAngle={2}
            stroke="#faf9f5"
            strokeWidth={2}
          >
            {data.map((d) => (
              <Cell key={d.status} fill={STATUS_COLORS[d.status]} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const p = payload[0].payload as { status: string; value: number }
              return (
                <div className="bg-surface-dark text-on-dark text-xs rounded-md px-3 py-2 shadow-lg">
                  {STATUS_LABEL[p.status as keyof typeof STATUS_LABEL]}: <b>{p.value}</b>
                </div>
              )
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

function PriorityBreakdown({ data }: PriorityProps) {
  return (
    <div className="w-full h-[200px]">
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
          <Bar dataKey="value" radius={[4, 4, 4, 4]}>
            {data.map((d) => (
              <Cell key={d.priority} fill={PRIORITY_COLORS[d.priority]} />
            ))}
          </Bar>
          <Tooltip
            cursor={{ fill: 'rgba(20,20,19,0.04)' }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const p = payload[0].payload as { priority: string; value: number }
              return (
                <div className="bg-surface-dark text-on-dark text-xs rounded-md px-3 py-2 shadow-lg">
                  {PRIORITY_LABEL[p.priority as keyof typeof PRIORITY_LABEL]}: <b>{p.value}</b>
                </div>
              )
            }}
          />
        </BarChart>
      </ResponsiveContainer>
      <div className="-mt-4 grid grid-cols-4 text-[11px] text-muted px-1">
        {data.map((d) => (
          <div key={d.priority} className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: PRIORITY_COLORS[d.priority] }} />
            <span className="capitalize">{d.priority}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export const MemoStatusBreakdown = memo(StatusBreakdown)
export const MemoPriorityBreakdown = memo(PriorityBreakdown)
