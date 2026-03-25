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
 * Data sources:
 *   - /energy/overview → today_energy_kwh, plant_capacity_kw
 *   - /energy/history  → 5-min snapshots, aggregated per hour for actual overlay
 *   - Open-Meteo GTI forecast via useSolarForecast
 */

import { useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { ChartContainer, ChartTooltip } from '@/components/ui/chart'
import { Sun } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Cell } from 'recharts'
import { Skeleton } from '@/components/ui/skeleton'
import { useSolarForecast } from '../hooks/useSolarForecast'
import { useSolarSettings } from '../hooks/useSolarSettings'
import { useHistory } from '../hooks/useGrowatt'

// ── Helpers ───────────────────────────────────────────────────────────────────

function localToday() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const chartConfig = {
  estimated: { label: 'Forecast',  color: 'hsl(var(--muted-foreground))' },
  actual:    { label: 'Actual',    color: '#f59e0b' },
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * @param {object}  props
 * @param {number}  props.actualKwh          - Today's actual production from Growatt
 * @param {number}  props.plantCapacityKw    - Plant peak power in kWp
 * @param {number}  props.lat                - Plant latitude
 * @param {number}  props.lon                - Plant longitude
 * @param {boolean} props.isLoading          - True while overview data is loading
 */
export default function SolarProductionCard({
  actualKwh,
  plantCapacityKw,
  lat,
  lon,
  isLoading,
}) {
  const { settings }       = useSolarSettings()
  const today              = localToday()
  const currentHour        = new Date().getHours()

  // ── Data fetching ─────────────────────────────────────────────────────────

  const { data: forecast } = useSolarForecast({
    lat, lon,
    tilt:    settings.tilt,
    azimuth: settings.azimuth,
  })

  const { data: history } = useHistory(today, today)

  // ── Hourly actual production (kWh) from 5-min history snapshots ───────────
  // Each snapshot has solar_w. Integrating over 5 min: kWh = W × (5/60) / 1000

  const hourlyActual = useMemo(() => {
    const acc = Array(24).fill(0)
    ;(history?.data ?? []).forEach(point => {
      const hour = parseInt(point.time?.slice(11, 13) ?? '0', 10)
      if (hour >= 0 && hour < 24) {
        acc[hour] += (point.solar_w || 0) * (5 / 60) / 1000
      }
    })
    return acc.map(v => Math.round(v * 1000) / 1000)
  }, [history])

  // ── Hourly estimated production from GTI + plant capacity + PR ────────────
  // Open-Meteo returns 24 hourly GTI values (W/m²) for today.

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

  const hasForecast    = !!(lat && lon && estimatedTotalKwh > 0)
  const progressPct    = hasForecast && estimatedTotalKwh > 0
    ? Math.min(Math.round(((actualKwh ?? 0) / estimatedTotalKwh) * 100), 100)
    : 0

  // ── Chart data: 24 hourly bars ────────────────────────────────────────────
  // Past/current hours show both estimated and actual.
  // Future hours show only the estimated forecast (dimmed).

  const chartData = useMemo(() =>
    Array.from({ length: 24 }, (_, h) => ({
      hour:      `${String(h).padStart(2, '0')}`,
      estimated: hourlyEstimated[h] ?? 0,
      actual:    h <= currentHour ? hourlyActual[h] : null,
      isFuture:  h > currentHour,
    })),
    [hourlyEstimated, hourlyActual, currentHour]
  )

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Card>
      <CardContent className="pt-4 pb-4">

        {/* Label */}
        <div className="flex items-center gap-1.5 mb-1">
          <Sun size={16} className="text-muted-foreground" />
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Solar Production
          </p>
        </div>

        {/* Actual production value */}
        <div className="flex items-baseline gap-1 mb-3">
          {isLoading ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <>
              <span className="text-2xl font-bold text-foreground">
                {actualKwh ?? '—'}
              </span>
              <span className="text-sm text-muted-foreground">kWh</span>
            </>
          )}
        </div>

        {/* Forecast section — only rendered when lat/lon are available */}
        {hasForecast && (
          <>
            <div className="h-px bg-border mb-3" />

            {/* Estimated max + progress */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] text-muted-foreground">
                  Estimated max today
                </span>
                <span className="text-[11px] font-semibold text-foreground">
                  {estimatedTotalKwh} kWh
                </span>
              </div>

              {/* Progress bar */}
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

            {/* Hourly forecast vs actual chart */}
            <ChartContainer config={chartConfig} className="h-20 w-full">
              <BarChart
                data={chartData}
                barCategoryGap="10%"
                barGap={1}
                margin={{ top: 2, right: 0, bottom: 0, left: 0 }}
              >
                <XAxis
                  dataKey="hour"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 8, fill: 'hsl(var(--muted-foreground))' }}
                  // Show only every 6 hours (00, 06, 12, 18)
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
                            <span className="inline-block w-2 h-2 rounded-full bg-muted-foreground/40" />
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

                {/* Forecast bars (background, dimmed) */}
                <Bar dataKey="estimated" maxBarSize={7} radius={[2, 2, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={
                        entry.isFuture
                          ? 'hsl(var(--muted-foreground) / 0.15)'
                          : 'hsl(var(--muted-foreground) / 0.25)'
                      }
                    />
                  ))}
                </Bar>

                {/* Actual production bars (amber, overlaid) */}
                <Bar
                  dataKey="actual"
                  maxBarSize={7}
                  fill="#f59e0b"
                  radius={[2, 2, 0, 0]}
                />

              </BarChart>
            </ChartContainer>

            {/* Legend */}
            <div className="flex justify-center gap-4 mt-1.5">
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-2.5 rounded-sm bg-muted-foreground/25" />
                <span className="text-[10px] text-muted-foreground">Forecast</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-2.5 rounded-sm bg-amber-500" />
                <span className="text-[10px] text-muted-foreground">Actual</span>
              </div>
            </div>
          </>
        )}

        {/* Prompt shown when plant coordinates are not available */}
        {!lat && !lon && !isLoading && (
          <p className="text-[11px] text-muted-foreground mt-1">
            Set panel orientation in Account → Solar Panel Settings to enable forecast.
          </p>
        )}

      </CardContent>
    </Card>
  )
}