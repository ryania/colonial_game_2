import { TradeMarket, Region, GameState, SettlementTier } from './types'

// ---------------------------------------------------------------------------
// Trade goods base prices (value per unit flowing through a market)
// ---------------------------------------------------------------------------
export const TRADE_GOOD_PRICES: Record<string, number> = {
  sugar:        5,
  tobacco:      7,
  spices:      12,
  fish:         2,
  furs:         8,
  naval_stores: 4,
  coffee:       9,
  gold:        20,
  silver:      15,
  brazilwood:   6,
  indigo:       8,
  rum:          5,
  salt:         2,
  timber:       3,
  cacao:        7,
  cotton:       5,
  silk:        15,
  tea:         10,
  porcelain:   12,
  ivory:       10,
  slaves:       6,
  cloth:        4,
  grain:        2,
  copper:       7,
  iron:         5,
  dye:          6,
  pepper:      10,
  cocoa:        7,
  wool:         3,
  flax:         3,
}

// Settlement tier multiplier on province trade value
const TIER_VALUE_MULT: Record<SettlementTier, number> = {
  unsettled:  0,
  wilderness: 0.5,
  village:    1.0,
  town:       1.5,
  city:       2.5,
}

// Settlement tier base trade power contribution
const TIER_POWER: Record<SettlementTier, number> = {
  unsettled:  0,
  wilderness: 1,
  village:    2,
  town:       4,
  city:       8,
}

// ---------------------------------------------------------------------------
// Historical trade market definitions (1600 era)
// ---------------------------------------------------------------------------
export const INITIAL_TRADE_MARKETS: Omit<TradeMarket,
  'total_trade_value' | 'nation_trade_power' | 'total_trade_power' | 'nation_income'>[] = [
  // ── European end-nodes (no further upstream) ──────────────────────────────
  {
    id: 'amsterdam',
    name: 'Amsterdam',
    lat: 52.37,
    lng: 4.90,
    hex_region_id: 'amsterdam',
    description: 'Dominant hub of the Dutch trading empire. Most Baltic and northern European goods flow here.',
    upstream_market_ids: [],
  },
  {
    id: 'london',
    name: 'London',
    lat: 51.51,
    lng: -0.13,
    hex_region_id: 'london',
    description: 'Centre of English commerce. Controls the English Channel and Atlantic trade.',
    upstream_market_ids: [],
  },
  {
    id: 'seville',
    name: 'Seville',
    lat: 37.39,
    lng: -5.99,
    hex_region_id: 'seville',
    description: 'Gateway of the Spanish colonial empire. Silver from the Americas ends its journey here.',
    upstream_market_ids: [],
  },
  {
    id: 'lisbon',
    name: 'Lisbon',
    lat: 38.72,
    lng: -9.14,
    hex_region_id: 'lisbon',
    description: 'Heart of the Portuguese Empire. Controls the spice and sugar trades from Africa and Asia.',
    upstream_market_ids: [],
  },
  {
    id: 'venice',
    name: 'Venice',
    lat: 45.44,
    lng: 12.33,
    hex_region_id: 'venice',
    description: 'Queen of the Mediterranean. Receives luxury goods from the Levant and Persian Gulf.',
    upstream_market_ids: [],
  },
  {
    id: 'hamburg',
    name: 'Hamburg',
    lat: 53.55,
    lng: 10.00,
    hex_region_id: 'hamburg',
    description: 'Leading Hanseatic city. Dominates Baltic grain, timber and naval stores trade.',
    upstream_market_ids: [],
  },

  // ── Americas ──────────────────────────────────────────────────────────────
  {
    id: 'havana',
    name: 'Havana',
    lat: 23.13,
    lng: -82.38,
    hex_region_id: 'havana',
    description: 'Staging port for the Spanish treasure fleets. Sugar, tobacco and silver flow through here.',
    upstream_market_ids: ['seville'],
  },
  {
    id: 'veracruz',
    name: 'Veracruz',
    lat: 19.18,
    lng: -96.13,
    hex_region_id: 'veracruz',
    description: 'Main port of New Spain. Silver from the Mexican interior is shipped to Seville.',
    upstream_market_ids: ['seville'],
  },
  {
    id: 'recife',
    name: 'Recife',
    lat: -8.05,
    lng: -34.88,
    hex_region_id: 'pernambuco',
    description: 'Capital of Portuguese Brazil. Sugar and brazilwood dominate outgoing trade.',
    upstream_market_ids: ['lisbon'],
  },

  // ── West & Central Africa ─────────────────────────────────────────────────
  {
    id: 'gold_coast',
    name: 'Gold Coast',
    lat: 5.56,
    lng: -0.20,
    hex_region_id: 'gold_coast',
    description: 'Rich source of gold and enslaved people. Portuguese and Dutch compete for dominance.',
    upstream_market_ids: ['lisbon', 'amsterdam'],
  },

  // ── Southern Africa / Indian Ocean gateway ───────────────────────────────
  {
    id: 'cape_town',
    name: 'Cape of Good Hope',
    lat: -33.93,
    lng: 18.42,
    hex_region_id: 'cape_town',
    description: 'Vital resupply point on the route to Asia. Controlled by the Dutch VOC.',
    upstream_market_ids: ['amsterdam'],
  },

  // ── Arabian / Persian Gulf ────────────────────────────────────────────────
  {
    id: 'aden',
    name: 'Aden',
    lat: 12.79,
    lng: 45.04,
    hex_region_id: 'aden',
    description: 'Controls the mouth of the Red Sea. Coffee and spices pass through en route to the Mediterranean.',
    upstream_market_ids: ['venice'],
  },
  {
    id: 'hormuz',
    name: 'Hormuz',
    lat: 27.09,
    lng: 56.46,
    hex_region_id: 'hormuz',
    description: 'Key Persian Gulf entrepôt. Silk and Persian luxury goods funnel to the Mediterranean.',
    upstream_market_ids: ['venice'],
  },

  // ── Indian subcontinent ───────────────────────────────────────────────────
  {
    id: 'goa',
    name: 'Goa',
    lat: 15.50,
    lng: 73.83,
    hex_region_id: 'goa',
    description: 'Crown jewel of the Portuguese Estado da India. Spices, cotton and indigo flow west from here.',
    upstream_market_ids: ['lisbon'],
  },

  // ── Southeast Asia ────────────────────────────────────────────────────────
  {
    id: 'malacca',
    name: 'Malacca',
    lat: 2.19,
    lng: 102.25,
    hex_region_id: 'malacca',
    description: 'Crossroads of the spice trade. Controls access between the Indian Ocean and South China Sea.',
    upstream_market_ids: ['goa'],
  },

  // ── East Asia ─────────────────────────────────────────────────────────────
  {
    id: 'canton',
    name: 'Canton',
    lat: 23.13,
    lng: 113.26,
    hex_region_id: 'guangzhou',
    description: 'Gateway to China. Silk, porcelain and tea are traded here for silver.',
    upstream_market_ids: ['malacca'],
  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Haversine great-circle distance in kilometres */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/** Compute the base trade value a province contributes to its market */
export function provinceTradeValue(region: Region): number {
  const tierMult = TIER_VALUE_MULT[region.settlement_tier] ?? 1
  const goodsValue = region.trade_goods.reduce((sum, good) => {
    return sum + (TRADE_GOOD_PRICES[good] ?? 1)
  }, 0)
  return goodsValue * tierMult
}

/** Compute the trade power a province contributes to its market */
export function provinceTradePower(region: Region): number {
  return TIER_POWER[region.settlement_tier] ?? 1
}

// ---------------------------------------------------------------------------
// TradeSystem class
// ---------------------------------------------------------------------------

export class TradeSystem {
  /**
   * Build the initial set of trade markets with zeroed computed fields.
   */
  initializeMarkets(): TradeMarket[] {
    return INITIAL_TRADE_MARKETS.map(def => ({
      ...def,
      total_trade_value:  0,
      nation_trade_power: {},
      total_trade_power:  0,
      nation_income:      {},
    }))
  }

  /**
   * Apply precomputed province → market assignments from the pathfinding system.
   * Updates region.market_id in place for all regions in the assignment map.
   */
  applyMarketAssignments(regions: Region[], assignmentMap: Map<string, string>): Region[] {
    for (const region of regions) {
      const marketId = assignmentMap.get(region.id)
      if (marketId) region.market_id = marketId
    }
    return regions
  }

  /**
   * Apply computed upstream market flow chains to the markets array.
   * Updates market.upstream_market_ids in place.
   */
  applyFlowChains(markets: TradeMarket[], upstreamMap: Map<string, string[]>): void {
    for (const market of markets) {
      const upstream = upstreamMap.get(market.id)
      if (upstream !== undefined) market.upstream_market_ids = upstream
    }
  }

  /**
   * Assign each land province to its nearest trade market (by great-circle distance).
   * @deprecated Use applyMarketAssignments with the pathfinding system instead.
   */
  assignProvincesToMarkets(regions: Region[], markets: TradeMarket[]): Region[] {
    for (const region of regions) {
      // Ocean tiles and water features don't participate in trade
      if (region.terrain_type === 'ocean' || region.terrain_type === 'sea') continue
      if (region.lat == null || region.lng == null) continue

      let closestMarket: TradeMarket | null = null
      let closestDist = Infinity

      for (const market of markets) {
        const dist = haversineKm(region.lat, region.lng, market.lat, market.lng)
        if (dist < closestDist) {
          closestDist = dist
          closestMarket = market
        }
      }

      if (closestMarket) {
        region.market_id = closestMarket.id
      }
    }
    return regions
  }

  /**
   * Monthly tick: recalculate trade power, value and income for every market.
   */
  processMonthlyTrade(state: GameState): TradeMarket[] {
    const markets = state.trade_markets.map(m => ({
      ...m,
      total_trade_value:  0,
      nation_trade_power: {} as Record<string, number>,
      total_trade_power:  0,
      nation_income:      {} as Record<string, number>,
    }))

    const marketById = new Map(markets.map(m => [m.id, m]))

    // Build owner lookup: region_id -> state_owner_id
    const ownerOf = this._buildOwnerMap(state)

    // Accumulate value and power from each province
    for (const region of state.regions) {
      if (!region.market_id) continue
      const market = marketById.get(region.market_id)
      if (!market) continue

      const value = provinceTradeValue(region)
      const power = provinceTradePower(region)
      market.total_trade_value += value
      market.total_trade_power += power

      const ownerId = ownerOf.get(region.id)
      if (ownerId) {
        market.nation_trade_power[ownerId] = (market.nation_trade_power[ownerId] ?? 0) + power
      }
    }

    // Calculate income per nation in each market
    for (const market of markets) {
      if (market.total_trade_power === 0) continue
      for (const [ownerId, power] of Object.entries(market.nation_trade_power)) {
        const share = power / market.total_trade_power
        market.nation_income[ownerId] = market.total_trade_value * share
      }
    }

    return markets
  }

  /**
   * Get the top N nations by trade power in a given market.
   */
  getTopTraders(market: TradeMarket, n = 5): Array<{ ownerId: string; power: number; share: number; income: number }> {
    if (market.total_trade_power === 0) return []
    return Object.entries(market.nation_trade_power)
      .map(([ownerId, power]) => ({
        ownerId,
        power,
        share: power / market.total_trade_power,
        income: market.nation_income[ownerId] ?? 0,
      }))
      .sort((a, b) => b.power - a.power)
      .slice(0, n)
  }

  /**
   * Get all markets a specific nation has any presence in, sorted by income.
   */
  getMarketsForNation(markets: TradeMarket[], ownerId: string): Array<{ market: TradeMarket; power: number; share: number; income: number }> {
    return markets
      .filter(m => (m.nation_trade_power[ownerId] ?? 0) > 0)
      .map(m => ({
        market: m,
        power:  m.nation_trade_power[ownerId] ?? 0,
        share:  m.total_trade_power > 0 ? (m.nation_trade_power[ownerId] ?? 0) / m.total_trade_power : 0,
        income: m.nation_income[ownerId] ?? 0,
      }))
      .sort((a, b) => b.income - a.income)
  }

  /**
   * Total monthly trade income for a given nation across all markets.
   */
  totalNationIncome(markets: TradeMarket[], ownerId: string): number {
    return markets.reduce((sum, m) => sum + (m.nation_income[ownerId] ?? 0), 0)
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /**
   * Build a map of region_id -> state_owner_id by consulting:
   * 1. region.state_owner_id (home territories)
   * 2. colonial entity → state owner link
   */
  private _buildOwnerMap(state: GameState): Map<string, string> {
    const map = new Map<string, string>()

    // Colonial entity → owner lookup
    const entityOwner = new Map<string, string>()
    for (const entity of state.colonial_entities) {
      if (entity.state_owner_id) {
        entityOwner.set(entity.id, entity.state_owner_id)
      }
    }

    for (const region of state.regions) {
      if (region.state_owner_id) {
        map.set(region.id, region.state_owner_id)
      } else if (region.colonial_entity_id) {
        const ownerId = entityOwner.get(region.colonial_entity_id)
        if (ownerId) map.set(region.id, ownerId)
      }
    }

    return map
  }
}

export const tradeSystem = new TradeSystem()
