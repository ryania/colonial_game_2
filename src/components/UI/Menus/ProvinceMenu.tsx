import React, { useState, useMemo } from 'react'
import { Region, GameState, SocialClass, GovernancePhase } from '../../../game/types'
import { demographicsSystem } from '../../../game/Demographics'
import { getNextTier, getNextTierProgression } from '../../../game/settlementConfig'
import { GOVERNMENT_TYPE_LABELS, GOVERNMENT_TYPE_COLORS } from '../../../game/StateOwnerSystem'
import { menuManager } from '../../../game/MenuManager'
import '../Menus.css'

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

interface ProvinceMenuProps {
  region: Region
  gameState: GameState
  onSelectRegion?: (regionId: string) => void
  onClose: () => void
  onInvest?: (amount: number) => void
}

export const ProvinceMenu: React.FC<ProvinceMenuProps> = ({ region, gameState, onSelectRegion, onClose, onInvest }) => {
  const [investmentAmount, setInvestmentAmount] = useState<number>(0)
  const governor = region.governor_id ? gameState.characters.find(c => c.id === region.governor_id) : null
  const colonialEntity = useMemo(
    () => region.colonial_entity_id
      ? (gameState.colonial_entities || []).find(e => e.id === region.colonial_entity_id)
      : undefined,
    [region.colonial_entity_id, gameState.colonial_entities]
  )
  // Sovereign: direct (home territory) or via colonial entity
  const stateOwner = useMemo(() => {
    const owners = gameState.state_owners || []
    if (region.state_owner_id) return owners.find(o => o.id === region.state_owner_id)
    if (colonialEntity?.state_owner_id) return owners.find(o => o.id === colonialEntity.state_owner_id)
    return undefined
  }, [region.state_owner_id, colonialEntity, gameState.state_owners])
  const nextTier = getNextTier(region.settlement_tier)
  const nextTierProgression = nextTier ? getNextTierProgression(region.settlement_tier) : null

  // Pop breakdown for this region
  const regionPops = useMemo(() => (gameState.pops || []).filter(p => p.region_id === region.id), [gameState.pops, region.id])
  const classSummary = useMemo(() => {
    const byClass: Partial<Record<SocialClass, { total: number; litSum: number; happySum: number }>> = {}
    for (const pop of regionPops) {
      const entry = byClass[pop.social_class] || { total: 0, litSum: 0, happySum: 0 }
      entry.total += pop.size
      entry.litSum += pop.literacy * pop.size
      entry.happySum += pop.happiness * pop.size
      byClass[pop.social_class] = entry
    }
    const grandTotal = regionPops.reduce((s, p) => s + p.size, 0)
    return Object.entries(byClass)
      .map(([cls, data]) => ({
        cls: cls as SocialClass,
        count: data.total,
        percentage: grandTotal > 0 ? (data.total / grandTotal) * 100 : 0,
        avgLit: data.total > 0 ? Math.round(data.litSum / data.total) : 0,
        avgHappy: data.total > 0 ? Math.round(data.happySum / data.total) : 0
      }))
      .sort((a, b) => b.count - a.count)
  }, [regionPops])

  const handleInvest = () => {
    if (investmentAmount > 0 && investmentAmount <= region.wealth && onInvest) {
      demographicsSystem.investInDevelopment(region, investmentAmount)
      setInvestmentAmount(0)
      onInvest(investmentAmount)
    }
  }

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

      {/* Population by Class */}
      {classSummary.length > 0 && (
        <div className="menu-section">
          <h4 className="section-title">Population by Class</h4>
          {classSummary.map(({ cls, count, percentage, avgLit, avgHappy }) => (
            <div key={cls} className="info-row" style={{ flexDirection: 'column', alignItems: 'flex-start', marginBottom: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                <span className="info-label" style={{ textTransform: 'capitalize' }}>{cls}</span>
                <span className="info-value">{count.toLocaleString()} ({percentage.toFixed(0)}%)</span>
              </div>
              <span style={{ fontSize: '10px', color: '#aaa', paddingLeft: 4 }}>
                literacy: {avgLit} | happiness: {avgHappy}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Settlement Tier */}
      <div className="menu-section">
        <h4 className="section-title">Settlement Development</h4>
        <div className="settlement-info">
          <div className="info-row">
            <span className="info-label">Tier:</span>
            <span className="info-value" style={{ textTransform: 'capitalize' }}>{region.settlement_tier}</span>
          </div>
          {nextTier && nextTierProgression && (
            <>
              <div className="info-row">
                <span className="info-label">Population Progress:</span>
                <span className="info-value">{Math.round(region.population.total)} / {nextTierProgression.minPopulation}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Investment Progress:</span>
                <span className="info-value">{Math.round(region.development_invested)} / {nextTierProgression.investmentCost}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Time Progress:</span>
                <span className="info-value">{region.months_at_tier} / {nextTierProgression.monthsRequired} months</span>
              </div>
              <div className="investment-section">
                <div className="info-row">
                  <span className="info-label">Invest Wealth:</span>
                  <input
                    type="number"
                    min="0"
                    max={region.wealth}
                    value={investmentAmount}
                    onChange={(e) => setInvestmentAmount(Math.max(0, parseInt(e.target.value) || 0))}
                    placeholder="0"
                    className="investment-input"
                  />
                </div>
                <button
                  className="action-btn primary"
                  onClick={handleInvest}
                  disabled={investmentAmount <= 0 || investmentAmount > region.wealth}
                  style={{ width: '100%', marginTop: '8px' }}
                >
                  Invest {investmentAmount} Wealth
                </button>
              </div>
            </>
          )}
          {!nextTier && (
            <div className="info-row">
              <span className="info-label">Status:</span>
              <span className="info-value">Maximum tier reached</span>
            </div>
          )}
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
      {(governor || stateOwner) && (
        <div className="menu-section">
          <h4 className="section-title">Government</h4>
          <div className="government-info">
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
            {governor && (
              <div className="info-row">
                <span className="info-label">Governor:</span>
                <span className="info-value">{governor.name}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Colonial Entity */}
      {colonialEntity && (
        <div className="menu-section">
          <h4 className="section-title">Colonial Entity</h4>
          <div className="info-row">
            <span className="info-label">Name:</span>
            <span className="info-value">{colonialEntity.name}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Phase:</span>
            <span
              className="info-value"
              style={{
                background: PHASE_BADGE_COLORS[colonialEntity.governance_phase],
                color: '#fff',
                borderRadius: '3px',
                padding: '1px 5px',
                fontSize: '10px',
              }}
            >
              {PHASE_LABELS[colonialEntity.governance_phase]}
            </span>
          </div>
          <div className="info-row">
            <span className="info-label">Phase Pressure:</span>
            <span className="info-value">{Math.round(colonialEntity.phase_pressure)}%</span>
          </div>
          <button
            className="action-btn secondary"
            style={{ width: '100%', marginTop: '8px', fontSize: '11px' }}
            onClick={() => menuManager.openMenu('governance', colonialEntity.id)}
          >
            View Entity Details →
          </button>
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
