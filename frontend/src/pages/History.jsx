/**
 * History.jsx — Energy history page.
 *
 * Displays historical energy production data:
 * - KPI cards: this month and this year production
 * - Daily production curve chart (coming soon)
 * - Monthly and yearly bar charts (coming soon)
 *
 * Data source: /energy/overview, /energy/history, /energy/aggregate
 */

import { useOverview } from '../hooks/useGrowatt'
import { Card, CardContent } from '@/components/ui/card'
import { Calendar, CalendarDays } from 'lucide-react'

// ── KPI Cards ────────────────────────────────────────────────────────────────

/**
 * Single KPI card showing an icon, label, value and unit.
 *
 * @param {object} props
 * @param {JSX.Element} props.icon - Lucide icon component
 * @param {string} props.label - Card label
 * @param {string|number} props.value - Main value to display
 * @param {string} props.unit - Unit of measurement
 */
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
          <span className="text-2xl font-bold text-foreground">
            {value ?? '—'}
          </span>
          {unit && (
            <span className="text-sm text-muted-foreground">{unit}</span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function History() {
  const { data: overview } = useOverview()

  return (
    <div className="bg-background min-h-dvh">

      {/* Page header */}
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-xl font-bold text-foreground">History</h1>
      </div>

      <div className="px-4 flex flex-col gap-3">

        {/* KPI Grid — 2 columns */}
        <div className="grid grid-cols-2 gap-3">
          <KpiCard
            icon={<Calendar size={16} />}
            label="This month"
            value={overview?.monthly_energy_kwh}
            unit="kWh"
          />
          <KpiCard
            icon={<CalendarDays size={16} />}
            label="This year"
            value={overview?.yearly_energy_kwh}
            unit="kWh"
          />
        </div>

        {/* Charts — coming soon */}
        <Card>
          <CardContent className="pt-3 pb-3 px-3">
            <p className="text-sm text-muted-foreground">Charts coming soon...</p>
          </CardContent>
        </Card>

        <div className="h-2" />
      </div>
    </div>
  )
}