/**
 * FlowNode.jsx — Single node for the Power Flow diagram.
 *
 * Renders a circle with an icon, label and power value inside an SVG.
 * Used by PowerFlowCard to represent each energy node:
 * Solar, Home, Battery, Grid and Inverter.
 *
 * Since this component renders inside SVG, it uses foreignObject to
 * embed the Lucide icon. Colors are passed as resolved hex strings
 * because SVG fill/stroke attributes do not support CSS variables.
 *
 * @param {object} props
 * @param {number} props.cx - Center x position in the SVG
 * @param {number} props.cy - Center y position in the SVG
 * @param {number} props.r - Circle radius in pixels
 * @param {JSX.Element} props.icon - Lucide icon component
 * @param {string} props.label - Node label shown below the circle
 * @param {number} [props.powerW] - Current power in Watts
 * @param {boolean} [props.alwaysShow] - Always show power value even when 0 (e.g. Grid)
 * @param {object} props.colors - Resolved design system colors
 * @param {string} props.colors.foreground - Active text/stroke color
 * @param {string} props.colors.mutedForeground - Inactive text color
 * @param {string} props.colors.muted - Circle background color
 * @param {string} props.colors.border - Inactive stroke color
 */
export default function FlowNode({
  cx,
  cy,
  r,
  icon,
  label,
  powerW = 0,
  alwaysShow = false,
  colors,
}) {
  const active = powerW > 0 || alwaysShow

  // Format Watts to kW with 2 decimal places
  const powerKw = (powerW / 1000).toFixed(2)

  return (
    <g>
      {/* Circle background */}
      <circle
        cx={cx} cy={cy} r={r}
        fill={colors.muted}
        stroke={active ? colors.foreground : colors.border}
        strokeWidth={active ? 2 : 1.5}
        style={{ transition: 'all 0.3s' }}
      />

      {/* Icon — rendered via foreignObject to support React components inside SVG */}
      <foreignObject x={cx - r} y={cy - r} width={r * 2} height={r * 2}>
        <div style={{
          width: r * 2,
          height: r * 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: active ? colors.foreground : colors.mutedForeground,
        }}>
          {icon}
        </div>
      </foreignObject>

      {/* Label below circle */}
      <text
        x={cx} y={cy + r + 14}
        textAnchor="middle"
        fontSize="11"
        fill={colors.mutedForeground}
        fontWeight="500"
      >
        {label}
      </text>

      {/* Power value below label */}
      <text
        x={cx} y={cy + r + 28}
        textAnchor="middle"
        fontSize="12"
        fill={active ? colors.foreground : colors.mutedForeground}
        fontWeight={active ? '700' : '400'}
      >
        {powerW > 0 ? `${powerKw} kW` : alwaysShow ? '0.00 kW' : '—'}
      </text>
    </g>
  )
}