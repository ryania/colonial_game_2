import React, { useMemo } from 'react'
import { Province, GameState } from '../../../game/types'
import { menuManager } from '../../../game/MenuManager'
import { GOVERNMENT_TYPE_LABELS, GOVERNMENT_TYPE_COLORS } from '../../../game/StateOwnerSystem'
import '../Menus.css'

interface ProvinceGroupMenuProps {
  province: Province
  gameState: GameState
  onClose: () => void
}

export const ProvinceGroupMenu: React.FC<ProvinceGroupMenuProps> = ({ province, gameState, onClose }) => {
  const memberDistricts = useMemo(
    () => (gameState.districts || []).filter(d => province.district_ids.includes(d.id)),
    [gameState.districts, province.district_ids]
  )

  const allLocalities = useMemo(() => {
    const localityIds = memberDistricts.flatMap(d => d.locality_ids)
    return gameState.localities.filter(l => localityIds.includes(l.id))
  }, [memberDistricts, gameState.localities])

  const totalPopulation = useMemo(
    () => allLocalities.reduce((sum, l) => sum + (l.population?.total || 0), 0),
    [allLocalities]
  )

  const totalWealth = useMemo(
    () => allLocalities.reduce((sum, l) => sum + (l.wealth || 0), 0),
    [allLocalities]
  )

  // Determine sovereign from member districts
  const stateOwner = useMemo(() => {
    const owners = gameState.state_owners || []
    for (const d of memberDistricts) {
      if (d.state_owner_id) return owners.find(o => o.id === d.state_owner_id)
      if (d.colonial_entity_id) {
        const entity = (gameState.colonial_entities || []).find(e => e.id === d.colonial_entity_id)
        if (entity?.state_owner_id) return owners.find(o => o.id === entity.state_owner_id)
      }
    }
    return undefined
  }, [memberDistricts, gameState.state_owners, gameState.colonial_entities])

  const geographicLabel = province.geographic_region
    ? province.geographic_region.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    : null

  const continentLabel = province.continent
    ? province.continent.charAt(0).toUpperCase() + province.continent.slice(1)
    : null

  return (
    <div className="province-menu">
      {/* Province Header */}
      <div className="menu-section">
        <h3 className="province-name" style={{ color: '#fff', fontSize: 16, marginBottom: 4 }}>
          {province.name}
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
          <span className="info-label">Districts:</span>
          <span className="info-value">{province.district_ids.length}</span>
        </div>
        <div className="info-row">
          <span className="info-label">Localities:</span>
          <span className="info-value">{allLocalities.length}</span>
        </div>
        <div className="info-row">
          <span className="info-label">Total Population:</span>
          <span className="info-value">{Math.round(totalPopulation).toLocaleString()}</span>
        </div>
        <div className="info-row">
          <span className="info-label">Total Wealth:</span>
          <span className="info-value">{Math.round(totalWealth).toLocaleString()}</span>
        </div>
      </div>

      {/* Realm (Sovereignty) */}
      {stateOwner && (
        <div className="menu-section">
          <h4 className="section-title">Realm</h4>
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
              {stateOwner.name} →
            </button>
          </div>
        </div>
      )}

      {/* Member Districts */}
      <div className="menu-section">
        <h4 className="section-title">Districts ({memberDistricts.length})</h4>
        {memberDistricts.length === 0 ? (
          <p className="no-data">No districts found.</p>
        ) : (
          memberDistricts
            .sort((a, b) => {
              const popA = gameState.localities
                .filter(l => a.locality_ids.includes(l.id))
                .reduce((s, l) => s + (l.population?.total || 0), 0)
              const popB = gameState.localities
                .filter(l => b.locality_ids.includes(l.id))
                .reduce((s, l) => s + (l.population?.total || 0), 0)
              return popB - popA
            })
            .map(district => {
              const districtPop = gameState.localities
                .filter(l => district.locality_ids.includes(l.id))
                .reduce((s, l) => s + (l.population?.total || 0), 0)
              return (
                <div
                  key={district.id}
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
                    onClick={() => menuManager.openMenu('region', district.id)}
                  >
                    {district.name}
                  </button>
                  <span style={{ fontSize: 10, color: '#7a9aaa' }}>
                    {district.locality_ids.length} loc · {Math.round(districtPop).toLocaleString()} pop
                  </span>
                </div>
              )
            })
        )}
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
