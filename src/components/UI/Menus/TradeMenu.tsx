import React, { useState } from 'react'
import { GameState, TradeMarket } from '../../../game/types'
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

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface MarketRowProps {
  market: TradeMarket
  playerOwnerId: string | undefined
  allOwners: GameState['state_owners']
  isSelected: boolean
  onClick: () => void
}

const MarketRow: React.FC<MarketRowProps> = ({ market, playerOwnerId, allOwners, isSelected, onClick }) => {
  const playerIncome = playerOwnerId ? (market.nation_income[playerOwnerId] ?? 0) : 0
  const playerPower = playerOwnerId ? (market.nation_trade_power[playerOwnerId] ?? 0) : 0
  const playerShare = market.total_trade_power > 0 ? playerPower / market.total_trade_power : 0

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
        <span style={{ color: '#ffdd99', fontWeight: 600, fontSize: 13 }}>{market.name}</span>
        <span style={{ color: '#88ccff', fontSize: 11 }}>
          {fmt(market.total_trade_value)} <span style={{ color: '#667' }}>value</span>
        </span>
      </div>

      {/* Mini trade power bar */}
      <div style={{ marginTop: 4, height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', position: 'relative' }}>
        {buildPowerSegments(market, allOwners).map((seg, i) => (
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

interface MarketDetailProps {
  market: TradeMarket
  playerOwnerId: string | undefined
  allOwners: GameState['state_owners']
  regions: GameState['regions']
  allMarkets: TradeMarket[]
}

const MarketDetail: React.FC<MarketDetailProps> = ({ market, playerOwnerId, allOwners, regions, allMarkets }) => {
  const traders = tradeSystem.getTopTraders(market, 8)
  const localRegions = regions.filter(r => r.market_id === market.id && r.terrain_type !== 'ocean' && r.terrain_type !== 'sea')

  const upstreamMarkets = market.upstream_market_ids
    .map(id => allMarkets.find(m => m.id === id))
    .filter((m): m is TradeMarket => m !== null && m !== undefined)

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ color: '#ffdd99', fontSize: 16, fontWeight: 700 }}>{market.name}</div>
        <div style={{ color: '#aabbcc', fontSize: 11, marginTop: 4, fontStyle: 'italic', lineHeight: 1.4 }}>
          {market.description}
        </div>
        {upstreamMarkets.length > 0 && (
          <div style={{ color: '#88ccff', fontSize: 10, marginTop: 6 }}>
            Flows to: {upstreamMarkets.map(m => m.name).join(', ')}
          </div>
        )}
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
        <StatBox label="Trade Value" value={fmt(market.total_trade_value)} color="#88ccff" />
        <StatBox label="Total Power" value={fmt(market.total_trade_power)} color="#aabb88" />
        <StatBox label="Provinces" value={String(localRegions.length)} color="#cc99ff" />
      </div>

      {/* Power bar */}
      <div style={{ marginBottom: 6, fontSize: 11, color: '#aabbcc' }}>Trade Power Distribution</div>
      <div style={{ height: 14, borderRadius: 3, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginBottom: 10, position: 'relative' }}>
        {buildPowerSegments(market, allOwners).map((seg, i) => (
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
          <div style={{ fontSize: 11, color: '#aabbcc', marginBottom: 4 }}>Nations</div>
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
        <div style={{ color: '#667', fontSize: 11, marginBottom: 12 }}>No nations active in this market yet.</div>
      )}

      {/* Province list */}
      {localRegions.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: '#aabbcc', marginBottom: 4 }}>
            Provinces ({localRegions.length})
          </div>
          <div style={{ maxHeight: 140, overflowY: 'auto', fontSize: 10 }}>
            {localRegions
              .sort((a, b) => {
                // Sort by trade value descending
                const av = a.trade_goods.reduce((s, g) => s + (TRADE_GOOD_PRICES[g] ?? 1), 0)
                const bv = b.trade_goods.reduce((s, g) => s + (TRADE_GOOD_PRICES[g] ?? 1), 0)
                return bv - av
              })
              .map(r => {
                const val = r.trade_goods.reduce((s, g) => s + (TRADE_GOOD_PRICES[g] ?? 1), 0)
                return (
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
                      {r.trade_goods.join(', ')} ({fmt(val)})
                    </span>
                  </div>
                )
              })}
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

function buildPowerSegments(market: TradeMarket, allOwners: GameState['state_owners']): PowerSegment[] {
  if (market.total_trade_power === 0) return []

  const entries = Object.entries(market.nation_trade_power).sort((a, b) => b[1] - a[1])
  const segments: PowerSegment[] = []
  let cursor = 0

  entries.forEach(([ownerId, power], i) => {
    const widthPct = (power / market.total_trade_power) * 100
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
  const markets = gameState.trade_markets ?? []
  const [selectedMarketId, setSelectedMarketId] = useState<string | null>(
    markets.length > 0 ? markets[0].id : null
  )

  // Determine player's owning nation
  const playerChar = gameState.characters.find(c => c.id === gameState.player_character_id)
  const playerRegion = playerChar ? gameState.regions.find(r => r.id === playerChar.region_id) : undefined
  const playerOwnerId =
    playerRegion?.state_owner_id ??
    (playerRegion?.colonial_entity_id
      ? gameState.colonial_entities.find(e => e.id === playerRegion.colonial_entity_id)?.state_owner_id
      : undefined)

  const selectedMarket = markets.find(m => m.id === selectedMarketId) ?? null

  const totalIncome = playerOwnerId
    ? tradeSystem.totalNationIncome(markets, playerOwnerId)
    : 0

  if (markets.length === 0) {
    return (
      <div className="trade-menu">
        <div className="menu-section" style={{ color: '#aabbcc' }}>
          Trade markets are being initialised…
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
          <span style={{ color: '#ffdd99', fontWeight: 700, fontSize: 14 }}>Trade Markets</span>
          {playerOwnerId && (
            <span style={{ color: '#ffd700', fontSize: 12 }}>
              Total: +{fmt(totalIncome)}/mo
            </span>
          )}
        </div>
        <div style={{ color: '#667', fontSize: 10, marginTop: 2 }}>
          {markets.length} markets · click to inspect
        </div>
      </div>

      {/* ── Split layout ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left: market list */}
        <div style={{ width: 200, overflowY: 'auto', padding: '8px 8px', borderRight: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
          {markets.map(market => (
            <MarketRow
              key={market.id}
              market={market}
              playerOwnerId={playerOwnerId}
              allOwners={gameState.state_owners}
              isSelected={market.id === selectedMarketId}
              onClick={() => setSelectedMarketId(market.id)}
            />
          ))}
        </div>

        {/* Right: detail panel */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
          {selectedMarket ? (
            <MarketDetail
              market={selectedMarket}
              playerOwnerId={playerOwnerId}
              allOwners={gameState.state_owners}
              regions={gameState.regions}
              allMarkets={markets}
            />
          ) : (
            <div style={{ color: '#667', fontSize: 12 }}>Select a market to inspect.</div>
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
