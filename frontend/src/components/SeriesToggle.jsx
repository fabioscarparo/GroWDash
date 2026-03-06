/**
 * SeriesToggle.jsx — Toggle button for chart series visibility.
 *
 * Wraps the shadcn Toggle component with a colored dot indicator.
 * Used in DailyCurveCard to show/hide individual chart lines.
 *
 * @param {object} props
 * @param {string} props.label - Series label (e.g. "Solar")
 * @param {string} props.color - Series color as hex (e.g. "#f59e0b")
 * @param {boolean} props.active - Whether the series is currently visible
 * @param {function} props.onClick - Called when the toggle is clicked
 */

import { Toggle } from '@/components/ui/toggle'

export default function SeriesToggle({ label, color, active, onClick }) {
  return (
    <Toggle
      pressed={active}
      onPressedChange={onClick}
      size="sm"
      className="text-xs rounded-full h-7 px-2.5 gap-1.5"
      style={{
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: active ? color : 'hsl(var(--border))',
        backgroundColor: active ? `${color}18` : 'hsl(var(--muted))',
        color: active ? color : 'hsl(var(--muted-foreground))',
      }}
    >
      {active && (
        <span
          className="inline-block w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: color }}
        />
      )}
      {label}
    </Toggle>
  )
}