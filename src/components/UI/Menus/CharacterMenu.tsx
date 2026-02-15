import React from 'react'
import { Character, GameState } from '../../../game/types'
import '../Menus.css'

interface CharacterMenuProps {
  character: Character
  allCharacters: Character[]
  gameState: GameState
  onSelectCharacter?: (character: Character) => void
  onClose: () => void
}

export const CharacterMenu: React.FC<CharacterMenuProps> = ({
  character,
  allCharacters,
  gameState,
  onSelectCharacter,
  onClose
}) => {
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
            {(character.illegitimate_children_ids?.length || 0) > 0 && (
              <div className="family-item">
                <span className="family-label">Illegitimate Children:</span>
                <span className="family-count">{character.illegitimate_children_ids?.length}</span>
              </div>
            )}
            {character.heir_id && (
              <div className="family-item">
                <span className="family-label">Heir:</span>
                <span className="family-heir">✓ Designated</span>
              </div>
            )}
          </div>
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
        {character.id !== gameState.player_character_id && (
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
