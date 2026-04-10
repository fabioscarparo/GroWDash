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
 * Calculates the integer percentage of a value relative to a total domain.
 * Guards against division by zero errors when the total is falsy or zero.
 *
 * @function pct
 * @param {number} value - The numeric value of the subject segment.
 * @param {number} total - The aggregated total value spanning all segments.
 * @returns {number} The integer percentage rounded to the nearest whole number (0–100).
 */
function pct(value, total) {
  if (!total || total === 0) return 0
  return Math.round((value / total) * 100)
}

/**
 * Calculates the exact remaining percentage for the final segment in a stacked progress bar.
 * Rather than computing it individually (which risks rounding gaps like 33% + 33% + 33% = 99%), 
 * this derives the remainder dynamically: 100 minus the sum of prior segment percentages.
 *
 * @function pctLast
 * @param {number[]} otherValues - Array of all other numeric segment values preceding the final segment.
 * @param {number} total - The overarching total reference value.
 * @returns {number} The integer percentage required to perfectly close the 100% stack bar (ensuring complete fill).
 */
function pctLast(otherValues, total) {
  if (!total || total === 0) return 0
  const sumOthers = otherValues.reduce((acc, v) => acc + pct(v, total), 0)
  return Math.max(100 - sumOthers, 0)
}

/**
 * Safely formats a numeric energy value to a fixed single or double decimal string.
 * Falls back to '0.00' for null, undefined, or NaN inputs.
 *
 * @function fmt
 * @param {number|string|null} value - The raw kWh measurement to format.
 * @returns {string} Formatted string strictly restricted to 2 decimal places (e.g., "3.75").
 */
function fmt(value) {
  return (Number(value) || 0).toFixed(2)
}

// ── Stacked progress bar ──────────────────────────────────────────────────────

/**
 * A horizontal stacked bar visualizing energy distribution percentages.
 * Renders multiple contiguous colored segments whose widths correlate directly to data proportions.
 *
 * @component StackedBar
 * @param {object} props
 * @param {Array<{color: string, pct: number}>} props.segments - Configuration arrays mapping flex-basis widths (`pct`) to CSS backgrounds (`color`).
 * @returns {JSX.Element} A flex container with proportionate colored `div` segments.
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
 * A tabular row representing a singular energy flow item within a section list.
 * Visually pairs an indicator dot to a label, alongside absolute and relative numeric metrics.
 *
 * @component Row
 * @param {object} props
 * @param {string} props.color - The hex color code styling the indicator dot matching the chart visualization.
 * @param {string} props.label - Human-readable label for the energy channel (e.g., 'Exported to grid').
 * @param {number} props.kwh - Total computed energy volume traversing this channel in kWh.
 * @param {number} props.percentage - The computed integer relative percentage representation inside the section domain.
 * @returns {JSX.Element} A styled data row for metric summarization.
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
 * Consolidates a domain grouping, encompassing a descriptive title header, 
 * an overarching domain total metric, a unified StackedBar visualization, and a list of internal flow rows.
 *
 * @component Section
 * @param {object} props
 * @param {string} props.title - Main categorical title denoting the grouping (e.g., "Solar production").
 * @param {string} [props.subtitle] - An optional contextual descriptor elaborating on the routing of the domain group.
 * @param {number} props.total - The aggregated total energy derived by summing all components within this scope (kWh).
 * @param {Array<{color: string, pct: number}>} props.segments - Input configurations defining StackedBar segment visuals.
 * @param {Array<object>} props.rows - Prop payloads forwarded to build the enumerated internal `Row` descendants.
 * @returns {JSX.Element} A self-contained categorical UI section wrapper.
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
 * EnergyBreakdownCard provides a structural schematic mapping today's overarching energy pathways,
 * divided fundamentally into System Output (solar generation dispersion) and Home Consumption (usage derivation).
 *
 * It employs a rigorous localization algorithm resolving inherent synchronization disparities across API readings 
 * (like edge meters vs inverters), guaranteeing that all domain charts mathematically equate to exactly 100% 
 * regardless of transient lag.
 *
 * @component
 * @param {object} props - The component parameters.
 * @param {object} props.today - Complete snapshot metrics retrieved via the `/energy/today` endpoint format.
 * @returns {JSX.Element} Structured breakdown component rendered sequentially within a unified Card container.
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
