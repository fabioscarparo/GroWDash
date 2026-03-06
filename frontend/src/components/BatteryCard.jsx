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

/**
 * Returns the color of the SOC bar based on the charge level.
 * @param {number} soc - State of charge (0-100)
 * @returns {string} Tailwind background color class
 */
function getSocColor(soc) {
  if (soc >= 60) return 'bg-green-500'
  if (soc >= 30) return 'bg-amber-500'
  return 'bg-red-500'
}

/**
 * Returns the battery status label and badge color.
 * Charging → red badge (energy flowing into battery)
 * Discharging → green badge (energy flowing out to home)
 * Idle → default badge
 *
 * @param {number} chargeW - Current charge power (W)
 * @param {number} dischargeW - Current discharge power (W)
 * @returns {{ label: string, className: string }}
 */
function getBatteryStatus(chargeW, dischargeW) {
  if (chargeW > 0) return {
    label: 'Charging',
    className:'bg-green-500 text-white hover:bg-green-500',
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
 * BatteryCard component.
 *
 * @param {object} props
 * @param {number} props.socPct - Battery state of charge (0-100)
 * @param {number} props.chargeW - Current charge power in Watts
 * @param {number} props.dischargeW - Current discharge power in Watts
 * @param {number} props.chargedTodayKwh - Energy charged today in kWh
 * @param {number} props.dischargedTodayKwh - Energy discharged today in kWh
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
      <CardHeader className="pt-0.1">
        <div className="flex items-center justify-between">
          {/* Title with battery icon */}
          <div className="flex items-center gap-2">
            <BatteryCharging size={16} className="text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">Battery</CardTitle>
          </div>
          {/* Current power and status badge */}
          <div className="flex items-center gap-2">
            {isActive && (
              <span className="text-xs font-semibold text-foreground">
                {currentPowerKw} kW
              </span>
            )}
            <Badge className={`text-xs ${status.className}`}>
              {status.label}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">

        {/* SOC percentage and progress bar */}
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-3xl font-bold text-foreground">
              {socPct}
            </span>
            <span className="text-sm text-muted-foreground">%</span>
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