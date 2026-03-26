/**
 * WeatherCard.jsx — Current weather and today's forecast.
 *
 * Shows temperature, condition, cloud cover and wind speed.
 * Cloud cover is especially relevant for solar production correlation.
 *
 * Data source: Open-Meteo (no API key required)
 * Coordinates: from /plant/info → latitude, longitude
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Cloud, Wind, CloudSun, Droplets,
  Sun, Moon, CloudMoon, CloudFog, CloudDrizzle, CloudRain, Snowflake, CloudLightning
} from 'lucide-react'

// ── WMO weather code → label + icon ─────────────────────────────────────────

function weatherLabel(code, isDay) {
  if (code === 0) return isDay
    ? { label: 'Clear sky', icon: Sun }
    : { label: 'Clear night', icon: Moon }
  if (code === 1) return isDay
    ? { label: 'Mainly clear', icon: Sun }
    : { label: 'Mainly clear', icon: CloudMoon }
  if (code === 2) return isDay 
    ? { label: 'Partly cloudy', icon: CloudSun }
    : { label: 'Partly cloudy', icon: CloudMoon }
  if (code === 3) return { label: 'Overcast', icon: Cloud }
  if ([45, 48].includes(code)) return { label: 'Fog', icon: CloudFog }
  if ([51, 53, 55].includes(code)) return { label: 'Drizzle', icon: CloudDrizzle }
  if ([61, 63, 65].includes(code)) return { label: 'Rain', icon: CloudRain }
  if ([71, 73, 75].includes(code)) return { label: 'Snow', icon: Snowflake }
  if ([80, 81, 82].includes(code)) return { label: 'Rain showers', icon: CloudRain }
  if ([95, 96, 99].includes(code)) return { label: 'Thunderstorm', icon: CloudLightning }
  return { label: 'Unknown', icon: Cloud }
}

// ── Cloud cover → solar impact label ─────────────────────────────────────────

function solarImpact(cloudcover, isDay) {
  if (!isDay) return { label: 'No solar production', color: 'text-muted-foreground' }
  if (cloudcover <= 20) return { label: 'Excellent solar', color: 'text-amber-500' }
  if (cloudcover <= 50) return { label: 'Good solar', color: 'text-amber-400' }
  if (cloudcover <= 80) return { label: 'Reduced solar', color: 'text-muted-foreground' }
  return { label: 'Poor solar', color: 'text-muted-foreground' }
}

// ── Stat pill ─────────────────────────────────────────────────────────────────

function Stat({ icon, value, unit }) {
  return (
    <div className="flex items-center gap-1.5 flex-1 justify-center sm:justify-start">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-xs text-foreground font-medium">{value}</span>
      <span className="text-xs text-muted-foreground">{unit}</span>
    </div>
  )
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

function WeatherSkeleton() {
  return (
    <Card className="animate-pulse h-full flex flex-col">
      <CardHeader className="pb-2 flex-none">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-muted" />
            <div className="w-16 h-4 rounded bg-muted" />
          </div>
          <div className="w-20 h-4 rounded bg-muted" />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 grow justify-between">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-muted" />
            <div className="space-y-2">
              <div className="w-12 h-8 rounded bg-muted" />
              <div className="w-16 h-3 rounded bg-muted" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="w-16 h-4 rounded bg-muted" />
            <div className="w-10 h-3 ml-auto rounded bg-muted" />
          </div>
        </div>
        <div className="h-px bg-border" />
        <div className="flex items-center justify-between pt-1">
          <div className="w-16 h-3 rounded bg-muted" />
          <div className="w-16 h-3 rounded bg-muted" />
          <div className="w-16 h-3 rounded bg-muted" />
        </div>
      </CardContent>
    </Card>
  )
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function WeatherCard({ data }) {
  if (!data || !data.hourly) return <WeatherSkeleton />

  const current = data.current
  const daily = data.daily
  const hourly = data.hourly

  const code = current.weathercode
  const { label, icon: MainIcon } = weatherLabel(code, current.is_day)
  const impact = solarImpact(current.cloudcover, current.is_day)

  const tempMax = Math.round(daily.temperature_2m_max[0])
  const tempMin = Math.round(daily.temperature_2m_min[0])
  const rainProb = daily.precipitation_probability_max[0]

  // Extract next 4 hours for the desktop/tablet forecast view
  // We find the current hour index from the hourly array timestamps
  const nowStr = new Date().toISOString().slice(0, 13) // e.g. "2026-03-26T09"
  const currentIndex = hourly.time.findIndex(t => t.startsWith(nowStr))
  
  // Guard fallback if time isn't strictly matched
  const startIndex = currentIndex >= 0 ? currentIndex + 1 : 1
  const nextHours = []
  
  for (let i = 0; i < 4; i++) {
    const idx = startIndex + i
    if (idx < hourly.time.length) {
      const timeStr = hourly.time[idx]
      const hh = new Date(timeStr).getHours()
      
      // Determine if it's day for the specific hour icon (rudimentary approximation 6 to 19)
      const isHourDay = hh > 5 && hh < 20
      
      const hrCode = hourly.weathercode[idx]
      const { icon: HourlyIcon } = weatherLabel(hrCode, isHourDay ? 1 : 0)
      
      nextHours.push({
        time: `${hh.toString().padStart(2, '0')}:00`,
        temp: Math.round(hourly.temperature_2m[idx]),
        Icon: HourlyIcon
      })
    }
  }

  return (
    <Card className="h-full flex flex-col group overflow-hidden">
      <CardHeader className="pb-2 flex-none">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CloudSun size={16} className="text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">Weather</CardTitle>
          </div>
          <span className={`text-xs font-medium ${impact.color}`}>
            {impact.label}
          </span>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col grow gap-4">

        {/* Top: Current Conditions */}
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-4">
            <div className="p-2 rounded-full bg-muted/50 text-foreground shadow-[0_0_12px_rgba(0,0,0,0.05)] border border-border/40">
              <MainIcon size={36} strokeWidth={1.5} />
            </div>
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold tracking-tight text-foreground">
                  {Math.round(current.temperature_2m)}
                </span>
                <span className="text-lg font-medium text-muted-foreground">°</span>
              </div>
              <p className="text-sm font-medium text-muted-foreground mt-0.5">{label}</p>
            </div>
          </div>

          <div className="text-right flex flex-col justify-center">
            <p className="text-sm font-semibold text-foreground tracking-wide">
              {tempMax}° <span className="text-muted-foreground font-normal mx-0.5">/</span> {tempMin}°
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Today</p>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-border w-full" />

        {/* Stats Row */}
        <div className="flex items-center justify-between py-1">
          <Stat icon={<Cloud size={14} />} value={current.cloudcover} unit="% clouds" />
          <Stat icon={<Wind size={14} />} value={Math.round(current.windspeed_10m)} unit="km/h" />
          <Stat icon={<Droplets size={14} />} value={rainProb ?? 0} unit="% rain" />
        </div>

        {/* Next Hours Forecast (Desktop/Tablet expanded UI) */}
        {nextHours.length > 0 && (
          <div className="mt-auto hidden md:block pt-3 border-t border-border border-dashed">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Upcoming Hours
            </p>
            <div className="flex items-center justify-between px-1">
              {nextHours.map((hr, idx) => (
                <div key={idx} className="flex flex-col items-center gap-2">
                  <span className="text-[11px] font-medium text-muted-foreground">{hr.time}</span>
                  <hr.Icon size={20} className="text-foreground" strokeWidth={1.5} />
                  <span className="text-xs font-semibold text-foreground">{hr.temp}°</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </CardContent>
    </Card>
  )
}