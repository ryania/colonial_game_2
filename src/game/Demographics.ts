import { Region, Population, Culture, Religion, GameEvent, SocialClass, PopGroup } from './types'
import { getTierProgression, getNextTier, canAdvanceTier, shouldRegressTier, getPreviousTier } from './settlementConfig'

// Class-based growth rate differentials (added to base 0.2%/month)
const CLASS_GROWTH_MODIFIER: Record<SocialClass, number> = {
  aristocrat: -0.0005,
  clergy:     -0.0003,
  merchant:    0.0000,
  artisan:     0.0002,
  peasant:     0.0006,
  laborer:     0.0005,
  slave:       0.0003
}

// Happiness targets by class
const CLASS_HAPPINESS_TARGET: Record<SocialClass, number> = {
  aristocrat: 70,
  clergy:     65,
  merchant:   60,
  artisan:    55,
  peasant:    45,
  laborer:    40,
  slave:      25
}

// Literacy targets by class (long-run drift target)
const CLASS_LITERACY_TARGET: Record<SocialClass, number> = {
  aristocrat: 75,
  clergy:     82,
  merchant:   60,
  artisan:    40,
  peasant:    15,
  laborer:    8,
  slave:      3
}

export class DemographicsSystem {
  private events: GameEvent[] = []
  private tick_count: number = 0

  processMonthTick(regions: Region[], pops: PopGroup[]): { updatedPops: PopGroup[], events: GameEvent[] } {
    this.events = []
    this.tick_count++

    // Work on a mutable copy
    let workingPops = pops.map(p => ({ ...p }))

    // 1. Growth
    workingPops = this.updatePopGrowth(workingPops, regions)

    // 2. Happiness drift
    workingPops = this.updatePopHappiness(workingPops, regions)

    // 3. Culture assimilation + religion conversion (every 3 ticks)
    if (this.tick_count % 3 === 0) {
      workingPops = this.processCultureAssimilation(workingPops, regions)
      workingPops = this.processReligionConversion(workingPops, regions)
    }

    // 4. Class mobility (every 6 ticks)
    if (this.tick_count % 6 === 0) {
      workingPops = this.processClassMobility(workingPops, regions)
    }

    // 5. Literacy drift
    workingPops = this.updateLiteracy(workingPops)

    // 6. Merge identical pops
    workingPops = this.mergePops(workingPops)

    // 7. Remove depleted pops
    workingPops = workingPops.filter(p => p.size > 0)

    // 8. Sync Region.population summary from pops (so settlement tier system keeps working)
    this.syncRegionPopulations(workingPops, regions)

    // 9. Wealth generation + tier advancement (uses freshly synced region.population.total)
    regions.forEach(region => {
      this.updateRegionWealth(region)
      this.updateSettlementProgress(region)
      this.checkTierRegression(region)
    })

    return { updatedPops: workingPops, events: this.events }
  }

  // ── Pop Growth ──────────────────────────────────────────────────────────────

  private updatePopGrowth(pops: PopGroup[], regions: Region[]): PopGroup[] {
    const regionMap = new Map(regions.map(r => [r.id, r]))

    return pops.map(pop => {
      const region = regionMap.get(pop.region_id)
      if (!region) return pop

      const tierProgression = getTierProgression(region.settlement_tier)
      const happinessMod = (pop.happiness - 50) / 100 * 0.001
      const classMod = CLASS_GROWTH_MODIFIER[pop.social_class]
      const growthRate = (0.002 + classMod + happinessMod) * tierProgression.growthModifier

      const growth = Math.round(pop.size * growthRate)
      const newSize = Math.max(0, pop.size + growth)

      if (growth > 1) {
        this.events.push({
          type: 'population_change',
          region_id: pop.region_id,
          data: { growth, pop_id: pop.id },
          timestamp: Date.now()
        })
      }

      return { ...pop, size: newSize }
    })
  }

  // ── Happiness ───────────────────────────────────────────────────────────────

  private updatePopHappiness(pops: PopGroup[], regions: Region[]): PopGroup[] {
    const regionMap = new Map(regions.map(r => [r.id, r]))

    return pops.map(pop => {
      const region = regionMap.get(pop.region_id)
      if (!region) return pop

      let target = CLASS_HAPPINESS_TARGET[pop.social_class]

      if (region.governor_id) target += 5
      if (region.wealth > 500) target += 5
      if (region.wealth < 100) target -= 10

      target = Math.max(0, Math.min(100, target))

      const drift = Math.sign(target - pop.happiness) * 0.5
      const happiness = Math.max(0, Math.min(100, pop.happiness + drift))

      return { ...pop, happiness }
    })
  }

  // ── Culture Assimilation ─────────────────────────────────────────────────────

  private processCultureAssimilation(pops: PopGroup[], regions: Region[]): PopGroup[] {
    const regionMap = new Map(regions.map(r => [r.id, r]))
    // Key: region_id → dominant culture
    const dominantCultureByRegion = new Map<string, Culture>()

    for (const region of regions) {
      const dominant = this.getDominantCultureFromPops(pops, region.id)
      if (dominant) dominantCultureByRegion.set(region.id, dominant)
    }

    // Collect deltas to apply after iteration
    const deltas: Array<{ region_id: string, culture: Culture, religion: Religion, social_class: SocialClass, delta: number }> = []
    const updatedPops = pops.map(pop => {
      const dominant = dominantCultureByRegion.get(pop.region_id)
      if (!dominant || pop.culture === dominant) return pop

      const region = regionMap.get(pop.region_id)
      if (!region) return pop

      const tierProgression = getTierProgression(region.settlement_tier)
      const rate = 0.001 * tierProgression.cultureSpreadRate
      const converted = Math.round(pop.size * rate)
      if (converted <= 0) return pop

      deltas.push({ region_id: pop.region_id, culture: dominant, religion: pop.religion, social_class: pop.social_class, delta: converted })

      if (converted > 0) {
        this.events.push({
          type: 'culture_spread',
          region_id: pop.region_id,
          data: { culture: dominant, spread_amount: converted },
          timestamp: Date.now()
        })
      }

      return { ...pop, size: Math.max(0, pop.size - converted) }
    })

    // Apply deltas — find or create target pops
    return this.applyDeltas(updatedPops, deltas)
  }

  // ── Religion Conversion ──────────────────────────────────────────────────────

  private processReligionConversion(pops: PopGroup[], regions: Region[]): PopGroup[] {
    const regionMap = new Map(regions.map(r => [r.id, r]))
    const dominantReligionByRegion = new Map<string, Religion>()

    for (const region of regions) {
      const dominant = this.getDominantReligionFromPops(pops, region.id)
      if (dominant) dominantReligionByRegion.set(region.id, dominant)
    }

    const deltas: Array<{ region_id: string, culture: Culture, religion: Religion, social_class: SocialClass, delta: number }> = []
    const updatedPops = pops.map(pop => {
      const dominant = dominantReligionByRegion.get(pop.region_id)
      if (!dominant || pop.religion === dominant) return pop

      const region = regionMap.get(pop.region_id)
      if (!region) return pop

      const tierProgression = getTierProgression(region.settlement_tier)
      const rate = 0.0005 * tierProgression.religionSpreadRate
      const converted = Math.round(pop.size * rate)
      if (converted <= 0) return pop

      deltas.push({ region_id: pop.region_id, culture: pop.culture, religion: dominant, social_class: pop.social_class, delta: converted })

      return { ...pop, size: Math.max(0, pop.size - converted) }
    })

    return this.applyDeltas(updatedPops, deltas)
  }

  // ── Class Mobility ───────────────────────────────────────────────────────────

  private processClassMobility(pops: PopGroup[], regions: Region[]): PopGroup[] {
    const regionMap = new Map(regions.map(r => [r.id, r]))
    const deltas: Array<{ region_id: string, culture: Culture, religion: Religion, social_class: SocialClass, delta: number }> = []

    const updatedPops = pops.map(pop => {
      const region = regionMap.get(pop.region_id)
      if (!region) return pop

      const mobilityAmount = Math.round(pop.size * 0.001)
      if (mobilityAmount <= 0) return pop

      let targetClass: SocialClass | null = null

      // Promotions
      if (pop.social_class === 'laborer' && region.wealth > 300) {
        targetClass = 'artisan'
      } else if (pop.social_class === 'peasant' && region.wealth > 500) {
        targetClass = 'artisan'
      } else if (
        pop.social_class === 'artisan' &&
        region.wealth > 800 &&
        (region.settlement_tier === 'town' || region.settlement_tier === 'city')
      ) {
        targetClass = 'merchant'
      }

      // Demotions
      if (pop.social_class === 'merchant' && region.wealth < 100) {
        targetClass = 'artisan'
      } else if (pop.social_class === 'artisan' && region.wealth < 50) {
        targetClass = 'laborer'
      }

      if (!targetClass || targetClass === pop.social_class) return pop

      deltas.push({ region_id: pop.region_id, culture: pop.culture, religion: pop.religion, social_class: targetClass, delta: mobilityAmount })

      return { ...pop, size: Math.max(0, pop.size - mobilityAmount) }
    })

    return this.applyDeltas(updatedPops, deltas)
  }

  // ── Literacy Drift ───────────────────────────────────────────────────────────

  private updateLiteracy(pops: PopGroup[]): PopGroup[] {
    return pops.map(pop => {
      const target = CLASS_LITERACY_TARGET[pop.social_class]
      const drift = Math.sign(target - pop.literacy) * 0.05
      const literacy = Math.max(0, Math.min(100, Math.round((pop.literacy + drift) * 10) / 10))
      return { ...pop, literacy }
    })
  }

  // ── Merge ────────────────────────────────────────────────────────────────────

  private mergePops(pops: PopGroup[]): PopGroup[] {
    const map = new Map<string, PopGroup>()

    for (const pop of pops) {
      const key = `${pop.region_id}|${pop.culture}|${pop.religion}|${pop.social_class}`
      const existing = map.get(key)
      if (existing) {
        const totalSize = existing.size + pop.size
        if (totalSize > 0) {
          existing.literacy = Math.round(
            (existing.literacy * existing.size + pop.literacy * pop.size) / totalSize
          )
          existing.happiness =
            (existing.happiness * existing.size + pop.happiness * pop.size) / totalSize
        }
        existing.size = totalSize
      } else {
        map.set(key, { ...pop })
      }
    }

    return Array.from(map.values())
  }

  // ── Sync Region.population ───────────────────────────────────────────────────

  private syncRegionPopulations(pops: PopGroup[], regions: Region[]): void {
    const popsByRegion = new Map<string, PopGroup[]>()
    for (const pop of pops) {
      const list = popsByRegion.get(pop.region_id) || []
      list.push(pop)
      popsByRegion.set(pop.region_id, list)
    }

    for (const region of regions) {
      const regionPops = popsByRegion.get(region.id) || []
      const total = regionPops.reduce((s, p) => s + p.size, 0)

      const culture_distribution: { [key in Culture]?: number } = {}
      for (const pop of regionPops) {
        culture_distribution[pop.culture] = (culture_distribution[pop.culture] || 0) + pop.size
      }

      const religion_distribution: { [key in Religion]?: number } = {}
      for (const pop of regionPops) {
        religion_distribution[pop.religion] = (religion_distribution[pop.religion] || 0) + pop.size
      }

      const happiness = total > 0
        ? regionPops.reduce((s, p) => s + p.happiness * p.size, 0) / total
        : 50

      region.population = { total, culture_distribution, religion_distribution, happiness }
    }
  }

  // ── Delta Application Helper ─────────────────────────────────────────────────

  private applyDeltas(
    pops: PopGroup[],
    deltas: Array<{ region_id: string, culture: Culture, religion: Religion, social_class: SocialClass, delta: number }>
  ): PopGroup[] {
    const result = [...pops]

    for (const delta of deltas) {
      const key = `${delta.region_id}|${delta.culture}|${delta.religion}|${delta.social_class}`
      const idx = result.findIndex(p =>
        p.region_id === delta.region_id &&
        p.culture === delta.culture &&
        p.religion === delta.religion &&
        p.social_class === delta.social_class
      )

      if (idx >= 0) {
        result[idx] = { ...result[idx], size: result[idx].size + delta.delta }
      } else {
        // Create a new pop with sensible defaults
        result.push({
          id: `${delta.region_id}_${delta.culture}_${delta.religion}_${delta.social_class}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          region_id: delta.region_id,
          culture: delta.culture,
          religion: delta.religion,
          social_class: delta.social_class,
          literacy: CLASS_LITERACY_TARGET[delta.social_class],
          size: delta.delta,
          happiness: CLASS_HAPPINESS_TARGET[delta.social_class]
        })
      }
    }

    return result
  }

  // ── Dominance Helpers (from pops) ────────────────────────────────────────────

  private getDominantCultureFromPops(pops: PopGroup[], regionId: string): Culture | null {
    const totals = new Map<Culture, number>()
    for (const pop of pops) {
      if (pop.region_id !== regionId) continue
      totals.set(pop.culture, (totals.get(pop.culture) || 0) + pop.size)
    }
    if (totals.size === 0) return null
    let best: Culture | null = null
    let bestVal = -1
    totals.forEach((v, k) => { if (v > bestVal) { bestVal = v; best = k } })
    return best
  }

  private getDominantReligionFromPops(pops: PopGroup[], regionId: string): Religion | null {
    const totals = new Map<Religion, number>()
    for (const pop of pops) {
      if (pop.region_id !== regionId) continue
      totals.set(pop.religion, (totals.get(pop.religion) || 0) + pop.size)
    }
    if (totals.size === 0) return null
    let best: Religion | null = null
    let bestVal = -1
    totals.forEach((v, k) => { if (v > bestVal) { bestVal = v; best = k } })
    return best
  }

  // ── Public helpers (used by UI) ──────────────────────────────────────────────

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

  // ── Settlement tier methods (unchanged) ──────────────────────────────────────

  private updateRegionWealth(region: Region): void {
    const base_wealth_generation = 5
    const tierProgression = getTierProgression(region.settlement_tier)
    const wealth_generation = base_wealth_generation * tierProgression.wealthModifier
    region.wealth += wealth_generation
  }

  private updateSettlementProgress(region: Region): void {
    region.months_at_tier++

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

    region.settlement_tier = nextTier
    region.months_at_tier = 0
    region.development_progress = 0
    region.development_invested = 0
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

  investInDevelopment(region: Region, amount: number): boolean {
    if (region.wealth < amount) {
      return false
    }
    region.wealth -= amount
    region.development_invested += amount
    return true
  }
}

export const demographicsSystem = new DemographicsSystem()
