import React from 'react'
import { MapMode, ColonialEntity, GovernancePhase, StateOwner } from '../../game/types'
import { GOVERNMENT_TYPE_LABELS } from '../../game/StateOwnerSystem'
import './MapModeSelector.css'

interface MapModeSelectorProps {
  mapMode: MapMode
  onMapModeChange: (mode: MapMode) => void
  colonialEntities: ColonialEntity[]
  stateOwners: StateOwner[]
}

const MODES: { id: MapMode; label: string }[] = [
  { id: 'terrain',     label: 'Terrain' },
  { id: 'population',  label: 'Population' },
  { id: 'settlement',  label: 'Settlement' },
  { id: 'wealth',      label: 'Wealth' },
  { id: 'governance',  label: 'Political Entity' },
  { id: 'sovereignty', label: 'Sovereign' },
  { id: 'rivers',      label: 'Rivers' },
]

const RIVER_LEGEND = [
  { name: 'River Shannon',    color: '#1a6bcc' },
  { name: 'River Liffey',     color: '#3a9ad4' },
  { name: 'River Lee',        color: '#1a5aaa' },
  { name: 'River Barrow',     color: '#2a80c0' },
  { name: 'River Nore',       color: '#3a72b8' },
  { name: 'River Suir',       color: '#4a84c8' },
  { name: 'River Blackwater', color: '#1a5898' },
  { name: 'River Erne',       color: '#2a6ab0' },
  { name: 'River Bann',       color: '#3a7cc0' },
]

const PHASE_LABELS: Record<GovernancePhase, string> = {
  early_settlement:    'Early Settlement',
  loose_confederation: 'Loose Confederation',
  crown_consolidation: 'Crown Consolidation',
  mature_royal:        'Mature Royal',
  growing_tension:     'Growing Tension',
}

const PHASE_BADGE_COLORS: Record<GovernancePhase, string> = {
  early_settlement:    '#4a7a4a',
  loose_confederation: '#7a6a2a',
  crown_consolidation: '#7a2a2a',
  mature_royal:        '#2a2a7a',
  growing_tension:     '#6a1a6a',
}

function packedColorToCss(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`
}

const TIER_LEGEND = [
  { color: '#5c4a2a', label: 'Wilderness' },
  { color: '#6b8c42', label: 'Village' },
  { color: '#c87e1a', label: 'Town' },
  { color: '#d4a017', label: 'City' },
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

function renderLegend(mode: MapMode, colonialEntities: ColonialEntity[], stateOwners: StateOwner[]) {
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

    case 'wealth':
      return <GradientLegend fromColor="#2e2416" toColor="#ffd700" lowLabel="Poor" highLabel="Wealthy" />

    case 'governance':
      return (
        <div className="mms-swatch-row mms-swatch-row--wrap">
          {colonialEntities.map(entity => (
            <div key={entity.id} className="mms-swatch-item" style={{ minWidth: '120px' }}>
              <div className="mms-swatch" style={{ background: packedColorToCss(entity.map_color) }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                <span className="mms-swatch-label">{entity.name}</span>
                <span
                  className="mms-swatch-label"
                  style={{
                    background: PHASE_BADGE_COLORS[entity.governance_phase],
                    color: '#fff',
                    borderRadius: '3px',
                    padding: '0 3px',
                    fontSize: '9px',
                  }}
                >
                  {PHASE_LABELS[entity.governance_phase]}
                </span>
              </div>
            </div>
          ))}
        </div>
      )

    case 'sovereignty':
      return stateOwners.length > 0 ? (
        <div className="mms-swatch-row mms-swatch-row--wrap">
          {stateOwners.map(owner => (
            <div key={owner.id} className="mms-swatch-item" style={{ minWidth: '110px' }}>
              <div className="mms-swatch" style={{ background: packedColorToCss(owner.map_color) }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                <span className="mms-swatch-label">{owner.short_name}</span>
                <span
                  className="mms-swatch-label"
                  style={{ color: '#8899aa', fontSize: '9px' }}
                >
                  {GOVERNMENT_TYPE_LABELS[owner.government_type]}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : null

    case 'rivers':
      return (
        <div>
          <p className="mms-terrain-note" style={{ marginBottom: '6px' }}>
            River-connected provinces highlighted. Connections reduce travel distance.
          </p>
          <div className="mms-swatch-row mms-swatch-row--wrap">
            {RIVER_LEGEND.map(({ name, color }) => (
              <div key={name} className="mms-swatch-item" style={{ minWidth: '130px' }}>
                <div
                  className="mms-swatch"
                  style={{
                    background: color,
                    width: '24px',
                    height: '6px',
                    borderRadius: '3px',
                    flexShrink: 0,
                  }}
                />
                <span className="mms-swatch-label">{name}</span>
              </div>
            ))}
          </div>
        </div>
      )

    default:
      return null
  }
}

const MapModeSelectorComponent: React.FC<MapModeSelectorProps> = ({ mapMode, onMapModeChange, colonialEntities, stateOwners }) => {
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
        {renderLegend(mapMode, colonialEntities, stateOwners)}
      </div>
    </div>
  )
}

export const MapModeSelector = React.memo(MapModeSelectorComponent)
