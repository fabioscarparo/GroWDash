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
import { Cloud, Wind, CloudSun, Droplets } from 'lucide-react'

// ── WMO weather code → label + emoji ─────────────────────────────────────────

function weatherLabel(code, isDay) {
  if (code === 0) return isDay
    ? { label: 'Clear sky',    emoji: '☀️' }
    : { label: 'Clear night',  emoji: '🌙' }
  if (code === 1) return isDay
    ? { label: 'Mainly clear', emoji: '🌤️' }
    : { label: 'Mainly clear', emoji: '🌙' }
  if (code === 2)              return { label: 'Partly cloudy',    emoji: '⛅' }
  if (code === 3)              return { label: 'Overcast',         emoji: '☁️' }
  if ([45, 48].includes(code)) return { label: 'Fog',             emoji: '🌫️' }
  if ([51,53,55].includes(code)) return { label: 'Drizzle',       emoji: '🌦️' }
  if ([61,63,65].includes(code)) return { label: 'Rain',          emoji: '🌧️' }
  if ([71,73,75].includes(code)) return { label: 'Snow',          emoji: '❄️' }
  if ([80,81,82].includes(code)) return { label: 'Rain showers',  emoji: '🌦️' }
  if ([95,96,99].includes(code)) return { label: 'Thunderstorm',  emoji: '⛈️' }
  return { label: 'Unknown', emoji: '🌡️' }
}

// ── Cloud cover → solar impact label ─────────────────────────────────────────

function solarImpact(cloudcover, isDay) {
  if (!isDay) return { label: 'No solar production', color: 'text-muted-foreground' }
  if (cloudcover <= 20) return { label: 'Excellent solar', color: 'text-amber-500' }
  if (cloudcover <= 50) return { label: 'Good solar',      color: 'text-amber-400' }
  if (cloudcover <= 80) return { label: 'Reduced solar',   color: 'text-muted-foreground' }
  return                       { label: 'Poor solar',      color: 'text-muted-foreground' }
}

// ── Stat pill ─────────────────────────────────────────────────────────────────

function Stat({ icon, value, unit }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-xs text-foreground font-medium">{value}</span>
      <span className="text-xs text-muted-foreground">{unit}</span>
    </div>
  )
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function WeatherCard({ data }) {
  if (!data) return null

  const current = data.current
  const daily   = data.daily

  const code      = current.weathercode
  const { label, emoji } = weatherLabel(code, current.is_day)
  const impact    = solarImpact(current.cloudcover, current.is_day)

  const tempMax   = Math.round(daily.temperature_2m_max?.[0])
  const tempMin   = Math.round(daily.temperature_2m_min?.[0])
  const rainProb  = daily.precipitation_probability_max?.[0]

  return (
    <Card>
      <CardHeader className="pb-2">
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

      <CardContent className="flex flex-col gap-3">

        {/* Main temp + condition */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{emoji}</span>
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-foreground">
                  {Math.round(current.temperature_2m)}
                </span>
                <span className="text-sm text-muted-foreground">°C</span>
              </div>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </div>

          {/* Min / Max */}
          <div className="text-right">
            <p className="text-sm font-semibold text-foreground">{tempMax}° / {tempMin}°</p>
            <p className="text-xs text-muted-foreground">today</p>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-border" />

        {/* Stats row */}
        <div className="flex items-center justify-between">
          <Stat icon={<Cloud size={13} />}    value={current.cloudcover}            unit="% clouds" />
          <Stat icon={<Wind size={13} />}     value={Math.round(current.windspeed_10m)} unit="km/h" />
          <Stat icon={<Droplets size={13} />} value={rainProb ?? 0}                 unit="% rain" />
        </div>

      </CardContent>
    </Card>
  )
}