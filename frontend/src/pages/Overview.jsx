/**
 * Overview.jsx — Main dashboard entry page.
 *
 * This is the primary landing view for the GroWDash application. It aggregates multiple
 * data streams to provide a real-time glance at the state of the PV system.
 *
 * Features:
 *   - Main header displaying plant name, dynamic peak capacity, and connection status.
 *   - Implements native-like "Pull-to-Refresh" functionality to manually invalidate TanStack Query caches.
 *   - Weather overview reflecting real-time conditions at the plant's coordinates.
 *   - KPI summaries for today's yields and lifetime environmental impact.
 *   - Grid layout switching intelligently between mobile (stacked layout) and desktop (side-by-side grid).
 *
 * @module pages/Overview
 */

import { useCallback, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useOverview, useToday, usePlantInfo, useDeviceList } from '../hooks/useGrowatt'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Sun, RefreshCw } from 'lucide-react'
import BatteryCard from '../components/BatteryCard'
import PowerFlowCard from '../components/PowerFlowCard'
import DailyCurveCard from '../components/DailyCurveCard'
import SOCCurveCard from '../components/SOCCurveCard'
// import { usePullToRefresh } from '../hooks/usePullToRefresh' // Removed local usage
import { useWeather } from '../hooks/useWeather'
import WeatherCard from '../components/WeatherCard'
import EnergyBreakdownCard from '../components/EnergyBreakdownCard'
import { Skeleton } from '@/components/ui/skeleton'

// ── Header ────────────────────────────────────────────────────────────────────

/**
 * Top contextual header displaying key plant attributes.
 *
 * @param {Object} props - Component props.
 * @param {string} props.plantName - The name assigned to the photovoltaic plant.
 * @param {string|number} props.plantCapacityKw - The total maximum output in kWp (Kilowatt Peak).
 * @param {string} props.serialNumber - The tracked inverter's serial number.
 * @param {boolean} props.isOnline - True if the connected inverter has reported data recently.
 * @param {string} props.lastUpdate - Time string of the last successful client-side data refresh.
 * @returns {JSX.Element} The rendered header block.
 */
function Header({ plantName, plantCapacityKw, serialNumber, isOnline, lastUpdate, isLoading }) {
  return (
    <div className="flex items-start justify-between px-4 pt-6 pb-4">
      <div className="flex-1">
        {isLoading ? (
          <>
            <Skeleton className="h-7 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold text-foreground">
              {plantName || 'GroWDash'}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              {plantCapacityKw && (
                <span className="text-xs text-muted-foreground">{plantCapacityKw} kWp</span>
              )}
              {serialNumber && plantCapacityKw && (
                <span className="text-xs text-muted-foreground">·</span>
              )}
              {serialNumber && (
                <span className="text-xs text-muted-foreground">{serialNumber}</span>
              )}
              {lastUpdate && (
                <>
                  <span className="text-xs text-muted-foreground">·</span>
                  <span className="text-xs text-muted-foreground">Updated {lastUpdate}</span>
                </>
              )}
            </div>
          </>
        )}
      </div>
      {isLoading ? (
        <Skeleton className="h-6 w-16 rounded-full mt-1" />
      ) : (
        <Badge variant={isOnline ? 'default' : 'secondary'} className="mt-1">
          <span className={`mr-1.5 inline-block w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-400' : 'bg-muted-foreground'}`} />
          {isOnline ? 'Online' : 'Offline'}
        </Badge>
      )}
    </div>
  )
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

/**
 * A reusable KPI presentation card. Layout consists of an upper title/icon row
 * and a lower emphasis row for the metric itself.
 *
 * @param {Object} props - Component props.
 * @param {JSX.Element} props.icon - A Lucide React icon.
 * @param {string} props.label - Descriptive title of the metric.
 * @param {number|string} props.value - The main metric value payload.
 * @param {string} props.unit - The unit suffix to display.
 * @param {string} [props.sublabel] - Optional subtle text spanning below the main value.
 * @returns {JSX.Element} The KPI Card wrapper.
 */
function KpiCard({ icon, label, value, unit, sublabel, isLoading }) {
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
          {isLoading ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <>
              <span className="text-2xl font-bold text-foreground">{value ?? '—'}</span>
              {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
            </>
          )}
        </div>
        {sublabel && (
          <p className="text-xs text-muted-foreground mt-0.5">{sublabel}</p>
        )}
      </CardContent>
    </Card>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

/**
 * The Overview main page.
 *
 * This functional component manages pulling and dispatching data into numerous
 * child widget components. It implements `usePullToRefresh` hook logic to animate
 * a custom mobile-native feeling spinner that forces query invalidation.
 *
 * @returns {JSX.Element} The completely assembled Overview view.
 */
export default function Overview() {
  const { data: plantInfo, isLoading: isPlantLoading }  = usePlantInfo()
  const { data: overview, isLoading: isOverviewLoading }   = useOverview()
  const { data: today }      = useToday()
  const { data: deviceList, isLoading: isDeviceLoading } = useDeviceList()
  const { data: weatherData } = useWeather(plantInfo?.latitude, plantInfo?.longitude)

  const isHeaderLoading = isPlantLoading || isOverviewLoading || isDeviceLoading

  const inverter     = deviceList?.devices?.find(d => d.type === 7)
  const isOnline     = inverter?.is_online ?? false
  const serialNumber = inverter?.serial_number

  // ── Pull-to-refresh ───────────────────────────────────────────────────────

  const queryClient = useQueryClient()
  const [lastUpdate, setLastUpdate] = useState(() => {
    const d = new Date()
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  })

  // Local refresh indicator removed in favor of global one in App.jsx

  /**
   * Callback fired sequentially when the user completes a valid pull-to-refresh action.
   * It triggers a hard invalidation array targeting the "energy" cache key for TanStack query, 
   * forcing all widgets to synchronize and fetch new data bounds.
   */
  const handleRefresh = useCallback(async () => {
    // Note: Overview-specific refresh handled via global refresh chip in App.jsx
    // This local state update can remain if needed for the header "Updated" display
    await queryClient.invalidateQueries({ queryKey: ['energy'] })
    const d = new Date()
    setLastUpdate(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`)
  }, [queryClient])

  // Removed local usePullToRefresh call

  return (
    <div className="bg-background min-h-dvh">

      <Header
        plantName={plantInfo?.name}
        plantCapacityKw={overview?.plant_capacity_kw}
        serialNumber={serialNumber}
        isOnline={isOnline}
        lastUpdate={lastUpdate}
        isLoading={isHeaderLoading}
      />

      <div className="px-4 flex flex-col gap-3 pb-4">

        {/* Weather and Solar Production KPI side-by-side on desktop, stacked on mobile */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <WeatherCard data={weatherData} />
          <KpiCard
            icon={<Sun size={16} />}
            label="Solar Production"
            value={overview?.today_energy_kwh}
            unit="kWh"
            isLoading={isOverviewLoading}
          />
        </div>

        {/* Grid switching: interactive Node Flow and Intraday Curvage graph side by side on wide screens */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <PowerFlowCard
            solarW={today?.flow?.live?.solar_w}
            homeW={today?.flow?.live?.home_w}
            batteryChargeW={today?.flow?.live?.battery_charge_w}
            batteryDischargeW={today?.flow?.live?.battery_discharge_w}
            gridExportW={today?.flow?.live?.grid_export_w}
            gridImportW={today?.flow?.live?.grid_import_w}
          />
          <DailyCurveCard />
        </div>

        {/* Stacked-bar widget dissecting the current day's accumulated energy yields versus consumption */}
        <EnergyBreakdownCard today={today?.flow?.today} />

        {/* Lower tier: Battery operational parameters and corresponding intraday State of Charge (SOC) tracking */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <BatteryCard
            socPct={today?.battery?.soc_pct}
            chargeW={today?.flow?.live?.battery_charge_w}
            dischargeW={today?.flow?.live?.battery_discharge_w}
            chargedTodayKwh={today?.battery?.charge_today_kwh}
            dischargedTodayKwh={today?.battery?.discharge_today_kwh}
          />
          <SOCCurveCard />
        </div>

      </div>
    </div>
  )
}