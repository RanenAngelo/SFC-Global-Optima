import React, { useMemo } from 'react'
import { Badge, Card, CardHeader } from '../../components/ui/primitives'
import { BarSeries, ChartCard } from '../../components/charts'
import { InfoCard, KpiCard, LiveNote } from '../../components/shared'
import { PageHeader } from '../../components/admin/PageHeader'
import { PageError, PageLoader, useApi } from '../../lib/api'
import { pct } from '../../lib/utils'

type CustomerSummary = {
  n_unseen: number
  agreement_pct: number
  disagreements: number
  both_wrong: number
  majority_baseline_accuracy: number
  spark_test: { accuracy: number; macro_f1: number; auc: number }
  python_test: { accuracy: number; macro_f1: number; auc: number }
  explanation: string
}
type DemandSummary = {
  n_unseen: number
  spark_mae: number
  python_mae: number
  pred_vs_pred_mae: number
  pred_vs_pred_corr: number | null
  within_1_unit_pct: number
  explanation: string
}
type ComparisonData = {
  summary: { customer: CustomerSummary; demand: DemandSummary }
  customer_rows: {
    customer_id: string
    actual: number
    spark_pred: number
    spark_proba: number
    py_pred: number
    py_proba: number
    match: number
    proba_diff: number
    spark_correct: number
    py_correct: number
  }[]
  demand_rows: {
    item_id: string
    restaurant_id: string
    order_date: string
    actual: number
    spark_pred: number
    py_pred: number
    naive_7: number
    abs_diff: number
  }[]
}

function Pred({ v, actual }: { v: number; actual: number }) {
  const ok = v === actual
  return (
    <span
      className={
        ok
          ? 'inline-flex h-6 w-6 items-center justify-center rounded-full bg-sage-50 text-[11px] font-bold text-sage-700'
          : 'inline-flex h-6 w-6 items-center justify-center rounded-full bg-clay-50 text-[11px] font-bold text-clay-600'
      }
    >
      {v}
    </span>
  )
}

export default function Comparison() {
  const { data, loading, error, refetch } = useApi<ComparisonData>('/comparison')

  const customerBars = useMemo(() => {
    if (!data) return []
    const c = data.summary.customer
    return [
      { metric: 'Accuracy', Spark: c.spark_test.accuracy * 100, Python: c.python_test.accuracy * 100 },
      { metric: 'Macro F1', Spark: c.spark_test.macro_f1 * 100, Python: c.python_test.macro_f1 * 100 },
      { metric: 'AUC', Spark: c.spark_test.auc * 100, Python: c.python_test.auc * 100 },
    ]
  }, [data])

  const demandBars = useMemo(() => {
    if (!data) return []
    const d = data.summary.demand
    return [{ metric: 'MAE (lower is better)', Spark: d.spark_mae, Python: d.python_mae }]
  }, [data])

  const disagreements = useMemo(
    () => (data?.customer_rows ?? []).filter((r) => r.match === 0).slice(0, 15),
    [data],
  )
  const worstDemand = useMemo(
    () => [...(data?.demand_rows ?? [])].sort((a, b) => b.abs_diff - a.abs_diff).slice(0, 15),
    [data],
  )

  if (loading) return <PageLoader label="Loading pipeline comparison…" />
  if (error || !data) return <PageError message={error ?? 'No comparison data.'} onRetry={refetch} />

  const c = data.summary.customer
  const d = data.summary.demand

  return (
    <div>
      <PageHeader
        eyebrow="Decisions · Dual pipeline"
        title="Model Comparison"
        subtitle="Spark MLlib and Python/sklearn pipelines train independently on equivalent features and are scored on one shared unseen test set. Neither pipeline sees the other's predictions."
        onRefresh={refetch}
      />
      <LiveNote className="mb-5">
        Live comparison served by the DineIQ API ({c.n_unseen} unseen customers, {d.n_unseen} unseen demand cells).
        Full methodology is in the dual-pipeline comparison report.
      </LiveNote>

      {/* Customer model */}
      <div className="mb-3 flex items-center gap-2">
        <h2 className="font-display text-[17px] font-semibold text-ink">High-value customer classifier</h2>
        <Badge tone="neutral">{c.n_unseen} unseen</Badge>
      </div>
      <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Spark accuracy" value={pct(c.spark_test.accuracy * 100)} compare={`macro-F1 ${c.spark_test.macro_f1.toFixed(3)} · AUC ${c.spark_test.auc.toFixed(3)}`} icon="Zap" tone="sky" />
        <KpiCard label="Python accuracy" value={pct(c.python_test.accuracy * 100)} compare={`macro-F1 ${c.python_test.macro_f1.toFixed(3)} · AUC ${c.python_test.auc.toFixed(3)}`} icon="Code2" tone="sage" />
        <KpiCard label="Pipeline agreement" value={pct(c.agreement_pct)} compare={`${c.disagreements} disagreements · ${c.both_wrong} both wrong`} icon="GitCompareArrows" tone="ember" />
        <KpiCard label="Majority baseline" value={pct(c.majority_baseline_accuracy * 100)} compare="Naive always-majority accuracy" icon="Minus" tone="neutral" />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1.4fr]">
        <ChartCard title="Test metrics by pipeline" subtitle="Shared unseen set — higher is better" height={260}>
          <BarSeries
            data={customerBars}
            xKey="metric"
            bars={[
              { key: 'Spark', label: 'Spark MLlib', color: '#2F6FA8' },
              { key: 'Python', label: 'Python / sklearn', color: '#5E8C4A' },
            ]}
            layout="vertical"
          />
        </ChartCard>
        <Card>
          <CardHeader title="Where the pipelines disagree" subtitle="First 15 disagreements — 0/1 vs actual outcome" />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead>
                <tr className="border-b border-line bg-canvas/60">
                  {['Customer', 'Actual', 'Spark', 'Python', 'Prob. gap'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {disagreements.map((r) => (
                  <tr key={r.customer_id} className="border-t border-line/70 hover:bg-canvas/50">
                    <td className="px-4 py-2.5 font-mono text-[12px] font-bold text-ink">{r.customer_id}</td>
                    <td className="px-4 py-2.5"><Pred v={r.actual} actual={r.actual} /></td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center gap-1.5">
                        <Pred v={r.spark_pred} actual={r.actual} />
                        <span className="text-[11.5px] tabular-nums text-ink-faint">{r.spark_proba.toFixed(2)}</span>
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center gap-1.5">
                        <Pred v={r.py_pred} actual={r.actual} />
                        <span className="text-[11.5px] tabular-nums text-ink-faint">{r.py_proba.toFixed(2)}</span>
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-[12.5px] tabular-nums text-ink-soft">{r.proba_diff.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
      <InfoCard title="Why they differ (customer model)" items={[c.explanation]} tone="neutral" className="mt-4" icon="Info" />

      {/* Demand model */}
      <div className="mb-3 mt-8 flex items-center gap-2">
        <h2 className="font-display text-[17px] font-semibold text-ink">Demand regressor</h2>
        <Badge tone="neutral">{d.n_unseen} unseen cells</Badge>
      </div>
      <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Spark MAE" value={d.spark_mae.toFixed(3)} compare="MLlib RandomForest · units/day" icon="Zap" tone="sky" />
        <KpiCard label="Python MAE" value={d.python_mae.toFixed(3)} compare="sklearn HistGB · units/day" icon="Code2" tone="sage" />
        <KpiCard label="Prediction gap" value={d.pred_vs_pred_mae.toFixed(3)} compare="Mean |spark − python| per cell" icon="GitCompareArrows" tone="ember" />
        <KpiCard label="Within 1 unit" value={pct(d.within_1_unit_pct)} compare="Cells where pipelines agree ±1" icon="CheckCircle2" tone="gold" />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1.4fr]">
        <ChartCard title="MAE by pipeline" subtitle="Lower is better — units per day" height={260}>
          <BarSeries
            data={demandBars}
            xKey="metric"
            bars={[
              { key: 'Spark', label: 'Spark MLlib', color: '#2F6FA8' },
              { key: 'Python', label: 'Python / sklearn', color: '#5E8C4A' },
            ]}
            layout="vertical"
          />
        </ChartCard>
        <Card>
          <CardHeader title="Largest prediction gaps" subtitle="Top 15 cells by |spark − python|" />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead>
                <tr className="border-b border-line bg-canvas/60">
                  {['Item', 'Branch', 'Date', 'Actual', 'Spark', 'Python', 'Naive-7', 'Gap'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {worstDemand.map((r, i) => (
                  <tr key={`${r.item_id}-${r.restaurant_id}-${r.order_date}-${i}`} className="border-t border-line/70 hover:bg-canvas/50">
                    <td className="px-4 py-2.5 font-mono text-[12px] font-bold text-ink">{r.item_id}</td>
                    <td className="px-4 py-2.5 font-mono text-[12px] text-ink-soft">{r.restaurant_id}</td>
                    <td className="px-4 py-2.5 text-[12px] text-ink-muted">{r.order_date}</td>
                    <td className="px-4 py-2.5 text-[12.5px] font-bold tabular-nums text-ink">{r.actual}</td>
                    <td className="px-4 py-2.5 text-[12.5px] tabular-nums text-ink-soft">{r.spark_pred.toFixed(1)}</td>
                    <td className="px-4 py-2.5 text-[12.5px] tabular-nums text-ink-soft">{r.py_pred.toFixed(1)}</td>
                    <td className="px-4 py-2.5 text-[12.5px] tabular-nums text-ink-faint">{r.naive_7}</td>
                    <td className="px-4 py-2.5 text-[12.5px] font-bold tabular-nums text-ember-600">{r.abs_diff.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
      <InfoCard title="Why they differ (demand model)" items={[d.explanation]} tone="neutral" className="mt-4" icon="Info" />
    </div>
  )
}
