/**
 * Device.jsx — Inverter technical details page.
 *
 * This page provides a comprehensive overview of the PV system's hardware.
 * It displays two main sections:
 * 1. A list of all connected devices (data loggers, energy meters).
 * 2. Detailed technical parameters for the primary inverter.
 *
 * Data sources:
 *   - /device/detail → Inverter technical details (firmware, status, etc.)
 *   - /device/list   → List of all connected auxiliary devices
 * 
 * @module pages/Device
 */

import { useDeviceDetail, useDeviceList } from '../hooks/useGrowatt'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Cpu, Wifi, WifiOff, CircuitBoard } from 'lucide-react'

// ── Detail Row ────────────────────────────────────────────────────────────────

/**
 * A reusable component that renders a single row of detailed information.
 * It automatically hides itself if the provided value is null or undefined 
 * (except for 0, which is deemed valid).
 *
 * @param {Object} props - The component props.
 * @param {string} props.label - The descriptive label for the data point.
 * @param {string|number|null} props.value - The value to display.
 * @returns {JSX.Element|null} The row element, or null if value is missing.
 */
function DetailRow({ label, value }) {
  if (!value && value !== 0) return null
  return (
    <div className="flex items-start justify-between py-1 border-b border-border last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-medium text-foreground text-right ml-4">{value}</span>
    </div>
  )
}

// ── Device Type Label ─────────────────────────────────────────────────────────

/**
 * Helper function to convert Growatt's internal numeric device types
 * into human-readable strings.
 *
 * @param {number} type - The integer representing the hardware type.
 * @returns {string} The human-readable device category.
 */
function deviceTypeLabel(type) {
  if (type === 7) return 'Inverter'
  if (type === 3) return 'Datalogger'
  return `Type ${type}`
}

// ── Page ──────────────────────────────────────────────────────────────────────

/**
 * The Device page component.
 * 
 * It fetches both the list of connected devices and the detailed metadata
 * for the main inverter simultaneously. It handles loading states gracefully
 * and renders a responsive list of cards containing the technical telemetry.
 *
 * @returns {JSX.Element} The completely rendered Device page.
 */
export default function Device() {
  const { data: detail, isLoading: loadingDetail } = useDeviceDetail()
  const { data: deviceList, isLoading: loadingList } = useDeviceList()

  return (
    <div className="bg-background min-h-dvh">

      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-xl font-bold text-foreground">Device</h1>
      </div>

      <div className="px-4 flex flex-col gap-3 pb-24">

        {/* Connected devices list */}
        <Card className="gap-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CircuitBoard size={16} className="text-muted-foreground" />
              <CardTitle className="text-sm font-semibold">Connected devices</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {loadingList ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : (
              <div className="flex flex-col gap-2">
                {deviceList?.devices?.map(device => (
                  <div
                    key={device.serial_number}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      {device.is_online
                        ? <Wifi size={16} className="text-green-500" />
                        : <WifiOff size={16} className="text-muted-foreground" />
                      }
                      <div>
                        <p className="text-xs font-medium text-foreground">
                          {deviceTypeLabel(device.type)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          SN: {device.type === 3 ? device.datalogger_sn : device.serial_number}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        {device.model ? `Model: ${device.model}` : '—'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {device.last_update ? `Last update: ${device.last_update}` : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Inverter detail card */}
        <Card className="gap-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu size={16} className="text-muted-foreground" />
                <CardTitle className="text-sm font-semibold">Inverter</CardTitle>
              </div>
              {!loadingDetail && (
                <Badge
                  variant={detail?.is_online ? 'default' : 'secondary'}
                >
                  <span className={`mr-1.5 inline-block w-1.5 h-1.5 rounded-full ${detail?.is_online ? 'bg-green-400' : 'bg-muted-foreground'}`} />
                  {detail?.is_online ? 'Online' : 'Offline'}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loadingDetail ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : (
              <>
                <DetailRow label="Serial number"       value={detail?.serial_number} />
                <DetailRow label="Model"               value={detail?.model} />
                <DetailRow label="Peak power"          value={detail?.peak_power_w ? `${detail.peak_power_w / 1000} kW` : null} />
                <DetailRow label="Firmware"            value={detail?.firmware_version} />
                <DetailRow label="Monitor version"     value={detail?.monitor_version} />
                <DetailRow label="Communication"       value={detail?.communication_version} />
                <DetailRow label="Datalogger SN"       value={detail?.datalogger_sn} />
                <DetailRow label="Last update"         value={detail?.last_update} />
              </>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  )
}