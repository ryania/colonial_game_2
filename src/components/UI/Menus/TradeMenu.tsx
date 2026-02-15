import React from 'react'
import { GameState } from '../../../game/types'
import '../Menus.css'

interface TradeMenuProps {
  gameState: GameState
  onClose: () => void
}

export const TradeMenu: React.FC<TradeMenuProps> = ({ gameState, onClose }) => {
  return (
    <div className="trade-menu">
      <div className="menu-section">
        <h3 style={{ color: '#ffdd99', margin: 0 }}>Trade Routes & Commerce</h3>
        <p style={{ color: '#aabbcc', marginTop: 12, marginBottom: 0, fontStyle: 'italic' }}>
          This feature is coming in Phase 4. Soon you'll be able to:
        </p>
        <ul style={{ color: '#aabbcc', fontSize: 12, marginTop: 8, paddingLeft: 20 }}>
          <li>Establish trade routes</li>
          <li>Monitor trade income</li>
          <li>Trade goods between regions</li>
          <li>Form merchant guilds</li>
          <li>Control market prices</li>
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
