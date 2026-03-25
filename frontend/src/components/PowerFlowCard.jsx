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

const W = 280      // SVG total width
const H = 320      // SVG total height — extra space for bottom node labels
const CX = W / 2   // center x
const CY = H / 2   // center y
const OFFSET = 100     // distance from center to outer nodes
const R = 24      // node circle radius

// Pre-calculated node center positions
const SOLAR = { x: CX, y: CY - OFFSET }
const HOME = { x: CX, y: CY + OFFSET }
const BATTERY = { x: CX - OFFSET, y: CY }
const GRID = { x: CX + OFFSET, y: CY }
const INV = { x: CX, y: CY }

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
    foreground: 'oklch(0.985 0 0)',
    mutedForeground: 'oklch(0.708 0 0)',
    muted: 'oklch(0.269 0 0)',
    border: 'oklch(1 0 0 / 10%)',
    nodeBorder: 'oklch(1 0 0 / 10%)',   // Match shadcn dark border
    nodeActive: 'oklch(1 0 0 / 25%)',   // Subtle active highlight
    primary: '#006fff',
  } : {
    foreground: 'oklch(0.145 0 0)',
    mutedForeground: 'oklch(0.556 0 0)',
    muted: 'oklch(0.97 0 0)',
    border: 'oklch(0.922 0 0)',    // Match shadcn light border
    nodeBorder: 'oklch(0.922 0 0)',
    nodeActive: 'oklch(0.7 0 0)',       // Subtle active highlight
    primary: '#006fff',
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
  const solarActive = solarW > THRESHOLD
  const batteryActive = batteryChargeW > THRESHOLD || batteryDischargeW > THRESHOLD
  const batteryDischarging = batteryDischargeW > THRESHOLD
  const batteryCharging = batteryChargeW > THRESHOLD
  const gridActive = gridExportW > THRESHOLD || gridImportW > THRESHOLD
  const gridImporting = gridImportW > THRESHOLD
  const homeActive = homeW > THRESHOLD
  const inverterActive = solarActive || homeActive

  // Use the higher of charge/discharge for battery node display
  const batteryW = batteryChargeW > 0 ? batteryChargeW : batteryDischargeW
  // Use the higher of export/import for grid node display
  const gridW = gridExportW > 0 ? gridExportW : gridImportW

  // ── Swarm Constants ────────────────────────────────────────────────────────

  const SWARM_SIZE = 8 // Increased for higher density
  const SWARM_COLORS = ['#3b82f6', '#8b5cf6', '#d946ef', '#06b6d4']
  const CYCLE_LENGTH = 24 // Fixed cycle for perfect loop synchronization

  /**
   * Calculates the duration of the flow animation based on wattage.
   * Velocity is proportional to the energy flow (W) using a logarithmic scale.
   * Snap wattage to the nearest 50W to prevent micro-fluctuations from 
   * restarting the CSS animation, which causes "stuttering".
   */
  const getFlowDuration = (w) => {
    if (w <= THRESHOLD) return '0s'
    // Snap to nearest 50W for visual stability
    const snappedW = Math.round(w / 50) * 50 || 50
    // Map ~5W to 4s (slow) and 10000W to ~0.6s (fast)
    const duration = Math.max(0.6, 4 - Math.log10(snappedW) * 0.8)
    return `${duration.toFixed(2)}s`
  }

  /**
   * Calculates deterministic properties for a particle.
   * Ensures dash + gap = CYCLE_LENGTH for a stutter-free loop.
   */
  const getSwarmProps = (i, baseDuration) => {
    const seed = i * 2.5
    const duration = (parseFloat(baseDuration) * (0.85 + (seed % 0.4))).toFixed(2) + 's'
    const delay = (seed % 5).toFixed(2) + 's'

    // Dash length varies (1.5 - 2.5), gap is calculated to keep the total at CYCLE_LENGTH
    const dash = 1.5 + (seed % 1)
    const gap = CYCLE_LENGTH - dash

    const color = SWARM_COLORS[i % SWARM_COLORS.length]
    // Reduced offset (1.6x) to keep particles within the 18px tube (max span ~13px)
    const offset = (i - (SWARM_SIZE - 1) / 2) * 1.6

    return { duration, delay, dash: dash.toFixed(1), gap: gap.toFixed(1), color, offset }
  }

  /**
   * Renders a "Swarm" of particles moving through a translucent tube.
   * Matches the high-end Ubiquiti / Unifi Flow Control aesthetic.
   */
  const renderConnection = (x1, y1, x2, y2, active, powerW, reverse = false, id) => {
    const baseDuration = getFlowDuration(powerW)

    const dx = x2 - x1
    const dy = y2 - y1
    const angle = Math.atan2(dy, dx)
    const perpAngle = angle + Math.PI / 2

    // Unique ID for the fade mask
    const maskId = `glow-mask-${id}`

    return (
      <g key={`connection-${id}`}>
        <defs>
          <linearGradient id={maskId} gradientUnits="userSpaceOnUse" x1={x1} y1={y1} x2={x2} y2={y2}>
            <stop offset="0%" stopColor="white" stopOpacity="0" />
            <stop offset="15%" stopColor="white" stopOpacity="1" />
            <stop offset="85%" stopColor="white" stopOpacity="1" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
          <mask id={`mask-${id}`}>
            <rect x="0" y="0" width={W} height={H} fill={`url(#${maskId})`} />
          </mask>
        </defs>

        {/* The "Tube" — wider (18px) to safely contain the swarm nodes (span is approx 13px) */}
        <line
          x1={x1} y1={y1} x2={x2} y2={y2}
          stroke={active ? colors.primary : colors.border}
          strokeWidth={active ? 18 : 1}
          strokeOpacity={active ? 0.05 : 1}
          strokeLinecap="round"
          style={{
            transition: 'all 0.5s',
            filter: active ? `drop-shadow(0 0 4px ${colors.primary})` : 'none'
          }}
        />

        {/* The Swarm — masked to ensure smooth fade-in/out at nodes */}
        <g mask={active ? `url(#mask-${id})` : undefined}>
          {active && Array.from({ length: SWARM_SIZE }).map((_, i) => {
            const { duration, delay, dash, gap, color, offset } = getSwarmProps(i, baseDuration)

            const jx = Math.cos(perpAngle) * offset
            const jy = Math.sin(perpAngle) * offset

            return (
              <line
                key={i}
                x1={x1 + jx} y1={y1 + jy}
                x2={x2 + jx} y2={y2 + jy}
                stroke={color}
                strokeWidth={2}
                strokeDasharray={`${dash} ${gap}`}
                strokeLinecap="round"
                style={{
                  // Loop exactly on CYCLE_LENGTH to prevent jumping/stuttering
                  animation: `flowDash ${duration} linear infinite ${reverse ? 'reverse' : ''}`,
                  animationDelay: `-${delay}`,
                  opacity: 0.9,
                  transition: 'all 0.5s',
                }}
              />
            )
          })}
        </g>
      </g>
    )
  }

  return (
    <Card className="gap-2">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Zap size={16} className="text-muted-foreground" />
          <CardTitle className="text-sm font-semibold">Power Flow</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="px-3 pb-3 flex justify-center">

        {/* CSS keyframes for animations */}
        <style>{`
          @keyframes flowDash {
            from { stroke-dashoffset: ${CYCLE_LENGTH}; }
            to   { stroke-dashoffset: 0; }
          }
          @keyframes nodePulse {
            0% { r: ${R}; stroke-opacity: 0.8; stroke-width: 1; }
            50% { r: ${R + 4}; stroke-opacity: 0; stroke-width: 3; }
            100% { r: ${R}; stroke-opacity: 0; stroke-width: 1; }
          }
        `}</style>

        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>

          {/* ── Connection lines ─────────────────────────────────────────── */}
          {/* Drawn before nodes so they appear behind the circles          */}

          {/* Solar → Inverter */}
          {renderConnection(SOLAR.x, SOLAR.y + R, INV.x, INV.y - R, solarActive, solarW, false, 'solar')}

          {/* Inverter → Home */}
          {renderConnection(INV.x, INV.y + R, HOME.x, HOME.y - R, homeActive, homeW, false, 'home')}

          {/* Battery ↔ Inverter — reversed when battery is discharging */}
          {renderConnection(
            BATTERY.x + R, BATTERY.y,
            INV.x - R, INV.y,
            batteryActive,
            batteryW,
            batteryCharging,
            'battery'
          )}

          {/* Inverter ↔ Grid — reversed when importing from grid */}
          {renderConnection(
            INV.x + R, INV.y,
            GRID.x - R, GRID.y,
            gridActive,
            gridW,
            gridImporting,
            'grid'
          )}

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

          {/* Outer pulse circle when active */}
          {inverterActive && (
            <circle
              cx={INV.x} cy={INV.y} r={R}
              fill="none"
              stroke={colors.primary}
              style={{ animation: 'nodePulse 2s ease-out infinite' }}
            />
          )}

          <circle
            cx={INV.x} cy={INV.y} r={R}
            fill={colors.muted}
            stroke={inverterActive ? colors.nodeActive : colors.nodeBorder}
            strokeWidth={1}
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