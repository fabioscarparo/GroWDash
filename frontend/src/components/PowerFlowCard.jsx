/**
 * PowerFlowCard.jsx — Live energy flow widget.
 *
 * Displays real-time power flow between the four nodes of the PV system.
 * Built as a single SVG for precise positioning of nodes and lines.
 *
 *        ☀️ Solar
 *           |
 * 🔋 Batt ─[⚙️ Inv]─ 🔌 Grid
 *           |
 *        🏠 Home
 *
 * Uses FlowNode for each node and animated SVG lines for the connections.
 * Colors are resolved from the system theme at runtime since SVG
 * attributes do not support CSS variables.
 *
 * Data source: /energy/today → flow.live
 */

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Sun, BatteryCharging, Home, Zap, Cpu } from 'lucide-react'
import FlowNode from './FlowNode'

// ── Constants ─────────────────────────────────────────────────────────────────

const W      = 280      // SVG total width
const H      = 320      // SVG total height — extra space for bottom node labels
const CX     = W / 2   // center x
const CY     = H / 2   // center y
const OFFSET = 100     // distance from center to outer nodes
const R      = 24      // node circle radius

// Pre-calculated node center positions
const SOLAR   = { x: CX,          y: CY - OFFSET }
const HOME    = { x: CX,          y: CY + OFFSET }
const BATTERY = { x: CX - OFFSET, y: CY }
const GRID    = { x: CX + OFFSET, y: CY }
const INV     = { x: CX,          y: CY }

// ── Theme colors ──────────────────────────────────────────────────────────────

/**
 * Returns resolved colors based on the current system theme.
 * SVG fill/stroke attributes do not support CSS variables,
 * so we resolve colors from prefers-color-scheme at runtime.
 * @returns {object} Color map for light or dark mode
 */
function getColors() {
  const dark = document.documentElement.classList.contains('dark')
  return dark ? {
    foreground:      'oklch(0.985 0 0)',     // --foreground dark
    mutedForeground: 'oklch(0.708 0 0)',     // --muted-foreground dark
    muted:           'oklch(0.269 0 0)',     // --muted dark
    border:          'oklch(0.4 0 0)',       // --border dark (opacizzato)
    primary:         '#006fff',
  } : {
    foreground:      'oklch(0.145 0 0)',     // --foreground light
    mutedForeground: 'oklch(0.556 0 0)',     // --muted-foreground light
    muted:           'oklch(0.97 0 0)',      // --muted light
    border:          'oklch(0.922 0 0)',     // --border light
    primary:         '#006fff',
  }
}

// ── Main component ────────────────────────────────────────────────────────────

/**
 * PowerFlowCard component.
 *
 * @param {object} props
 * @param {number} props.solarW - Current solar production (W)
 * @param {number} props.homeW - Current home consumption (W)
 * @param {number} props.batteryChargeW - Current battery charge power (W)
 * @param {number} props.batteryDischargeW - Current battery discharge power (W)
 * @param {number} props.gridExportW - Current grid export power (W)
 * @param {number} props.gridImportW - Current grid import power (W)
 */
export default function PowerFlowCard({
  solarW = 0,
  homeW = 0,
  batteryChargeW = 0,
  batteryDischargeW = 0,
  gridExportW = 0,
  gridImportW = 0,
}) {
  // Resolve theme colors on mount and when system theme changes
  const [colors, setColors] = useState(getColors)

  useEffect(() => {
    const observer = new MutationObserver(() => setColors(getColors()))
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })
    return () => observer.disconnect()
  }, [])

  // ── Flow state ─────────────────────────────────────────────────────────────

  // Determine which connections have active power flow
  // Use a small threshold (5W) to avoid visual noise from negligible power
  const THRESHOLD = 5
  const solarActive        = solarW > THRESHOLD
  const batteryActive      = batteryChargeW > THRESHOLD || batteryDischargeW > THRESHOLD
  const batteryDischarging = batteryDischargeW > THRESHOLD
  const batteryCharging    = batteryChargeW > THRESHOLD
  const gridActive         = gridExportW > THRESHOLD || gridImportW > THRESHOLD
  const gridImporting      = gridImportW > THRESHOLD
  const homeActive         = homeW > THRESHOLD
  const inverterActive     = solarActive || homeActive

  // Use the higher of charge/discharge for battery node display
  const batteryW = batteryChargeW > 0 ? batteryChargeW : batteryDischargeW
  // Use the higher of export/import for grid node display
  const gridW    = gridExportW > 0 ? gridExportW : gridImportW

  // ── Line style helper ──────────────────────────────────────────────────────

  /**
   * Returns SVG line styles for an animated flow line.
   * @param {boolean} active - Whether energy is flowing on this line
   * @param {boolean} reverse - Whether to reverse the animation direction
   */
  const lineStyle = (active, reverse = false) => ({
    stroke: active ? colors.primary : colors.border,
    strokeWidth: active ? 2 : 1.5,
    strokeDasharray: active ? '6 4' : 'none',
    animation: active
      ? `flowDash 1s linear infinite ${reverse ? 'reverse' : ''}`
      : 'none',
    transition: 'stroke 0.3s',
  })

  return (
    <Card className="gap-2">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Zap size={16} className="text-muted-foreground" />
          <CardTitle className="text-sm font-semibold">Power Flow</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="px-3 pb-3 flex justify-center">

        {/* CSS keyframes for the animated dashes on active flow lines */}
        <style>{`
          @keyframes flowDash {
            from { stroke-dashoffset: 20; }
            to   { stroke-dashoffset: 0; }
          }
        `}</style>

        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>

          {/* ── Connection lines ─────────────────────────────────────────── */}
          {/* Drawn before nodes so they appear behind the circles          */}

          {/* Solar → Inverter */}
          <line
            x1={SOLAR.x} y1={SOLAR.y + R}
            x2={INV.x}   y2={INV.y - R}
            style={lineStyle(solarActive)}
          />

          {/* Inverter → Home */}
          <line
            x1={INV.x}  y1={INV.y + R}
            x2={HOME.x} y2={HOME.y - R}
            style={lineStyle(homeActive)}
          />

          {/* Battery ↔ Inverter — reversed when battery is discharging */}
          <line
            x1={BATTERY.x + R} y1={BATTERY.y}
            x2={INV.x - R}     y2={INV.y}
            style={lineStyle(batteryActive, batteryCharging)}
          />

          {/* Inverter ↔ Grid — reversed when importing from grid */}
          <line
            x1={INV.x + R}  y1={INV.y}
            x2={GRID.x - R} y2={GRID.y}
            style={lineStyle(gridActive, gridImporting)}
          />

          {/* ── Outer nodes ──────────────────────────────────────────────── */}

          <FlowNode
            cx={SOLAR.x} cy={SOLAR.y} r={R}
            icon={<Sun size={20} />}
            label="Solar"
            powerW={solarW}
            colors={colors}
          />
          <FlowNode
            cx={HOME.x} cy={HOME.y} r={R}
            icon={<Home size={20} />}
            label="Home"
            powerW={homeW}
            colors={colors}
          />
          <FlowNode
            cx={BATTERY.x} cy={BATTERY.y} r={R}
            icon={<BatteryCharging size={20} />}
            label="Battery"
            powerW={batteryW}
            colors={colors}
          />
          <FlowNode
            cx={GRID.x} cy={GRID.y} r={R}
            icon={<Zap size={20} />}
            label="Grid"
            powerW={gridW}
            alwaysShow
            colors={colors}
          />

          {/* ── Inverter — center node ────────────────────────────────────── */}
          {/* Rendered manually since it has no power value                  */}

          <circle
            cx={INV.x} cy={INV.y} r={R}
            fill={colors.muted}
            stroke={inverterActive ? colors.foreground : colors.border}
            strokeWidth={inverterActive ? 2 : 1.5}
            style={{ transition: 'all 0.3s' }}
          />
          <foreignObject x={INV.x - R} y={INV.y - R} width={R * 2} height={R * 2}>
            <div style={{
              width: R * 2,
              height: R * 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: inverterActive ? colors.foreground : colors.mutedForeground,
            }}>
              <Cpu size={20} />
            </div>
          </foreignObject>

          {/* Inverter label */}
          <text
            x={INV.x} y={INV.y + R + 14}
            textAnchor="middle"
            fontSize="11"
            fill={colors.mutedForeground}
            fontWeight="500"
          >
            Inverter
          </text>

        </svg>

      </CardContent>
    </Card>
  )
}