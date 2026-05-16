import { memo } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { DailyPoint } from '../lib/analytics'

interface Props {
  data: DailyPoint[]
}

function CompletionChartInner({ data }: Props) {
  return (
    <div className="w-full h-[260px]">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="completedFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#cc785c" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#cc785c" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="createdFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#5db8a6" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#5db8a6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" axisLine={false} tickLine={false} interval="preserveStartEnd" />
          <YAxis allowDecimals={false} axisLine={false} tickLine={false} width={28} />
          <Tooltip content={<CustomTip />} cursor={{ stroke: '#cc785c', strokeOpacity: 0.25 }} />
          <Area
            type="monotone"
            dataKey="created"
            stroke="#5db8a6"
            strokeWidth={1.5}
            fill="url(#createdFill)"
          />
          <Area
            type="monotone"
            dataKey="completed"
            stroke="#cc785c"
            strokeWidth={2}
            fill="url(#completedFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function CustomTip({ active, payload, label }: { active?: boolean; payload?: { value: number; dataKey: string }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface-dark text-on-dark text-xs rounded-md px-3 py-2 shadow-lg">
      <p className="text-on-dark-soft mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="capitalize">
          <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ background: p.dataKey === 'completed' ? '#cc785c' : '#5db8a6' }} />
          {p.dataKey}: <span className="font-medium">{p.value}</span>
        </p>
      ))}
    </div>
  )
}

export default memo(CompletionChartInner)
