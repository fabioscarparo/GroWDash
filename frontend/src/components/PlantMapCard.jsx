/**
 * PlantMapCard.jsx — Interactive map card showing the PV plant location.
 *
 * Renders a MapLibre GL map centered on the plant's GPS coordinates with a
 * custom marker and an info popup displaying plant name and peak capacity.
 * The map style automatically follows the app's light/dark theme.
 *
 * @module components/PlantMapCard
 */

import { useState, useEffect } from 'react'
import { Map, MapMarker, MarkerContent, MarkerPopup, MapControls } from '@/components/ui/map'
import { Skeleton } from '@/components/ui/skeleton'
import { Sun, Zap, MapPin } from 'lucide-react'

// ── Sub-components ────────────────────────────────────────────────────────────

/**
 * Custom solar-themed marker pin rendered inside the MapMarker.
 */
function SolarMarkerPin() {
  return (
    <div className="flex flex-col items-center" style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.35))' }}>
      {/* Pin body */}
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#0071e3] border-[3px] border-white">
        <Sun size={18} className="text-white" strokeWidth={2.2} />
      </div>
      {/* Pin tail */}
      <div
        className="w-0 h-0"
        style={{
          borderLeft: '6px solid transparent',
          borderRight: '6px solid transparent',
          borderTop: '10px solid #0071e3',
          marginTop: '-1px',
        }}
      />
    </div>
  )
}

/**
 * Content for the popup shown when the marker is clicked.
 *
 * @param {Object} props
 * @param {string} props.plantName
 * @param {string|number} props.capacityKw
 * @param {string|number} props.lat
 * @param {string|number} props.lon
 */
function PlantPopupContent({ plantName, capacityKw, lat, lon }) {
  return (
    <div className="flex flex-col gap-2.5 min-w-[180px]">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-[7px] bg-[#0071e3] flex items-center justify-center flex-shrink-0">
          <Sun size={14} className="text-white" strokeWidth={2} />
        </div>
        <p className="text-[14px] font-semibold text-foreground leading-tight">{plantName || 'PV Plant'}</p>
      </div>
      <div className="flex flex-col gap-1.5 pt-0.5 border-t border-border/50">
        <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
          <Zap size={11} className="text-[#0071e3]" />
          <span className="font-medium">{capacityKw || '—'} kWp peak capacity</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/70">
          <MapPin size={10} />
          <span>{parseFloat(lat).toFixed(4)}° N, {parseFloat(lon).toFixed(4)}° E</span>
        </div>
      </div>
    </div>
  )
}

// ── Theme detection ──────────────────────────────────────────────────────────

/**
 * Watches the `dark` class on <html> to derive the resolved theme string.
 * This is necessary because the app only adds/removes the `dark` class (never
 * adds `light`), so the Map component's built-in detection returns `null` when
 * switching back to light and falls through to the system preference.
 *
 * @returns {'dark'|'light'}
 */
function useResolvedMapTheme() {
  const [resolvedTheme, setResolvedTheme] = useState(
    () => document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  )

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setResolvedTheme(
        document.documentElement.classList.contains('dark') ? 'dark' : 'light'
      )
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })
    return () => observer.disconnect()
  }, [])

  return resolvedTheme
}

// ── Main Component ─────────────────────────────────────────────────────────────

/**
 * Card wrapping an interactive map centered on the PV plant.
 *
 * @component
 * @param {Object}  props
 * @param {string}  [props.plantName]      - Plant display name.
 * @param {number}  [props.lat]            - Latitude of the plant.
 * @param {number}  [props.lon]            - Longitude of the plant.
 * @param {number}  [props.capacityKw]     - Peak capacity in kWp.
 * @param {boolean} [props.isLoading]      - Whether data is still loading.
 * @returns {JSX.Element}
 */
export default function PlantMapCard({ plantName, lat, lon, capacityKw, isLoading }) {
  const [popupOpen, setPopupOpen] = useState(false)
  const mapTheme = useResolvedMapTheme()

  // Don't attempt to render the map without valid coordinates
  const hasCoords = lat != null && lon != null && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lon))

  if (isLoading) {
    return (
      <div className="w-full rounded-[20px] overflow-hidden border border-border/70 shadow-[0_8px_32px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
        <Skeleton className="w-full h-[280px] md:h-[320px] rounded-[20px]" />
      </div>
    )
  }

  if (!hasCoords) {
    return (
      <div className="w-full h-[280px] md:h-[320px] rounded-[20px] border border-border/70 bg-muted/40 flex flex-col items-center justify-center gap-3">
        <MapPin size={28} className="text-muted-foreground/50" />
        <p className="text-[13px] text-muted-foreground font-medium">Plant location not available</p>
      </div>
    )
  }

  const latitude = parseFloat(lat)
  const longitude = parseFloat(lon)

  return (
    <div
      className="w-full h-full min-h-[300px] rounded-[20px] overflow-hidden border border-border/70 shadow-sm md:shadow-[0_8px_24px_rgba(0,0,0,0.04)] md:dark:shadow-[0_8px_24px_rgba(0,0,0,0.2)]"
      aria-label="Plant location map"
    >
      <Map
        center={[longitude, latitude]}
        zoom={13}
        theme={mapTheme}
        scrollZoom={true}
        touchZoomRotate={true}
        dragRotate={true}
      >
        <MapControls position="bottom-right" showZoom={true} />

        <MapMarker
          longitude={longitude}
          latitude={latitude}
          onClick={() => setPopupOpen(prev => !prev)}
        >
          <MarkerContent>
            <SolarMarkerPin />
          </MarkerContent>

          {popupOpen && (
            <MarkerPopup closeButton={true} closeOnClick={false} anchor="top">
              <PlantPopupContent
                plantName={plantName}
                capacityKw={capacityKw}
                lat={latitude}
                lon={longitude}
              />
            </MarkerPopup>
          )}
        </MapMarker>
      </Map>
    </div>
  )
}
