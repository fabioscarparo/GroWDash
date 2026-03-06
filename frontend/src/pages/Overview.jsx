/**
 * Overview.jsx — Main dashboard page.
 *
 * Displays a summary of the current state of the PV system:
 * - Header with plant name, capacity, serial number and online status
 * - KPI cards: today's production and CO2 saved
 * - Power Flow widget: live power values for all four system nodes
 * - Battery status card: SOC, charge/discharge totals
 */

import { useOverview, useToday, usePlantInfo, useDeviceList } from '../hooks/useGrowatt'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Sun, Zap, Leaf } from 'lucide-react'
import BatteryCard from '../components/BatteryCard'
import PowerFlowCard from '../components/PowerFlowCard'

// ── Header ───────────────────────────────────────────────────────────────────

/**
 * Page header showing plant name, capacity, serial number and online status.
 * Online status is derived from the device list (type 7 = inverter).
 *
 * @param {object} props
 * @param {string} props.plantName - Name of the PV plant
 * @param {number} props.plantCapacityKw - Peak power capacity of the plant (kW)
 * @param {string} props.serialNumber - Inverter serial number
 * @param {boolean} props.isOnline - Whether the inverter is reachable
 */
function Header({ plantName, plantCapacityKw, serialNumber, isOnline }) {
  return (
    <div className="flex items-start justify-between px-4 pt-6 pb-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">
          {plantName || 'GroWDash'}
        </h1>
        <div className="flex items-center gap-2 mt-0.5">
          {plantCapacityKw && (
            <span className="text-xs text-muted-foreground">
              {plantCapacityKw} kWp
            </span>
          )}
          {serialNumber && plantCapacityKw && (
            <span className="text-xs text-muted-foreground">·</span>
          )}
          {serialNumber && (
            <span className="text-xs text-muted-foreground">
              {serialNumber}
            </span>
          )}
        </div>
      </div>
      <Badge
        variant={isOnline ? 'default' : 'secondary'}
        className="mt-1"
      >
        <span className={`mr-1.5 inline-block w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-400' : 'bg-muted-foreground'}`} />
        {isOnline ? 'Online' : 'Offline'}
      </Badge>
    </div>
  )
}

// ── KPI Cards ────────────────────────────────────────────────────────────────

/**
 * Single KPI card showing an icon, label, value and unit.
 *
 * @param {object} props
 * @param {JSX.Element} props.icon - Lucide icon component
 * @param {string} props.label - Card label (e.g. "Today")
 * @param {string|number} props.value - Main value to display
 * @param {string} props.unit - Unit of measurement (e.g. "kWh")
 * @param {string} [props.sublabel] - Optional secondary label
 */
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

  // Find the inverter (type 7) from the device list to get real online status
  const inverter = deviceList?.devices?.find(d => d.type === 7)
  const isOnline = inverter?.is_online ?? false
  const serialNumber = inverter?.serial_number

  return (
    <div className="bg-background min-h-dvh">

      {/* Header — plant name, capacity, serial number and online status */}
      <Header
        plantName={plantInfo?.name}
        plantCapacityKw={overview?.plant_capacity_kw}
        serialNumber={serialNumber}
        isOnline={isOnline}
      />

      <div className="px-4 flex flex-col gap-3">

        {/* KPI Grid — 2 columns */}
        <div className="grid grid-cols-2 gap-3">
          <KpiCard
            icon={<Sun size={16} />}
            label="Today"
            value={overview?.today_energy_kwh}
            unit="kWh"
          />
          <KpiCard
            icon={<Leaf size={16} />}
            label="CO₂ saved"
            value={overview?.carbon_offset_kg}
            unit="kg"
          />
        </div>

        {/* Total production — full width */}
        <KpiCard
          icon={<Zap size={16} />}
          label="Total production"
          value={overview?.total_energy_kwh}
          unit="kWh"
        />

        <PowerFlowCard
          solarW={today?.flow?.live?.solar_w}
          homeW={today?.flow?.live?.home_w}
          batteryChargeW={today?.flow?.live?.battery_charge_w}
          batteryDischargeW={today?.flow?.live?.battery_discharge_w}
          gridExportW={today?.flow?.live?.grid_export_w}
          gridImportW={today?.flow?.live?.grid_import_w}
        />

        {/* Battery status card */}
        <BatteryCard
          socPct={today?.battery?.soc_pct}
          chargeW={today?.flow?.live?.battery_charge_w}
          dischargeW={today?.flow?.live?.battery_discharge_w}
          chargedTodayKwh={today?.battery?.charge_today_kwh}
          dischargedTodayKwh={today?.battery?.discharge_today_kwh}
        />

        <div className="h-2" />
      </div>
    </div>
  )
}