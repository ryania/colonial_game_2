import React from 'react'
import { Region, GameState } from '../../../game/types'
import '../Menus.css'

interface ProvinceMenuProps {
  region: Region
  gameState: GameState
  onSelectRegion?: (regionId: string) => void
  onClose: () => void
}

export const ProvinceMenu: React.FC<ProvinceMenuProps> = ({ region, gameState, onSelectRegion, onClose }) => {
  const governor = region.governor_id ? gameState.characters.find(c => c.id === region.governor_id) : null

  return (
    <div className="province-menu">
      {/* Province Header */}
      <div className="menu-section">
        <div className="province-header">
          <h3 className="province-name">{region.name}</h3>
          <p className="province-coords">Location: ({region.x}, {region.y})</p>
        </div>
      </div>

      {/* Population Overview */}
      <div className="menu-section">
        <h4 className="section-title">Population</h4>
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-label">Total</span>
            <span className="stat-value">{(region.population as any).total?.toLocaleString() || 'N/A'}</span>
          </div>
        </div>
      </div>

      {/* Culture & Religion */}
      <div className="menu-section">
        <h4 className="section-title">Identity</h4>
        <div className="identity-info">
          <div className="info-row">
            <span className="info-label">Owner Culture:</span>
            <span className="info-value">{region.owner_culture}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Owner Religion:</span>
            <span className="info-value">{region.owner_religion}</span>
          </div>
        </div>
      </div>

      {/* Economy */}
      <div className="menu-section">
        <h4 className="section-title">Economy</h4>
        <div className="economy-info">
          <div className="info-row">
            <span className="info-label">Wealth:</span>
            <span className="info-value">{region.wealth}</span>
          </div>
          {region.trade_goods && region.trade_goods.length > 0 && (
            <div className="info-row">
              <span className="info-label">Trade Goods:</span>
              <span className="info-value">{region.trade_goods.join(', ')}</span>
            </div>
          )}
        </div>
      </div>

      {/* Government */}
      {governor && (
        <div className="menu-section">
          <h4 className="section-title">Government</h4>
          <div className="government-info">
            <div className="info-row">
              <span className="info-label">Governor:</span>
              <span className="info-value">{governor.name}</span>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="menu-section menu-actions">
        <button className="action-btn secondary" onClick={onClose}>
          CLOSE
        </button>
      </div>
    </div>
  )
}
