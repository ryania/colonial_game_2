import React from 'react'
import { GameState } from '../../../game/types'
import '../Menus.css'

interface ArmyMenuProps {
  armyId?: string
  gameState: GameState
  onClose: () => void
}

export const ArmyMenu: React.FC<ArmyMenuProps> = ({ armyId, gameState, onClose }) => {
  return (
    <div className="army-menu">
      <div className="menu-section">
        <h3 style={{ color: '#ffdd99', margin: 0 }}>Army/Battle Information</h3>
        <p style={{ color: '#aabbcc', marginTop: 12, marginBottom: 0, fontStyle: 'italic' }}>
          This feature is coming in Phase 4. Soon you'll be able to:
        </p>
        <ul style={{ color: '#aabbcc', fontSize: 12, marginTop: 8, paddingLeft: 20 }}>
          <li>View army composition</li>
          <li>Check morale and discipline</li>
          <li>Issue combat orders</li>
          <li>Review battle logs</li>
          <li>Manage military campaigns</li>
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
