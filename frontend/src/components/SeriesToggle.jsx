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
import { cn } from '@/lib/utils'

/**
 * Renders the series toggle component.
 */
export default function SeriesToggle({ label, color, active, onClick }) {
  return (
    <Toggle
      pressed={active}
      onPressedChange={onClick}
      size="sm"
      className={cn(
        "text-[12px] font-semibold rounded-full h-8 px-4 gap-2 transition-all duration-300 border",
        active 
          ? "border-transparent data-[state=on]:text-foreground" 
          : "border-border/30 text-muted-foreground hover:bg-muted/50"
      )}
      style={{
        backgroundColor: active ? `${color}20` : 'transparent',
      }}
    >
      <span
        className={cn(
          "inline-block w-2 h-2 rounded-full shrink-0 transition-all duration-300",
          !active && "opacity-40 grayscale"
        )}
        style={{ background: color }}
      />
      {label}
    </Toggle>
  )
}