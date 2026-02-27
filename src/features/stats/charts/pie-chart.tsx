import {
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  type TooltipContentProps,
} from 'recharts'

interface PieDataItem {
  name: string
  value: number
  color: string
}

interface StatsPieChartProps {
  data: PieDataItem[]
}

function CustomTooltip({ active, payload }: TooltipContentProps<number, string>) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  return (
    <div
      className="rounded-lg border border-border px-3 py-2 text-xs"
      style={{ backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--foreground))' }}
    >
      <p style={{ color: item.payload?.color }}>{item.name}: {item.value}</p>
    </div>
  )
}

export function StatsPieChart({ data }: StatsPieChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsPieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="45%"
          outerRadius="70%"
          strokeWidth={0}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}
          iconType="circle"
          iconSize={8}
        />
      </RechartsPieChart>
    </ResponsiveContainer>
  )
}
