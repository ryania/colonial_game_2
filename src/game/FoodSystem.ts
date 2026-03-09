/**
 * FoodSystem.ts
 *
 * Three-tier food production, consumption, and distribution system.
 *
 * ── Production sources ───────────────────────────────────────────────────────
 *   1. Trade-good output — provinces whose trade_good is a FOOD_GOOD produce
 *      food units scaled by settlement tier (same multiplier as TradeSystem supply).
 *      Cattle and bison produce food alongside their leather/hide byproduct;
 *      the trade_good value captures the economic side while FoodSystem captures
 *      the nutritional side.
 *
 *   2. Subsistence farming — peasant pops produce food locally based on terrain
 *      suitability and settlement tier organisation. This food is consumed on-site
 *      and does NOT enter the trade system supply. It represents the majority of
 *      caloric production in the 1600s world.
 *
 * ── Distribution chain ───────────────────────────────────────────────────────
 *   Province stockpile → District pooling → TradeCluster market pool
 *
 *   Step 1: Each province adds production to its own food_stockpile.
 *   Step 2: Provinces within the same District share their food equally
 *           (a small spoilage loss occurs during this short-distance movement).
 *   Step 3: Each province consumes food from its local stockpile to feed pops.
 *           food_satisfaction = food_available / food_demanded (0–1.5).
 *   Step 4: Surplus above a local buffer is exported to the cluster food pool,
 *           with spoilage applied on the longer regional→market journey.
 *   Step 5: cluster.food_satisfaction is the population-weighted average of
 *           member province satisfactions. The cluster pool then spoils monthly.
 *   Step 6: Monthly spoilage applied to all remaining regional stockpiles.
 *
 * ── Spoilage and trade distance ──────────────────────────────────────────────
 *   Each food good has a FOOD_SPOILAGE_RATE (0–1 per hop). High-spoilage goods
 *   (fresh fish, live cattle, coconut) barely survive the province→region hop
 *   and contribute almost nothing to the cluster pool, making them effectively
 *   local goods. Low-spoilage goods (grain, salt, dried spices, rum, wine) move
 *   freely and can sustain populations far from their source.
 *
 *   Inter-cluster food trade (market → distant market) is handled by the existing
 *   TradeSystem; FoodSystem's proximity efficiency already penalises long routes,
 *   and perishable goods produce near-zero cluster surpluses to trade anyway.
 *
 * ── Class consumption rates ──────────────────────────────────────────────────
 *   Aristocrats eat most (richer diet, more variety); slaves eat least.
 *   Peasants have a lower base demand because subsistence farming covers part of
 *   their needs outside the formal distribution system.
 *
 * ── Religion dietary preferences ─────────────────────────────────────────────
 *   Each religion has preference multipliers per food good:
 *     0.0 = forbidden (does not count toward demand satisfaction)
 *     1.0 = neutral
 *     > 1.0 = preferred (counts for more satisfaction per unit)
 *   This is applied when computing effective food availability and consumption.
 */

import {
  GameState, Locality, PopGroup, District, TradeCluster,
  SocialClass, Religion, TerrainType, SettlementTier,
} from './types'
import { FOOD_GOODS, FOOD_SATIATION, FOOD_SPOILAGE_RATE } from './TradeGoods'

// ── Class food consumption ────────────────────────────────────────────────────
// Food units demanded per 1,000 people per month.
// "1 food unit" = the monthly output of one wilderness-tier grain province for ~1,000 people.

export const CLASS_FOOD_CONSUMPTION: Record<SocialClass, number> = {
  aristocrat: 3.0,  // Large households, feasts, luxury imports
  clergy:     2.0,  // Modest but regular meals, fasting days
  merchant:   2.2,  // Affluent table; regular imported luxuries
  artisan:    1.8,  // Decent diet; skilled wage allows variety
  peasant:    1.2,  // Partially self-sufficient via subsistence farming
  laborer:    1.5,  // Hard physical work demands more calories
  slave:      1.0,  // Bare subsistence ration
}

// ── Religion dietary preferences ─────────────────────────────────────────────
// Multiplier on effective satiation for a specific food good.
// Values < 1.0 signal avoidance; 0.0 = forbidden (religiously prohibited food
// is refused entirely and does not count toward feeding the population).

export const RELIGION_FOOD_PREFERENCES: Record<Religion, Partial<Record<string, number>>> = {
  Muslim: {
    // Halal staples preferred; alcohol forbidden (haram)
    dates: 1.5, rice: 1.3, fish: 1.2, olive_oil: 1.3, grain: 1.1,
    wine: 0.0, beer: 0.0, rum: 0.0,
  },
  Hindu: {
    // Vegetarian preference dominant; beef is taboo (sacred cow)
    rice: 1.5, spices: 1.4, coconut: 1.3, palm_oil: 1.2, sugar: 1.2, dates: 1.1,
    cattle: 0.0, bison: 0.0,
  },
  Buddhist: {
    // Vegetarian tendency; reduced but not eliminated meat consumption
    rice: 1.4, tea: 1.5, fish: 1.1, spices: 1.2,
    cattle: 0.5, bison: 0.5,
  },
  Shinto: {
    // Rice-centred culture; fish a dietary cornerstone
    rice: 1.6, fish: 1.5, tea: 1.3,
  },
  Catholic: {
    // Friday fish abstinence; wine in Eucharist; Mediterranean olive culture
    fish: 1.4, wine: 1.3, grain: 1.2, olive_oil: 1.2,
  },
  Protestant: {
    // Northern European diet: rye/wheat bread, beer, salted fish
    grain: 1.2, beer: 1.2, fish: 1.1,
  },
  Orthodox: {
    // Many fasting periods raise fish and olive-oil importance; liturgical wine
    fish: 1.4, grain: 1.2, wine: 1.2, olive_oil: 1.2,
  },
  Christian: {
    // Catch-all Christian traditions
    grain: 1.1, fish: 1.2, wine: 1.1,
  },
  Animist: {},  // Adapts entirely to locally available foods — no modifiers
  Other:    {},
}

// ── Terrain farming suitability ───────────────────────────────────────────────
// Multiplier on peasant subsistence food output.
// Reflects soil quality, water availability, and micro-climate suitability.

const TERRAIN_FARMING_MULT: Partial<Record<TerrainType, number>> = {
  farmlands: 1.50,  // Cleared, tilled agricultural land — optimal
  flatlands: 1.20,  // Open plains — good for extensive grain farming
  river:     1.30,  // Flood-plain silt deposits — very productive
  coast:     0.80,  // Fishing supplements limited arable land
  island:    0.90,  // Small plots + fishing; varied
  lake:      0.90,  // Lacustrine fishing + riparian farming
  land:      0.80,  // Generic temperate land
  hills:     0.70,  // Terraced farming possible; limited scale
  beach:     0.60,  // Sandy soil; some fishing
  forest:    0.50,  // Slash-and-burn; foraging; hunting
  bog:       0.30,  // Waterlogged; very poor arable
  swamp:     0.30,  // Same
  mountains: 0.30,  // Thin soil, short growing season
  // ocean, sea → handled by water-terrain early return
}

// ── Settlement tier multipliers ───────────────────────────────────────────────

// Food output per tier from trade-good production (mirrors TradeSystem TIER_SUPPLY_MULT).
const TIER_FOOD_OUTPUT: Record<SettlementTier, number> = {
  unsettled:  0.0,
  wilderness: 0.5,
  village:    1.0,
  town:       2.0,
  city:       4.0,
}

// Farming organisation bonus per tier (better tools, drainage, crop rotation).
const TIER_FARMING_MULT: Record<SettlementTier, number> = {
  unsettled:  0.3,
  wilderness: 1.0,
  village:    1.3,
  town:       1.5,
  city:       1.7,
}

// Subsistence food units produced per 1,000 peasants per month
// (base rate at wilderness tier on flatlands terrain).
const SUBSISTENCE_BASE_RATE = 2.5

// ── Spoilage factors per transit tier ────────────────────────────────────────
// Applied as:  survived = units × (1 – spoilage_rate × factor)
// Shorter hops (province→region) have a smaller factor than longer hops
// (region→cluster), so perishables degrade progressively with distance.

const PROVINCE_TO_REGION_SPOILAGE_FACTOR = 0.15  // Short inter-province movement
const REGION_TO_CLUSTER_SPOILAGE_FACTOR  = 0.40  // Longer regional-to-market journey

// ── FoodSystem class ──────────────────────────────────────────────────────────

export class FoodSystem {
  /**
   * Monthly food tick. Processes production, distribution, consumption, and
   * spoilage for all provinces and trade clusters.
   *
   * Mutates region.food_stockpile, region.food_satisfaction,
   *         cluster.food_stockpile, and cluster.food_satisfaction in place.
   *
   * Must be called BEFORE demographicsSystem.processMonthTick so that the
   * freshly computed food_satisfaction values are available for happiness
   * and growth modifiers.
   */
  processMonthlyFood(state: GameState, pops: PopGroup[]): void {
    const { localities: regions, districts, trade_clusters } = state

    const regionMap  = new Map(regions.map(r => [r.id, r]))
    const clusterMap = new Map(trade_clusters.map(c => [c.id, c]))

    // Pre-group pops by region for efficient lookup
    const popsByRegion = this._groupByRegion(pops)

    // Lazily initialise stockpiles on first run
    for (const r of regions) {
      if (!r.food_stockpile)       r.food_stockpile    = {}
      if (r.food_satisfaction == null) r.food_satisfaction = 1.0
    }
    for (const c of trade_clusters) {
      if (!c.food_stockpile)       c.food_stockpile    = {}
      if (c.food_satisfaction == null) c.food_satisfaction = 1.0
    }

    // ── Step 1: Province food production ────────────────────────────────────
    const provinceDemand = new Map<string, number>()

    for (const region of regions) {
      if (this._isWater(region)) continue

      const regionPops = popsByRegion.get(region.id) ?? []

      // 1a. Trade-good food production
      if (FOOD_GOODS.has(region.trade_good)) {
        const output = TIER_FOOD_OUTPUT[region.settlement_tier]
        if (output > 0) {
          region.food_stockpile![region.trade_good] =
            (region.food_stockpile![region.trade_good] ?? 0) + output
        }
      }

      // 1b. Subsistence farming — peasants produce food independently of trade good.
      //     This food stays local and does NOT enter the trade economic supply.
      const peasantPop = regionPops
        .filter(p => p.social_class === 'peasant')
        .reduce((s, p) => s + p.size, 0)

      if (peasantPop > 0) {
        const terrainMult = TERRAIN_FARMING_MULT[region.terrain_type] ?? 0
        if (terrainMult > 0) {
          const tierMult = TIER_FARMING_MULT[region.settlement_tier]
          const units    = (peasantPop / 1000) * SUBSISTENCE_BASE_RATE * terrainMult * tierMult
          const crop     = this._subsistenceCrop(region)
          region.food_stockpile![crop] =
            (region.food_stockpile![crop] ?? 0) + units
        }
      }

      // 1c. Compute demand from class + size (religion modifiers applied at consumption)
      let demand = 0
      for (const pop of regionPops) {
        demand += (pop.size / 1000) * (CLASS_FOOD_CONSUMPTION[pop.social_class] ?? 1.5)
      }
      provinceDemand.set(region.id, demand)
    }

    // ── Step 2: District-level redistribution ──────────────────────────
    // Provinces within the same District share their stockpile equally.
    // A small spoilage loss is applied to simulate short-distance transport.
    for (const pr of districts) {
      this._redistributeWithinRegion(pr, regionMap)
    }

    // ── Step 3: Province-level consumption ───────────────────────────────────
    // Each province feeds its pops from its local stockpile.
    // food_satisfaction = effective_food / demand  (capped at 1.5 for surplus bonus)
    for (const region of regions) {
      if (this._isWater(region)) {
        region.food_satisfaction = 1.0
        continue
      }

      const demand    = provinceDemand.get(region.id) ?? 0
      const regionPops = popsByRegion.get(region.id) ?? []

      if (demand <= 0) {
        region.food_satisfaction = 1.0
        continue
      }

      const available = this._effectiveFoodUnits(region.food_stockpile!, regionPops)
      region.food_satisfaction = Math.min(1.5, available / demand)

      // Consume food from stockpile proportionally
      this._consumeFood(region.food_stockpile!, Math.min(available, demand), regionPops)
    }

    // ── Step 4: Export province surplus to cluster food pool ─────────────────
    // Provinces keep a small local buffer; surplus is exported to the cluster.
    // Spoilage on this longer journey is significant for perishable goods.
    for (const region of regions) {
      if (this._isWater(region) || !region.cluster_id) continue
      const cluster = clusterMap.get(region.cluster_id)
      if (!cluster) continue

      const demand   = provinceDemand.get(region.id) ?? 0
      // Distribute buffer evenly across the number of distinct food goods held
      const goodCount = Math.max(1, Object.keys(region.food_stockpile!).length)

      for (const [good, units] of Object.entries(region.food_stockpile!)) {
        if (units <= 0) continue

        // Keep enough to cover ~half a month of local demand per good slot
        const keepBuffer = (demand * 0.5) / goodCount
        const toExport   = Math.max(0, units - keepBuffer)
        if (toExport < 0.01) continue

        const spoilageRate = FOOD_SPOILAGE_RATE[good] ?? 0
        const survived     = toExport * (1 - spoilageRate * REGION_TO_CLUSTER_SPOILAGE_FACTOR)

        if (survived > 0.001) {
          cluster.food_stockpile![good] = (cluster.food_stockpile![good] ?? 0) + survived
        }
        region.food_stockpile![good] = units - toExport
      }
    }

    // ── Step 5: Cluster food satisfaction ────────────────────────────────────
    // Population-weighted average of member province satisfactions.
    // Also apply monthly spoilage to the cluster pool.
    for (const cluster of trade_clusters) {
      const memberRegions = regions.filter(r => r.cluster_id === cluster.id && !this._isWater(r))

      if (memberRegions.length === 0) {
        cluster.food_satisfaction = 1.0
      } else {
        const totalPop = memberRegions.reduce((s, r) => s + (r.population.total ?? 0), 0)
        if (totalPop > 0) {
          cluster.food_satisfaction = memberRegions.reduce((s, r) => {
            const weight = (r.population.total ?? 0) / totalPop
            return s + (r.food_satisfaction ?? 1.0) * weight
          }, 0)
        } else {
          cluster.food_satisfaction = 1.0
        }
      }

      // Monthly decay of cluster food pool (spoilage in warehouse/port storage)
      this._applySpoilage(cluster.food_stockpile!)
    }

    // ── Step 6: Monthly spoilage of remaining province stockpiles ────────────
    for (const region of regions) {
      if (!this._isWater(region)) {
        this._applySpoilage(region.food_stockpile!)
      }
    }
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private _isWater(region: Locality): boolean {
    return region.terrain_type === 'ocean' || region.terrain_type === 'sea'
  }

  /**
   * Pick the subsistence crop for a region based on geography and terrain.
   * Coastal/lake provinces lean on fishing; Asian regions grow rice; rest grow grain.
   */
  private _subsistenceCrop(region: Locality): string {
    if (region.terrain_type === 'coast' || region.terrain_type === 'lake') return 'fish'
    if (region.continent === 'asia' || region.continent === 'oceania')      return 'rice'
    return 'grain'
  }

  /**
   * Compute effective food units available in a stockpile for a given pop group,
   * accounting for religion dietary preferences.
   * Forbidden foods (preference = 0) are excluded from the count entirely.
   * Preferred foods are worth more than their base satiation.
   */
  private _effectiveFoodUnits(stockpile: Record<string, number>, pops: PopGroup[]): number {
    let total = 0
    for (const [good, units] of Object.entries(stockpile)) {
      if (units <= 0) continue
      const satiation = FOOD_SATIATION[good] ?? 0
      if (satiation <= 0) continue
      const prefMult = this._avgPreference(good, pops)
      total += units * satiation * prefMult
    }
    return total
  }

  /**
   * Population-size-weighted average of religion food preference multipliers
   * for a given good across all pops in the region.
   */
  private _avgPreference(good: string, pops: PopGroup[]): number {
    if (pops.length === 0) return 1.0
    let totalPop = 0
    let weighted = 0
    for (const pop of pops) {
      const prefs = RELIGION_FOOD_PREFERENCES[pop.religion] ?? {}
      const pref  = prefs[good] ?? 1.0
      weighted   += pref * pop.size
      totalPop   += pop.size
    }
    return totalPop > 0 ? weighted / totalPop : 1.0
  }

  /**
   * Consume `demand` effective food units from the stockpile.
   * Each good is drawn down proportionally to its effective contribution,
   * so preferred foods are consumed first and forbidden foods are left untouched.
   */
  private _consumeFood(
    stockpile: Record<string, number>,
    demand: number,
    pops: PopGroup[],
  ): void {
    const goods = Object.keys(stockpile).filter(
      g => stockpile[g] > 0 && (FOOD_SATIATION[g] ?? 0) > 0
    )
    if (!goods.length || demand <= 0) return

    const totalEffective = this._effectiveFoodUnits(stockpile, pops)
    if (totalEffective <= 0) return

    const consumeRatio = Math.min(1, demand / totalEffective)
    for (const good of goods) {
      const prefMult  = this._avgPreference(good, pops)
      const satiation = FOOD_SATIATION[good] ?? 0
      // Only consume if this good actually contributes effective nutrition
      if (prefMult > 0 && satiation > 0) {
        stockpile[good] = Math.max(0, stockpile[good] * (1 - consumeRatio))
      }
    }
  }

  /**
   * District-level food redistribution.
   * All provinces pool their food; small spoilage losses occur during movement;
   * the pool is divided equally back to each province.
   */
  private _redistributeWithinRegion(district: District, regionMap: Map<string, Locality>): void {
    const members = district.locality_ids
      .map(id => regionMap.get(id))
      .filter((r): r is Locality => r != null && !this._isWater(r))

    if (members.length <= 1) return

    const pool: Record<string, number> = {}
    for (const prov of members) {
      for (const [good, units] of Object.entries(prov.food_stockpile!)) {
        if (units <= 0) continue
        const spoilageRate = FOOD_SPOILAGE_RATE[good] ?? 0
        const survived     = units * (1 - spoilageRate * PROVINCE_TO_REGION_SPOILAGE_FACTOR)
        pool[good] = (pool[good] ?? 0) + survived
        prov.food_stockpile![good] = 0
      }
    }

    const share = 1 / members.length
    for (const prov of members) {
      for (const [good, pooledUnits] of Object.entries(pool)) {
        prov.food_stockpile![good] = (prov.food_stockpile![good] ?? 0) + pooledUnits * share
      }
    }
  }

  /** Apply monthly storage spoilage to a food stockpile in place. Remove negligible quantities. */
  private _applySpoilage(stockpile: Record<string, number>): void {
    for (const good of Object.keys(stockpile)) {
      const rate = FOOD_SPOILAGE_RATE[good] ?? 0
      if (rate > 0) {
        stockpile[good] = Math.max(0, stockpile[good] * (1 - rate))
      }
      if (stockpile[good] < 0.001) delete stockpile[good]
    }
  }

  private _groupByRegion(pops: PopGroup[]): Map<string, PopGroup[]> {
    const map = new Map<string, PopGroup[]>()
    for (const pop of pops) {
      const list = map.get(pop.region_id)
      if (list) list.push(pop)
      else       map.set(pop.region_id, [pop])
    }
    return map
  }

  // ── Public query helpers ───────────────────────────────────────────────────

  /**
   * Summarise a province's food situation for UI display.
   * Returns the stockpile contents sorted by quantity, the current satisfaction,
   * and a human-readable status label.
   */
  getProvinceFoodSummary(region: Locality): {
    stockpile: Array<{ good: string; units: number; spoilageRate: number }>
    satisfaction: number
    status: 'feast' | 'adequate' | 'hungry' | 'starving'
  } {
    const stockpile = Object.entries(region.food_stockpile ?? {})
      .filter(([, u]) => u > 0.01)
      .sort(([, a], [, b]) => b - a)
      .map(([good, units]) => ({
        good,
        units: Math.round(units * 10) / 10,
        spoilageRate: FOOD_SPOILAGE_RATE[good] ?? 0,
      }))

    const satisfaction = region.food_satisfaction ?? 1.0
    const status =
      satisfaction >= 1.2 ? 'feast'    :
      satisfaction >= 0.9 ? 'adequate' :
      satisfaction >= 0.5 ? 'hungry'   : 'starving'

    return { stockpile, satisfaction, status }
  }

  /**
   * Return the top food-producing regions in a trade cluster, useful for UI/debug.
   */
  getClusterFoodStockpile(cluster: TradeCluster): Array<{ good: string; units: number }> {
    return Object.entries(cluster.food_stockpile ?? {})
      .filter(([, u]) => u > 0.01)
      .sort(([, a], [, b]) => b - a)
      .map(([good, units]) => ({ good, units: Math.round(units * 10) / 10 }))
  }
}

export const foodSystem = new FoodSystem()
