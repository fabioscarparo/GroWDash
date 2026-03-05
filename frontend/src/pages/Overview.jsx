/**
 * Overview.jsx — Main dashboard page.
 *
 * Displays a summary of the current state of the PV system:
 * - Header with plant name, device serial number and online status
 * - KPI cards: today, month, year, total energy and CO2 saved
 * - Power Flow widget: live power values for all four system nodes
 * - Battery status card: SOC, charge/discharge totals
 */

import { useOverview, useToday, usePlantInfo, useDeviceList } from '../hooks/useGrowatt'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

// ── Header ───────────────────────────────────────────────────────────────────

/**
 * Page header showing plant name, device serial number and online status.
 * Online status is derived from the device list (type 7 = inverter).
 *
 * @param {object} props
 * @param {string} props.plantName - Name of the PV plant
 * @param {string} props.serialNumber - Inverter serial number
 * @param {boolean} props.isOnline - Whether the inverter is reachable
 */
function Header({ plantName, serialNumber, isOnline }) {
  return (
    <div className="flex items-start justify-between px-4 pt-6 pb-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">
          {plantName || 'GroWDash'}
        </h1>
        {serialNumber && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {serialNumber}
          </p>
        )}
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
 * Single KPI card showing a label, value and unit.
 *
 * @param {object} props
 * @param {string} props.label - Card label (e.g. "Today")
 * @param {string|number} props.value - Main value to display
 * @param {string} props.unit - Unit of measurement (e.g. "kWh")
 * @param {string} [props.sublabel] - Optional secondary label
 */
function KpiCard({ label, value, unit, sublabel }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
          {label}
        </p>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold text-foreground">
            {value ?? '—'}
          </span>
          {unit && (
            <span className="text-sm text-muted-foreground">{unit}</span>
          )}
        </div>
        {sublabel && (
          <p className="text-xs text-muted-foreground mt-1">{sublabel}</p>
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

      {/* Header — plant name, serial number and online status */}
      <Header
        plantName={plantInfo?.name}
        serialNumber={serialNumber}
        isOnline={isOnline}
      />

      <div className="px-4 flex flex-col gap-3">

        {/* KPI Grid — 2 columns */}
        <div className="grid grid-cols-2 gap-3">
          <KpiCard
            label="Today"
            value={overview?.today_energy_kwh}
            unit="kWh"
          />
          <KpiCard
            label="This month"
            value={overview?.monthly_energy_kwh}
            unit="kWh"
          />
          <KpiCard
            label="This year"
            value={overview?.yearly_energy_kwh}
            unit="kWh"
          />
          <KpiCard
            label="CO₂ saved"
            value={overview?.carbon_offset_kg}
            unit="kg"
          />
        </div>

        {/* Total energy — full width */}
        <KpiCard
          label="Total production"
          value={overview?.total_energy_kwh}
          unit="kWh"
          sublabel={`Plant capacity: ${overview?.plant_capacity_kw ?? '—'} kW`}
        />

        {/* Power Flow widget — coming soon */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Power Flow</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Coming soon...</p>
          </CardContent>
        </Card>

        {/* Battery card — coming soon */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Battery</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Coming soon...</p>
          </CardContent>
        </Card>

        <div className="h-2" />
      </div>
    </div>
  )
}