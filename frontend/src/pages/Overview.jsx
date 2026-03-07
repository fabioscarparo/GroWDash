/**
 * Overview.jsx — Main dashboard page.
 *
 * Displays a summary of the current state of the PV system:
 * - Header with plant name, capacity, serial number and online status
 * - KPI cards: today's production and CO2 saved
 * - Power Flow widget: live power values for all four system nodes
 * - Battery status card: SOC, charge/discharge totals
 */

import { useCallback, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useOverview, useToday, usePlantInfo, useDeviceList } from '../hooks/useGrowatt'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Sun, Leaf, RefreshCw } from 'lucide-react'
import BatteryCard from '../components/BatteryCard'
import PowerFlowCard from '../components/PowerFlowCard'
import DailyCurveCard from '../components/DailyCurveCard'
import SOCCurveCard from '../components/SOCCurveCard'
import { usePullToRefresh } from '../hooks/usePullToRefresh'
import { useWeather } from '../hooks/useWeather'
import WeatherCard from '../components/WeatherCard'
import EnergyBreakdownCard from '../components/EnergyBreakdownCard'

// ── Header ───────────────────────────────────────────────────────────────────

function Header({ plantName, plantCapacityKw, serialNumber, isOnline, lastUpdate }) {
  return (
    <div className="flex items-start justify-between px-4 pt-6 pb-4">
      <div>
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
      </div>
      <Badge variant={isOnline ? 'default' : 'secondary'} className="mt-1">
        <span className={`mr-1.5 inline-block w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-400' : 'bg-muted-foreground'}`} />
        {isOnline ? 'Online' : 'Offline'}
      </Badge>
    </div>
  )
}

// ── KPI Cards ────────────────────────────────────────────────────────────────

function KpiCard({ icon, label, value, unit, sublabel }) {
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
        {sublabel && (
          <p className="text-xs text-muted-foreground mt-0.5">{sublabel}</p>
        )}
      </CardContent>
    </Card>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function Overview() {
  const { data: plantInfo } = usePlantInfo()
  const { data: overview } = useOverview()
  const { data: today } = useToday()
  const { data: deviceList } = useDeviceList()
  const { data: weatherData } = useWeather(plantInfo?.latitude, plantInfo?.longitude)

  const inverter = deviceList?.devices?.find(d => d.type === 7)
  const isOnline = inverter?.is_online ?? false
  const serialNumber = inverter?.serial_number

  // ── Pull-to-refresh ─────────────────────────────────────────────────────

  const queryClient = useQueryClient()
  const [lastUpdate, setLastUpdate] = useState(() => {
    const d = new Date()
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  })
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    await queryClient.invalidateQueries({ queryKey: ['energy'] })
    const d = new Date()
    setLastUpdate(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`)
    setIsRefreshing(false)
  }, [queryClient])

  const { pulling, pullDistance, progress } = usePullToRefresh(handleRefresh)

  return (
    <div className="bg-background min-h-dvh">

      {/* Refresh indicator — slides in from top */}
      <div
        className="fixed left-0 right-0 z-50 flex justify-center pointer-events-none"
        style={{
          top: 0,
          transform: isRefreshing
            ? 'translateY(12px)'
            : `translateY(calc(-100% + ${pullDistance}px))`,
          transition: pulling ? 'none' : 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        <div
          className="bg-card border border-border rounded-full px-3 py-1.5 shadow-md flex items-center gap-2"
          style={{
            animation: progress >= 0.9 && !isRefreshing ? 'ptr-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none',
          }}
        >
          <RefreshCw
            size={14}
            className={isRefreshing ? 'text-primary' : progress >= 0.9 ? 'text-primary' : 'text-muted-foreground'}
            style={{
              animation: isRefreshing
                ? 'spin 0.8s linear infinite'
                : progress >= 0.9
                  ? 'ptr-wiggle 0.4s ease-out'
                  : 'none',
              transform: (!isRefreshing && progress < 0.9)
                ? `rotate(${progress * 360}deg)`
                : undefined,
            }}
          />
          <span
            key={isRefreshing ? 'refreshing' : progress >= 0.9 ? 'release' : 'pull'}
            className="text-xs text-muted-foreground"
            style={{ animation: 'ptr-text-in 0.2s ease-out' }}
          >
            {isRefreshing ? 'Updating...' : progress >= 0.9 ? 'Release to refresh' : 'Pull to refresh'}
          </span>
        </div>
      </div>

      <Header
        plantName={plantInfo?.name}
        plantCapacityKw={overview?.plant_capacity_kw}
        serialNumber={serialNumber}
        isOnline={isOnline}
        lastUpdate={lastUpdate}
      />

      <div className="px-4 flex flex-col gap-3 pb-4">
        <WeatherCard data={weatherData} />
        <div className="grid grid-cols-2 gap-3">
          <KpiCard icon={<Sun size={16} />} label="Today" value={overview?.today_energy_kwh} unit="kWh" />
          <KpiCard icon={<Leaf size={16} />} label="CO₂ saved" value={overview?.carbon_offset_kg} unit="kg" />
        </div>
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

        <SOCCurveCard />
        
        <BatteryCard
          socPct={today?.battery?.soc_pct}
          chargeW={today?.flow?.live?.battery_charge_w}
          dischargeW={today?.flow?.live?.battery_discharge_w}
          chargedTodayKwh={today?.battery?.charge_today_kwh}
          dischargedTodayKwh={today?.battery?.discharge_today_kwh}
        />
        
      </div>
    </div>
  )
}