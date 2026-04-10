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
import { LogOut, User, Sun, Moon, Monitor, SolarPanel, SunMoon } from 'lucide-react'
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

/**
 * Arbitrates numerical degree measurements mapping them natively into localized directional abbreviations (N/S/E/W).
 *
 * @function azimuthLabel
 * @param {number} deg - Absolute compass degree scalar bounding index.
 * @returns {string} Truncated directional string parameter.
 */
function azimuthLabel(deg) {
  return DIRECTIONS.find(d => d.deg === deg)?.label ?? `${deg}°`
}

// ── Compass Picker SVG ────────────────────────────────────────────────────────

/**
 * Interactive SVG compass rose.
 * 8 clickable direction points (N, NE, E, SE, S, SW, W, NW).
 * The selected direction is highlighted in amber.
 *
 * @component CompassPicker
 * @param {object} props
 * @param {number} props.value - Reflected azimuth degree index state mapped tightly.
 * @param {function(number): void} props.onChange - Mutation invocation altering upper state blocks actively.
 * @returns {JSX.Element} Interactive DOM interface capturing panel alignments graphically.
 */
function CompassPicker({ value, onChange }) {
  const SIZE = 240
  const CX = SIZE / 2
  const CY = SIZE / 2
  const LABEL_R = 96
  const BUTTON_R = 18

  return (
    <div className="flex flex-col items-center gap-4">
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        aria-label="Panel orientation compass"
        className="overflow-visible"
      >
        <defs>
          <filter id="panel-shadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="rgba(0,0,0,0.3)" />
          </filter>
        </defs>

        {/* Decorative subtle compass rings */}
        <circle cx={CX} cy={CY} r={64} fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" className="text-border" />
        <circle cx={CX} cy={CY} r={56} fill="none" stroke="currentColor" strokeWidth="1" opacity="0.4" className="text-border" />
        
        {/* N-S / E-W subtle axis marks inside the ring */}
        <line x1={CX} y1={CY - 64} x2={CX} y2={CY - 56} stroke="currentColor" strokeWidth="1" className="text-border" />
        <line x1={CX} y1={CY + 56} x2={CX} y2={CY + 64} stroke="currentColor" strokeWidth="1" className="text-border" />
        <line x1={CX - 64} y1={CY} x2={CX - 56} y2={CY} stroke="currentColor" strokeWidth="1" className="text-border" />
        <line x1={CX + 56} y1={CY} x2={CX + 64} y2={CY} stroke="currentColor" strokeWidth="1" className="text-border" />

        {/* Direction buttons */}
        {DIRECTIONS.map(({ label, deg }) => {
          const rad = (deg * Math.PI) / 180
          const px = CX + LABEL_R * Math.sin(rad)
          const py = CY - LABEL_R * Math.cos(rad)
          const selected = value === deg

          return (
            <g
              key={deg}
              onClick={() => onChange(deg)}
              role="button"
              aria-label={`${label} — ${deg}°`}
              aria-pressed={selected}
              style={{ cursor: 'pointer' }}
              className="group"
            >
              <circle
                cx={px} cy={py} r={BUTTON_R}
                fill={selected ? '#006fff' : 'transparent'}
                className={selected ? 'transition-all duration-300 scale-100' : 'group-hover:fill-muted transition-all duration-200 scale-95 origin-center group-hover:scale-100'}
                style={{
                  transformOrigin: `${px}px ${py}px`,
                  ...(selected ? { filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.15))' } : {})
                }}
              />
              <text
                x={px} y={py}
                textAnchor="middle"
                dominantBaseline="central"
                dy="0.1em"
                fontSize={label.length > 1 ? '11' : '13'}
                fontWeight={selected ? '600' : '500'}
                fill="currentColor"
                className={`transition-colors duration-200 ${selected ? 'text-white' : 'text-muted-foreground'}`}
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                {label}
              </text>
            </g>
          )
        })}

        {/* Center Panel Visualization */}
        <g
          transform={`translate(${CX}, ${CY}) rotate(${value})`}
          style={{ transition: 'transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)' }}
        >
          {/* Main Panel Group with Shadow */}
          <g filter="url(#panel-shadow)">
            {/* The Solar Panel base border/frame (matching foreground, like a metal frame) */}
            <rect x="-22" y="-16" width="44" height="32" rx="3" fill="currentColor" opacity="0.85" className="text-foreground" />
            
            {/* The Solar Panel PV surface (Navbar blue) */}
            <rect x="-20" y="-14" width="40" height="28" rx="1.5" fill="#006fff" />
            
            {/* Grid lines (White) */}
            <g stroke="#ffffff" strokeWidth="0.75" opacity="0.4">
              <line x1="-10" y1="-14" x2="-10" y2="14" />
              <line x1="0"  y1="-14" x2="0"  y2="14" />
              <line x1="10" y1="-14" x2="10" y2="14" />
              <line x1="-20" y1="-4.6" x2="20" y2="-4.6" />
              <line x1="-20" y1="4.6"  x2="20" y2="4.6" />
            </g>
          </g>

          {/* Direction indicator (Arrow pointing forward/up) */}
          <path d="M 0 -44 L 5 -34 L -5 -34 Z" fill="#006fff" />
          <line x1="0" y1="-16" x2="0" y2="-34" stroke="#006fff" strokeWidth="2.5" />
        </g>
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
 * 
 * @component SettingSlider
 * @param {object} props
 * @param {number} props.min - Baseline numerical slider boundary offset limit.
 * @param {number} props.max - Uppermost maximum numerical scope threshold.
 * @param {number} props.step - Distinct incremental segmentation mapping distance value.
 * @param {number} props.value - Unidirectional state block reflecting track position scaling.
 * @param {function(number): void} props.onChange - Extraneous handler updating native system contexts dynamically.
 * @returns {JSX.Element} Functional themed slider implementation interface logic visually harmonized.
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

/**
 * Root account configuration UI dashboard framing preferences scaling User models cleanly.
 * Dispatches mutations adjusting generic App behavior parameters locally (Theme modes, Solar modeling alignments).
 *
 * @component
 * @returns {JSX.Element} Extrusion of interactive control panel groups dynamically.
 */
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

      <div className="px-4 grid grid-cols-1 md:grid-cols-2 gap-4 pb-24 md:pb-8">

        {/* ── Left Column ──────────────────────────────────────────────── */}
        <div className="space-y-4">
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

          {/* ── Appearance ───────────────────────────────────────────────── */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <SunMoon size={16} className="text-muted-foreground" />
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
        </div>

        {/* ── Right Column ─────────────────────────────────────────────── */}
        <div className="space-y-4">
          {/* ── Solar Panel Settings ──────────────────────────────────────── */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <SolarPanel size={16} className="text-muted-foreground" />
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

          {/* ── Logout ───────────────────────────────────────────────────── */}
          <div className="pt-2 md:hidden">
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

      </div>
    </div>
  )
}