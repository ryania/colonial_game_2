import React, { useMemo } from 'react'
import { StateOwner, GameState, ColonialEntity, GovernmentType } from '../../../game/types'
import {
  GOVERNMENT_TYPE_LABELS,
  GOVERNMENT_TYPE_DESCRIPTIONS,
  GOVERNMENT_TYPE_RULER_TITLE,
  GOVERNMENT_TYPE_COLORS,
} from '../../../game/StateOwnerSystem'
import { menuManager } from '../../../game/MenuManager'
import '../Menus.css'
import './StateOwnerMenu.css'

interface StateOwnerMenuProps {
  owner: StateOwner
  gameState: GameState
  onClose: () => void
}

// Government type icon glyphs (unicode)
const GOV_TYPE_ICONS: Record<GovernmentType, string> = {
  kingdom:            '♔',
  empire:             '⚜',
  republic:           '⚖',
  theocracy:          '✝',
  oligarchy:          '◈',
  duchy:              '♖',
  sultanate:          '☽',
  merchant_republic:  '⚓',
  tribal_confederacy: '⬡',
  city_state:         '⬛',
}

function StatBar({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="som-stat">
      <div className="som-stat-header">
        <span className="som-stat-label">{label}</span>
        <span className="som-stat-value">{Math.round(value)}</span>
      </div>
      <div className="som-stat-track">
        <div
          className="som-stat-fill"
          style={{
            width: `${Math.max(0, Math.min(100, value))}%`,
            background: color ?? '#e94560',
          }}
        />
      </div>
    </div>
  )
}

function packedColorToCss(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`
}

export const StateOwnerMenu: React.FC<StateOwnerMenuProps> = ({ owner, gameState, onClose }) => {
  const ownedEntities: ColonialEntity[] = useMemo(
    () => (gameState.colonial_entities || []).filter(e => owner.colonial_entity_ids.includes(e.id)),
    [gameState.colonial_entities, owner.colonial_entity_ids]
  )

  const headOfState = owner.head_of_state_id
    ? gameState.characters.find(c => c.id === owner.head_of_state_id)
    : undefined

  const dynasty = owner.dynasty_id
    ? gameState.dynasties.find(d => d.id === owner.dynasty_id)
    : undefined

  const councilMembers = (owner.ruling_council_ids || [])
    .map(id => gameState.characters.find(c => c.id === id))
    .filter(Boolean)

  const govColor = GOVERNMENT_TYPE_COLORS[owner.government_type]
  const govLabel = GOVERNMENT_TYPE_LABELS[owner.government_type]
  const govDescription = GOVERNMENT_TYPE_DESCRIPTIONS[owner.government_type]
  const rulerTitle = GOVERNMENT_TYPE_RULER_TITLE[owner.government_type]
  const govIcon = GOV_TYPE_ICONS[owner.government_type]

  const isMonarchy = ['kingdom', 'empire', 'duchy', 'sultanate'].includes(owner.government_type)
  const isCouncil = ['republic', 'oligarchy', 'merchant_republic', 'tribal_confederacy'].includes(owner.government_type)

  return (
    <div className="state-owner-menu">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="menu-section som-header">
        <div className="som-title-row">
          <div
            className="som-color-swatch"
            style={{ background: packedColorToCss(owner.map_color) }}
          />
          <div className="som-title-block">
            <h2 className="som-name">{owner.name}</h2>
            <p className="som-short-name">Est. {owner.founding_year}</p>
          </div>
        </div>
        <div className="som-badges">
          <span
            className="som-gov-badge"
            style={{ background: govColor }}
          >
            <span className="som-gov-icon">{govIcon}</span>
            {govLabel}
          </span>
          {owner.official_religion && (
            <span className="som-religion-badge">{owner.official_religion}</span>
          )}
        </div>
      </div>

      {/* ── Government type description ──────────────────────────── */}
      <div className="menu-section">
        <span className="section-title">Government</span>
        <p className="som-gov-desc">{govDescription}</p>
      </div>

      {/* ── Leadership ───────────────────────────────────────────── */}
      <div className="menu-section">
        <span className="section-title">Leadership</span>
        <div className="government-info">

          {/* Head of state (ruler title varies by type) */}
          <div className="info-row">
            <span className="info-label">{rulerTitle}</span>
            <span className="info-value">
              {headOfState ? headOfState.name : <em className="som-vacant">Vacant</em>}
            </span>
          </div>

          {/* Dynasty (for monarchies) */}
          {isMonarchy && (
            <div className="info-row">
              <span className="info-label">Ruling Dynasty</span>
              <span className="info-value">
                {dynasty ? `House of ${dynasty.name.replace(/^House of /, '')}` : <em className="som-vacant">None</em>}
              </span>
            </div>
          )}

          {/* Succession law (for monarchies) */}
          {isMonarchy && owner.succession_law && (
            <div className="info-row">
              <span className="info-label">Succession</span>
              <span className="info-value" style={{ textTransform: 'capitalize' }}>
                {owner.succession_law.replace('_', ' ')}
              </span>
            </div>
          )}

          {/* Council members (for councils/republics) */}
          {isCouncil && (
            <div className="info-row">
              <span className="info-label">Council</span>
              <span className="info-value">
                {councilMembers.length > 0
                  ? councilMembers.map(c => c!.name).join(', ')
                  : <em className="som-vacant">No members</em>
                }
              </span>
            </div>
          )}

        </div>
      </div>

      {/* ── Governance stats ─────────────────────────────────────── */}
      <div className="menu-section">
        <span className="section-title">Standing</span>
        <div className="som-stats">
          <StatBar label="Legitimacy" value={owner.legitimacy} color="#c87e1a" />
          <StatBar label="Stability"  value={owner.stability}  color="#4a7a4a" />
          <StatBar label="Prestige"   value={owner.prestige}   color="#6b5a8b" />
        </div>
        <p className="som-standing-note">
          {owner.legitimacy < 40
            ? 'Legitimacy is critically low — political crisis is imminent.'
            : owner.stability < 40
            ? 'Internal tensions are rising — the state is fragile.'
            : owner.prestige > 70
            ? 'This state commands great respect among European powers.'
            : 'Governance is holding steady.'}
        </p>
      </div>

      {/* ── Colonial entities ────────────────────────────────────── */}
      <div className="menu-section">
        <span className="section-title">
          Colonial Entities ({ownedEntities.length})
        </span>
        {ownedEntities.length > 0 ? (
          <div className="som-entity-list">
            {ownedEntities.map(entity => (
              <button
                key={entity.id}
                className="som-entity-btn"
                onClick={() => menuManager.openMenu('governance', entity.id)}
                title={`View ${entity.name}`}
              >
                <div
                  className="som-entity-dot"
                  style={{ background: packedColorToCss(entity.map_color) }}
                />
                <div className="som-entity-info">
                  <span className="som-entity-name">{entity.name}</span>
                  <span className="som-entity-meta">
                    {entity.region_ids.length} provinces · {entity.governance_phase.replace(/_/g, ' ')}
                  </span>
                </div>
                <span className="som-entity-arrow">›</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="no-data">No colonial entities at this time.</p>
        )}
      </div>

    </div>
  )
}
