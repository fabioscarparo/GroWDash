/**
 * History.jsx — Energy history analytics page.
 *
 * Provides deep insights into historical energy production and consumption.
 * It renders several interactive charts and KPI summaries covering various time granularities.
 *
 * Displays:
 *   - High-level KPI cards: total, monthly, and yearly production yields.
 *   - HistoricalChart: Interactive bar chart for aggregated solar production.
 *   - EnergyBreakdownChart: Full stacked-bar area visualizing generation, consumption, grid, and battery flows simultaneously.
 *   - SelfSufficiencyChart: Advanced analytics pie/bar showing grid reliance.
 *
 * Data sources:
 *   /energy/overview  → KPI cards
 *   /energy/history   → DailyCurveCard
 *   /energy/aggregate → HistoricalChart
 */

import { useOverview } from '../hooks/useGrowatt'
import { Card, CardContent } from '@/components/ui/card'
import { Calendar, CalendarDays, Zap, Leaf } from 'lucide-react'
import HistoricalChart from '../components/HistoricalChart'
import EnergyBreakdownChart from '../components/EnergyBreakdownChart'
import SelfSufficiencyChart from '../components/SelfSufficiencyChart'


// ── KPI Card ──────────────────────────────────────────────────────────────────

/**
 * A reusable presentation component displaying a single Key Performance Indicator.
 *
 * @component KpiCard
 * @param {Object} props - The component props.
 * @param {JSX.Element} props.icon - The Lucide React icon to display next to the label.
 * @param {string} props.label - The title describing the KPI.
 * @param {number|string} props.value - The main numeric value to display.
 * @param {string} props.unit - The unit string (e.g., 'kWh') appended to the value.
 * @returns {JSX.Element} A formatted card component with large typography.
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
          <span className="text-2xl font-bold text-foreground">{value ?? '—'}</span>
          {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
        </div>
      </CardContent>
    </Card>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

/**
 * The History page component.
 * 
 * It coordinates the rendering of high-level overview metrics alongside
 * deeply interactive and customized React-based charting components.
 * Data-fetching for the charts is independently handled by their respective components.
 *
 * @component
 * @returns {JSX.Element} The rendered historical analytics page.
 */
export default function History() {
  const { data: overview } = useOverview()

  return (
    <div className="bg-background min-h-dvh">

      {/* Page header */}
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-xl font-bold text-foreground">History</h1>
      </div>

      <div className="px-4 flex flex-col gap-3 pb-6">

        {/* KPI cards grid: 2x2 on mobile, 1x4 on desktop */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard
            icon={<Zap size={14} />}
            label="Total production"
            value={overview?.total_energy_kwh}
            unit="kWh"
          />
          <KpiCard
            icon={<Leaf size={14} />}
            label="Total CO₂ saved"
            value={overview?.carbon_offset_kg}
            unit="kg"
          />
          <KpiCard
            icon={<CalendarDays size={14} />}
            label="This year"
            value={overview?.yearly_energy_kwh}
            unit="kWh"
          />
          <KpiCard
            icon={<Calendar size={14} />}
            label="This month"
            value={overview?.monthly_energy_kwh}
            unit="kWh"
          />
        </div>

        {/* Historical bar chart wrapper inside its dedicated component */}
        <HistoricalChart />

        {/* Full energy breakdown — all flows, day by day, month navigation */}
        <EnergyBreakdownChart />

        {/* Self sufficiency analytics pie/bar component */}
        <SelfSufficiencyChart />

      </div>
    </div>
  )
}