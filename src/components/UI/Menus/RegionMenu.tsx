import React, { useMemo } from 'react'
import { District, GameState } from '../../../game/types'
import { menuManager } from '../../../game/MenuManager'
import { GOVERNMENT_TYPE_LABELS, GOVERNMENT_TYPE_COLORS } from '../../../game/StateOwnerSystem'
import '../Menus.css'

interface RegionMenuProps {
  district: District
  gameState: GameState
  onClose: () => void
}

export const RegionMenu: React.FC<RegionMenuProps> = ({ provinceRegion, gameState, onClose }) => {
  const memberProvinces = useMemo(
    () => gameState.localities.filter(r => district.locality_ids.includes(r.id)),
    [gameState.localities, district.locality_ids]
  )

  const totalPopulation = useMemo(
    () => memberProvinces.reduce((sum, r) => sum + (r.population?.total || 0), 0),
    [memberProvinces]
  )

  const totalWealth = useMemo(
    () => memberProvinces.reduce((sum, r) => sum + (r.wealth || 0), 0),
    [memberProvinces]
  )

  const stateOwner = useMemo(() => {
    const owners = gameState.state_owners || []
    if (district.state_owner_id) return owners.find(o => o.id === district.state_owner_id)
    if (district.colonial_entity_id) {
      const entity = (gameState.colonial_entities || []).find(e => e.id === district.colonial_entity_id)
      if (entity?.state_owner_id) return owners.find(o => o.id === entity.state_owner_id)
    }
    return undefined
  }, [provinceRegion, gameState.state_owners, gameState.colonial_entities])

  const colonialEntity = useMemo(
    () => district.colonial_entity_id
      ? (gameState.colonial_entities || []).find(e => e.id === district.colonial_entity_id)
      : undefined,
    [district.colonial_entity_id, gameState.colonial_entities]
  )

  const settlementTierCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const r of memberProvinces) {
      counts[r.settlement_tier] = (counts[r.settlement_tier] || 0) + 1
    }
    return counts
  }, [memberProvinces])

  const geographicLabel = district.geographic_region
    ? district.geographic_region.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    : null

  const continentLabel = district.continent
    ? district.continent.charAt(0).toUpperCase() + district.continent.slice(1)
    : null

  return (
    <div className="province-menu">
      {/* Region Header */}
      <div className="menu-section">
        <h3 className="province-name" style={{ color: '#fff', fontSize: 16, marginBottom: 4 }}>
          {district.name}
        </h3>
        {(geographicLabel || continentLabel) && (
          <p style={{ color: '#a0b4c0', fontSize: 11, margin: 0 }}>
            {[geographicLabel, continentLabel].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>

      {/* Overview */}
      <div className="menu-section">
        <h4 className="section-title">Overview</h4>
        <div className="info-row">
          <span className="info-label">Provinces:</span>
          <span className="info-value">{district.locality_ids.length}</span>
        </div>
        <div className="info-row">
          <span className="info-label">Total Population:</span>
          <span className="info-value">{Math.round(totalPopulation).toLocaleString()}</span>
        </div>
        <div className="info-row">
          <span className="info-label">Total Wealth:</span>
          <span className="info-value">{Math.round(totalWealth).toLocaleString()}</span>
        </div>
        {Object.keys(settlementTierCounts).length > 0 && (
          <div className="info-row" style={{ flexDirection: 'column', alignItems: 'flex-start', marginTop: 4 }}>
            <span className="info-label" style={{ marginBottom: 4 }}>Settlement Tiers:</span>
            {Object.entries(settlementTierCounts)
              .sort(([a], [b]) => {
                const order = ['city', 'town', 'village', 'wilderness', 'unsettled']
                return order.indexOf(a) - order.indexOf(b)
              })
              .map(([tier, count]) => (
                <span key={tier} style={{ fontSize: 11, color: '#a0b4c0', paddingLeft: 8 }}>
                  {tier.charAt(0).toUpperCase() + tier.slice(1)}: {count}
                </span>
              ))}
          </div>
        )}
      </div>

      {/* Sovereignty */}
      {(stateOwner || colonialEntity) && (
        <div className="menu-section">
          <h4 className="section-title">Sovereignty</h4>
          {stateOwner && (
            <div className="info-row" style={{ alignItems: 'center', gap: '6px' }}>
              <span className="info-label">Sovereign:</span>
              <button
                className="action-btn secondary"
                style={{ padding: '2px 8px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                onClick={() => menuManager.openMenu('state_owner', stateOwner.id)}
              >
                <span
                  style={{
                    display: 'inline-block',
                    padding: '1px 5px',
                    borderRadius: '3px',
                    fontSize: '9px',
                    fontWeight: 700,
                    background: GOVERNMENT_TYPE_COLORS[stateOwner.government_type],
                    color: '#fff',
                  }}
                >
                  {GOVERNMENT_TYPE_LABELS[stateOwner.government_type]}
                </span>
                {stateOwner.name}
              </button>
            </div>
          )}
          {colonialEntity && (
            <div className="info-row" style={{ marginTop: 4 }}>
              <span className="info-label">Colonial Entity:</span>
              <button
                className="action-btn secondary"
                style={{ padding: '2px 8px', fontSize: '11px' }}
                onClick={() => menuManager.openMenu('governance', colonialEntity.id)}
              >
                {colonialEntity.name} →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Member Provinces */}
      <div className="menu-section">
        <h4 className="section-title">Provinces</h4>
        {memberProvinces
          .sort((a, b) => (b.population?.total || 0) - (a.population?.total || 0))
          .map(r => (
            <div
              key={r.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 4,
                padding: '3px 0',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <button
                className="action-btn secondary"
                style={{ padding: '2px 6px', fontSize: '11px', textAlign: 'left' }}
                onClick={() => menuManager.openMenu('province', r.id)}
              >
                {r.name}
              </button>
              <span style={{ fontSize: 10, color: '#7a9aaa', textTransform: 'capitalize' }}>
                {r.settlement_tier}
              </span>
            </div>
          ))}
      </div>

      {/* Actions */}
      <div className="menu-section menu-actions">
        <button className="action-btn secondary" onClick={onClose}>
          CLOSE
        </button>
      </div>
    </div>
  )
}
