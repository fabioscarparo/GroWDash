/**
 * FlowNode.jsx — Single node for the Power Flow diagram.
 *
 * FlowNode component serves as an individualized visual entity within the overarching SVG PowerFlowCard schematic.
 * It renders a circular bordered node enveloping a React Lucide icon, paired with lower-oriented textual labels 
 * and power transmission metrics.
 *
 * Utilizes `<foreignObject>` context tunneling to embed HTML/React components directly into the SVG namespace.
 * 
 * @component
 * @param {object} props - The component parameters.
 * @param {number} props.cx - Absolute X-axis coordinate relative to the parent SVG container.
 * @param {number} props.cy - Absolute Y-axis coordinate relative to the parent SVG container.
 * @param {number} props.r - Core circle radius strictly defined in user-space pixels.
 * @param {JSX.Element} props.icon - Instantiated Lucide icon component reference.
 * @param {string} props.label - Human-readable node semantic label string (e.g., 'Solar' or 'Grid').
 * @param {number} [props.powerW=0] - The instantaneous active power traversing the node, quantified in Watts.
 * @param {boolean} [props.alwaysShow=false] - When true, forces rendering of power metrics (e.g., '0.00 kW') even in a zero-flow state, preventing collapse to an '—' dash.
 * @param {object} props.colors - A pre-resolved dictionary of hex string colors mapping UI semantic states (computed via `getColors` utility) necessitated by SVG limitations against using var() variables in structural layers.
 * @param {string} props.colors.foreground - Absolute hex for active state textual/icon foreground.
 * @param {string} props.colors.mutedForeground - Absolute hex for inactive state textual overlay.
 * @param {string} props.colors.muted - Absolute hex delineating the base node inner circle background.
 * @param {string} props.colors.nodeBorder - Absolute hex mapping to inactive outer stroke boundaries.
 * @param {string} props.colors.nodeActive - Absolute hex mapping to highlight bounds when instantaneous power metrics transcend 0.
 * @returns {JSX.Element} A grouped structural `<g>` block appended into a parent SVG scope.
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
        stroke={active ? colors.nodeActive : colors.nodeBorder}
        strokeWidth={1}
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