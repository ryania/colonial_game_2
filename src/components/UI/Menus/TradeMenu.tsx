import React, { useState } from 'react'
import { GameState, TradeCluster, TradeFlow } from '../../../game/types'
import { tradeSystem, TRADE_GOOD_PRICES } from '../../../game/TradeSystem'
import '../Menus.css'

interface TradeMenuProps {
  gameState: GameState
  onClose: () => void
}

// Colour palette for national trade power bars
const NATION_COLORS = [
  '#f5a623', '#4a90d9', '#e74c3c', '#2ecc71',
  '#9b59b6', '#1abc9c', '#e67e22', '#3498db',
]

function fmt(n: number): string {
  return n.toFixed(1)
}

function pct(share: number): string {
  return `${(share * 100).toFixed(0)}%`
}

function fmtPrice(price: number, basePrice: number): string {
  const delta = price - basePrice
  if (Math.abs(delta) < 0.1) return fmt(price)
  const sign = delta > 0 ? '+' : ''
  return `${fmt(price)} (${sign}${Math.round((delta / basePrice) * 100)}%)`
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface ClusterRowProps {
  cluster: TradeCluster
  playerOwnerId: string | undefined
  allOwners: GameState['state_owners']
  isSelected: boolean
  onClick: () => void
}

const ClusterRow: React.FC<ClusterRowProps> = ({ cluster, playerOwnerId, allOwners, isSelected, onClick }) => {
  const playerIncome = playerOwnerId ? (cluster.nation_income[playerOwnerId] ?? 0) : 0
  const playerPower  = playerOwnerId ? (cluster.nation_trade_power[playerOwnerId] ?? 0) : 0
  const playerShare  = cluster.total_trade_power > 0 ? playerPower / cluster.total_trade_power : 0

  return (
    <div
      onClick={onClick}
      style={{
        padding: '8px 10px',
        marginBottom: 4,
        borderRadius: 4,
        cursor: 'pointer',
        background: isSelected ? 'rgba(255,220,100,0.12)' : 'rgba(255,255,255,0.04)',
        border: isSelected ? '1px solid rgba(255,220,100,0.4)' : '1px solid transparent',
        transition: 'background 0.15s',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#ffdd99', fontWeight: 600, fontSize: 13 }}>{cluster.name}</span>
        <span style={{ color: '#88ccff', fontSize: 11 }}>
          {fmt(cluster.total_trade_value)} <span style={{ color: '#667' }}>value</span>
        </span>
      </div>

      {/* Mini trade power bar */}
      <div style={{ marginTop: 4, height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', position: 'relative' }}>
        {buildPowerSegments(cluster, allOwners).map((seg, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${seg.startPct}%`,
              width: `${seg.widthPct}%`,
              height: '100%',
              background: seg.color,
            }}
          />
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
        <span style={{ color: '#aabbcc', fontSize: 10 }}>
          {playerShare > 0 ? `Your share: ${pct(playerShare)}` : 'No presence'}
        </span>
        {playerIncome > 0 && (
          <span style={{ color: '#ffd700', fontSize: 10 }}>+{fmt(playerIncome)}/mo</span>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------

interface ClusterDetailProps {
  cluster: TradeCluster
  playerOwnerId: string | undefined
  allOwners: GameState['state_owners']
  regions: GameState['regions']
  flows: TradeFlow[]
  allClusters: TradeCluster[]
}

const ClusterDetail: React.FC<ClusterDetailProps> = ({ cluster, playerOwnerId, allOwners, regions, flows, allClusters }) => {
  const traders = tradeSystem.getTopTraders(cluster, 8)
  const localRegions = regions.filter(
    r => r.cluster_id === cluster.id && r.terrain_type !== 'ocean' && r.terrain_type !== 'sea'
  )

  // Top 5 goods by supply
  const topSupply = (Object.entries(cluster.supply) as [string, number][])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  // Top 5 goods by demand
  const topDemand = (Object.entries(cluster.demand) as [string, number][])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  // Active trade flows involving this cluster
  const inFlows  = flows.filter(f => f.to_cluster_id === cluster.id).slice(0, 4)
  const outFlows = flows.filter(f => f.from_cluster_id === cluster.id).slice(0, 4)

  const clusterById = new Map<string, TradeCluster>(allClusters.map(c => [c.id, c]))

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ color: '#ffdd99', fontSize: 16, fontWeight: 700 }}>{cluster.name}</div>
        <div style={{ color: '#aabbcc', fontSize: 10, marginTop: 3 }}>
          {localRegions.length} provinces · {cluster.continent}
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
        <StatBox label="Trade Value" value={fmt(cluster.total_trade_value)} color="#88ccff" />
        <StatBox label="Total Power" value={fmt(cluster.total_trade_power)} color="#aabb88" />
        <StatBox label="Provinces"   value={String(localRegions.length)} color="#cc99ff" />
      </div>

      {/* Supply / Demand side by side */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: '#aabb88', marginBottom: 4 }}>Top Exports (supply)</div>
          {topSupply.length === 0 && <div style={{ color: '#667', fontSize: 10 }}>—</div>}
          {topSupply.map(([good, qty]) => {
            const basePrice = TRADE_GOOD_PRICES[good] ?? 1
            const curPrice  = cluster.prices[good] ?? basePrice
            const pricePct  = Math.round(((curPrice - basePrice) / basePrice) * 100)
            return (
              <div key={good} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, padding: '1px 0', color: '#ccd' }}>
                <span>{good}</span>
                <span style={{ color: '#88ccff' }}>
                  {fmt(qty)}
                  {pricePct !== 0 && (
                    <span style={{ color: pricePct > 0 ? '#ffd700' : '#e74c3c', marginLeft: 4 }}>
                      ({pricePct > 0 ? '+' : ''}{pricePct}%)
                    </span>
                  )}
                </span>
              </div>
            )
          })}
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: '#e74c3c', marginBottom: 4 }}>Top Imports (demand)</div>
          {topDemand.length === 0 && <div style={{ color: '#667', fontSize: 10 }}>—</div>}
          {topDemand.map(([good, qty]) => {
            const basePrice = TRADE_GOOD_PRICES[good] ?? 1
            const curPrice  = cluster.prices[good] ?? basePrice
            const pricePct  = Math.round(((curPrice - basePrice) / basePrice) * 100)
            return (
              <div key={good} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, padding: '1px 0', color: '#ccd' }}>
                <span>{good}</span>
                <span style={{ color: '#e74c3c' }}>
                  {fmt(qty)}
                  {pricePct !== 0 && (
                    <span style={{ color: pricePct > 0 ? '#ffd700' : '#aabb88', marginLeft: 4 }}>
                      ({pricePct > 0 ? '+' : ''}{pricePct}%)
                    </span>
                  )}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Active trade flows */}
      {(outFlows.length > 0 || inFlows.length > 0) && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, color: '#aabbcc', marginBottom: 4 }}>Active Trade Flows</div>
          {outFlows.map(f => (
            <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, padding: '2px 0', color: '#aabb88' }}>
              <span>→ {clusterById.get(f.to_cluster_id)?.name ?? f.to_cluster_id}: <span style={{ color: '#ccd' }}>{f.good}</span></span>
              <span style={{ color: '#ffd700' }}>+{fmt(f.value)}/mo</span>
            </div>
          ))}
          {inFlows.map(f => (
            <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, padding: '2px 0', color: '#88aabb' }}>
              <span>← {clusterById.get(f.from_cluster_id)?.name ?? f.from_cluster_id}: <span style={{ color: '#ccd' }}>{f.good}</span></span>
              <span style={{ color: '#88ccff' }}>{fmt(f.volume)} units</span>
            </div>
          ))}
        </div>
      )}

      {/* Power bar */}
      <div style={{ marginBottom: 6, fontSize: 10, color: '#aabbcc' }}>Trade Power Distribution</div>
      <div style={{ height: 12, borderRadius: 3, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginBottom: 10, position: 'relative' }}>
        {buildPowerSegments(cluster, allOwners).map((seg, i) => (
          <div
            key={i}
            title={`${seg.name}: ${pct(seg.widthPct / 100)}`}
            style={{
              position: 'absolute',
              left: `${seg.startPct}%`,
              width: `${seg.widthPct}%`,
              height: '100%',
              background: seg.color,
              borderRight: '1px solid rgba(0,0,0,0.3)',
            }}
          />
        ))}
      </div>

      {/* Nation breakdown */}
      {traders.length > 0 ? (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, color: '#aabbcc', marginBottom: 4 }}>Nations</div>
          {traders.map(({ ownerId, power, share, income }, i) => {
            const owner = allOwners.find(o => o.id === ownerId)
            const isPlayer = ownerId === playerOwnerId
            return (
              <div
                key={ownerId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '3px 0',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  background: isPlayer ? 'rgba(255,220,100,0.07)' : 'transparent',
                }}
              >
                <div style={{ width: 10, height: 10, borderRadius: 2, background: NATION_COLORS[i % NATION_COLORS.length], flexShrink: 0 }} />
                <span style={{ flex: 1, color: isPlayer ? '#ffdd99' : '#ccd', fontSize: 11, fontWeight: isPlayer ? 600 : 400 }}>
                  {owner?.name ?? ownerId}
                </span>
                <span style={{ color: '#aabb88', fontSize: 10, width: 36, textAlign: 'right' }}>{pct(share)}</span>
                <span style={{ color: '#ffd700', fontSize: 10, width: 48, textAlign: 'right' }}>+{fmt(income)}/mo</span>
              </div>
            )
          })}
        </div>
      ) : (
        <div style={{ color: '#667', fontSize: 11, marginBottom: 12 }}>No nations active in this cluster yet.</div>
      )}

      {/* Province list */}
      {localRegions.length > 0 && (
        <div>
          <div style={{ fontSize: 10, color: '#aabbcc', marginBottom: 4 }}>
            Provinces ({localRegions.length})
          </div>
          <div style={{ maxHeight: 130, overflowY: 'auto', fontSize: 10 }}>
            {localRegions
              .sort((a, b) => (TRADE_GOOD_PRICES[b.trade_good] ?? 0) - (TRADE_GOOD_PRICES[a.trade_good] ?? 0))
              .map(r => (
                <div
                  key={r.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '2px 0',
                    borderBottom: '1px solid rgba(255,255,255,0.03)',
                    color: '#aabbcc',
                  }}
                >
                  <span>{r.name}</span>
                  <span style={{ color: '#88ccff' }}>
                    {r.trade_good} ({fmt(TRADE_GOOD_PRICES[r.trade_good] ?? 1)})
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------

const StatBox: React.FC<{ label: string; value: string; color: string }> = ({ label, value, color }) => (
  <div
    style={{
      flex: 1,
      background: 'rgba(255,255,255,0.06)',
      borderRadius: 4,
      padding: '6px 8px',
      textAlign: 'center',
    }}
  >
    <div style={{ color, fontSize: 15, fontWeight: 700 }}>{value}</div>
    <div style={{ color: '#667', fontSize: 9, marginTop: 1 }}>{label}</div>
  </div>
)

// ---------------------------------------------------------------------------
// Helper: build colour-coded power segments for a horizontal bar
// ---------------------------------------------------------------------------

interface PowerSegment {
  name: string
  color: string
  startPct: number
  widthPct: number
}

function buildPowerSegments(cluster: TradeCluster, allOwners: GameState['state_owners']): PowerSegment[] {
  if (cluster.total_trade_power === 0) return []

  const entries = Object.entries(cluster.nation_trade_power).sort((a, b) => b[1] - a[1])
  const segments: PowerSegment[] = []
  let cursor = 0

  entries.forEach(([ownerId, power], i) => {
    const widthPct = (power / cluster.total_trade_power) * 100
    const owner = allOwners.find(o => o.id === ownerId)
    segments.push({
      name: owner?.name ?? ownerId,
      color: NATION_COLORS[i % NATION_COLORS.length],
      startPct: cursor,
      widthPct,
    })
    cursor += widthPct
  })

  return segments
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export const TradeMenu: React.FC<TradeMenuProps> = ({ gameState, onClose }) => {
  const clusters = gameState.trade_clusters ?? []
  const flows    = gameState.trade_flows ?? []

  const [selectedClusterId, setSelectedClusterId] = useState<string | null>(
    clusters.length > 0 ? clusters[0].id : null
  )

  // Determine player's owning nation
  const playerChar = gameState.characters.find(c => c.id === gameState.player_character_id)
  const playerRegion = playerChar ? gameState.regions.find(r => r.id === playerChar.region_id) : undefined
  const playerOwnerId =
    playerRegion?.state_owner_id ??
    (playerRegion?.colonial_entity_id
      ? gameState.colonial_entities.find(e => e.id === playerRegion.colonial_entity_id)?.state_owner_id
      : undefined)

  const selectedCluster = clusters.find(c => c.id === selectedClusterId) ?? null

  const totalIncome = playerOwnerId
    ? tradeSystem.totalNationIncome(clusters, playerOwnerId)
    : 0

  if (clusters.length === 0) {
    return (
      <div className="trade-menu">
        <div className="menu-section" style={{ color: '#aabbcc' }}>
          Trade clusters are being initialised…
        </div>
        <div className="menu-section menu-actions">
          <button className="action-btn secondary" onClick={onClose}>CLOSE</button>
        </div>
      </div>
    )
  }

  return (
    <div className="trade-menu" style={{ display: 'flex', flexDirection: 'column', gap: 0, height: '100%' }}>
      {/* ── Summary bar ── */}
      <div className="menu-section" style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#ffdd99', fontWeight: 700, fontSize: 14 }}>Trade Clusters</span>
          {playerOwnerId && (
            <span style={{ color: '#ffd700', fontSize: 12 }}>
              Total: +{fmt(totalIncome)}/mo
            </span>
          )}
        </div>
        <div style={{ color: '#667', fontSize: 10, marginTop: 2 }}>
          {clusters.length} clusters · {flows.length} active trade flows
        </div>
      </div>

      {/* ── Split layout ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left: cluster list */}
        <div style={{ width: 200, overflowY: 'auto', padding: '8px 8px', borderRight: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
          {clusters.map(cluster => (
            <ClusterRow
              key={cluster.id}
              cluster={cluster}
              playerOwnerId={playerOwnerId}
              allOwners={gameState.state_owners}
              isSelected={cluster.id === selectedClusterId}
              onClick={() => setSelectedClusterId(cluster.id)}
            />
          ))}
        </div>

        {/* Right: detail panel */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
          {selectedCluster ? (
            <ClusterDetail
              cluster={selectedCluster}
              playerOwnerId={playerOwnerId}
              allOwners={gameState.state_owners}
              regions={gameState.regions}
              flows={flows}
              allClusters={clusters}
            />
          ) : (
            <div style={{ color: '#667', fontSize: 12 }}>Select a cluster to inspect.</div>
          )}
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="menu-section menu-actions" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <button className="action-btn secondary" onClick={onClose}>CLOSE</button>
      </div>
    </div>
  )
}
