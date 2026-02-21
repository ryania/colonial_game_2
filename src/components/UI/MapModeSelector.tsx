import React from 'react'
import { MapMode } from '../../game/types'
import './MapModeSelector.css'

interface MapModeSelectorProps {
  mapMode: MapMode
  onMapModeChange: (mode: MapMode) => void
}

const MODES: { id: MapMode; label: string }[] = [
  { id: 'terrain',    label: 'Terrain' },
  { id: 'population', label: 'Population' },
  { id: 'settlement', label: 'Settlement' },
  { id: 'owner',      label: 'Owner' },
  { id: 'wealth',     label: 'Wealth' },
]

const TIER_LEGEND = [
  { color: '#5c4a2a', label: 'Wilderness' },
  { color: '#6b8c42', label: 'Village' },
  { color: '#c87e1a', label: 'Town' },
  { color: '#d4a017', label: 'City' },
]

const OWNER_LEGEND = [
  { color: '#8b1a1a', label: 'Spanish' },
  { color: '#1a2e8b', label: 'English' },
  { color: '#6b1a8b', label: 'French' },
  { color: '#1a6b2e', label: 'Portuguese' },
  { color: '#c87e1a', label: 'Dutch' },
  { color: '#6b4a1a', label: 'Native' },
  { color: '#1a5a5a', label: 'African' },
  { color: '#1a8b5a', label: 'Swahili' },
  { color: '#8b8b1a', label: 'German' },
  { color: '#5a1a8b', label: 'Italian' },
  { color: '#8b5a1a', label: 'Flemish' },
  { color: '#c81a1a', label: 'Polish' },
]

function GradientLegend({ fromColor, toColor, lowLabel, highLabel }: {
  fromColor: string; toColor: string; lowLabel: string; highLabel: string
}) {
  return (
    <div className="mms-gradient-legend">
      <span className="mms-legend-label">{lowLabel}</span>
      <div
        className="mms-gradient-bar"
        style={{ background: `linear-gradient(to right, ${fromColor}, ${toColor})` }}
      />
      <span className="mms-legend-label">{highLabel}</span>
    </div>
  )
}

function renderLegend(mode: MapMode) {
  switch (mode) {
    case 'terrain':
      return <p className="mms-terrain-note">Terrain type &amp; settlement tier coloring</p>

    case 'population':
      return <GradientLegend fromColor="#2d4a3a" toColor="#d4a44a" lowLabel="Sparse" highLabel="Dense" />

    case 'settlement':
      return (
        <div className="mms-swatch-row">
          {TIER_LEGEND.map(({ color, label }) => (
            <div key={label} className="mms-swatch-item">
              <div className="mms-swatch" style={{ background: color }} />
              <span className="mms-swatch-label">{label}</span>
            </div>
          ))}
        </div>
      )

    case 'owner':
      return (
        <div className="mms-swatch-row mms-swatch-row--wrap">
          {OWNER_LEGEND.map(({ color, label }) => (
            <div key={label} className="mms-swatch-item">
              <div className="mms-swatch" style={{ background: color }} />
              <span className="mms-swatch-label">{label}</span>
            </div>
          ))}
        </div>
      )

    case 'wealth':
      return <GradientLegend fromColor="#2e2416" toColor="#ffd700" lowLabel="Poor" highLabel="Wealthy" />

    default:
      return null
  }
}

const MapModeSelectorComponent: React.FC<MapModeSelectorProps> = ({ mapMode, onMapModeChange }) => {
  return (
    <div className="mms-container">
      <div className="mms-buttons">
        {MODES.map(({ id, label }) => (
          <button
            key={id}
            className={`mms-btn${mapMode === id ? ' mms-btn--active' : ''}`}
            onClick={() => onMapModeChange(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="mms-legend">
        {renderLegend(mapMode)}
      </div>
    </div>
  )
}

export const MapModeSelector = React.memo(MapModeSelectorComponent)
