/**
 * History.jsx — Energy history analytics page.
 *
 * Provides deep insights into historical energy production and consumption.
 * It renders interactive charts and KPI summaries across multiple time ranges.
 *
 * Displays:
 *   - KPI cards: total, monthly, yearly production and environmental impact.
 *   - HistoricalChart: aggregated solar production trend.
 *   - EnergyBreakdownChart: day-by-day energy flow composition.
 *   - SelfSufficiencyChart: grid reliance vs local autonomy.
 *
 * Data sources:
 *   /energy/overview  -> KPI cards
 *   /energy/history   -> intraday trend widgets
 *   /energy/aggregate -> historical production bars
 *
 * Design Rationale:
 * -----------------
 * History.jsx transitions the UI from "Real-time Telemetry" to "Energy Analytics".
 * It leverages the standardized layout grid and unified `HistoryRow` components
 * to maintain a consistent aesthetic with the Settings views while displaying
 * high-density chart data.
 *
 * @module pages/History
 */
import { Card, CardContent } from '@/components/ui/card'
import { 
  Zap, 
  Leaf, 
  CalendarRange, 
  Calendar, 
  TrendingUp, 
  BarChart3, 
  Activity,
  ChartNoAxesColumn
} from 'lucide-react'
import { useOverview } from '../hooks/useGrowatt'
import HistoricalChart from '../components/HistoricalChart'
import EnergyBreakdownChart from '../components/EnergyBreakdownChart'
import SelfSufficiencyChart from '../components/SelfSufficiencyChart'

/**
 * HistoryRow
 * A specialized data row for analytical summaries, mimicking the TechRow style.
 *
 * @component
 */
function HistoryRow({ icon: Icon, label, value, unit }) {
  return (
    <div className="settings-row group/row py-3.5">
      <div className="flex items-center gap-3">
        {Icon && <Icon size={17} strokeWidth={2} className="text-muted-foreground shrink-0" />}
        <span className="text-[15px] font-medium text-foreground/90">{label}</span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-[17px] font-bold text-near-black dark:text-white leading-none">
          {value ?? '—'}
        </span>
        {unit && (
          <span className="text-[13px] font-semibold text-muted-foreground/60">
            {unit}
          </span>
        )}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function History() {
  const { data: overview } = useOverview()

  return (
    <div className="bg-background min-h-dvh flex flex-col items-center">

      <div className="w-full max-w-[1440px] px-4 md:px-6 flex flex-col gap-8 md:gap-10 py-6 md:py-8 pb-32">

        {/* Analytical Summary (Unified Row Style) */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 px-1">
            <Activity size={18} className="text-foreground/60" strokeWidth={2} />
            <h2 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider pl-0.5 font-display">
              Summary
            </h2>
          </div>
          <Card className="premium-glass border-white/20 dark:border-white/5 overflow-hidden py-0">
            <CardContent className="p-0 divide-y divide-border/10">
              <HistoryRow
                icon={Zap}
                label="Total production"
                value={overview?.total_energy_kwh}
                unit="kWh"
              />
              <HistoryRow
                icon={Leaf}
                label="CO2 Saved"
                value={overview?.carbon_offset_kg}
                unit="kg CO₂"
              />
              <HistoryRow
                icon={CalendarRange}
                label="Annual Yield"
                value={overview?.yearly_energy_kwh}
                unit="kWh"
              />
              <HistoryRow
                icon={Calendar}
                label="Monthly Yield"
                value={overview?.monthly_energy_kwh}
                unit="kWh"
              />
            </CardContent>
          </Card>
        </div>

        {/* Historical production trend chart */}
        <HistoricalChart />

        {/* Daily energy-flow breakdown */}
        <EnergyBreakdownChart />

        {/* Self-sufficiency analytics */}
        <SelfSufficiencyChart />

      </div>
    </div>
  )
}
