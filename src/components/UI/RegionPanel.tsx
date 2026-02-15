import { Region } from '../../game/types'
import { demographicsSystem } from '../../game/Demographics'
import { mapManager } from '../../game/Map'
import './RegionPanel.css'

interface RegionPanelProps {
  region: Region
}

export default function RegionPanel({ region }: RegionPanelProps) {
  const dominant_culture = demographicsSystem.getDominantCulture(region.population)
  const dominant_religion = demographicsSystem.getDominantReligion(region.population)
  const neighbors = mapManager.getNeighbors(region.id)

  return (
    <div className="region-panel">
      <div className="region-header">
        <h2>{region.name}</h2>
        <div className="region-position">({region.x}, {region.y})</div>
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

      <div className="section">
        <h3>Economy</h3>
        <div className="stat-row">
          <span className="label">Wealth:</span>
          <span className="value">{Math.round(region.wealth)}</span>
        </div>
        <div className="stat-row">
          <span className="label">Trade Goods:</span>
          <span className="value">{region.trade_goods.join(', ')}</span>
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
