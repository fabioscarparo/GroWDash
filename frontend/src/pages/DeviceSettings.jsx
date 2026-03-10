/**
 * DeviceSettings.jsx — Inverter settings overview page.
 *
 * This page displays the most relevant inverter configuration settings,
 * grouped logically by category (System, Battery, Grid, Functions).
 * 
 * Note: All data presented on this page is read-only. Modifying settings 
 * must be done directly through the installer interface or official app.
 *
 * Data source: 
 *   - /device/settings → Raw configuration dictionary from the inverter
 * 
 * @module pages/DeviceSettings
 */

import { useDeviceSettings } from '../hooks/useGrowatt'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Zap, BatteryCharging, Settings } from 'lucide-react'

// ── Detail Row ────────────────────────────────────────────────────────────────

/**
 * A reusable component that renders a single row of detailed information.
 * It strictly hides itself if the provided value is null, undefined, or an empty string,
 * avoiding the display of broken or missing data.
 *
 * @param {Object} props - The component props.
 * @param {string} props.label - The descriptive label for the setting.
 * @param {string|number|null|JSX.Element} props.value - The setting's current value or badge.
 * @returns {JSX.Element|null} The row element, or null if value is missing.
 */
function DetailRow({ label, value }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-medium text-foreground text-right ml-4">{value}</span>
    </div>
  )
}

// ── Section Card ──────────────────────────────────────────────────────────────

/**
 * A layout component that wraps a group of related settings inside a styled Card.
 *
 * @param {Object} props - The component props.
 * @param {JSX.Element} props.icon - The Lucide React icon to display in the header.
 * @param {string} props.title - The title of the settings category.
 * @param {JSX.Element|JSX.Element[]} props.children - The `DetailRow` components to render inside.
 * @returns {JSX.Element} The section card.
 */
function Section({ icon, title, children }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{icon}</span>
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Converts a numeric or boolean enable/disable flag into a colored UI Badge.
 *
 * @param {number|boolean} val - The flag value (1/true for enabled, 0/false for disabled).
 * @returns {JSX.Element|string} A green "Enabled" badge, a gray "Disabled" badge, or a fallback string.
 */
function enabled(val) {
  if (val === 1 || val === true) return <Badge className="bg-green-500 text-white hover:bg-green-500 text-xs">Enabled</Badge>
  if (val === 0 || val === false) return <Badge variant="secondary" className="text-xs">Disabled</Badge>
  return '—'
}

/**
 * Converts an On/Off state flag into a colored UI Badge.
 *
 * @param {number} val - The state flag (1 for On, 0 for Off).
 * @returns {JSX.Element} A green "On" badge or a gray "Off" badge.
 */
function onOff(val) {
  if (val === 1) return <Badge className="bg-green-500 text-white hover:bg-green-500 text-xs">On</Badge>
  return <Badge variant="secondary" className="text-xs">Off</Badge>
}

/**
 * Translates the internal system work mode integer into a human-readable string.
 *
 * @param {number} val - The work mode integer.
 * @returns {string} The descriptive name of the work mode (e.g., "Self-use").
 */
function workMode(val) {
  const modes = { 0: 'Self-use', 1: 'Feed-in priority', 2: 'Battery first', 3: 'Off-grid' }
  return modes[val] ?? `Mode ${val}`
}

/**
 * Translates the internal Battery DC (BDC) operating mode into a human-readable string.
 *
 * @param {number} val - The BDC mode integer.
 * @returns {string} The descriptive name of the BDC mode (e.g., "Auto", "Charge").
 */
function bdcMode(val) {
  const modes = { 0: 'Auto', 1: 'Charge', 2: 'Discharge' }
  return modes[val] ?? `Mode ${val}`
}

// ── Page ──────────────────────────────────────────────────────────────────────

/**
 * The Device Settings page component.
 * 
 * It fetches the raw configuration dictionary from the backend and maps the most
 * important fields into categorized, readable UI blocks using formatting helpers.
 *
 * @returns {JSX.Element} The rendered settings page.
 */
export default function DeviceSettings() {
  const { data: s, isLoading } = useDeviceSettings()

  if (isLoading) return (
    <div className="px-4 pt-6">
      <p className="text-sm text-muted-foreground">Loading...</p>
    </div>
  )

  return (
    <div className="bg-background min-h-dvh">

      <div className="px-4 pt-6 pb-4">
        <h1 className="text-xl font-bold text-foreground">Settings</h1>
        {s?.sysTime && (
          <p className="text-xs text-muted-foreground mt-0.5">Last update: {s.lastUpdateTimeText}</p>
        )}
      </div>

      <div className="px-4 flex flex-col gap-3 pb-24">

        {/* System */}
        <Section icon={<Settings size={16} />} title="System">
          <DetailRow label="Status"       value={onOff(s?.onOff)} />
          <DetailRow label="Work mode"    value={workMode(s?.bsystemWorkMode)} />
          <DetailRow label="Serial number" value={s?.serialNum} />
          <DetailRow label="System time"  value={s?.sysTimeText} />
          <DetailRow label="Region"       value={s?.region} />
          <DetailRow label="Grid code"    value={s?.gridCode} />
          <DetailRow label="Active rate"  value={s?.activeRate != null ? `${s.activeRate}%` : null} />
        </Section>

        {/* Battery */}
        <Section icon={<BatteryCharging size={16} />} title="Battery">
          <DetailRow label="BDC mode"                value={bdcMode(s?.bdcMode)} />
          <DetailRow label="AC charge"               value={enabled(s?.acChargeEnable)} />
          <DetailRow label="Charge power"            value={s?.chargePowerCommand != null ? `${s.chargePowerCommand}%` : null} />
          <DetailRow label="Discharge power"         value={s?.disChargePowerCommand != null ? `${s.disChargePowerCommand}%` : null} />
          <DetailRow label="Discharge stop SOC"      value={s?.onGridDischargeStopSOC != null ? `${s.onGridDischargeStopSOC}%` : null} />
          <DetailRow label="Charge SOC limit"        value={s?.wchargeSOCLowLimit != null ? `${s.wchargeSOCLowLimit}%` : null} />
          <DetailRow label="Discharge SOC limit"     value={s?.wdisChargeSOCLowLimit != null ? `${s.wdisChargeSOCLowLimit}%` : null} />
          <DetailRow label="EPS function"            value={enabled(s?.epsFunEn)} />
        </Section>

        {/* Grid */}
        <Section icon={<Zap size={16} />} title="Grid">
          <DetailRow label="Export limit"            value={enabled(s?.exportLimit)} />
          <DetailRow label="Export limit rate"       value={s?.exportLimitPowerRate != null ? `${s.exportLimitPowerRate}%` : null} />
          <DetailRow label="Voltage high limit"      value={s?.voltageHighLimit != null ? `${s.voltageHighLimit} V` : null} />
          <DetailRow label="Voltage low limit"       value={s?.voltageLowLimit != null ? `${s.voltageLowLimit} V` : null} />
          <DetailRow label="Frequency high limit"    value={s?.frequencyHighLimit != null ? `${s.frequencyHighLimit.toFixed(2)} Hz` : null} />
          <DetailRow label="Frequency low limit"     value={s?.frequencyLowLimit != null ? `${s.frequencyLowLimit.toFixed(2)} Hz` : null} />
        </Section>

        {/* Functions */}
        <Section icon={<Zap size={16} />} title="Functions">
          <DetailRow label="Peak shaving"            value={enabled(s?.peakShavingEnable)} />
          <DetailRow label="Demand management"       value={enabled(s?.demandManageEnable)} />
          <DetailRow label="Generator control"       value={s?.genCtrl != null ? `Mode ${s.genCtrl}` : null} />
          <DetailRow label="Anti-islanding"          value={enabled(s?.antiIslandEnable === 1 ? 1 : 0)} />
          <DetailRow label="Reactive output"         value={enabled(s?.reactiveOutputEnable === 1 ? 1 : 0)} />
        </Section>

      </div>
    </div>
  )
}