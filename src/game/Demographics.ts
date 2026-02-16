import { Region, Population, Culture, Religion, GameEvent, SettlementTier } from './types'
import { mapManager } from './Map'
import { getTierProgression, getNextTier, getPreviousTier, canAdvanceTier, shouldRegressTier } from './settlementConfig'

export class DemographicsSystem {
  private events: GameEvent[] = []
  private tick_count: number = 0
  private dominantCultureCache: Map<Population, Culture | null> = new Map()
  private dominantReligionCache: Map<Population, Religion | null> = new Map()

  processMonthTick(regions: Region[]): GameEvent[] {
    this.events = []
    this.tick_count++

    // Clear caches every tick
    this.dominantCultureCache.clear()
    this.dominantReligionCache.clear()

    regions.forEach(region => {
      this.updatePopulation(region)
      this.updateRegionWealth(region)
      this.updateSettlementProgress(region)
      this.checkTierRegression(region)
      // Optimize: Only spread culture/religion every 3 months to reduce computation
      if (this.tick_count % 3 === 0) {
        this.spreadCulture(region, regions)
        this.updateReligion(region, regions)
      }
    })

    return this.events
  }

  private updatePopulation(region: Region): void {
    const pop = region.population
    const base_growth = 0.002 // 0.2% per month
    const happiness_factor = (pop.happiness - 50) / 100
    let growth_rate = base_growth + (happiness_factor * 0.001)

    // Apply settlement tier growth modifier
    const tierProgression = getTierProgression(region.settlement_tier)
    growth_rate *= tierProgression.growthModifier

    const new_total = Math.max(100, pop.total * (1 + growth_rate))
    const growth = new_total - pop.total

    region.population.total = Math.round(new_total)

    if (growth > 1) {
      this.events.push({
        type: 'population_change',
        region_id: region.id,
        data: { growth, new_total: region.population.total },
        timestamp: Date.now()
      })
    }

    // Proportionally increase culture distribution
    if (pop.culture_distribution) {
      const cultures = Object.keys(pop.culture_distribution) as Culture[]
      cultures.forEach(culture => {
        if (pop.culture_distribution[culture] !== undefined) {
          pop.culture_distribution[culture]! *= (1 + growth_rate)
        }
      })
    }

    // Proportionally increase religion distribution
    if (pop.religion_distribution) {
      const religions = Object.keys(pop.religion_distribution) as Religion[]
      religions.forEach(religion => {
        if (pop.religion_distribution[religion] !== undefined) {
          pop.religion_distribution[religion]! *= (1 + growth_rate)
        }
      })
    }
  }

  private spreadCulture(region: Region, allRegions: Region[]): void {
    const neighbors = mapManager.getNeighbors(region.id)
    const pop = region.population

    if (!pop.culture_distribution) return

    // Get dominant culture using cache
    const dominant_culture = this.getDominantCultureCached(pop)
    if (!dominant_culture) return

    // Get culture spread rate modifier based on settlement tier
    const tierProgression = getTierProgression(region.settlement_tier)
    const base_spread_chance = 0.05 * tierProgression.cultureSpreadRate

    neighbors.forEach(neighbor => {
      if (!neighbor.population.culture_distribution) return

      // Culture spread chance modified by settlement tier
      if (Math.random() < base_spread_chance) {
        const spread_amount = neighbor.population.total * 0.05
        if (!neighbor.population.culture_distribution[dominant_culture]) {
          neighbor.population.culture_distribution[dominant_culture] = 0
        }
        neighbor.population.culture_distribution[dominant_culture]! += spread_amount

        this.events.push({
          type: 'culture_spread',
          region_id: neighbor.id,
          data: { culture: dominant_culture, spread_amount },
          timestamp: Date.now()
        })
      }
    })
  }

  private updateReligion(region: Region, allRegions: Region[]): void {
    const pop = region.population

    if (!pop.religion_distribution) return

    const neighbors = mapManager.getNeighbors(region.id)

    // Get dominant religion using cache
    const dominant_religion = this.getDominantReligionCached(pop)
    if (!dominant_religion) return

    // Get religion spread rate modifier based on settlement tier
    const tierProgression = getTierProgression(region.settlement_tier)
    const base_spread_chance = 0.03 * tierProgression.religionSpreadRate

    neighbors.forEach(neighbor => {
      if (!neighbor.population.religion_distribution) return

      // Religion spread chance modified by settlement tier
      if (Math.random() < base_spread_chance) {
        const spread_amount = neighbor.population.total * 0.03
        if (!neighbor.population.religion_distribution[dominant_religion]) {
          neighbor.population.religion_distribution[dominant_religion] = 0
        }
        neighbor.population.religion_distribution[dominant_religion]! += spread_amount
      }
    })
  }

  /**
   * Get dominant culture with caching for the current tick
   */
  private getDominantCultureCached(population: Population): Culture | null {
    if (this.dominantCultureCache.has(population)) {
      return this.dominantCultureCache.get(population) || null
    }

    const result = this.getDominantCulture(population)
    this.dominantCultureCache.set(population, result)
    return result
  }

  /**
   * Get dominant religion with caching for the current tick
   */
  private getDominantReligionCached(population: Population): Religion | null {
    if (this.dominantReligionCache.has(population)) {
      return this.dominantReligionCache.get(population) || null
    }

    const result = this.getDominantReligion(population)
    this.dominantReligionCache.set(population, result)
    return result
  }

  getDominantCulture(population: Population): Culture | null {
    if (!population.culture_distribution) return null
    const entries = Object.entries(population.culture_distribution)
    if (entries.length === 0) return null
    return entries.reduce((prev, current) => ((current[1] || 0) > (prev[1] || 0) ? current : prev))[0] as Culture
  }

  getDominantReligion(population: Population): Religion | null {
    if (!population.religion_distribution) return null
    const entries = Object.entries(population.religion_distribution)
    if (entries.length === 0) return null
    return entries.reduce((prev, current) => ((current[1] || 0) > (prev[1] || 0) ? current : prev))[0] as Religion
  }

  getCulturePercentage(population: Population, culture: Culture): number {
    if (!population.culture_distribution?.[culture]) return 0
    return (population.culture_distribution[culture]! / population.total) * 100
  }

  getReligionPercentage(population: Population, religion: Religion): number {
    if (!population.religion_distribution?.[religion]) return 0
    return (population.religion_distribution[religion]! / population.total) * 100
  }

  // Settlement tier system methods

  private updateRegionWealth(region: Region): void {
    // Base wealth generation: 5 per month
    const base_wealth_generation = 5
    const tierProgression = getTierProgression(region.settlement_tier)
    const wealth_generation = base_wealth_generation * tierProgression.wealthModifier

    region.wealth += wealth_generation
  }

  private updateSettlementProgress(region: Region): void {
    // Increment months at tier
    region.months_at_tier++

    // Check if settlement can advance to next tier
    if (
      canAdvanceTier(
        region.settlement_tier,
        region.population.total,
        region.development_invested,
        region.months_at_tier,
      )
    ) {
      this.advanceTier(region)
    }
  }

  private advanceTier(region: Region): void {
    const nextTier = getNextTier(region.settlement_tier)
    if (!nextTier) return

    const currentTierProgression = getTierProgression(region.settlement_tier)

    // Advance to next tier
    region.settlement_tier = nextTier

    // Reset progression counters
    region.months_at_tier = 0
    region.development_progress = 0
    region.development_invested = 0

    // Deduct investment cost from wealth
    region.wealth -= currentTierProgression.investmentCost

    this.events.push({
      type: 'population_change',
      region_id: region.id,
      data: { event: 'tier_advanced', new_tier: nextTier },
      timestamp: Date.now(),
    })
  }

  private checkTierRegression(region: Region): void {
    if (shouldRegressTier(region.settlement_tier, region.population.total)) {
      this.regressTier(region)
    }
  }

  private regressTier(region: Region): void {
    const previousTier = getPreviousTier(region.settlement_tier)
    if (!previousTier) return

    region.settlement_tier = previousTier

    // Reset progression counters
    region.months_at_tier = 0
    region.development_progress = 0
    region.development_invested = 0

    this.events.push({
      type: 'population_change',
      region_id: region.id,
      data: { event: 'tier_regressed', new_tier: previousTier },
      timestamp: Date.now(),
    })
  }

  // Public method to allow investment in settlement development
  investInDevelopment(region: Region, amount: number): boolean {
    if (region.wealth < amount) {
      return false // Not enough wealth
    }

    region.wealth -= amount
    region.development_invested += amount

    return true
  }
}

export const demographicsSystem = new DemographicsSystem()
