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
 *   - Solar Production card with GTI-based forecast overlay and hourly comparison chart.
 *   - Grid layout switching intelligently between mobile (stacked layout) and desktop (side-by-side grid).
 *
 * Design Rationale:
 * -----------------
 * The page follows a "Progressive Disclosure" strategy. The HeroHeader provides
 * instantaneous system health (Online/Offline) and capacity, while the content
 * sections (Environment, Production, Energy, Battery) are grouped logically 
 * into 980px max-width containers to maintain readability on large displays 
 * while appearing as native widgets on mobile.
 *
 * @module pages/Overview
 */

import { useOverview, useToday, usePlantInfo, useDeviceList } from '../hooks/useGrowatt'
import { useRefresh } from '../context/RefreshContext'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import BatteryCard from '../components/BatteryCard'
import PowerFlowCard from '../components/PowerFlowCard'
import DailyCurveCard from '../components/DailyCurveCard'
import SOCCurveCard from '../components/SOCCurveCard'
import { useWeather } from '../hooks/useWeather'
import WeatherCard from '../components/WeatherCard'
import EnergyBreakdownCard from '../components/EnergyBreakdownCard'
import SolarProductionCard from '../components/SolarProductionCard'
import PlantMapCard from '../components/PlantMapCard'

// ── Header (Hero Section) ─────────────────────────────────────────────────────

/**
 * Top contextual header displaying key plant attributes.
 *
 * @component
 * @param {Object} props
 * @param {string} props.plantName
 * @param {string|number} props.plantCapacityKw
 * @param {string} props.serialNumber
 * @param {boolean} props.isOnline
 * @param {string} props.lastUpdate
 * @param {boolean} props.isLoading
 * @returns {JSX.Element}
 */
function HeroHeader({ plantName, plantCapacityKw, serialNumber, isOnline, lastUpdate, isLoading }) {
  return (
    <div className="bg-background pt-10 pb-5 md:pt-16 md:pb-8 px-4 md:px-6 flex flex-col items-center text-center border-b border-border/10">
      <div className="max-w-[1440px] w-full">
        {isLoading ? (
          <div className="flex flex-col items-center gap-4">
            <Skeleton className="h-14 w-64" />
            <Skeleton className="h-6 w-96" />
          </div>
        ) : (
          <>
            <Badge 
              variant="outline" 
              className={cn(
                "mb-4 border-border/20 font-normal rounded-full",
                isOnline ? "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20" : "bg-muted text-muted-foreground"
              )}
            >
              <span className={cn("mr-2 w-1.5 h-1.5 rounded-full inline-block", isOnline ? "bg-green-400" : "bg-muted-foreground")} />
              {isOnline ? 'System Online' : 'System Offline'}
            </Badge>
            
            <h1 className="text-[32px] md:text-[42px] font-semibold tracking-[-0.015em] leading-[1.07] mb-2 text-near-black dark:text-white">
              {plantName || 'Your GroWDash'}
            </h1>
            
            <div className="flex items-center justify-center gap-4 text-foreground/80 dark:text-white/80 text-[13px] font-medium tracking-tight">
              <span>{plantCapacityKw || '0'} kWp Capacity</span>
              {serialNumber && (
                <>
                  <span className="w-1 h-1 rounded-full bg-border" />
                  <span>S/N: {serialNumber}</span>
                </>
              )}
            </div>
            
            {lastUpdate && (
              <p className="mt-4 text-[10px] text-foreground/65 dark:text-white/65 font-semibold uppercase tracking-[0.12em]">
                Last synchronous update: {lastUpdate}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

/**
 * Overview main page.
 *
 * Aggregates data from plant info, real-time flow, weather and battery sources
 * into a responsive dashboard grouped by context (environment, flow, storage).
 *
 * @component
 * @returns {JSX.Element}
 */
export default function Overview() {
  const { data: plantInfo, isLoading: isPlantLoading } = usePlantInfo()
  const { data: overview, isLoading: isOverviewLoading } = useOverview()
  const { data: today, isLoading: isTodayLoading } = useToday()
  const { data: deviceList, isLoading: isDeviceLoading } = useDeviceList()
  const { data: weatherData } = useWeather()

  const isHeaderLoading = isPlantLoading || isOverviewLoading || isDeviceLoading

  const inverter = deviceList?.devices?.find(d => d.type === 7)
  const isOnline = inverter?.is_online ?? false
  const serialNumber = inverter?.serial_number

  // ── Pull-to-refresh (managed globally) ───────────────────────────────────
  const { lastUpdate } = useRefresh()

  return (
    <div className="bg-background min-h-dvh">

      <HeroHeader
        plantName={plantInfo?.name}
        plantCapacityKw={overview?.plant_capacity_kw}
        serialNumber={serialNumber}
        isOnline={isOnline}
        lastUpdate={lastUpdate}
        isLoading={isHeaderLoading}
      />

      {/* Page sections */}
      <div className="flex justify-center w-full">
        <div className="max-w-[1440px] w-full px-4 md:px-6 py-6 md:py-8 pb-28 md:pb-32 flex flex-col gap-8 md:gap-10">
          {/* 0+1+2. Plant Location, Environment & Production — side by side on desktop */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10 items-stretch">
            <section className="flex flex-col gap-4 h-full">
              <h2 className="text-[24px] font-semibold tracking-tight text-near-black dark:text-white px-1">
                Location
              </h2>
              <PlantMapCard
                plantName={plantInfo?.name}
                lat={plantInfo?.latitude}
                lon={plantInfo?.longitude}
                capacityKw={overview?.plant_capacity_kw}
                isLoading={isPlantLoading}
              />
            </section>

            {/* 1. Environment */}
            <section className="flex flex-col gap-4 h-full">
              <h2 className="text-[24px] font-semibold tracking-tight text-near-black dark:text-white px-1">
                Environment
              </h2>
              <WeatherCard data={weatherData} />
            </section>

            {/* 2. Production */}
            <section className="flex flex-col gap-4 h-full">
              <h2 className="text-[24px] font-semibold tracking-tight text-near-black dark:text-white px-1">
                Production
              </h2>
              <SolarProductionCard
                actualKwh={today?.flow?.today?.solar_kwh}
                plantCapacityKw={overview?.plant_capacity_kw}
                isLoading={isOverviewLoading || isPlantLoading || isTodayLoading}
              />
            </section>
          </div>

          {/* 3. Energy */}
          <section className="flex flex-col gap-4">
            <h2 className="text-[24px] font-semibold tracking-tight text-near-black dark:text-white px-1">
              Energy
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8 items-stretch">
              <PowerFlowCard
                solarW={today?.flow?.live?.solar_w}
                homeW={today?.flow?.live?.home_w}
                batteryChargeW={today?.flow?.live?.battery_charge_w}
                batteryDischargeW={today?.flow?.live?.battery_discharge_w}
                gridExportW={today?.flow?.live?.grid_export_w}
                gridImportW={today?.flow?.live?.grid_import_w}
              />
              <DailyCurveCard />
              <EnergyBreakdownCard today={today?.flow?.today} />
            </div>
          </section>

          {/* 4. Battery */}
          <section className="flex flex-col gap-4">
            <h2 className="text-[24px] font-semibold tracking-tight text-near-black dark:text-white px-1">
              Battery
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <BatteryCard
                socPct={today?.battery?.soc_pct}
                chargeW={today?.flow?.live?.battery_charge_w}
                dischargeW={today?.flow?.live?.battery_discharge_w}
                chargedTodayKwh={today?.battery?.charge_today_kwh}
                dischargedTodayKwh={today?.battery?.discharge_today_kwh}
              />
              <SOCCurveCard />
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
