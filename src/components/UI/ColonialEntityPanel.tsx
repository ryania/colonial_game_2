import React, { useMemo } from 'react'
import { ColonialEntity, GovernancePhase, ColonialEntityType, Region, StateOwner } from '../../game/types'
import { GOVERNMENT_TYPE_LABELS, GOVERNMENT_TYPE_COLORS } from '../../game/StateOwnerSystem'
import './ColonialEntityPanel.css'

interface ColonialEntityPanelProps {
  entity: ColonialEntity
  regions: Region[]
  stateOwner?: StateOwner
  onClose: () => void
  onRegionClick: (regionId: string) => void
  onStateOwnerClick?: (ownerId: string) => void
}

const PHASE_LABELS: Record<GovernancePhase, string> = {
  early_settlement:    'Early Settlement',
  loose_confederation: 'Loose Confederation',
  crown_consolidation: 'Crown Consolidation',
  mature_royal:        'Mature Royal Control',
  growing_tension:     'Growing Tension',
}

const PHASE_BADGE_COLORS: Record<GovernancePhase, string> = {
  early_settlement:    '#4a7a4a',
  loose_confederation: '#7a6a2a',
  crown_consolidation: '#7a2a2a',
  mature_royal:        '#2a2a7a',
  growing_tension:     '#6a1a6a',
}

const NEXT_PHASE_LABELS: Record<GovernancePhase, string | null> = {
  early_settlement:    'Loose Confederation',
  loose_confederation: 'Crown Consolidation',
  crown_consolidation: 'Mature Royal Control',
  mature_royal:        'Growing Tension',
  growing_tension:     null,
}

const PHASE_DESCRIPTIONS: Record<GovernancePhase, string> = {
  early_settlement:
    'Individual charter grants create semi-independent colonies. Loosely affiliated with minimal central coordination. Economic focus on extracting locally viable resources.',
  loose_confederation:
    'Colonies coordinate defensively against shared threats. Trade networks forming between colonies. Intercolonial tensions also becoming apparent — boundary disputes, competing claims.',
  crown_consolidation:
    'The crown attempts to centralize control, revoking or suspending charters and grouping colonies under unified governors. Many colonies resist and charters will eventually be restored.',
  mature_royal:
    'Colonies operate under clear royal oversight with restored standardized charters. Sophisticated institutions including assemblies with real power. Intercolonial trade is a major economic driver.',
  growing_tension:
    'Colonies develop stronger local institutions and identity, creating friction with crown authority. Independence sentiment grows. The historical break looms.',
}

const ENTITY_TYPE_LABELS: Record<ColonialEntityType, string> = {
  charter_company:      'Charter Company',
  proprietary_colony:   'Proprietary Colony',
  royal_colony:         'Royal Colony',
  loose_confederation:  'Loose Confederation',
  crown_consolidation:  'Crown Consolidation',
  independent_assembly: 'Independent Assembly',
}

function StatBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="cep-stat">
      <div className="cep-stat-header">
        <span className="cep-stat-label">{label}</span>
        <span className="cep-stat-value">{Math.round(value)}</span>
      </div>
      <div className="cep-stat-track">
        <div className="cep-stat-fill" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  )
}

function packedColorToCss(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`
}

const ColonialEntityPanelComponent: React.FC<ColonialEntityPanelProps> = ({
  entity,
  regions,
  stateOwner,
  onClose,
  onRegionClick,
  onStateOwnerClick,
}) => {
  const memberRegions = useMemo(
    () => regions.filter(r => entity.region_ids.includes(r.id)),
    [regions, entity.region_ids]
  )

  const nextPhaseLabel = NEXT_PHASE_LABELS[entity.governance_phase]

  return (
    <div className="cep-panel">
      {/* Header */}
      <div className="cep-header">
        <div className="cep-title-row">
          <div
            className="cep-color-dot"
            style={{ background: packedColorToCss(entity.map_color) }}
          />
          <h2 className="cep-title">{entity.name}</h2>
          <button className="cep-close" onClick={onClose}>✕</button>
        </div>
        <div className="cep-meta">
          <span className="cep-badge" style={{ background: '#444' }}>
            {ENTITY_TYPE_LABELS[entity.entity_type]}
          </span>
          <span className="cep-badge cep-badge--culture">{entity.founding_culture}</span>
          <span className="cep-badge">Est. {entity.founding_year}</span>
        </div>
        {stateOwner && (
          <div className="cep-sovereign-row">
            <span className="cep-sovereign-label">Sovereign:</span>
            {onStateOwnerClick ? (
              <button
                className="cep-sovereign-btn"
                onClick={() => onStateOwnerClick(stateOwner.id)}
                title={`View ${stateOwner.name}`}
              >
                <span
                  className="cep-sovereign-gov-badge"
                  style={{ background: GOVERNMENT_TYPE_COLORS[stateOwner.government_type] }}
                >
                  {GOVERNMENT_TYPE_LABELS[stateOwner.government_type]}
                </span>
                <span className="cep-sovereign-name">{stateOwner.name}</span>
                <span className="cep-sovereign-arrow">›</span>
              </button>
            ) : (
              <span className="cep-sovereign-name">{stateOwner.name}</span>
            )}
          </div>
        )}
      </div>

      {/* Current Phase */}
      <div className="cep-section">
        <div className="cep-phase-header">
          <span
            className="cep-phase-pill"
            style={{ background: PHASE_BADGE_COLORS[entity.governance_phase] }}
          >
            {PHASE_LABELS[entity.governance_phase]}
          </span>
        </div>
        <p className="cep-phase-desc">{PHASE_DESCRIPTIONS[entity.governance_phase]}</p>

        {/* Phase progression bar */}
        {nextPhaseLabel && (
          <div className="cep-progress-section">
            <div className="cep-progress-labels">
              <span className="cep-progress-label">Phase Pressure</span>
              <span className="cep-progress-label">{Math.round(entity.phase_pressure)}%</span>
            </div>
            <div className="cep-progress-track">
              <div
                className="cep-progress-fill"
                style={{ width: `${entity.phase_pressure}%` }}
              />
            </div>
            <div className="cep-progress-next">→ {nextPhaseLabel}</div>
          </div>
        )}
        {!nextPhaseLabel && (
          <p className="cep-end-state">This entity has reached its final governance phase.</p>
        )}
      </div>

      {/* Phase History */}
      {entity.phase_history.length > 0 && (
        <div className="cep-section">
          <h3 className="cep-section-title">Phase History</h3>
          <div className="cep-history">
            {entity.phase_history.map((phase, i) => (
              <span
                key={i}
                className="cep-history-pill"
                style={{ background: PHASE_BADGE_COLORS[phase] }}
              >
                {PHASE_LABELS[phase]}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Governance Stats */}
      <div className="cep-section">
        <h3 className="cep-section-title">Governance</h3>
        <div className="cep-stats-grid">
          <StatBar label="Centralization" value={entity.centralization} />
          <StatBar label="Autonomy" value={entity.autonomy} />
          <StatBar label="Stability" value={entity.stability} />
          <StatBar label="Crown Authority" value={entity.crown_authority} />
        </div>
        <p className="cep-tension-note">
          {entity.autonomy > entity.centralization
            ? 'Local institutions dominate — low compliance with central directives.'
            : 'Central authority holds — colonial assemblies have limited independence.'}
        </p>
      </div>

      {/* Economics */}
      <div className="cep-section">
        <h3 className="cep-section-title">Economics</h3>
        <div className="cep-econ-row">
          <span className="cep-econ-label">Tax Rate</span>
          <span className="cep-econ-value">{Math.round(entity.tax_rate * 100)}%</span>
        </div>
        {entity.trade_monopoly_goods.length > 0 && (
          <div className="cep-econ-row">
            <span className="cep-econ-label">Trade Monopolies</span>
            <div className="cep-goods">
              {entity.trade_monopoly_goods.map(g => (
                <span key={g} className="cep-good-pill">{g}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Member Provinces */}
      <div className="cep-section">
        <h3 className="cep-section-title">Member Provinces ({memberRegions.length})</h3>
        <div className="cep-province-list">
          {memberRegions.map(r => (
            <button
              key={r.id}
              className="cep-province-btn"
              onClick={() => onRegionClick(r.id)}
            >
              {r.name}
            </button>
          ))}
          {memberRegions.length === 0 && (
            <span className="cep-empty">No provinces assigned</span>
          )}
        </div>
      </div>
    </div>
  )
}

export const ColonialEntityPanel = React.memo(ColonialEntityPanelComponent)
