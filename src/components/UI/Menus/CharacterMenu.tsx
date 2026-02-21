import React, { useState } from 'react'
import { Character, GameState, SuccessionLaw } from '../../../game/types'
import '../Menus.css'

interface CharacterMenuProps {
  character: Character
  allCharacters: Character[]
  gameState: GameState
  onSelectCharacter?: (character: Character) => void
  onDesignateHeir?: (heirId: string) => void
  onLegitimize?: (childId: string) => void
  onSetSuccessionLaw?: (law: SuccessionLaw) => void
  adoptionPool?: Character[]
  onRequestAdoptionPool?: () => void
  onAdopt?: (childId: string) => void
  onClose: () => void
}

const ADOPTION_COST = 200

const SUCCESSION_LAWS: { law: SuccessionLaw; label: string; description: string }[] = [
  { law: 'primogeniture', label: 'Primogeniture', description: 'Eldest child inherits' },
  { law: 'absolute', label: 'Absolute', description: 'Your designated heir inherits first' },
  { law: 'elective', label: 'Elective', description: 'Most prestigious relative inherits' },
  { law: 'gavelkind', label: 'Gavelkind', description: 'All children share the inheritance' },
]

export const CharacterMenu: React.FC<CharacterMenuProps> = ({
  character,
  allCharacters,
  gameState,
  onSelectCharacter,
  onDesignateHeir,
  onLegitimize,
  onSetSuccessionLaw,
  adoptionPool,
  onRequestAdoptionPool,
  onAdopt,
  onClose
}) => {
  const successionLaw = character.succession_law ?? 'primogeniture'
  const [showHeirPicker, setShowHeirPicker] = useState(false)
  const [showAdoptionPanel, setShowAdoptionPanel] = useState(false)

  const isPlayerCharacter = character.id === gameState.player_character_id

  // Eligible heir candidates: living adult relatives (not self)
  const heirCandidates = allCharacters.filter(c => {
    if (!c.is_alive || c.age < 16 || c.id === character.id) return false
    return (
      character.legitimate_children_ids.includes(c.id) ||
      character.illegitimate_children_ids.includes(c.id) ||
      character.sibling_ids.includes(c.id) ||
      character.spouse_id === c.id ||
      character.spouse_ids.includes(c.id)
    )
  }).sort((a, b) => b.age - a.age)

  const designatedHeir = character.heir_id
    ? allCharacters.find(c => c.id === character.heir_id)
    : null

  const illegitimateChildren = character.illegitimate_children_ids
    .map(id => allCharacters.find(c => c.id === id))
    .filter((c): c is Character => c !== undefined && c.is_alive)

  return (
    <div className="character-menu">
      {/* Character Header */}
      <div className="menu-section">
        <div className="character-header">
          <div className="character-avatar">👤</div>
          <div className="character-basic-info">
            <h3 className="character-name">{character.name}</h3>
            <p className="character-subtitle">
              {character.character_class} • Age {character.age}
            </p>
            <p className="character-region">{character.region_id} • {character.culture}</p>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="menu-section">
        <h4 className="section-title">Stats</h4>
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-label">Wealth</span>
            <span className="stat-value">{character.wealth}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Prestige</span>
            <span className="stat-value">{character.prestige}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Health</span>
            <span className="stat-value">{character.health}%</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Relations</span>
            <span className="stat-value">{character.relationship_ids?.length || 0}</span>
          </div>
        </div>
      </div>

      {/* Traits Section */}
      {character.traits && character.traits.length > 0 && (
        <div className="menu-section">
          <h4 className="section-title">Traits</h4>
          <div className="traits-container">
            {character.traits.map((trait, idx) => (
              <span key={idx} className="trait-badge">
                {trait}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Class Traits */}
      {character.class_traits && character.class_traits.length > 0 && (
        <div className="menu-section">
          <h4 className="section-title">Class Traits</h4>
          <div className="traits-container">
            {character.class_traits.map((trait, idx) => (
              <span key={idx} className="trait-badge trait-class">
                {trait}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Family Info */}
      {(character.spouse_ids?.length || 0 > 0 ||
        (character.legitimate_children_ids?.length || 0) > 0 ||
        (character.illegitimate_children_ids?.length || 0) > 0) && (
        <div className="menu-section">
          <h4 className="section-title">Family</h4>
          <div className="family-info">
            {character.spouse_ids && character.spouse_ids.length > 0 && (
              <div className="family-item">
                <span className="family-label">Spouse:</span>
                <span className="family-count">{character.spouse_ids.length}</span>
              </div>
            )}
            {(character.legitimate_children_ids?.length || 0) > 0 && (
              <div className="family-item">
                <span className="family-label">Legitimate Children:</span>
                <span className="family-count">{character.legitimate_children_ids?.length}</span>
              </div>
            )}
            {/* Illegitimate children with legitimization option */}
            {illegitimateChildren.length > 0 && (
              <div className="family-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                <span className="family-label">Illegitimate Children:</span>
                {illegitimateChildren.map(child => (
                  <div key={child.id} style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: '#aaa' }}>
                      {child.name} (age {child.age})
                    </span>
                    {isPlayerCharacter && onLegitimize && (
                      <button
                        className="action-btn secondary"
                        style={{ fontSize: '0.65rem', padding: '2px 6px', opacity: character.prestige >= 100 ? 1 : 0.5 }}
                        disabled={character.prestige < 100}
                        title={character.prestige < 100 ? 'Requires 100 prestige' : 'Legitimize this child (costs 100 prestige)'}
                        onClick={() => onLegitimize(child.id)}
                      >
                        Legitimize (100✦)
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
            {designatedHeir && (
              <div className="family-item">
                <span className="family-label">Designated Heir:</span>
                <span className="family-heir">✓ {designatedHeir.name}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Succession Section — only shown for the player's own character */}
      {isPlayerCharacter && (
        <div className="menu-section">
          <h4 className="section-title">Succession</h4>

          {/* Succession Law Selector */}
          <div style={{ marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', color: '#aaa', display: 'block', marginBottom: '4px' }}>
              Succession Law
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {SUCCESSION_LAWS.map(({ law, label, description }) => (
                <button
                  key={law}
                  className={`action-btn ${successionLaw === law ? 'primary' : 'secondary'}`}
                  style={{ fontSize: '0.7rem', padding: '3px 8px' }}
                  title={description}
                  onClick={() => onSetSuccessionLaw?.(law)}
                >
                  {label}
                </button>
              ))}
            </div>
            <span style={{ fontSize: '0.7rem', color: '#888', display: 'block', marginTop: '3px' }}>
              {SUCCESSION_LAWS.find(l => l.law === successionLaw)?.description}
            </span>
          </div>

          {/* Designate Heir */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontSize: '0.75rem', color: '#aaa' }}>
                {designatedHeir ? `Heir: ${designatedHeir.name}` : 'No heir designated'}
              </span>
              <button
                className="action-btn secondary"
                style={{ fontSize: '0.7rem', padding: '3px 8px' }}
                onClick={() => setShowHeirPicker(v => !v)}
                disabled={heirCandidates.length === 0}
                title={heirCandidates.length === 0 ? 'No eligible relatives' : 'Choose your heir'}
              >
                {showHeirPicker ? 'Cancel' : designatedHeir ? 'Change Heir' : 'Designate Heir'}
              </button>
            </div>

            {/* Clear designation */}
            {designatedHeir && !showHeirPicker && (
              <button
                className="action-btn secondary"
                style={{ fontSize: '0.65rem', padding: '2px 6px', opacity: 0.7 }}
                onClick={() => onDesignateHeir?.('')}
              >
                Clear designation
              </button>
            )}

            {/* Heir picker list */}
            {showHeirPicker && (
              <div style={{
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid #444',
                borderRadius: '4px',
                padding: '6px',
                maxHeight: '140px',
                overflowY: 'auto'
              }}>
                {heirCandidates.length === 0 ? (
                  <span style={{ fontSize: '0.75rem', color: '#888' }}>No eligible relatives (must be adult)</span>
                ) : (
                  heirCandidates.map(candidate => (
                    <div
                      key={candidate.id}
                      onClick={() => {
                        onDesignateHeir?.(candidate.id)
                        setShowHeirPicker(false)
                      }}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '4px 6px',
                        cursor: 'pointer',
                        borderRadius: '3px',
                        background: candidate.id === character.heir_id ? 'rgba(255,215,0,0.15)' : 'transparent',
                        marginBottom: '2px',
                      }}
                      className="heir-candidate-row"
                    >
                      <span style={{ fontSize: '0.8rem' }}>
                        {candidate.id === character.heir_id ? '✓ ' : ''}{candidate.name}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: '#888' }}>
                        Age {candidate.age} • {candidate.character_class} • {candidate.prestige}✦
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Adoption — only when no eligible adult relatives */}
          {heirCandidates.length === 0 && (
            <div style={{ marginTop: '8px' }}>
              <p style={{ fontSize: '0.72rem', color: '#888', marginBottom: '4px' }}>
                No eligible relatives available to designate.
              </p>
              <button
                className={`action-btn ${showAdoptionPanel ? 'secondary' : 'primary'}`}
                style={{ fontSize: '0.7rem', padding: '3px 8px' }}
                disabled={character.wealth < ADOPTION_COST}
                title={
                  character.wealth < ADOPTION_COST
                    ? `Need ${ADOPTION_COST} wealth to adopt`
                    : `Adopt a child from ${character.region_id} (costs ${ADOPTION_COST} wealth)`
                }
                onClick={() => {
                  if (!showAdoptionPanel) onRequestAdoptionPool?.()
                  setShowAdoptionPanel(v => !v)
                }}
              >
                {showAdoptionPanel ? 'CANCEL' : `ADOPT A CHILD (${ADOPTION_COST}💰)`}
              </button>

              {showAdoptionPanel && (
                <div style={{
                  background: 'rgba(0,0,0,0.4)',
                  border: '1px solid #556',
                  borderRadius: '4px',
                  padding: '6px',
                  marginTop: '4px'
                }}>
                  {!adoptionPool || adoptionPool.length === 0 ? (
                    <span style={{ fontSize: '0.75rem', color: '#888' }}>Loading…</span>
                  ) : (
                    <>
                      <p style={{ fontSize: '0.7rem', color: '#aaa', marginBottom: '4px' }}>
                        Children available in {character.region_id}:
                      </p>
                      {adoptionPool.map(child => (
                        <div
                          key={child.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '4px 6px',
                            borderRadius: '3px',
                            background: 'rgba(255,255,255,0.05)',
                            marginBottom: '3px'
                          }}
                        >
                          <div>
                            <span style={{ fontSize: '0.8rem' }}>{child.name}</span>
                            <span style={{ fontSize: '0.68rem', color: '#888', marginLeft: '6px' }}>
                              Age {child.age} • {child.culture}
                            </span>
                          </div>
                          <button
                            className="action-btn primary"
                            style={{ fontSize: '0.65rem', padding: '2px 8px' }}
                            onClick={() => {
                              onAdopt?.(child.id)
                              setShowAdoptionPanel(false)
                            }}
                          >
                            Adopt
                          </button>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Culture & Religion */}
      <div className="menu-section">
        <h4 className="section-title">Identity</h4>
        <div className="identity-info">
          <div className="info-row">
            <span className="info-label">Culture:</span>
            <span className="info-value">{character.culture}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Religion:</span>
            <span className="info-value">{character.religion}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Dynasty:</span>
            <span className="info-value">{character.dynasty_id}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="menu-section menu-actions">
        {!isPlayerCharacter && (
          <button
            className="action-btn primary"
            onClick={() => {
              onSelectCharacter?.(character)
            }}
          >
            SWITCH TO CHARACTER
          </button>
        )}
        <button className="action-btn secondary" onClick={onClose}>
          CLOSE
        </button>
      </div>
    </div>
  )
}
