/**
 * UserAccount.jsx — User settings and plant configuration.
 *
 * Personal profile management and physical configuration hub for the solar plant.
 * Allows session management, theme toggling, and panel calibration
 * (azimuth, tilt) using professional instrument UI.
 *
 * Sections:
 *   1. Profile       — avatar display, username
 *   2. Account       — sign out
 *   3. Interface     — light / dark / system theme
 *   4. Plant Params  — compass azimuth, tilt slider, efficiency slider
 */

import { useAuth } from '../context/AuthContext'
import { useTheme } from '../hooks/useTheme'
import { useSolarSettings } from '../hooks/useSolarSettings'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import {
  LogOut,
  User,
  Sun,
  Moon,
  Monitor,
  SolarPanel,
  ChevronRight,
  Palette,
  ArrowUpRight,
  Gauge,
} from 'lucide-react'

// ── Constants ─────────────────────────────────────────────────────────────────

const DIRECTIONS = [
  { label: 'N', deg: 0 },
  { label: 'NE', deg: 45 },
  { label: 'E', deg: 90 },
  { label: 'SE', deg: 135 },
  { label: 'S', deg: 180 },
  { label: 'SW', deg: 225 },
  { label: 'W', deg: 270 },
  { label: 'NW', deg: 315 },
]

const THEME_OPTIONS = [
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'dark', label: 'Dark', icon: Moon },
  { id: 'system', label: 'System', icon: Monitor },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

const azimuthLabel = (deg) =>
  DIRECTIONS.find(d => d.deg === deg)?.label ?? `${deg}°`

// ── Shared UI Components ──────────────────────────────────────────────────────

/**
 * SettingsGroup — labeled card section.
 * Icon rendered without background box, slightly larger.
 */
function SettingsGroup({ title, icon: Icon, children }) {
  return (
    <div className="space-y-2.5">
      {title && (
        <div className="flex items-center gap-2 px-1">
          {Icon && <Icon size={18} className="text-foreground/60" strokeWidth={2} />}
          <h2 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider pl-0.5 font-display">
            {title}
          </h2>
        </div>
      )}
      <Card className="premium-glass border-white/20 dark:border-white/5 overflow-hidden py-0 shadow-sm">
        <CardContent className="p-0 divide-y divide-border/10">
          {children}
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * SettingsRow — single row inside a SettingsGroup.
 * Icon rendered without background box.
 */
function SettingsRow({ label, value, children, icon: Icon }) {
  return (
    <div className="settings-row group">
      <div className="flex items-center gap-3">
        {Icon && <Icon size={17} strokeWidth={2} className="text-muted-foreground shrink-0" />}
        <span className="text-[15px] font-medium text-foreground/90">{label}</span>
      </div>
      <div className="flex items-center gap-3 text-right">
        {value && <span className="text-[15px] text-muted-foreground font-normal">{value}</span>}
        {children}
      </div>
    </div>
  )
}

/**
 * CompassPicker — SVG compass for panel azimuth selection.
 */
function CompassPicker({ value, onChange }) {
  const SIZE = 220
  const CX = SIZE / 2
  const CY = SIZE / 2
  const LABEL_R = 88
  const BUTTON_R = 16

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <svg
        width={SIZE} height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="overflow-visible select-none"
      >
        <defs>
          <filter id="panel-shadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="rgba(0,0,0,0.3)" />
          </filter>
        </defs>

        {/* Outer ring */}
        <circle cx={CX} cy={CY} r={108} fill="none" stroke="currentColor" strokeWidth="1"
          className="text-border/40" />

        {/* Main dial */}
        <circle cx={CX} cy={CY} r={72} fill="currentColor" className="text-black/5 dark:text-white/5" />
        <circle cx={CX} cy={CY} r={72} fill="none" stroke="currentColor" strokeWidth="0.5"
          className="text-border/20" />

        {/* Tick marks */}
        {DIRECTIONS.map(({ deg }) => {
          const rad = (deg * Math.PI) / 180
          return (
            <line
              key={`mark-${deg}`}
              x1={CX + 72 * Math.sin(rad)} y1={CY - 72 * Math.cos(rad)}
              x2={CX + 62 * Math.sin(rad)} y2={CY - 62 * Math.cos(rad)}
              stroke="currentColor" strokeWidth="1.5"
              className="text-muted-foreground/30"
            />
          )
        })}

        {/* Direction buttons */}
        {DIRECTIONS.map(({ label, deg }) => {
          const rad = (deg * Math.PI) / 180
          const px = CX + LABEL_R * Math.sin(rad)
          const py = CY - LABEL_R * Math.cos(rad)
          const selected = value === deg

          return (
            <g key={deg} onClick={() => onChange(deg)} className="cursor-pointer">
              <circle
                cx={px} cy={py} r={BUTTON_R}
                fill={selected ? '#0071e3' : 'transparent'}
                className={cn("transition-all duration-300", !selected && "hover:fill-muted")}
              />
              <text
                x={px} y={py} textAnchor="middle" dominantBaseline="central"
                fontSize="10" fontWeight="bold"
                fill={selected ? 'white' : 'currentColor'}
                className="transition-colors pointer-events-none"
              >
                {label}
              </text>
            </g>
          )
        })}

        {/* Animated Center Panel Visualization */}
        <g
          transform={`translate(${CX}, ${CY}) rotate(${value})`}
          style={{ transition: 'transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)' }}
        >
          <g filter="url(#panel-shadow)">
            {/* The Solar Panel base border/frame */}
            <rect x="-22" y="-16" width="44" height="32" rx="3" fill="currentColor" opacity="0.85" className="text-foreground" />
            
            {/* The Solar Panel PV surface (Standard Blue) */}
            <rect x="-20" y="-14" width="40" height="28" rx="1.5" fill="#0071e3" />
            
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
          <path d="M 0 -44 L 5 -34 L -5 -34 Z" fill="#0071e3" />
          <line x1="0" y1="-16" x2="0" y2="-34" stroke="#0071e3" strokeWidth="2.5" />
          
          {/* Center pin */}
          <circle cx={0} cy={0} r={3} fill="white" />
        </g>
      </svg>

      <div className="flex flex-col items-center gap-1">
        <span className="text-[13px] font-semibold uppercase tracking-widest px-3 py-1 bg-primary/10 rounded-full text-primary">
          {azimuthLabel(value)} ({value}°)
        </span>
        <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-tighter">
          Panel Orientation
        </span>
      </div>
    </div>
  )
}

/**
 * SettingSlider — range input with a fully blue thumb.
 */
function SettingSlider({ min, max, step, value, onChange }) {
  return (
    <div className="flex items-center gap-4 w-full">
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="flex-1 h-[3px] rounded-full appearance-none bg-muted accent-primary cursor-pointer
                   [&::-webkit-slider-thumb]:appearance-none
                   [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                   [&::-webkit-slider-thumb]:rounded-full
                   [&::-webkit-slider-thumb]:bg-primary
                   [&::-webkit-slider-thumb]:shadow-[0_2px_6px_rgba(0,113,227,0.4)]
                   active:[&::-webkit-slider-thumb]:scale-110
                   transition-transform"
      />
      <span className="text-[14px] font-bold text-primary min-w-[40px] text-right">{value}</span>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function UserAccount() {
  const { user, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const { settings, updateSettings } = useSolarSettings()

  return (
    <div className="bg-background min-h-dvh flex flex-col items-center">
      <div className="w-full max-w-[1440px] px-5 py-10 md:py-16 space-y-12 pb-32">

        {/* ── Profile ── */}
        <section className="flex flex-col items-center space-y-4">
          <div className="w-24 h-24 rounded-full border-[3px] border-primary/20 p-1 hover:scale-105 transition-transform duration-500">
            <div className="w-full h-full rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
              <User size={48} strokeWidth={1.5} className="text-primary/60" />
            </div>
          </div>
          <div className="text-center space-y-1">
            <h1 className="text-[28px] font-bold tracking-tight text-near-black dark:text-white leading-tight">
              {user?.username ?? 'Solar Architect'}
            </h1>
            <p className="text-[14px] text-muted-foreground font-medium">Owner & Administrator</p>
          </div>
        </section>

        {/* ── Settings Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

          {/* Column 1: Account + Interface */}
          <div className="space-y-8">

            <SettingsGroup title="Account" icon={User}>
              <button
                onClick={logout}
                className="w-full settings-row flex items-center justify-between group active:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <LogOut size={17} strokeWidth={2} className="text-red-500 shrink-0" />
                  <span className="text-[15px] font-semibold text-red-500">Sign Out</span>
                </div>
                <ChevronRight size={18} className="text-muted-foreground/40 group-hover:translate-x-1 transition-transform" />
              </button>
            </SettingsGroup>

            <SettingsGroup title="Interface" icon={Palette}>
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[15px] font-medium text-foreground/90">Display Mode</span>
                  <span className="text-[12px] text-muted-foreground font-normal capitalize">{theme}</span>
                </div>

                {/* Segmented theme control */}
                <div className="relative p-1 bg-black/5 dark:bg-white/5 rounded-[12px] flex h-10">
                  <div
                    className="absolute inset-y-1 rounded-[9px] bg-white dark:bg-[#2c2c2e] shadow-sm z-10
                               transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
                    style={{
                      width: 'calc(33.33% - 4px)',
                      left: theme === 'light' ? '4px'
                        : theme === 'dark' ? '33.33%'
                          : 'calc(66.66% - 4px)',
                    }}
                  />
                  {THEME_OPTIONS.map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => setTheme(id)}
                      className={cn(
                        "relative z-20 flex-1 flex items-center justify-center gap-2 text-[13px] font-semibold",
                        "transition-colors rounded-[8px] active:scale-95 duration-200",
                        theme === id ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      <Icon size={14} />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </SettingsGroup>

          </div>

          {/* Column 2: Plant Parameters */}
          <SettingsGroup title="Plant Parameters" icon={SolarPanel}>
            <div className="p-4 bg-muted/20 dark:bg-white/2">
              <CompassPicker
                value={settings.azimuth}
                onChange={az => updateSettings({ azimuth: az })}
              />
            </div>

            <SettingsRow label="Panel Tilt" icon={ArrowUpRight}>
              <div className="w-[180px]">
                <SettingSlider
                  min={0} max={90} step={5}
                  value={settings.tilt}
                  onChange={v => updateSettings({ tilt: v })}
                />
              </div>
            </SettingsRow>

            <SettingsRow label="Efficiency Factor" icon={Gauge}>
              <div className="w-[180px]">
                <SettingSlider
                  min={55} max={95} step={5}
                  value={Math.round(settings.performanceRatio * 100)}
                  onChange={v => updateSettings({ performanceRatio: v / 100 })}
                />
              </div>
            </SettingsRow>
          </SettingsGroup>

        </div>
      </div>
    </div>
  )
}