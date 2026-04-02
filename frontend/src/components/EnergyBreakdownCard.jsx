/**
 * EnergyBreakdownCard.jsx — Daily energy breakdown.
 *
 * Two sections showing how energy flowed through the system today:
 *
 *   1. System output — total energy delivered by the inverter, split into:
 *        - Self-consumed: solar energy retained on-site (loads + battery)
 *        - Exported to grid: excess energy sent to the public grid
 *      Total = self_consumed_kwh + grid_exported_kwh (fallback: solar_kwh)
 *
 *   2. Home consumption — total energy consumed by home loads, split into:
 *        - From solar: panels → loads directly (not via battery, not exported)
 *        - From battery: battery discharge → loads
 *        - From grid: energy imported from the public grid
 *      Total = max(home_kwh, self_consumed_kwh + grid_imported_kwh)
 *
 * Progress bars use a "last segment fills the rest" strategy to avoid
 * floating point gaps caused by Math.round() on individual percentages.
 *
 * Data source: /energy/today → flow.today
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartPie } from 'lucide-react'

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Calculates the percentage of a value relative to a total.
 * Returns 0 if total is falsy or zero to avoid division by zero.
 *
 * @param {number} value
 * @param {number} total
 * @returns {number} Integer percentage 0–100
 */
function pct(value, total) {
  if (!total || total === 0) return 0
  return Math.round((value / total) * 100)
}

/**
 * Calculates the percentage for the last segment in a stacked bar.
 * Instead of computing it from its own value, it takes 100 minus the sum
 * of all other segments' percentages. This ensures the bar always fills
 * completely, compensating for rounding errors in the other segments.
 *
 * @param {number[]} otherValues - All values except the last segment
 * @param {number} total - Total reference value
 * @returns {number} Integer percentage 0–100
 */
function pctLast(otherValues, total) {
  if (!total || total === 0) return 0
  const sumOthers = otherValues.reduce((acc, v) => acc + pct(v, total), 0)
  return Math.max(100 - sumOthers, 0)
}

/**
 * Formats a kWh value to one decimal place.
 * Falls back to 0.0 for null/undefined/NaN values.
 *
 * @param {number} value
 * @returns {string} e.g. "3.7"
 */
function fmt(value) {
  return (Number(value) || 0).toFixed(2)
}

// ── Stacked progress bar ──────────────────────────────────────────────────────

/**
 * A horizontal stacked bar made of colored segments.
 * Each segment's width is its percentage of the total bar width.
 *
 * @param {object} props
 * @param {{ color: string, pct: number }[]} props.segments
 */
function StackedBar({ segments }) {
  return (
    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden flex">
      {segments.map((s, i) => (
        <div
          key={i}
          className="h-full transition-all duration-500"
          style={{ width: `${s.pct}%`, backgroundColor: s.color }}
        />
      ))}
    </div>
  )
}

// ── Single data row ───────────────────────────────────────────────────────────

/**
 * A single labeled row showing a colored dot, label, kWh value and percentage.
 *
 * @param {object} props
 * @param {string} props.color - Dot color (hex)
 * @param {string} props.label - Row label
 * @param {number} props.kwh - Energy value in kWh
 * @param {number} props.percentage - Integer percentage 0–100
 */
function Row({ color, label, kwh, percentage }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span
          className="inline-block w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: color }}
        />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold text-foreground">{fmt(kwh)} kWh</span>
        <span className="text-xs text-muted-foreground w-8 text-right">{percentage}%</span>
      </div>
    </div>
  )
}

// ── Section ───────────────────────────────────────────────────────────────────

/**
 * A titled section with a total value, a stacked bar and a list of rows.
 *
 * @param {object} props
 * @param {string} props.title - Section title
 * @param {string} [props.subtitle] - Optional subtitle for explanation
 * @param {number} props.total - Total energy value for this section (kWh)
 * @param {{ color: string, pct: number }[]} props.segments - Bar segments
 * @param {object[]} props.rows - Row data (passed directly to Row component)
 */
function Section({ title, subtitle, total, segments, rows }) {
  return (
    <div className="flex flex-col gap-2.5">

      {/* Title + total */}
      <div className="flex justify-between items-start">
        <div className="flex flex-col">
          <p className="text-xs font-semibold text-foreground">{title}</p>
          {subtitle && <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{subtitle}</p>}
        </div>
        <div className="flex items-baseline gap-1 shrink-0 ml-2 pt-0.5">
          <span className="text-sm font-bold text-foreground">{fmt(total)}</span>
          <span className="text-xs text-muted-foreground">kWh</span>
        </div>
      </div>

      {/* Stacked progress bar */}
      <StackedBar segments={segments} />

      {/* Data rows */}
      <div className="flex flex-col gap-1.5">
        {rows.map((r, i) => <Row key={i} {...r} />)}
      </div>

    </div>
  )
}

// ── Component ──────────────────────────────────────────────────────────────────

/**
 * EnergyBreakdownCard component.
 *
 * @param {object} props
 * @param {object} props.today - Daily energy totals from /energy/today → flow.today
 */
export default function EnergyBreakdownCard({ today }) {

  // ── Raw values from API ─────────────────────────────────────────────────────

  const home = Number(today?.home_kwh) || 0
  const gridExported = Number(today?.grid_exported_kwh) || 0
  const gridImported = Number(today?.grid_imported_kwh) || 0
  const batDischarged = Number(today?.battery_discharged_kwh) || 0
  const batCharged = Number(today?.battery_charged_kwh) || 0

  // ── Derived values (Option A: Perfect Coherence) ────────────────────────────

  // 1. Home consumption is fulfilled by 3 sources: directly from solar, from battery, or from grid.
  // gridImported and batDischarged are precise. We derive solarDirect to perfectly balance the house.
  const homeTotal = Math.max(home, gridImported + batDischarged)
  const solarDirect = Math.max(homeTotal - gridImported - batDischarged, 0)

  // 2. Solar production splits into what was kept locally vs what was exported.
  // We reconstruct the local usage ("Kept on-site") by precisely summing the solar that
  // went to the house (solarDirect) and the solar that went to the battery (batCharged).
  // Then we reconstruct the total solar production to hide any inverter losses and ensure 100% coherence.
  const selfConsumed = solarDirect + batCharged
  const systemOutput = selfConsumed + gridExported

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <ChartPie size={16} className="text-muted-foreground" />
          <CardTitle className="text-sm font-semibold">Energy breakdown</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">

        {/* Section 1 — Solar production */}
        <Section
          title="Solar production"
          subtitle="Where the generated solar energy went"
          total={systemOutput}
          segments={[
            { color: '#22c55e', pct: pct(selfConsumed, systemOutput) },
            { color: '#10b981', pct: pctLast([selfConsumed], systemOutput) },
          ]}
          rows={[
            { color: '#22c55e', label: 'Used locally (Home + Battery)', kwh: selfConsumed, percentage: pct(selfConsumed, systemOutput) },
            { color: '#10b981', label: 'Exported to grid', kwh: gridExported, percentage: pct(gridExported, systemOutput) },
          ]}
        />

        <div className="h-px bg-border my-1" />

        {/* Section 2 — Home consumption */}
        <Section
          title="Home consumption"
          subtitle="Where the energy to power your home came from"
          total={homeTotal}
          segments={[
            { color: '#f59e0b', pct: pct(solarDirect, homeTotal) },
            { color: '#8b5cf6', pct: pct(batDischarged, homeTotal) },
            { color: '#ef4444', pct: pctLast([solarDirect, batDischarged], homeTotal) },
          ]}
          rows={[
            { color: '#f59e0b', label: 'Directly from solar', kwh: solarDirect, percentage: pct(solarDirect, homeTotal) },
            { color: '#8b5cf6', label: 'From battery', kwh: batDischarged, percentage: pct(batDischarged, homeTotal) },
            { color: '#ef4444', label: 'Imported from grid', kwh: gridImported, percentage: pct(gridImported, homeTotal) },
          ]}
        />

      </CardContent>
    </Card>
  )
}
