/**
 * TechnicalInfo.jsx — Hardware and operational telemetry view.
 *
 * This page consolidates all hardware-level parameters, firmware versions,
 * and operational configurations into a unified settings-style interface.
 * It provides a deep dive into the inverter's internal state without the 
 * abstraction layer seen on the Overview page.
 *
 * Design Rationale:
 * -----------------
 * Uses a compact, high-density visual hierarchy with 
 * .settings-row components grouped inside .premium-glass cards.
 * Data is categorized into:
 * 1. System Components (Lifecycle & Connectivity)
 * 2. Energy Storage (Battery Health & Specs)
 * 3. Configuration (Grid & Work Modes)
 * 4. Operational Logic (Charging rates & limits)
 */

import { useDeviceDetail, useDeviceList, useDeviceSettings } from '../hooks/useGrowatt'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Cpu,
  Wifi,
  WifiOff,
  Battery,
  Settings,
  Zap,
  ShieldCheck,
  Activity,
  Globe,
  Hash,
  Terminal,
  ArrowLeftRight,
  BatteryFull,
  Binary,
  Layers,
  MapPin,
  Gauge,
  Settings2,
  PlugZap,
  ArrowDownToLine,
  Hand,
  ArrowRightFromLine,
  TrendingDown,
  Umbrella,
  LifeBuoy
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

// ── Shared UI Components ──────────────────────────────────────────────────────

/**
 * TechGroup
 * A structured container for technical data rows, mirroring grouped preferences layouts.
 */
function TechGroup({ title, children, icon: Icon }) {
  return (
    <div className="space-y-2.5">
      {title && (
        <div className="flex items-center gap-2 px-1">
          {Icon && <Icon size={18} className="text-foreground/60" strokeWidth={2} />}
          <h2 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider pl-0.5 font-display">
            {title}
          </h2>
        </div>
      )}
      <Card className="premium-glass border-white/20 dark:border-white/5 overflow-hidden py-0 shadow-sm">
        <CardContent className="p-0 divide-y divide-border/10">
          {children}
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * TechRow
 * A specialized data row for technical specs.
 */
function TechRow({ label, value, icon: Icon, subValue }) {
  return (
    <div className="settings-row group/row">
      <div className="flex items-center gap-3">
        {Icon && <Icon size={17} strokeWidth={2} className="text-muted-foreground shrink-0" />}
        <div className="flex flex-col">
          <span className="text-[15px] font-medium text-foreground/90 leading-tight">{label}</span>
          {subValue && <span className="text-[11px] text-muted-foreground/60 font-medium">{subValue}</span>}
        </div>
      </div>
      <div className="flex items-center gap-3 text-right">
        <span className="text-[15px] font-semibold text-near-black dark:text-white/90">
          {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value}
        </span>
      </div>
    </div>
  )
}

// ── Status Formatters ─────────────────────────────────────────────────────────

function enabled(val) {
  if (val === 1 || val === true) return <span className="font-bold text-foreground">Enabled</span>
  if (val === 0 || val === false) return <span className="text-muted-foreground/40 italic">Disabled</span>
  return '—'
}

/**
 * Maps inverter on/off numeric flags to readable status chips.
 */
function onOff(val) {
  if (val === 1) return <span className="text-green-600 dark:text-green-400 font-bold">On</span>
  return <span className="text-muted-foreground/40 italic">Off</span>
}

/**
 * Converts inverter work-mode codes into user-facing labels.
 */
function workMode(val) {
  if (val === null || val === undefined) return null
  const modes = { 0: 'Self-use', 1: 'Feed-in priority', 2: 'Battery first', 3: 'Off-grid' }
  return modes[val] ?? `Mode ${val}`
}

/**
 * Converts battery DC mode codes into readable labels.
 */
function bdcMode(val) {
  if (val === null || val === undefined) return null
  const modes = { 0: 'Auto', 1: 'Charge', 2: 'Discharge' }
  return modes[val] ?? `Mode ${val}`
}

/**
 * Maps connected device type codes to descriptive names.
 */
function deviceTypeLabel(type) {
  if (type === 7) return 'Inverter'
  if (type === 3) return 'Datalogger'
  return `Module (${type})`
}

/**
 * Selects the icon used for each device row according to type and online state.
 */
function getDeviceIcon(type, isOnline) {
  if (!isOnline) return WifiOff
  if (type === 3) return Wifi
  if (type === 7) return Cpu
  return Cpu
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function TechnicalInfo() {
  const { data: detail, isLoading: loadingDetail } = useDeviceDetail()
  const { data: deviceList, isLoading: loadingList } = useDeviceList()
  const { data: s, isLoading: loadingSettings } = useDeviceSettings()

  const auxDevices = deviceList?.devices?.filter(d => d.type !== 7) || []
  const isLoading = loadingDetail || loadingList || loadingSettings

  // Loading Skeleton View
  if (isLoading) {
    return (
      <div className="bg-background min-h-dvh flex flex-col items-center">
        <div className="w-full max-w-[1440px] px-5 py-24 space-y-12">
          <Skeleton className="h-40 w-full rounded-3xl" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Skeleton className="h-64 w-full rounded-2xl" /><Skeleton className="h-64 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-background min-h-dvh flex flex-col items-center">

      <div className="w-full max-w-[1440px] px-4 md:px-6 flex flex-col gap-8 md:gap-10 py-6 md:py-8 pb-32">

        {/* Unified Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-12 items-start">

          {/* COLUMN 1: Hardware & Storage */}
          <div className="space-y-12">

            {/* Core System Components (Elevated Datalogger) */}
            <TechGroup title="System Components" icon={Cpu} iconBg="bg-blue-600">
              <TechRow
                label="Primary Inverter"
                value={detail?.is_online ? <span className="text-green-600 dark:text-green-400 font-bold">Online</span> : 'Offline'}
                subValue={`${detail?.model} • S/N: ${detail?.serial_number}`}
                icon={Cpu}
                iconBg="bg-neutral-500"
              />
              {auxDevices.map(device => (
                <TechRow
                  key={device.serial_number || device.datalogger_sn}
                  label={deviceTypeLabel(device.type)}
                  value={device.is_online ? <span className="text-green-600 dark:text-green-400 font-bold">Online</span> : 'Offline'}
                  subValue={device.serial_number || device.datalogger_sn}
                  icon={getDeviceIcon(device.type, device.is_online)}
                  iconBg="bg-neutral-500"
                />
              ))}
              <TechRow label="Hardware Version" value={detail?.firmware_version} subValue="Firmware" icon={Terminal} iconBg="bg-neutral-500" />
              <TechRow label="Comm Version" value={detail?.communication_version} icon={ArrowLeftRight} iconBg="bg-neutral-500" />
              <TechRow label="Peak Power Cap" value={`${(detail?.peak_power_w / 1000).toFixed(1)} kW`} icon={Zap} iconBg="bg-neutral-500" />
            </TechGroup>

            {/* Energy Storage (Pro Battery Health style) */}
            {detail?.battery && (
              <TechGroup title="Energy Storage" icon={Battery} iconBg="bg-green-500">
                <TechRow
                  label="System Capacity"
                  value="100%"
                  subValue={`${(detail.battery.system_energy_kwh / 10).toFixed(1)} kWh • ${detail.battery.model}`}
                  icon={BatteryFull}
                  iconBg="bg-neutral-500"
                />
                <TechRow label="Battery Firmware" value={detail.battery.version} icon={Binary} iconBg="bg-neutral-500" />
                <TechRow label="Pack Serial" value={detail.battery.serial_number} icon={Hash} iconBg="bg-neutral-500" />
              </TechGroup>
            )}
          </div>

          {/* COLUMN 2: Operational States & Configuration */}
          <div className="space-y-12">

            {/* System Operational Configuration */}
            <TechGroup title="System Configuration" icon={Settings} iconBg="bg-orange-500">
              <TechRow label="Operating State" value={onOff(s?.onOff)} icon={Activity} iconBg="bg-neutral-500" />
              <TechRow label="Work Mode" value={workMode(s?.bsystemWorkMode)} icon={Layers} iconBg="bg-neutral-500" />
              <TechRow label="Registry Region" value={s?.region} icon={MapPin} iconBg="bg-neutral-500" />
              <TechRow label="Grid Interaction" value={s?.gridCode} icon={Globe} iconBg="bg-neutral-500" />
              <TechRow label="Power Output Rate" value={`${s?.activeRate}%`} icon={Gauge} iconBg="bg-neutral-500" />
            </TechGroup>

            {/* Storage Operational Logic */}
            <TechGroup title="Storage Parameters" icon={BatteryFull} iconBg="bg-amber-500">
              <TechRow label="BDC Charging Mode" value={bdcMode(s?.bdcMode)} icon={Settings2} iconBg="bg-neutral-500" />
              <TechRow label="AC Grid Charging" value={enabled(s?.acChargeEnable)} icon={PlugZap} iconBg="bg-neutral-500" />
              <TechRow label="Max Charge Rate" value={`${s?.chargePowerCommand}%`} icon={ArrowDownToLine} iconBg="bg-neutral-500" />
              <TechRow label="On-Grid Stop Limit" value={`${s?.onGridDischargeStopSOC}%`} icon={Hand} iconBg="bg-neutral-500" />
            </TechGroup>

            {/* Smart Interaction Functions */}
            <TechGroup title="Network & Functions" icon={Activity} iconBg="bg-blue-400">
              <TechRow label="Export Limitation" value={enabled(s?.exportLimit)} icon={ArrowRightFromLine} iconBg="bg-neutral-500" />
              <TechRow label="Peak Shaving Mode" value={enabled(s?.peakShavingEnable)} icon={TrendingDown} iconBg="bg-neutral-500" />
              <TechRow label="Anti-Islanding (LOM)" value={enabled(s?.antiIslandEnable === 1)} icon={Umbrella} iconBg="bg-neutral-500" />
              <TechRow label="EPS Emergency Hub" value={enabled(s?.epsFunEn)} icon={LifeBuoy} iconBg="bg-neutral-500" />
            </TechGroup>

          </div>

        </div>

      </div>
    </div>
  )
}
