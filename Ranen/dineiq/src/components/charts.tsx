import React from 'react'
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, LineChart, Line, ComposedChart, PieChart, Pie, Cell,
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, RadarChart,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts'
import { Card, CardHeader } from './ui/primitives'
import { cn, money } from '../lib/utils'

export const CHART_COLORS = ['#B54E17', '#5E8C4A', '#C08A16', '#2F6FA8', '#96352C', '#8B6F4E', '#6B7280', '#B45309']

/* ─────────────────────────────── Tooltip ─────────────────────────────── */
export function ChartTooltip({
  active,
  payload,
  label,
  valueFormat,
  labelSuffix,
}: {
  active?: boolean
  payload?: any[]
  label?: any
  valueFormat?: (v: number, name?: string) => string
  labelSuffix?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-line bg-white/98 px-3 py-2 shadow-pop">
      {label !== undefined && (
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
          {label}
          {labelSuffix}
        </p>
      )}
      <div className="space-y-1">
        {payload
          .filter((p) => p.value !== null && p.value !== undefined)
          .map((p, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: p.color || p.fill || CHART_COLORS[0] }} />
              <span className="text-ink-muted">{p.name}</span>
              <span className="ml-auto font-semibold tabular-nums text-ink">
                {valueFormat ? valueFormat(Number(p.value), p.name) : Number(p.value).toLocaleString()}
              </span>
            </div>
          ))}
      </div>
    </div>
  )
}

const AXIS = { stroke: '#E9E2D9', tick: { fill: '#9C948A', fontSize: 11, fontWeight: 500 } }
const GRID = { stroke: '#EFEAE3', strokeDasharray: '3 3', vertical: false }

/* ─────────────────────────────── Chart card shell ─────────────────────────────── */
export function ChartCard({
  title,
  subtitle,
  actions,
  footer,
  height = 280,
  children,
  className,
  badge,
  bodyClass,
}: {
  title: React.ReactNode
  subtitle?: React.ReactNode
  actions?: React.ReactNode
  footer?: React.ReactNode
  height?: number
  children: React.ReactNode
  className?: string
  badge?: React.ReactNode
  bodyClass?: string
}) {
  return (
    <Card className={cn('flex flex-col overflow-hidden', className)}>
      <CardHeader title={title} subtitle={subtitle} actions={actions} />
      <div className={cn('min-w-0 flex-1 px-2 pb-2 pt-4 sm:px-3', bodyClass)}>
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            {children as React.ReactElement}
          </ResponsiveContainer>
        </div>
      </div>
      {footer && <div className="border-t border-line px-4 py-3 text-xs text-ink-muted sm:px-5">{footer}</div>}
    </Card>
  )
}

/* ─────────────────────────────── Trend / area chart ─────────────────────────────── */
export function TrendChart({
  data,
  xKey,
  series,
  height,
  valueFormat,
  showLegend = true,
  showGrid = true,
  gradientFor = 0,
}: {
  data: any[]
  xKey: string
  series: { key: string; label: string; color: string; type?: 'area' | 'line' | 'bar'; dashed?: boolean; stackId?: string }[]
  height?: number
  valueFormat?: (v: number, name?: string) => string
  showLegend?: boolean
  showGrid?: boolean
  gradientFor?: number
}) {
  return (
    <ComposedChart data={data} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
      <defs>
        {series.map((s, i) => (
          <linearGradient key={s.key} id={`grad-${s.key}-${i}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={s.color} stopOpacity={0.28} />
            <stop offset="100%" stopColor={s.color} stopOpacity={0.02} />
          </linearGradient>
        ))}
      </defs>
      {showGrid && <CartesianGrid {...GRID} />}
      <XAxis dataKey={xKey} axisLine={false} tickLine={false} tick={AXIS.tick} minTickGap={16} />
      <YAxis axisLine={false} tickLine={false} tick={AXIS.tick} width={54} />
      <Tooltip content={<ChartTooltip valueFormat={valueFormat} />} cursor={{ stroke: '#DAD1C5', strokeWidth: 1 }} />
      {showLegend && <Legend iconType="circle" iconSize={8} wrapperStyle={{ paddingTop: 8, fontSize: 12 }} />}
      {series.map((s, i) =>
        s.type === 'bar' ? (
          <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} stackId={s.stackId} radius={[5, 5, 0, 0]} maxBarSize={26} />
        ) : s.type === 'line' ? (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={s.color}
            strokeWidth={2.2}
            strokeDasharray={s.dashed ? '5 4' : undefined}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
            connectNulls
          />
        ) : (
          <Area
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={s.color}
            strokeWidth={2.2}
            fill={i === gradientFor ? `url(#grad-${s.key}-${i})` : s.color}
            fillOpacity={i === gradientFor ? 1 : 0.08}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
            connectNulls
          />
        ),
      )}
    </ComposedChart>
  )
}

/* ─────────────────────────────── Bar chart ─────────────────────────────── */
export function BarSeries({
  data,
  xKey,
  bars,
  layout = 'horizontal',
  valueFormat,
  showLegend,
  radius = 6,
}: {
  data: any[]
  xKey: string
  bars: { key: string; label: string; color: string; stackId?: string }[]
  layout?: 'horizontal' | 'vertical'
  valueFormat?: (v: number, name?: string) => string
  showLegend?: boolean
  radius?: number
}) {
  const vertical = layout === 'vertical'
  return (
    <BarChart
      data={data}
      layout={layout}
      margin={vertical ? { top: 4, right: 12, left: 8, bottom: 0 } : { top: 4, right: 4, left: -10, bottom: 0 }}
      barGap={4}
    >
      <CartesianGrid {...(vertical ? { stroke: '#EFEAE3', strokeDasharray: '3 3', horizontal: false } : GRID)} />
      {vertical ? (
        <>
          <XAxis type="number" axisLine={false} tickLine={false} tick={AXIS.tick} />
          <YAxis type="category" dataKey={xKey} axisLine={false} tickLine={false} tick={AXIS.tick} width={118} />
        </>
      ) : (
        <>
          <XAxis dataKey={xKey} axisLine={false} tickLine={false} tick={AXIS.tick} minTickGap={8} />
          <YAxis axisLine={false} tickLine={false} tick={AXIS.tick} width={54} />
        </>
      )}
      <Tooltip content={<ChartTooltip valueFormat={valueFormat} />} cursor={{ fill: 'rgba(29,27,25,0.04)' }} />
      {showLegend && <Legend iconType="circle" iconSize={8} wrapperStyle={{ paddingTop: 8, fontSize: 12 }} />}
      {bars.map((b) => (
        <Bar
          key={b.key}
          dataKey={b.key}
          name={b.label}
          fill={b.color}
          stackId={b.stackId}
          radius={vertical ? [0, radius, radius, 0] : [radius, radius, 0, 0]}
          maxBarSize={38}
        />
      ))}
    </BarChart>
  )
}

export function LineSeries({
  data,
  xKey,
  lines,
  valueFormat,
  showLegend,
}: {
  data: any[]
  xKey: string
  lines: { key: string; label: string; color: string; dashed?: boolean }[]
  valueFormat?: (v: number, name?: string) => string
  showLegend?: boolean
}) {
  return (
    <LineChart data={data} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
      <CartesianGrid {...GRID} />
      <XAxis dataKey={xKey} axisLine={false} tickLine={false} tick={AXIS.tick} minTickGap={12} />
      <YAxis axisLine={false} tickLine={false} tick={AXIS.tick} width={54} domain={['dataMin - 0.3', 'dataMax + 0.2']} />
      <Tooltip content={<ChartTooltip valueFormat={valueFormat} />} />
      {showLegend && <Legend iconType="circle" iconSize={8} wrapperStyle={{ paddingTop: 8, fontSize: 12 }} />}
      {lines.map((l) => (
        <Line
          key={l.key}
          type="monotone"
          dataKey={l.key}
          name={l.label}
          stroke={l.color}
          strokeWidth={2.2}
          strokeDasharray={l.dashed ? '5 4' : undefined}
          dot={{ r: 2.5, strokeWidth: 0, fill: l.color }}
          activeDot={{ r: 5, strokeWidth: 0 }}
          connectNulls
        />
      ))}
    </LineChart>
  )
}

/* ─────────────────────────────── Area-only simple ─────────────────────────────── */
export function AreaSeries({
  data,
  xKey,
  yKey,
  color = '#B54E17',
  name,
  valueFormat,
  height,
}: {
  data: any[]
  xKey: string
  yKey: string
  color?: string
  name?: string
  valueFormat?: (v: number) => string
  height?: number
}) {
  return (
    <AreaChart data={data} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
      <defs>
        <linearGradient id={`ag-${yKey}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      <CartesianGrid {...GRID} />
      <XAxis dataKey={xKey} axisLine={false} tickLine={false} tick={AXIS.tick} minTickGap={12} />
      <YAxis axisLine={false} tickLine={false} tick={AXIS.tick} width={54} />
      <Tooltip content={<ChartTooltip valueFormat={valueFormat} />} />
      <Area type="monotone" dataKey={yKey} name={name ?? yKey} stroke={color} strokeWidth={2.2} fill={`url(#ag-${yKey})`} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
    </AreaChart>
  )
}

/* ─────────────────────────────── Donut ─────────────────────────────── */
export function DonutChart({
  data,
  nameKey = 'name',
  valueKey = 'value',
  height,
  centerValue,
  centerLabel,
  valueFormat,
  colors = CHART_COLORS,
}: {
  data: any[]
  nameKey?: string
  valueKey?: string
  height?: number
  centerValue?: string
  centerLabel?: string
  valueFormat?: (v: number) => string
  colors?: string[]
}) {
  const [active, setActive] = React.useState<number | null>(null)
  return (
    <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
      <Pie
        data={data}
        dataKey={valueKey}
        nameKey={nameKey}
        innerRadius="62%"
        outerRadius="86%"
        paddingAngle={2}
        stroke="none"
        onMouseEnter={(_, i) => setActive(i)}
        onMouseLeave={() => setActive(null)}
      >
        {data.map((d, i) => (
          <Cell key={i} fill={d.color ?? colors[i % colors.length]} opacity={active === null || active === i ? 1 : 0.42} style={{ transition: 'opacity .18s' }} />
        ))}
      </Pie>
      <Tooltip content={<ChartTooltip valueFormat={valueFormat} />} />
      {centerValue && (
        <text x="50%" y="47%" textAnchor="middle" dominantBaseline="middle" className="fill-ink" style={{ fontSize: 22, fontWeight: 600, fontFamily: 'Fraunces, Georgia, serif' }}>
          {centerValue}
        </text>
      )}
      {centerLabel && (
        <text x="50%" y="60%" textAnchor="middle" dominantBaseline="middle" className="fill-[#9C948A]" style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase' }}>
          {centerLabel}
        </text>
      )}
    </PieChart>
  )
}

/* ─────────────────────────────── Scatter ─────────────────────────────── */
export function ScatterPlot({
  data,
  xKey,
  yKey,
  groupKey,
  groups,
  xLabel,
  yLabel,
  valueFormat,
}: {
  data: any[]
  xKey: string
  yKey: string
  groupKey: string
  groups: { key: string; label: string; color: string }[]
  xLabel?: string
  yLabel?: string
  valueFormat?: (v: number, name?: string) => string
}) {
  return (
    <ScatterChart margin={{ top: 10, right: 16, left: -6, bottom: 18 }}>
      <CartesianGrid stroke="#EFEAE3" strokeDasharray="3 3" />
      <XAxis type="number" dataKey={xKey} axisLine={false} tickLine={false} tick={AXIS.tick} name={xLabel ?? xKey} label={{ value: xLabel, position: 'insideBottom', offset: -10, style: { fill: '#9C948A', fontSize: 11 } }} />
      <YAxis type="number" dataKey={yKey} axisLine={false} tickLine={false} tick={AXIS.tick} width={54} name={yLabel ?? yKey} />
      <ZAxis range={[70, 70]} />
      <Tooltip content={<ChartTooltip valueFormat={valueFormat} />} cursor={{ strokeDasharray: '3 3' }} />
      <Legend iconType="circle" iconSize={8} wrapperStyle={{ paddingTop: 4, fontSize: 12 }} />
      {groups.map((g) => (
        <Scatter key={g.key} name={g.label} data={data.filter((d) => d[groupKey] === g.key)} fill={g.color} fillOpacity={0.78} stroke="#fff" strokeWidth={1} />
      ))}
    </ScatterChart>
  )
}

/* ─────────────────────────────── Radar ─────────────────────────────── */
export function RadarSeries({ data, keys }: { data: any[]; keys: { key: string; label: string; color: string }[] }) {
  return (
    <RadarChart data={data} outerRadius="72%">
      <PolarGrid stroke="#E9E2D9" />
      <PolarAngleAxis dataKey="subject" tick={{ fill: '#726B62', fontSize: 11, fontWeight: 500 }} />
      <PolarRadiusAxis angle={90} tick={{ fill: '#9C948A', fontSize: 10 }} />
      <Tooltip content={<ChartTooltip />} />
      <Legend iconType="circle" iconSize={8} wrapperStyle={{ paddingTop: 6, fontSize: 12 }} />
      {keys.map((k) => (
        <Radar key={k.key} name={k.label} dataKey={k.key} stroke={k.color} fill={k.color} fillOpacity={0.16} strokeWidth={2} />
      ))}
    </RadarChart>
  )
}

/* ─────────────────────────────── Sparkline ─────────────────────────────── */
export function Sparkline({
  values,
  color = '#B54E17',
  width = 76,
  height = 26,
}: {
  values: number[]
  color?: string
  width?: number
  height?: number
}) {
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1 || 1)) * (width - 2) + 1
    const y = height - 2 - ((v - min) / span) * (height - 4)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  const area = `M${pts.join(' L')} L${width - 1},${height} L1,${height} Z`
  const gid = `spark-${color.replace('#', '')}`
  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.24} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={pts[pts.length - 1]?.split(',')[0]} cy={pts[pts.length - 1]?.split(',')[1]} r={2.2} fill={color} />
    </svg>
  )
}

/* ─────────────────────────────── Legend swatches ─────────────────────────────── */
export function ChartLegend({ items, className }: { items: { label: string; color: string; value?: string }[]; className?: string }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-x-4 gap-y-2', className)}>
      {items.map((i) => (
        <div key={i.label} className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: i.color }} />
          <span className="text-xs text-ink-muted">{i.label}</span>
          {i.value && <span className="text-xs font-semibold tabular-nums text-ink">{i.value}</span>}
        </div>
      ))}
    </div>
  )
}

export const defaultCurrencyFormat = (v: number) => money(v, { compact: true })
export { ReferenceLine, Cell }
