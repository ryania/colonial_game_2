import React from 'react'
import { GameState } from '../../../game/types'
import '../Menus.css'

interface DiplomacyMenuProps {
  gameState: GameState
  onClose: () => void
}

export const DiplomacyMenu: React.FC<DiplomacyMenuProps> = ({ gameState, onClose }) => {
  return (
    <div className="diplomacy-menu">
      <div className="menu-section">
        <h3 style={{ color: '#ffdd99', margin: 0 }}>Diplomacy & Relations</h3>
        <p style={{ color: '#aabbcc', marginTop: 12, marginBottom: 0, fontStyle: 'italic' }}>
          This feature is coming in Phase 4. Soon you'll be able to:
        </p>
        <ul style={{ color: '#aabbcc', fontSize: 12, marginTop: 8, paddingLeft: 20 }}>
          <li>Manage alliances and rivals</li>
          <li>Arrange marriages</li>
          <li>Declare wars and make peace</li>
          <li>Exchange gifts for opinion gain</li>
          <li>Form political coalitions</li>
        </ul>
      </div>

      <div className="menu-section menu-actions">
        <button className="action-btn secondary" onClick={onClose}>
          CLOSE
        </button>
      </div>
    </div>
  )
}
