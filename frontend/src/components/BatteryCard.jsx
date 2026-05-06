/**
 * BatteryCard.jsx — Battery status card.
 *
 * Displays the current state of the battery storage system:
 * - State of charge (SOC) with a visual progress bar
 * - Current charge or discharge power (kW)
 * - Energy charged and discharged today (kWh)
 *
 * Data source: /energy/today → flow.battery_soc_pct, flow.live, battery
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BatteryCharging } from 'lucide-react'
import { cn } from '../lib/utils'

/**
 * Resolves the CSS background color class for the State of Charge (SOC) progress bar.
 * The color visually indicates the health or capacity level of the battery.
 *
 * @function getSocColor
 * @param {number} soc - The current state of charge percentage of the battery (range: 0-100).
 * @returns {string} The corresponding Tailwind CSS background color class:
 *   - 'bg-green-500' (Healthy/Full) if SOC >= 60
 *   - 'bg-amber-500' (Warning/Mid) if SOC >= 30 and < 60
 *   - 'bg-red-500' (Critical/Low) if SOC < 30
 */
function getSocColor(soc) {
  if (soc >= 60) return 'bg-green-500'
  if (soc >= 30) return 'bg-amber-500'
  return 'bg-red-500'
}

/**
 * Determines the readable status label and corresponding CSS class for the battery state badge.
 * Evaluates whether the battery is actively charging, discharging, or idle.
 *
 * @function getBatteryStatus
 * @param {number} chargeW - The current charging power flowing into the battery, in Watts.
 * @param {number} dischargeW - The current discharging power flowing out of the battery, in Watts.
 * @returns {{ label: string, className: string }} An object containing:
 *   - `label`: The text to display in the badge ('Charging', 'Discharging', or 'Idle').
 *   - `className`: The Tailwind CSS class string configuring the badge's background and text color.
 */
function getBatteryStatus(chargeW, dischargeW) {
  if (chargeW > 0) return {
    label: 'Charging',
    className: 'bg-green-500 text-white hover:bg-green-500',
  }
  if (dischargeW > 0) return {
    label: 'Discharging',
    className: 'bg-red-500 text-white hover:bg-red-500',
  }
  return {
    label: 'Idle',
    className: '',
  }
}

/**
 * BatteryCard component displays the live status of the battery storage system.
 * It presents the State of Charge (SOC) as a numeric percentage and progress bar,
 * current power flow (charging vs discharging), and total energy accumulated today.
 *
 * @component
 * @param {object} props - The component properties.
 * @param {number} [props.socPct=0] - Current battery state of charge (range: 0-100).
 * @param {number} [props.chargeW=0] - Current real-time battery charging power in Watts.
 * @param {number} [props.dischargeW=0] - Current real-time battery discharging power in Watts.
 * @param {number} [props.chargedTodayKwh=0] - Total energy charged into the battery today in kWh.
 * @param {number} [props.dischargedTodayKwh=0] - Total energy discharged from the battery today in kWh.
 * @returns {JSX.Element} A rendered dashboard card detailing battery metrics.
 */
export default function BatteryCard({
  socPct = 0,
  chargeW = 0,
  dischargeW = 0,
  chargedTodayKwh = 0,
  dischargedTodayKwh = 0,
}) {
  const status = getBatteryStatus(chargeW, dischargeW)
  const isActive = chargeW > 0 || dischargeW > 0

  // Convert W to kW and round to 2 decimal places
  const currentPowerKw = ((chargeW > 0 ? chargeW : dischargeW) / 1000).toFixed(2)

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          {/* Title with battery icon */}
          <div className="flex items-center gap-2">
            <BatteryCharging size={18} className="text-primary" />
            <CardTitle className="text-[17px] font-semibold tracking-tight">Energy Storage</CardTitle>
          </div>
          {/* Current power and status badge */}
          <div className="flex items-center gap-2">
            {isActive && (
              <span className="text-[13px] font-bold text-near-black dark:text-white uppercase tracking-wider">
                {currentPowerKw} kW
              </span>
            )}
            <Badge className={cn("text-[11px] font-bold rounded-full border-none px-2.5 py-0.5", 
              status.label === 'Charging' ? "bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400" :
              status.label === 'Discharging' ? "bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400" :
              "bg-muted/30 text-muted-foreground")}>
              {status.label}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">

        {/* SOC percentage and progress bar */}
        <div>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-[40px] font-semibold tracking-tight text-near-black dark:text-white leading-none">
              {socPct}
            </span>
            <span className="text-[19px] font-medium text-muted-foreground">%</span>
          </div>
          {/* SOC progress bar — color changes based on charge level */}
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${getSocColor(socPct)}`}
              style={{ width: `${Math.min(Math.max(socPct, 0), 100)}%` }}
            />
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-border" />

        {/* Today's totals */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Charged today</p>
            <p className="text-base font-semibold text-foreground">
              {chargedTodayKwh}
              <span className="text-xs text-muted-foreground font-normal ml-1">kWh</span>
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Discharged today</p>
            <p className="text-base font-semibold text-foreground">
              {dischargedTodayKwh}
              <span className="text-xs text-muted-foreground font-normal ml-1">kWh</span>
            </p>
          </div>
        </div>

      </CardContent>
    </Card>
  )
}
