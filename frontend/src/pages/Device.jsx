/**
 * Device.jsx — Hardware Overview & Technical Details Page.
 *
 * This component serves as a comprehensive dashboard for the photovoltaic system's hardware status.
 * It is responsible for fetching, parsing, and displaying technical telemetry for all connected modules.
 *
 * Key Features:
 *   - Auto-discovers and maps auxiliary modules (Dataloggers, Smart Meters) into individual cards.
 *   - Visualizes critical inverter telemetry (Firmware, Communication Version, Peak Power).
 *   - Extracts and presents nested Battery Storage operational limits (State of Charge constraints).
 *   - Implements a unified Shadcn UI layout consistent with the rest of the GroWDash application.
 *
 * Data Sources (via React Query Hooks):
 *   - useDeviceDetail(): Fetches deep telemetrics for the primary inverter and its attached battery pack.
 *   - useDeviceList(): Fetches the topography of all tracked auxiliary devices in the solar plant.
 * 
 * @module pages/Device
 */

import { useDeviceDetail, useDeviceList } from '../hooks/useGrowatt'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Cpu, Wifi, WifiOff, CircuitBoard, Battery, Radio } from 'lucide-react'

// ── Shared UI Components ──────────────────────────────────────────────────────

/**
 * DetailRow
 * 
 * A reusable, standardized row component for rendering key-value pairs of technical data.
 * It automatically collapses (returns null) if the incoming value is entirely empty or undefined,
 * preventing a cluttered UI with "N/A" or blank strings. It explicitly preserves strict falsy 
 * boolean values and the number `0` as legitimate telemetry.
 *
 * @component
 * @param {Object} props - The component properties.
 * @param {string} props.label - The human-readable descriptor for the metric (e.g., "Serial Number").
 * @param {string|number|boolean|null} props.value - The dynamic value to be displayed on the trailing edge.
 * @returns {JSX.Element|null} A formatted flex-row element, or nothing if the value is missing.
 */
function DetailRow({ label, value }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div className="flex items-start justify-between py-1.5 border-b border-border last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-medium text-foreground text-right ml-4">
        {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value}
      </span>
    </div>
  )
}

// ── Utility Functions ─────────────────────────────────────────────────────────

/**
 * deviceTypeLabel
 *
 * translates the numeric hardware identifier returned by the Growatt Cloud API
 * into a user-friendly string classification.
 *
 * @function deviceTypeLabel
 * @param {number} type - The integer identifying the device category (e.g., 7 for Inverters).
 * @returns {string} The localized, human-readable category name.
 */
function deviceTypeLabel(type) {
  if (type === 7) return 'Inverter'
  if (type === 3) return 'Datalogger / Meter'
  return `Type ${type}`
}

/**
 * getDeviceIcon
 *
 * dynamically resolves the appropriate Lucide-React icon representing the device's role
 * and its current network connectivity status. Defaults to a disconnected icon if offline.
 *
 * @function getDeviceIcon
 * @param {number} type - The integer identifying the device category.
 * @param {boolean} isOnline - The network presence flag corresponding to the device.
 * @returns {JSX.Element} A monochrome React SVG icon tailored for the device type.
 */
function getDeviceIcon(type, isOnline) {
  if (!isOnline) return <WifiOff size={16} className="text-muted-foreground" />
  if (type === 3) return <Radio size={16} className="text-muted-foreground" />
  return <Wifi size={16} className="text-muted-foreground" />
}

// ── Main Layout View ──────────────────────────────────────────────────────────

/**
 * Device (Default Export)
 *
 * The primary view controller for the `/device` route.
 * It synchronously coordinates multiple loading states from the backend proxy
 * and constructs a responsive, card-based interface detailing system diagnostics.
 * 
 * Architecture:
 *   1. Auxiliary Devices (Mapped dynamically, separating Meters from Dataloggers visually).
 *   2. Primary Inverter (Displays native technical identifiers and Cloud synchronization status).
 *   3. Storage Battery (Conditionally rendered only if a valid `bdc1Sn` serial is detected, unpacking SOC limits).
 *
 * @component
 * @returns {JSX.Element} The fully rendered Hardware Overview page.
 */
export default function Device() {
  const { data: detail, isLoading: loadingDetail } = useDeviceDetail()
  const { data: deviceList, isLoading: loadingList } = useDeviceList()

  // Filter out the inverter from the generic devices list to avoid redundancy,
  // since we dedicate a full card to the Inverter.
  const auxDevices = deviceList?.devices?.filter(d => d.type !== 7) || []

  return (
    <div className="bg-background min-h-dvh">
      {/* Header */}
      <div className="flex items-start justify-between px-4 pt-6 pb-4">
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">Hardware Overview</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-muted-foreground">Detailed telemetry and health status</span>
          </div>
        </div>
      </div>

      <div className="px-4 flex flex-col gap-4 pb-24">
        
        {/* 1. Auxiliary Devices (Datalogger & Meter) */}
        {loadingList ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground animate-pulse">Loading modules...</p>
            </CardContent>
          </Card>
        ) : auxDevices.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">No auxiliary modules found.</p>
            </CardContent>
          </Card>
        ) : (
          auxDevices.map(device => (
            <Card key={device.serial_number || device.datalogger_sn}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CircuitBoard size={16} className="text-muted-foreground" />
                    <CardTitle className="text-sm font-semibold">{deviceTypeLabel(device.type)}</CardTitle>
                  </div>
                  <Badge variant={device.is_online ? 'default' : 'secondary'} className="px-2 py-0.5 text-xs">
                    <span className={`mr-1.5 inline-block w-1.5 h-1.5 rounded-full ${device.is_online ? 'bg-green-400' : 'bg-muted-foreground'}`} />
                    {device.is_online ? 'Online' : 'Offline'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-1">
                  <DetailRow label="Serial Number" value={device.type === 3 ? device.datalogger_sn : device.serial_number} />
                  <DetailRow label="Manufacturer"  value={device.manufacturer} />
                  <DetailRow label="Last Update"   value={device.last_update} />
                </div>
              </CardContent>
            </Card>
          ))
        )}

        {/* 2. Inverter Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu size={16} className="text-muted-foreground" />
                <CardTitle className="text-sm font-semibold">Inverter</CardTitle>
              </div>
              {!loadingDetail && (
                <Badge variant={detail?.is_online ? 'default' : 'secondary'} className="px-2 py-0.5 text-xs">
                  <span className={`mr-1.5 inline-block w-1.5 h-1.5 rounded-full ${detail?.is_online ? 'bg-green-400' : 'bg-muted-foreground'}`} />
                  {detail?.is_online ? 'Online' : 'Offline'}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loadingDetail ? (
              <p className="text-sm text-muted-foreground animate-pulse">Loading inverter data...</p>
            ) : (
              <div className="flex flex-col gap-1">
                <DetailRow label="Serial Number"       value={detail?.serial_number} />
                <DetailRow label="Model"               value={detail?.model} />
                <DetailRow label="Peak Power"          value={detail?.peak_power_w ? `${detail.peak_power_w / 1000} kW` : null} />
                <DetailRow label="Firmware Version"    value={detail?.firmware_version} />
                <DetailRow label="Comm Version"        value={detail?.communication_version} />
                <DetailRow label="Status"              value={detail?.status_text} />
                <DetailRow label="Last Update"         value={detail?.last_update} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* 3. Battery Card */}
        {(!loadingDetail && detail?.battery) && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Battery size={16} className="text-muted-foreground" />
                <CardTitle className="text-sm font-semibold">Storage Battery</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-1">
                <DetailRow label="Serial Number"       value={detail.battery.serial_number} />
                <DetailRow label="Model ID"            value={detail.battery.model} />
                <DetailRow label="System Capacity"     value={`${detail.battery.system_energy_kwh / 10} kWh`} /> 
                <DetailRow label="BDC Version"         value={detail.battery.version} />
                <div className="mt-4 mb-2">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Operational Limits (SOC)</span>
                </div>
                <DetailRow label="AC Charge Stop SOC"  value={detail.battery.ac_charging_stop_soc !== "" && detail.battery.ac_charging_stop_soc !== "N/A" ? `${detail.battery.ac_charging_stop_soc}%` : null} />
                <DetailRow label="On-Grid Discharge Stop" value={detail.battery.on_grid_discharge_stop_soc !== "" ? `${detail.battery.on_grid_discharge_stop_soc}%` : null} />
                <DetailRow label="Winter On-Grid Stop" value={detail.battery.win_mode_on_grid_discharge_stop_soc !== "" ? `${detail.battery.win_mode_on_grid_discharge_stop_soc}%` : null} />
                <DetailRow label="Winter Off-Grid Stop" value={detail.battery.win_mode_off_grid_discharge_stop_soc !== "" ? `${detail.battery.win_mode_off_grid_discharge_stop_soc}%` : null} />
                <DetailRow label="Charge Low Limit" value={detail.battery.charge_soc_low_limit !== "" ? `${detail.battery.charge_soc_low_limit}%` : null} />
                <DetailRow label="Discharge Low Limit" value={detail.battery.discharge_soc_low_limit !== "" ? `${detail.battery.discharge_soc_low_limit}%` : null} />
                <DetailRow label="Peak Shaving Backup" value={detail.battery.peak_shaving_backup_soc !== "" ? `${detail.battery.peak_shaving_backup_soc}%` : null} />
                <DetailRow label="Discharge Stop (Raw)" value={detail.battery.discharge_stop_soc !== "" ? `${detail.battery.discharge_stop_soc}%` : null} />
                <DetailRow label="Charge Stop (Raw)" value={detail.battery.charge_stop_soc !== "" ? `${detail.battery.charge_stop_soc}%` : null} />
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  )
}