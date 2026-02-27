import {
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  type TooltipContentProps,
} from 'recharts'

interface LineDef {
  key: string
  color: string
  label: string
}

interface StatsLineChartProps {
  data: Record<string, unknown>[]
  xKey: string
  lines: LineDef[]
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

export function StatsLineChart({ data, xKey, lines, yUnit, tickFormatter }: StatsLineChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsLineChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
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
        {lines.length > 1 && (
          <Legend
            wrapperStyle={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}
          />
        )}
        {lines.map((line) => (
          <Line
            key={line.key}
            type="monotone"
            dataKey={line.key}
            name={line.label}
            stroke={line.color}
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        ))}
      </RechartsLineChart>
    </ResponsiveContainer>
  )
}
