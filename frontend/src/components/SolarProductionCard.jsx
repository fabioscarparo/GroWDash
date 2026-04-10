/**
 * SolarProductionCard.jsx — Solar production KPI with forecast overlay.
 *
 * Replaces the simple KPI card in Overview with a two-section card:
 *
 *   1. Actual production today (kWh) — from Growatt API
 *   2. Estimated maximum production (kWh) — derived from Open-Meteo GTI
 *      forecast scaled by plant capacity and user performance ratio, with
 *      a progress bar and an hourly forecast vs actual comparison chart.
 *
 * Production estimate formula (standard PV industry):
 *   hourly_kWh = GTI (W/m²) / 1000 × peak_power_kWp × performance_ratio
 *
 * Chart: dual AreaChart — forecast as a filled grey area, actual production
 * as an amber filled area overlaid on top. Both share the same time axis.
 *
 * Data sources:
 *   - /energy/overview → today_energy_kwh, plant_capacity_kw
 *   - /energy/history  → 5-min snapshots, aggregated per hour for actual overlay
 *   - Open-Meteo GTI forecast via useSolarForecast
 */

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip } from '@/components/ui/chart'
import { Sun } from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  CartesianGrid,
} from 'recharts'
import { Skeleton } from '@/components/ui/skeleton'
import { useSolarForecast } from '../hooks/useSolarForecast'
import { useSolarSettings } from '../hooks/useSolarSettings'
import { useHistory } from '../hooks/useGrowatt'

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Resolves the localized "YYYY-MM-DD" short date string strictly anchored to the host device's active timezone.
 *
 * @function localToday
 * @returns {string} The localized short-date string boundary.
 */
function localToday() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const chartConfig = {
  estimated: { label: 'Forecast', color: '#94a3b8' },
  actual: { label: 'Actual', color: '#f59e0b' },
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * SolarProductionCard encapsulates a localized performance widget contrasting real-time PV generation 
 * against theoretical maximums synthesized from instantaneous Open-Meteo Global Tilted Irradiance (GTI) models.
 *
 * It employs continuous algebraic overlays blending array peak capacity with performance degradation indices 
 * mapped out hour-by-hour on an intertwined dual AreaChart topological frame.
 *
 * @component
 * @param {object} props - The component parameters.
 * @param {number} props.actualKwh - Hard reported total cumulative solar yield for today.
 * @param {number} props.plantCapacityKw - The static system peak generation sizing multiplier (kWp).
 * @param {boolean} props.isLoading - React Query loading reflection mitigating visual popping states.
 * @returns {JSX.Element} Fully resolved Shadcn Card embedding localized solar efficacy charts.
 */
export default function SolarProductionCard({
  actualKwh,
  plantCapacityKw,
  isLoading,
}) {
  const { settings } = useSolarSettings()
  const today = localToday()
  const currentHour = new Date().getHours()

  // ── Data fetching ─────────────────────────────────────────────────────────

  const { data: forecast } = useSolarForecast({
    tilt: settings.tilt,
    azimuth: settings.azimuth,
  })

  const { data: history } = useHistory(today, today)

  // ── Hourly actual production (kWh) aggregated from 5-min snapshots ────────
  // Each 5-min snapshot: kWh = solar_w × (5/60) / 1000

  const hourlyActual = useMemo(() => {
    const acc = Array(24).fill(0)
      ; (history?.data ?? []).forEach(point => {
        const hour = parseInt(point.time?.slice(11, 13) ?? '0', 10)
        if (hour >= 0 && hour < 24) {
          acc[hour] += (point.solar_w || 0) * (5 / 60) / 1000
        }
      })
    return acc.map(v => Math.round(v * 1000) / 1000)
  }, [history])

  // ── Hourly estimated production from GTI + plant capacity + PR ────────────

  const hourlyEstimated = useMemo(() => {
    const gti = forecast?.hourly?.global_tilted_irradiance ?? []
    if (!gti.length || !plantCapacityKw) return Array(24).fill(0)
    return gti.map(wm2 => {
      const kwh = (wm2 / 1000) * plantCapacityKw * settings.performanceRatio
      return Math.round(kwh * 1000) / 1000
    })
  }, [forecast, plantCapacityKw, settings.performanceRatio])

  // ── Daily totals ──────────────────────────────────────────────────────────

  const estimatedTotalKwh = useMemo(
    () => Math.round(hourlyEstimated.reduce((s, v) => s + v, 0) * 10) / 10,
    [hourlyEstimated]
  )

  const hasForecast = !!(estimatedTotalKwh > 0)
  const progressPct = hasForecast && estimatedTotalKwh > 0
    ? Math.min(Math.round(((actualKwh ?? 0) / estimatedTotalKwh) * 100), 100)
    : 0

  // ── Chart data: 24 hourly points ──────────────────────────────────────────
  // Future hours: actual is null so the amber area stops at the current hour.

  const chartData = useMemo(() =>
    Array.from({ length: 24 }, (_, h) => ({
      hour: `${String(h).padStart(2, '0')}`,
      estimated: hourlyEstimated[h] ?? 0,
      actual: h <= currentHour ? (hourlyActual[h] ?? 0) : null,
    })),
    [hourlyEstimated, hourlyActual, currentHour]
  )

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Sun size={16} className="text-muted-foreground" />
          <CardTitle className="text-sm font-semibold">Solar Production</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pb-4">

        {isLoading ? (
          <div className="space-y-3 pb-2 pt-0">
            <Skeleton className="h-8 w-24" />
            <div className="h-px bg-border my-3" />
            <div className="space-y-2">
              <div className="flex justify-between">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-1.5 w-full rounded-full" />
              <div className="flex justify-between mt-1">
                <Skeleton className="h-2.5 w-20" />
                <Skeleton className="h-2.5 w-24" />
              </div>
            </div>
            <Skeleton className="h-24 w-full mt-3" />
            <div className="flex justify-center gap-4 mt-2">
              <Skeleton className="h-2.5 w-16" />
              <Skeleton className="h-2.5 w-16" />
            </div>
          </div>
        ) : (
          <>
            {/* Actual production value */}
            <div className="flex items-baseline gap-1 mb-3">
              <span className="text-2xl font-bold text-foreground">
                {actualKwh ?? '—'}
              </span>
              <span className="text-sm text-muted-foreground">kWh</span>
            </div>

            {/* Forecast section */}
            {hasForecast ? (
              <>
                <div className="h-px bg-border mb-3" />

                {/* Estimated max + progress bar */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] text-muted-foreground">
                      Estimated max today
                    </span>
                    <span className="text-[11px] font-semibold text-foreground">
                      {estimatedTotalKwh} kWh
                    </span>
                  </div>

                  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all duration-700"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>

                  <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-muted-foreground">
                      {progressPct}% of forecast
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      PR {Math.round(settings.performanceRatio * 100)}% · {settings.tilt}° tilt
                    </span>
                  </div>
                </div>

                {/* Hourly forecast vs actual — dual area chart */}
                <ChartContainer config={chartConfig} className="h-24 w-full">
                  <AreaChart
                    data={chartData}
                    margin={{ top: 4, right: 0, bottom: 0, left: 0 }}
                  >
                    <defs>
                      {/* Forecast area gradient — neutral grey */}
                      <linearGradient id="grad-estimated" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.03} />
                      </linearGradient>
                      {/* Actual area gradient — amber */}
                      <linearGradient id="grad-actual" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.45} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>

                    <CartesianGrid
                      vertical={false}
                      stroke="hsl(var(--border))"
                      strokeDasharray="3 3"
                    />

                    <XAxis
                      dataKey="hour"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 8, fill: 'hsl(var(--muted-foreground))' }}
                      // Show only 00, 06, 12, 18
                      tickFormatter={(v, i) => (i % 6 === 0 ? v : '')}
                      interval={0}
                    />

                    <ChartTooltip
                      cursor={false}
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null
                        const est = payload.find(p => p.dataKey === 'estimated')?.value ?? 0
                        const act = payload.find(p => p.dataKey === 'actual')?.value
                        return (
                          <div className="bg-background border border-border rounded px-2.5 py-2 text-xs shadow-md">
                            <p className="text-muted-foreground font-medium mb-1">{label}:00</p>
                            <div className="flex items-center justify-between gap-4 mb-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className="inline-block w-2 h-2 rounded-full bg-foreground/40" />
                                <span className="text-muted-foreground">Forecast</span>
                              </div>
                              <span className="font-semibold text-foreground">
                                {est.toFixed(2)} kWh
                              </span>
                            </div>
                            {act != null && (
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-1.5">
                                  <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
                                  <span className="text-muted-foreground">Actual</span>
                                </div>
                                <span className="font-semibold text-amber-500">
                                  {act.toFixed(2)} kWh
                                </span>
                              </div>
                            )}
                          </div>
                        )
                      }}
                    />

                    {/* Forecast area — rendered first so it sits behind actual */}
                    <Area
                      type="monotone"
                      dataKey="estimated"
                      stroke="#94a3b8"
                      strokeOpacity={0.4}
                      strokeWidth={1.5}
                      strokeDasharray="4 3"
                      fill="url(#grad-estimated)"
                      dot={false}
                      activeDot={{ r: 3, fill: '#94a3b8' }}
                      connectNulls
                    />

                    {/* Actual area — amber, stops at current hour (nulls not connected) */}
                    <Area
                      type="monotone"
                      dataKey="actual"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      fill="url(#grad-actual)"
                      dot={false}
                      activeDot={{ r: 3, fill: '#f59e0b' }}
                      connectNulls={false}
                    />

                  </AreaChart>
                </ChartContainer>

                {/* Legend */}
                <div className="flex justify-center gap-4 mt-2">
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block w-3 h-[2px] rounded bg-foreground/40" />
                    <span className="text-[10px] text-muted-foreground">Forecast</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block w-3 h-[2px] rounded bg-amber-500" />
                    <span className="text-[10px] text-muted-foreground">Actual</span>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-[11px] text-muted-foreground mt-1">
                Forecast currently unavailable.
              </p>
            )}
          </>
        )}

      </CardContent>
    </Card>
  )
}