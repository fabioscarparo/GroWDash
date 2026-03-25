/**
 * UserAccount.jsx — Account settings page.
 *
 * Sections:
 *   - Account Information (username)
 *   - Solar Panel Settings (tilt, azimuth, performance ratio)
 *   - Appearance (theme selector)
 *   - Logout button
 */

import { useAuth } from '../context/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { LogOut, User, Sun, Moon, Monitor } from 'lucide-react'
import { useTheme } from '../hooks/useTheme'
import { useSolarSettings } from '../hooks/useSolarSettings'

// ── Compass direction data ────────────────────────────────────────────────────

const DIRECTIONS = [
  { label: 'N',  deg: 0   },
  { label: 'NE', deg: 45  },
  { label: 'E',  deg: 90  },
  { label: 'SE', deg: 135 },
  { label: 'S',  deg: 180 },
  { label: 'SW', deg: 225 },
  { label: 'W',  deg: 270 },
  { label: 'NW', deg: 315 },
]

function azimuthLabel(deg) {
  return DIRECTIONS.find(d => d.deg === deg)?.label ?? `${deg}°`
}

// ── Compass Picker SVG ────────────────────────────────────────────────────────

/**
 * Interactive SVG compass rose.
 * 8 clickable direction points (N, NE, E, SE, S, SW, W, NW).
 * The selected direction is highlighted in amber.
 *
 * @param {{ value: number, onChange: (deg: number) => void }} props
 */
function CompassPicker({ value, onChange }) {
  const SIZE = 168
  const CX = SIZE / 2
  const CY = SIZE / 2
  const R  = 62   // distance from center to direction buttons
  const r  = 16   // button circle radius

  return (
    <div className="flex flex-col items-center gap-2">
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        aria-label="Panel orientation compass"
      >
        {/* Outer decorative ring */}
        <circle
          cx={CX} cy={CY} r={R + r + 4}
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth={1}
          strokeDasharray="3 3"
        />

        {/* Cross lines */}
        <line x1={CX} y1={CY - R + 2} x2={CX} y2={CY + R - 2}
          stroke="hsl(var(--border))" strokeWidth={1} />
        <line x1={CX - R + 2} y1={CY} x2={CX + R - 2} y2={CY}
          stroke="hsl(var(--border))" strokeWidth={1} />

        {/* Direction buttons */}
        {DIRECTIONS.map(({ label, deg }) => {
          const rad = (deg * Math.PI) / 180
          // Compass convention: N=top, E=right
          const px = CX + R * Math.sin(rad)
          const py = CY - R * Math.cos(rad)
          const selected = value === deg

          return (
            <g
              key={deg}
              onClick={() => onChange(deg)}
              role="button"
              aria-label={`${label} — ${deg}°`}
              aria-pressed={selected}
              style={{ cursor: 'pointer' }}
            >
              <circle
                cx={px} cy={py} r={r}
                fill={selected ? '#f59e0b' : 'hsl(var(--muted))'}
                stroke={selected ? '#f59e0b' : 'hsl(var(--border))'}
                strokeWidth={selected ? 0 : 1}
                style={{ transition: 'all 0.2s' }}
              />
              <text
                x={px} y={py}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={label.length > 1 ? '7' : '9'}
                fontWeight={selected ? '700' : '500'}
                fill={selected ? 'white' : 'hsl(var(--muted-foreground))'}
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                {label}
              </text>
            </g>
          )
        })}

        {/* Center dot */}
        <circle cx={CX} cy={CY} r={3} fill="hsl(var(--muted-foreground))" />
      </svg>

      <p className="text-xs text-muted-foreground">
        Panels face <span className="font-semibold text-foreground">{azimuthLabel(value)}</span>
        {' '}({value}° from North)
      </p>
    </div>
  )
}

// ── Slider ────────────────────────────────────────────────────────────────────

/**
 * Styled range input consistent with shadcn theming.
 */
function SettingSlider({ min, max, step, value, onChange }) {
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={e => onChange(Number(e.target.value))}
      className="w-full h-1.5 rounded-full appearance-none cursor-pointer
                 bg-muted [&::-webkit-slider-thumb]:appearance-none
                 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                 [&::-webkit-slider-thumb]:rounded-full
                 [&::-webkit-slider-thumb]:bg-primary
                 [&::-webkit-slider-thumb]:border-2
                 [&::-webkit-slider-thumb]:border-background
                 [&::-webkit-slider-thumb]:shadow-sm
                 [&::-webkit-slider-thumb]:cursor-pointer"
    />
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function UserAccount() {
  const { user, logout }             = useAuth()
  const { theme, setTheme }          = useTheme()
  const { settings, updateSettings } = useSolarSettings()

  const handleLogout = async () => {
    await logout()
  }

  return (
    <div className="bg-background min-h-dvh">

      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-xl font-bold text-foreground">Account</h1>
      </div>

      <div className="px-4 flex flex-col gap-3 pb-24">

        {/* ── Account Information ───────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User size={16} className="text-muted-foreground" />
              <CardTitle className="text-sm font-semibold">Account Information</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Username
              </label>
              <div className="text-sm font-medium text-foreground">
                {user?.username || 'Loading...'}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Solar Panel Settings ──────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sun size={16} className="text-muted-foreground" />
              <CardTitle className="text-sm font-semibold">Solar Panel Settings</CardTitle>
            </div>
            <CardDescription className="text-xs mt-1">
              Calculate estimated production from weather forecast data.
              Adjust these settings to match your actual panel installation for more accurate estimates.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">

            {/* Panel Tilt */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-foreground">Panel Tilt</label>
                <span className="text-xs font-bold text-foreground">{settings.tilt}°</span>
              </div>
              <SettingSlider
                min={0}
                max={90}
                step={5}
                value={settings.tilt}
                onChange={v => updateSettings({ tilt: v })}
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>0° Flat</span>
                <span>30° Typical</span>
                <span>90° Vertical</span>
              </div>
            </div>

            {/* Panel Orientation */}
            <div className="space-y-3">
              <label className="text-xs font-medium text-foreground block">
                Panel Orientation
              </label>
              <CompassPicker
                value={settings.azimuth}
                onChange={az => updateSettings({ azimuth: az })}
              />
            </div>

            {/* System Efficiency (Performance Ratio) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-foreground">System Efficiency</label>
                <span className="text-xs font-bold text-foreground">
                  {Math.round(settings.performanceRatio * 100)}%
                </span>
              </div>
              <SettingSlider
                min={55}
                max={95}
                step={5}
                value={Math.round(settings.performanceRatio * 100)}
                onChange={v => updateSettings({ performanceRatio: v / 100 })}
              />
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Accounts for inverter losses, wiring, temperature and soiling.
                Typically 75–85% for a residential system in good condition.
              </p>
            </div>

          </CardContent>
        </Card>

        {/* ── Appearance ───────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sun size={16} className="text-muted-foreground" />
              <CardTitle className="text-sm font-semibold">Appearance</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Theme
              </label>

              <div className="relative p-1 bg-muted/50 rounded-lg border border-border/50 flex">
                {/* Sliding Background */}
                <div
                  className="absolute inset-y-1 h-auto rounded-md bg-background shadow-sm transition-all duration-300 ease-in-out z-0"
                  style={{
                    width: 'calc(33.33% - 4px)',
                    left:  theme === 'light' ? '4px' : theme === 'dark' ? '33.33%' : 'calc(66.66% - 4px)',
                    transform: theme === 'dark' ? 'translateX(1.5px)' : theme === 'system' ? 'translateX(3px)' : 'none',
                  }}
                />
                {[
                  { id: 'light',  label: 'Light',  icon: Sun     },
                  { id: 'dark',   label: 'Dark',   icon: Moon    },
                  { id: 'system', label: 'System', icon: Monitor },
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setTheme(id)}
                    className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md transition-colors text-xs font-medium ${
                      theme === id
                        ? 'text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Icon size={14} />
                    <span>{label}</span>
                  </button>
                ))}
              </div>

              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Choose a fixed appearance or let GroWDash match your device's system settings.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* ── Logout ───────────────────────────────────────────────────── */}
        <Button
          onClick={handleLogout}
          variant="destructive"
          className="w-full gap-2"
        >
          <LogOut size={18} />
          Logout
        </Button>

      </div>
    </div>
  )
}