/**
 * TradeSystem.ts
 *
 * Proximity-based market cluster trade system with supply/demand dynamics.
 *
 * Provinces are grouped into ~22 geographic trade clusters. Each month:
 *   1. Clusters accumulate supply from their provinces (one good per province).
 *   2. Demand is computed from base economic roles × cluster population.
 *   3. Surplus goods flow from producing clusters to consuming clusters via
 *      the cheapest pre-computed ocean-current-aware route.
 *   4. Prices adjust based on supply/demand ratios.
 *   5. Income is distributed to nations by trade power share.
 *
 * The Atlantic triangle trade emerges naturally:
 *   - West Africa has slave surplus; Caribbean has slave demand.
 *   - Caribbean has sugar surplus; European clusters have sugar demand.
 *   - Trade Winds (W) and Gulf Stream (NE) make these routes cheapest.
 */

import { TradeCluster, TradeFlow, TradeRoute, Region, GameState, SettlementTier, GeographicRegion, Continent } from './types'
import { buildTradeRouteRecord, ClusterRoute, PathfindingGraph, buildAnchorNodeIds, computeRoutesFromSource } from './Pathfinding'
import { TRADE_GOOD_PRICES } from './TradeGoods'

export { TRADE_GOOD_PRICES }

// ---------------------------------------------------------------------------
// Settlement tier multipliers for supply production
// ---------------------------------------------------------------------------

const TIER_SUPPLY_MULT: Record<SettlementTier, number> = {
  unsettled:  0,
  wilderness: 0.5,
  village:    1.0,
  town:       2.0,
  city:       4.0,
}

const TIER_POWER: Record<SettlementTier, number> = {
  unsettled:  0,
  wilderness: 1,
  village:    2,
  town:       4,
  city:       8,
}

// ---------------------------------------------------------------------------
// Cluster zone definitions
// Each cluster maps a set of GeographicRegion values to a named trade zone.
// Provinces whose geographic_region is in a cluster's list are assigned to
// that cluster by default; Dijkstra-based assignment resolves the rest.
// ---------------------------------------------------------------------------

interface ClusterZoneDef {
  id: string
  name: string
  continent: Continent
  geographic_regions: GeographicRegion[]
  preferred_anchor: string  // Province ID to use as pathfinding anchor
}

export const CLUSTER_ZONE_DEFS: ClusterZoneDef[] = [
  // ── Europe ────────────────────────────────────────────────────────────────
  {
    id: 'iberia', name: 'Iberian Peninsula',
    continent: 'europe',
    geographic_regions: ['iberia'],
    preferred_anchor: 'lisbon',
  },
  {
    id: 'france', name: 'France',
    continent: 'europe',
    geographic_regions: ['france'],
    preferred_anchor: 'paris',
  },
  {
    id: 'british_isles', name: 'British Isles',
    continent: 'europe',
    geographic_regions: ['british_isles'],
    preferred_anchor: 'london',
  },
  {
    id: 'low_countries', name: 'Low Countries & Hanseatic',
    continent: 'europe',
    geographic_regions: ['low_countries', 'hanseatic', 'holy_roman_empire', 'central_europe', 'north_sea'],
    preferred_anchor: 'amsterdam',
  },
  {
    id: 'mediterranean', name: 'Mediterranean',
    continent: 'europe',
    geographic_regions: ['italy', 'mediterranean'],
    preferred_anchor: 'genoa',
  },
  {
    id: 'ottoman', name: 'Ottoman Empire',
    continent: 'asia',
    geographic_regions: ['anatolia', 'balkans', 'levant'],
    preferred_anchor: 'istanbul',
  },
  {
    id: 'baltic', name: 'Baltic & Scandinavia',
    continent: 'europe',
    geographic_regions: ['baltic', 'scandinavia', 'poland', 'eastern_europe'],
    preferred_anchor: 'stockholm',
  },
  {
    id: 'russia', name: 'Russia',
    continent: 'europe',
    geographic_regions: ['russia', 'central_asia'],
    preferred_anchor: 'moscow',
  },
  // ── Africa ────────────────────────────────────────────────────────────────
  {
    id: 'north_africa', name: 'North Africa',
    continent: 'africa',
    geographic_regions: ['north_africa'],
    preferred_anchor: 'algiers',
  },
  {
    id: 'west_africa', name: 'West Africa',
    continent: 'africa',
    geographic_regions: ['west_africa', 'central_africa'],
    preferred_anchor: 'gold_coast',
  },
  {
    id: 'east_africa', name: 'East Africa',
    continent: 'africa',
    geographic_regions: ['east_africa', 'northeast_africa'],
    preferred_anchor: 'mombasa',
  },
  {
    id: 'southern_africa', name: 'Southern Africa',
    continent: 'africa',
    geographic_regions: ['southern_africa', 'madagascar'],
    preferred_anchor: 'cape_town',
  },
  // ── Middle East ───────────────────────────────────────────────────────────
  {
    id: 'middle_east', name: 'Middle East & Persia',
    continent: 'asia',
    geographic_regions: ['arabia', 'persian_gulf', 'red_sea', 'mesopotamia', 'persia'],
    preferred_anchor: 'isfahan',
  },
  // ── Americas ──────────────────────────────────────────────────────────────
  {
    id: 'caribbean', name: 'Caribbean',
    continent: 'americas',
    geographic_regions: ['caribbean', 'gulf_of_mexico'],
    preferred_anchor: 'cuba',
  },
  {
    id: 'central_america', name: 'Central America & Mexico',
    continent: 'americas',
    geographic_regions: ['central_america', 'mexico'],
    preferred_anchor: 'veracruz',
  },
  {
    id: 'eastern_seaboard', name: 'Eastern Seaboard',
    continent: 'americas',
    geographic_regions: ['north_america', 'great_lakes'],
    preferred_anchor: 'chesapeake',
  },
  {
    id: 'brazil', name: 'Brazil & South America',
    continent: 'americas',
    geographic_regions: ['south_america'],
    preferred_anchor: 'pernambuco',
  },
  // ── Asia ──────────────────────────────────────────────────────────────────
  {
    id: 'india_west', name: 'Western India',
    continent: 'asia',
    geographic_regions: ['india_west', 'india_interior', 'south_asia'],
    preferred_anchor: 'surat',
  },
  {
    id: 'india_east', name: 'Eastern India & Bay of Bengal',
    continent: 'asia',
    geographic_regions: ['india_east', 'bay_of_bengal'],
    preferred_anchor: 'bengal',
  },
  {
    id: 'southeast_asia', name: 'Southeast Asia',
    continent: 'asia',
    geographic_regions: ['southeast_asia', 'malaya', 'indochina', 'siam', 'burma'],
    preferred_anchor: 'malacca',
  },
  {
    id: 'spice_islands', name: 'Spice Islands & Philippines',
    continent: 'asia',
    geographic_regions: ['spice_islands', 'java', 'celebes', 'borneo', 'sumatra', 'philippines', 'new_guinea'],
    preferred_anchor: 'ternate',
  },
  {
    id: 'china_japan', name: 'China, Korea & Japan',
    continent: 'asia',
    geographic_regions: ['china', 'japan', 'korea', 'east_asia', 'south_china_sea'],
    preferred_anchor: 'guangzhou',
  },
]

// ---------------------------------------------------------------------------
// Base demand per cluster (units per month at reference population)
// Demand represents what this cluster imports / consumes from other clusters.
// Goods not listed have 0 base demand (cluster only supplies them).
// ---------------------------------------------------------------------------

const REFERENCE_POP = 100_000  // population normalisation base

const CLUSTER_BASE_DEMAND: Record<string, Record<string, number>> = {
  iberia: {
    sugar: 10, silver: 8, tobacco: 6, gold: 6, spices: 5,
    indigo: 4, cocoa: 3, ivory: 3, slaves: 0, grain: 2,
  },
  france: {
    sugar: 6, tobacco: 5, silk: 4, spices: 4, indigo: 3,
    grain: 2, cloth: 2, iron: 2,
  },
  british_isles: {
    sugar: 8, tobacco: 12, furs: 6, fur: 6, indigo: 5,
    grain: 3, iron: 2, cloth: 2,
  },
  low_countries: {
    sugar: 6, spices: 8, silk: 5, tea: 5, gold: 4,
    grain: 4, timber: 3, naval_stores: 2, copper: 2,
  },
  mediterranean: {
    silk: 8, spices: 10, ivory: 6, porcelain: 4, cotton: 5,
    grain: 5, silver: 4, gold: 3,
  },
  ottoman: {
    silk: 5, spices: 4, grain: 3, cotton: 4, silver: 3,
    ivory: 2, coffee: 4,
  },
  baltic: {
    grain: 2, cloth: 4, iron: 4, copper: 3, naval_stores: 2,
    silver: 2,
  },
  russia: {
    silk: 2, spices: 2, silver: 2, cloth: 3, iron: 3,
  },
  north_africa: {
    silk: 3, silver: 2, cloth: 3, spices: 2, ivory: 2,
  },
  west_africa: {
    cloth: 6, iron: 5, copper: 4, silver: 2, glass: 2,
  },
  east_africa: {
    silver: 3, cloth: 3, iron: 2, glass: 2,
  },
  southern_africa: {
    silver: 2, cloth: 2, iron: 2,
  },
  middle_east: {
    silver: 5, spices: 3, silk: 4, cotton: 4, ivory: 3, gold: 2,
  },
  caribbean: {
    slaves: 8, iron: 4, cloth: 6, grain: 2, copper: 2,
  },
  central_america: {
    iron: 3, cloth: 4, grain: 2, slaves: 3,
  },
  eastern_seaboard: {
    cloth: 4, iron: 3, grain: 0, slaves: 4,
  },
  brazil: {
    slaves: 10, iron: 4, cloth: 3, grain: 2,
  },
  india_west: {
    silver: 8, gold: 3, silk: 2, cloth: 2,
  },
  india_east: {
    silver: 6, cloth: 2,
  },
  southeast_asia: {
    silver: 5, cloth: 2, iron: 2,
  },
  china_japan: {
    silver: 10, gold: 5, copper: 3,
  },
  spice_islands: {
    silver: 4, cloth: 2, iron: 2,
  },
}

// ---------------------------------------------------------------------------
// TradeSystem class
// ---------------------------------------------------------------------------

export class TradeSystem {
  private interClusterRoutes: Map<string, ClusterRoute> = new Map()

  // Lazy pathfinding context — populated by setPathfindingContext()
  private pathfindingGraph:  PathfindingGraph | null = null
  private anchorNodeIds:     Map<string, number>     = new Map()
  private pendingSourceIds:  string[]                = []

  /**
   * Store pre-computed inter-cluster routes (called from App.tsx after init).
   * @deprecated Prefer setPathfindingContext for lazy computation.
   */
  setInterClusterRoutes(routes: Map<string, ClusterRoute>): void {
    this.interClusterRoutes = routes
  }

  /**
   * Provide the pathfinding graph and cluster list so routes can be computed
   * lazily one cluster-source at a time via requestIdleCallback, instead of
   * blocking startup with 22 full Dijkstra passes.
   */
  setPathfindingContext(graph: PathfindingGraph, clusters: TradeCluster[]): void {
    this.pathfindingGraph = graph
    this.anchorNodeIds    = buildAnchorNodeIds(graph, clusters)
    this.pendingSourceIds = [...this.anchorNodeIds.keys()]
    this._scheduleNextRouteCompute()
  }

  private _scheduleNextRouteCompute(): void {
    if (this.pendingSourceIds.length === 0 || !this.pathfindingGraph) return
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(() => this._computeNextSource(), { timeout: 2000 })
    } else {
      setTimeout(() => this._computeNextSource(), 0)
    }
  }

  private _computeNextSource(): void {
    if (this.pendingSourceIds.length === 0 || !this.pathfindingGraph) return
    const fromId   = this.pendingSourceIds.shift()!
    const newRoutes = computeRoutesFromSource(this.pathfindingGraph, fromId, this.anchorNodeIds)
    newRoutes.forEach((route, key) => this.interClusterRoutes.set(key, route))
    this._scheduleNextRouteCompute()
  }

  /**
   * Build the initial set of trade clusters from province data.
   * Anchors are the preferred_anchor province (if it exists in regions),
   * otherwise the most developed province in each zone.
   */
  initializeClusters(regions: Region[]): TradeCluster[] {
    const provinceById = new Map(regions.map(r => [r.id, r]))
    const byGeoRegion  = new Map<GeographicRegion, Region[]>()

    for (const region of regions) {
      if (!region.geographic_region) continue
      const list = byGeoRegion.get(region.geographic_region) ?? []
      list.push(region)
      byGeoRegion.set(region.geographic_region, list)
    }

    return CLUSTER_ZONE_DEFS.map(def => {
      // Try preferred anchor first
      let anchor = provinceById.get(def.preferred_anchor)

      // Fallback: most developed province in the zone
      if (!anchor) {
        for (const geoRegion of def.geographic_regions) {
          const candidates = byGeoRegion.get(geoRegion) ?? []
          for (const c of candidates) {
            if (!anchor || TIER_POWER[c.settlement_tier] > TIER_POWER[anchor.settlement_tier]) {
              anchor = c
            }
          }
        }
      }

      if (!anchor) {
        console.warn(`[TradeSystem] Cluster "${def.id}": no anchor province found`)
      }

      return {
        id:                 def.id,
        name:               def.name,
        anchor_province_id: anchor?.id ?? def.preferred_anchor,
        continent:          def.continent,
        geographic_regions: def.geographic_regions,
        supply:             {},
        demand:             {},
        prices:             this._initPrices(),
        nation_trade_power: {},
        total_trade_power:  0,
        total_trade_value:  0,
        nation_income:      {},
      } satisfies TradeCluster
    })
  }

  /**
   * Apply pathfinding-computed province → cluster assignments.
   * Updates region.cluster_id in place.
   */
  applyClusterAssignments(regions: Region[], assignmentMap: Map<string, string>): void {
    for (const region of regions) {
      const clusterId = assignmentMap.get(region.id)
      if (clusterId) region.cluster_id = clusterId
    }
  }

  /**
   * Monthly tick: compute supply/demand, trade flows, and income for all clusters.
   * Returns updated clusters, active trade flows, and trade route records for rendering.
   */
  processMonthlyTrade(state: GameState): {
    clusters: TradeCluster[]
    flows: TradeFlow[]
    routes: TradeRoute[]
  } {
    // Deep-copy clusters so we don't mutate game state directly
    const clusters: TradeCluster[] = state.trade_clusters.map(c => ({
      ...c,
      supply:             {},
      demand:             {},
      nation_trade_power: {},
      total_trade_power:  0,
      total_trade_value:  0,
      nation_income:      {},
    }))
    const clusterById     = new Map(clusters.map(c => [c.id, c]))
    const prevClusterById = new Map(state.trade_clusters.map(c => [c.id, c]))

    // ── Step 1: compute supply and trade power from provinces ────────────────
    const ownerOf = this._buildOwnerMap(state)

    for (const region of state.regions) {
      if (!region.cluster_id || !region.trade_good) continue
      const cluster = clusterById.get(region.cluster_id)
      if (!cluster) continue

      const supplyMult = TIER_SUPPLY_MULT[region.settlement_tier]
      if (supplyMult > 0) {
        cluster.supply[region.trade_good] = (cluster.supply[region.trade_good] ?? 0) + supplyMult
      }

      const power = TIER_POWER[region.settlement_tier]
      if (power > 0) {
        cluster.total_trade_power += power
        const ownerId = ownerOf.get(region.id)
        if (ownerId) {
          cluster.nation_trade_power[ownerId] = (cluster.nation_trade_power[ownerId] ?? 0) + power
        }
      }
    }

    // ── Step 2: compute cluster population for demand scaling ────────────────
    const clusterPop = new Map<string, number>()
    for (const region of state.regions) {
      if (!region.cluster_id) continue
      const existing = clusterPop.get(region.cluster_id) ?? 0
      clusterPop.set(region.cluster_id, existing + (region.population.total ?? 0))
    }

    // ── Step 3: compute demand (base demand × population weight) ─────────────
    for (const cluster of clusters) {
      const baseDemand = CLUSTER_BASE_DEMAND[cluster.id] ?? {}
      const pop = clusterPop.get(cluster.id) ?? REFERENCE_POP
      const popWeight = Math.max(0.1, pop / REFERENCE_POP)

      cluster.demand = {}
      for (const [good, base] of Object.entries(baseDemand)) {
        if (base > 0) cluster.demand[good] = base * popWeight
      }
    }

    // ── Step 4: compute dynamic prices (supply/demand ratio) ─────────────────
    for (const cluster of clusters) {
      const prevPrices = prevClusterById.get(cluster.id)?.prices ?? {}
      cluster.prices = {}
      const allGoods = new Set([...Object.keys(cluster.supply), ...Object.keys(cluster.demand)])
      for (const good of allGoods) {
        const basePrice = TRADE_GOOD_PRICES[good] ?? 1
        const supply = cluster.supply[good] ?? 0
        const demand = cluster.demand[good] ?? 0
        if (demand === 0 && supply > 0) {
          // Oversupply with no demand — price drops
          cluster.prices[good] = Math.max(basePrice * 0.25, (prevPrices[good] ?? basePrice) * 0.95)
        } else if (demand > 0) {
          const ratio = demand / Math.max(supply, 0.1)
          const targetPrice = Math.min(basePrice * 4, basePrice * Math.sqrt(ratio))
          // Smooth price toward target (10% per month)
          const prev = prevPrices[good] ?? basePrice
          cluster.prices[good] = prev + (targetPrice - prev) * 0.1
        } else {
          cluster.prices[good] = prevPrices[good] ?? basePrice
        }
      }
      // Ensure base prices exist for all known goods in this cluster
      for (const good of Object.keys(TRADE_GOOD_PRICES)) {
        if (!cluster.prices[good]) cluster.prices[good] = TRADE_GOOD_PRICES[good]
      }
    }

    // ── Step 5: compute inter-cluster trade flows ─────────────────────────────
    const flows: TradeFlow[] = []
    const routes: TradeRoute[] = []

    // For each good, find surplus clusters and match them to deficit clusters.
    // Use a greedy approach: largest surplus first, nearest deficit cluster.
    const allGoods = new Set<string>()
    for (const cluster of clusters) {
      Object.keys(cluster.supply).forEach(g => allGoods.add(g))
      Object.keys(cluster.demand).forEach(g => allGoods.add(g))
    }

    for (const good of allGoods) {
      // Compute surplus/deficit per cluster
      const surplus: Array<{ cluster: TradeCluster; amount: number }> = []
      const deficit: Array<{ cluster: TradeCluster; amount: number }> = []

      for (const cluster of clusters) {
        const sup = cluster.supply[good] ?? 0
        const dem = cluster.demand[good] ?? 0
        if (sup > dem + 0.5) surplus.push({ cluster, amount: sup - dem })
        else if (dem > sup + 0.5) deficit.push({ cluster, amount: dem - sup })
      }

      if (surplus.length === 0 || deficit.length === 0) continue

      // Sort surplus largest-first for greedy matching
      surplus.sort((a, b) => b.amount - a.amount)

      // Track remaining deficit per cluster to avoid over-routing
      const remainingDeficit = new Map(deficit.map(d => [d.cluster.id, d.amount]))

      for (const { cluster: fromCluster, amount: surplusAmt } of surplus) {
        let remainingSurplus = surplusAmt

        // Find deficits sorted by cheapest route cost from this surplus cluster
        const sortedDeficits = deficit
          .filter(d => (remainingDeficit.get(d.cluster.id) ?? 0) > 0)
          .map(d => ({
            cluster: d.cluster,
            cost: this.interClusterRoutes.get(`${fromCluster.id}→${d.cluster.id}`)?.cost ?? Infinity,
          }))
          .filter(d => isFinite(d.cost))
          .sort((a, b) => a.cost - b.cost)

        for (const { cluster: toCluster } of sortedDeficits) {
          if (remainingSurplus < 0.5) break
          const defAmt = remainingDeficit.get(toCluster.id) ?? 0
          if (defAmt < 0.5) continue

          const volume = Math.min(remainingSurplus, defAmt)
          const price  = toCluster.prices[good] ?? TRADE_GOOD_PRICES[good] ?? 1
          const value  = volume * price

          // Income split: 60% to origin cluster nations, 40% to destination cluster nations
          const fromValue = value * 0.6
          const toValue   = value * 0.4

          fromCluster.total_trade_value += fromValue
          toCluster.total_trade_value   += toValue

          // Distribute income by trade power share
          if (fromCluster.total_trade_power > 0) {
            for (const [ownerId, power] of Object.entries(fromCluster.nation_trade_power)) {
              const share = power / fromCluster.total_trade_power
              fromCluster.nation_income[ownerId] = (fromCluster.nation_income[ownerId] ?? 0) + fromValue * share
            }
          }
          if (toCluster.total_trade_power > 0) {
            for (const [ownerId, power] of Object.entries(toCluster.nation_trade_power)) {
              const share = power / toCluster.total_trade_power
              toCluster.nation_income[ownerId] = (toCluster.nation_income[ownerId] ?? 0) + toValue * share
            }
          }

          remainingSurplus -= volume
          remainingDeficit.set(toCluster.id, defAmt - volume)

          const flow: TradeFlow = {
            id:              `flow_${fromCluster.id}_${toCluster.id}_${good}`,
            from_cluster_id: fromCluster.id,
            to_cluster_id:   toCluster.id,
            good,
            volume,
            value,
            path_region_ids: this.interClusterRoutes.get(`${fromCluster.id}→${toCluster.id}`)?.path_region_ids,
          }
          flows.push(flow)

          routes.push(buildTradeRouteRecord(fromCluster, toCluster, good, this.interClusterRoutes))
        }
      }
    }

    // ── Step 6: finalize income for clusters that only have local trade power ─
    // (clusters with no flows still distribute local trade value by power share)
    for (const cluster of clusters) {
      if (cluster.total_trade_value > 0 && cluster.total_trade_power > 0) {
        // Income already accumulated in step 5; ensure no double-counting
        // by only adding base local value if no flows touched this cluster.
        const alreadyDistributed = Object.values(cluster.nation_income).reduce((s, v) => s + v, 0)
        if (alreadyDistributed === 0 && cluster.total_trade_power > 0) {
          for (const [ownerId, power] of Object.entries(cluster.nation_trade_power)) {
            const share = power / cluster.total_trade_power
            cluster.nation_income[ownerId] = cluster.total_trade_value * share
          }
        }
      }
    }

    return { clusters, flows, routes }
  }

  // ── Query helpers ──────────────────────────────────────────────────────────

  getTopTraders(cluster: TradeCluster, n = 5): Array<{ ownerId: string; power: number; share: number; income: number }> {
    if (cluster.total_trade_power === 0) return []
    return Object.entries(cluster.nation_trade_power)
      .map(([ownerId, power]) => ({
        ownerId,
        power,
        share:  power / cluster.total_trade_power,
        income: cluster.nation_income[ownerId] ?? 0,
      }))
      .sort((a, b) => b.power - a.power)
      .slice(0, n)
  }

  getClustersForNation(clusters: TradeCluster[], ownerId: string): Array<{ cluster: TradeCluster; power: number; share: number; income: number }> {
    return clusters
      .filter(c => (c.nation_trade_power[ownerId] ?? 0) > 0)
      .map(c => ({
        cluster: c,
        power:   c.nation_trade_power[ownerId] ?? 0,
        share:   c.total_trade_power > 0 ? (c.nation_trade_power[ownerId] ?? 0) / c.total_trade_power : 0,
        income:  c.nation_income[ownerId] ?? 0,
      }))
      .sort((a, b) => b.income - a.income)
  }

  totalNationIncome(clusters: TradeCluster[], ownerId: string): number {
    return clusters.reduce((sum, c) => sum + (c.nation_income[ownerId] ?? 0), 0)
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private _initPrices(): Record<string, number> {
    const prices: Record<string, number> = {}
    for (const [good, price] of Object.entries(TRADE_GOOD_PRICES)) {
      prices[good] = price
    }
    return prices
  }

  private _buildOwnerMap(state: GameState): Map<string, string> {
    const map = new Map<string, string>()
    const entityOwner = new Map<string, string>()
    for (const entity of state.colonial_entities) {
      if (entity.state_owner_id) entityOwner.set(entity.id, entity.state_owner_id)
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
