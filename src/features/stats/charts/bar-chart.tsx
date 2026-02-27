import {
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  type TooltipContentProps,
} from 'recharts'

interface BarDef {
  key: string
  color: string
  label: string
}

interface StatsBarChartProps {
  data: Record<string, unknown>[]
  xKey: string
  bars: BarDef[]
  yUnit?: string
  tickFormatter?: (value: string) => string
}

function CustomTooltip({ active, payload, label }: TooltipContentProps<number, string>) {
  if (!active || !payload?.length) return null
  return (
    <div
      className="rounded-lg border border-border px-3 py-2 text-xs"
      style={{ backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--foreground))' }}
    >
      <p className="font-medium mb-1">{label}</p>
      {payload.map((entry: { name: string; value: number; color: string }) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  )
}

export function StatsBarChart({ data, xKey, bars, yUnit, tickFormatter }: StatsBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsBarChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis
          dataKey={xKey}
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={tickFormatter}
        />
        <YAxis
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          unit={yUnit}
        />
        <Tooltip content={<CustomTooltip />} />
        {bars.map((bar) => (
          <Bar
            key={bar.key}
            dataKey={bar.key}
            name={bar.label}
            fill={bar.color}
            radius={[4, 4, 0, 0]}
          />
        ))}
      </RechartsBarChart>
    </ResponsiveContainer>
  )
}
