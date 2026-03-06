/**
 * History.jsx — Energy history page.
 *
 * Displays:
 *   - KPI cards: this month and this year production
 *   - DailyCurveCard: today's 5-minute power curve
 *   - HistoricalChart: bar chart with day/month/year granularity
 *
 * Data sources:
 *   /energy/overview  → KPI cards
 *   /energy/history   → DailyCurveCard
 *   /energy/aggregate → HistoricalChart
 */

import { useOverview } from '../hooks/useGrowatt'
import { Card, CardContent } from '@/components/ui/card'
import { Calendar, CalendarDays, Zap } from 'lucide-react'
import HistoricalChart from '../components/HistoricalChart'

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({ icon, label, value, unit }) {
  return (
    <Card>
      <CardContent>
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-muted-foreground">{icon}</span>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {label}
          </p>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold text-foreground">{value ?? '—'}</span>
          {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
        </div>
      </CardContent>
    </Card>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function History() {
  const { data: overview } = useOverview()

  return (
    <div className="bg-background min-h-dvh">

      {/* Page header */}
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-xl font-bold text-foreground">History</h1>
      </div>

      <div className="px-4 flex flex-col gap-3 pb-6">

        {/* KPI cards */}
        
        {/* Total production — full width */}
        <KpiCard
          icon={<Zap size={14} />}
          label="Total production"
          value={overview?.total_energy_kwh}
          unit="kWh"
        />

        <div className="grid grid-cols-2 gap-3">
          <KpiCard
            icon={<Calendar size={14} />}
            label="This month"
            value={overview?.monthly_energy_kwh}
            unit="kWh"
          />
          <KpiCard
            icon={<CalendarDays size={14} />}
            label="This year"
            value={overview?.yearly_energy_kwh}
            unit="kWh"
          />
        </div>

        {/* Historical bar chart */}
        <HistoricalChart />

      </div>
    </div>
  )
}