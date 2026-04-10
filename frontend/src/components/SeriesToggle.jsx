/**
 * SeriesToggle.jsx — Toggle button for chart series visibility.
 *
 * SeriesToggle provides an aesthetically styled, interactive boolean toggle button designed inherently 
 * for chart visibility mapping. It embeds Shadcn configurations bound securely with inline style mutation 
 * overriding generic tokens for user-specified hex code colors, dynamically presenting an active dot marker 
 * indicating chart metric persistence.
 *
 * @component
 * @param {object} props - The component parameters.
 * @param {string} props.label - Human-readable label designating the correlated dataset.
 * @param {string} props.color - Valid hex code directly injecting visual highlighting bounds.
 * @param {boolean} props.active - The binary React state tracking node visibility inside the parent mapping context.
 * @param {function} props.onClick - Execution callback triggering parent series mutation handler logic.
 * @returns {JSX.Element} Configured Shadcn Toggle representation matching active styles dynamically.
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
          className="inline-block w-2 h-2 rounded-full shrink-0"
          style={{ background: color }}
        />
      )}
      {label}
    </Toggle>
  )
}