import { useMemo, memo } from 'react'
import { Region, PopGroup, SocialClass } from '../../game/types'
import { demographicsSystem } from '../../game/Demographics'
import { mapManager } from '../../game/Map'
import { getTierProgression, getNextTier, getNextTierProgression } from '../../game/settlementConfig'
import './RegionPanel.css'

interface RegionPanelProps {
  region: Region
  pops?: PopGroup[]
}

function RegionPanelContent({ region, pops = [] }: RegionPanelProps) {
  const dominant_culture = useMemo(() => demographicsSystem.getDominantCulture(region.population), [region.population])
  const dominant_religion = useMemo(() => demographicsSystem.getDominantReligion(region.population), [region.population])
  const neighbors = useMemo(() => mapManager.getNeighbors(region.id), [region.id])

  const nextTier = useMemo(() => getNextTier(region.settlement_tier), [region.settlement_tier])
  const nextTierProgression = useMemo(() => nextTier ? getNextTierProgression(region.settlement_tier) : null, [nextTier, region.settlement_tier])
  const currentTierProgression = useMemo(() => getTierProgression(region.settlement_tier), [region.settlement_tier])

  // Calculate progress percentages
  const populationProgress = useMemo(() => nextTierProgression ? (region.population.total / nextTierProgression.minPopulation) * 100 : 100, [region.population.total, nextTierProgression])
  const investmentProgress = useMemo(() => nextTierProgression ? (region.development_invested / nextTierProgression.investmentCost) * 100 : 100, [region.development_invested, nextTierProgression])
  const timeProgress = useMemo(() => nextTierProgression ? (region.months_at_tier / nextTierProgression.monthsRequired) * 100 : 100, [region.months_at_tier, nextTierProgression])

  // Class summary derived from pops
  const classSummary = useMemo(() => {
    const byClass: Partial<Record<SocialClass, { total: number; litSum: number; happySum: number }>> = {}
    for (const pop of pops) {
      const entry = byClass[pop.social_class] || { total: 0, litSum: 0, happySum: 0 }
      entry.total += pop.size
      entry.litSum += pop.literacy * pop.size
      entry.happySum += pop.happiness * pop.size
      byClass[pop.social_class] = entry
    }
    const grandTotal = pops.reduce((s, p) => s + p.size, 0)
    return Object.entries(byClass)
      .map(([cls, data]) => ({
        cls: cls as SocialClass,
        count: data.total,
        percentage: grandTotal > 0 ? (data.total / grandTotal) * 100 : 0,
        avgLiteracy: data.total > 0 ? Math.round(data.litSum / data.total) : 0,
        avgHappiness: data.total > 0 ? Math.round(data.happySum / data.total) : 0
      }))
      .sort((a, b) => b.count - a.count)
  }, [pops])

  // Average literacy across region
  const avgLiteracy = useMemo(() => {
    const total = pops.reduce((s, p) => s + p.size, 0)
    if (total === 0) return 0
    return Math.round(pops.reduce((s, p) => s + p.literacy * p.size, 0) / total)
  }, [pops])

  const formatLabel = (value: string) =>
    value.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

  return (
    <div className="region-panel">
      <div className="region-header">
        <h2>{region.name}</h2>
        <div className="region-position">({region.x}, {region.y})</div>
      </div>

      {(region.continent || region.geographic_region) && (
        <div className="section">
          <h3>Geography</h3>
          {region.continent && (
            <div className="stat-row">
              <span className="label">Continent:</span>
              <span className="value">{formatLabel(region.continent)}</span>
            </div>
          )}
          {region.geographic_region && (
            <div className="stat-row">
              <span className="label">Region:</span>
              <span className="value">{formatLabel(region.geographic_region)}</span>
            </div>
          )}
        </div>
      )}

      <div className="section">
        <h3>Settlement</h3>
        <div className="stat-row">
          <span className="label">Tier:</span>
          <span className="value settlement-tier">{region.settlement_tier.charAt(0).toUpperCase() + region.settlement_tier.slice(1)}</span>
        </div>
        {nextTier && nextTierProgression && (
          <>
            <div className="stat-row">
              <span className="label">Progress to {nextTier.charAt(0).toUpperCase() + nextTier.slice(1)}:</span>
            </div>
            <div className="progress-section">
              <div className="progress-item">
                <span className="progress-label">Population: {Math.round(region.population.total).toLocaleString()} / {nextTierProgression.minPopulation.toLocaleString()}</span>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${Math.min(populationProgress, 100)}%` }}></div>
                </div>
              </div>
              <div className="progress-item">
                <span className="progress-label">Investment: {Math.round(region.development_invested)} / {nextTierProgression.investmentCost}</span>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${Math.min(investmentProgress, 100)}%` }}></div>
                </div>
              </div>
              <div className="progress-item">
                <span className="progress-label">Time: {region.months_at_tier} / {nextTierProgression.monthsRequired} months</span>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${Math.min(timeProgress, 100)}%` }}></div>
                </div>
              </div>
            </div>
          </>
        )}
        {!nextTier && (
          <div className="stat-row">
            <span className="label">Status:</span>
            <span className="value">Maximum tier reached</span>
          </div>
        )}
      </div>

      <div className="section">
        <h3>Demographics</h3>
        <div className="stat-row">
          <span className="label">Population:</span>
          <span className="value">{Math.round(region.population.total).toLocaleString()}</span>
        </div>
        <div className="stat-row">
          <span className="label">Dominant Culture:</span>
          <span className="value">{dominant_culture || 'Unknown'}</span>
        </div>
        <div className="stat-row">
          <span className="label">Dominant Religion:</span>
          <span className="value">{dominant_religion || 'Unknown'}</span>
        </div>
        <div className="stat-row">
          <span className="label">Happiness:</span>
          <span className="value">{Math.round(region.population.happiness)}/100</span>
        </div>
        {pops.length > 0 && (
          <div className="stat-row">
            <span className="label">Avg Literacy:</span>
            <span className="value">{avgLiteracy}/100</span>
          </div>
        )}
      </div>

      <div className="section">
        <h3>Culture Distribution</h3>
        {region.population.culture_distribution && Object.entries(region.population.culture_distribution).map(([culture, pop]) => {
          const percentage = ((pop || 0) / region.population.total * 100).toFixed(1)
          return (
            <div key={culture} className="bar-row">
              <span className="label">{culture}</span>
              <div className="bar">
                <div className="fill" style={{ width: `${percentage}%` }}></div>
              </div>
              <span className="percentage">{percentage}%</span>
            </div>
          )
        })}
      </div>

      <div className="section">
        <h3>Religion Distribution</h3>
        {region.population.religion_distribution && Object.entries(region.population.religion_distribution).map(([religion, pop]) => {
          const percentage = ((pop || 0) / region.population.total * 100).toFixed(1)
          return (
            <div key={religion} className="bar-row">
              <span className="label">{religion}</span>
              <div className="bar">
                <div className="fill" style={{ width: `${percentage}%` }}></div>
              </div>
              <span className="percentage">{percentage}%</span>
            </div>
          )
        })}
      </div>

      {classSummary.length > 0 && (
        <div className="section">
          <h3>Social Classes</h3>
          {classSummary.map(({ cls, count, percentage, avgLiteracy: lit, avgHappiness: happy }) => (
            <div key={cls} className="bar-row" style={{ flexWrap: 'wrap' }}>
              <span className="label" style={{ textTransform: 'capitalize', minWidth: 70 }}>{cls}</span>
              <div className="bar">
                <div className="fill" style={{ width: `${percentage}%` }}></div>
              </div>
              <span className="percentage">{count.toLocaleString()} ({percentage.toFixed(1)}%)</span>
              <span style={{ fontSize: '10px', color: '#aaa', width: '100%', paddingLeft: 70, marginTop: 1 }}>
                lit: {lit} | happiness: {happy}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="section">
        <h3>Economy</h3>
        <div className="stat-row">
          <span className="label">Wealth:</span>
          <span className="value">{Math.round(region.wealth)}</span>
        </div>
        <div className="stat-row">
          <span className="label">Trade Good:</span>
          <span className="value">{region.trade_good || '—'}</span>
        </div>
      </div>

      <div className="section">
        <h3>Neighbors ({neighbors.length})</h3>
        <div className="neighbors-list">
          {neighbors.map(neighbor => (
            <div key={neighbor.id} className="neighbor-item">
              {neighbor.name}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Use React.memo to prevent unnecessary re-renders when parent component updates
export default memo(RegionPanelContent)
