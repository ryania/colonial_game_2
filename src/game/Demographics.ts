import { Region, Population, Culture, Religion, GameEvent } from './types'
import { mapManager } from './Map'

export class DemographicsSystem {
  private events: GameEvent[] = []
  private tick_count: number = 0

  processMonthTick(regions: Region[]): GameEvent[] {
    this.events = []
    this.tick_count++

    regions.forEach(region => {
      this.updatePopulation(region)
      this.spreadCulture(region, regions)
      this.updateReligion(region, regions)
    })

    return this.events
  }

  private updatePopulation(region: Region): void {
    const pop = region.population
    const base_growth = 0.002 // 0.2% per month
    const happiness_factor = (pop.happiness - 50) / 100
    const growth_rate = base_growth + (happiness_factor * 0.001)

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

    neighbors.forEach(neighbor => {
      if (!neighbor.population.culture_distribution) return

      // 5% chance per month for culture to spread to neighbors
      if (Math.random() < 0.05) {
        const region_cultures = Object.entries(pop.culture_distribution).sort(([, a], [, b]) => (b || 0) - (a || 0))
        const dominant_culture = region_cultures[0]?.[0] as Culture

        if (dominant_culture) {
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
      }
    })
  }

  private updateReligion(region: Region, allRegions: Region[]): void {
    const pop = region.population

    if (!pop.religion_distribution) return

    const neighbors = mapManager.getNeighbors(region.id)

    neighbors.forEach(neighbor => {
      if (!neighbor.population.religion_distribution) return

      // 3% chance per month for religion to spread
      if (Math.random() < 0.03) {
        const region_religions = Object.entries(pop.religion_distribution).sort(([, a], [, b]) => (b || 0) - (a || 0))
        const dominant_religion = region_religions[0]?.[0] as Religion

        if (dominant_religion) {
          const spread_amount = neighbor.population.total * 0.03
          if (!neighbor.population.religion_distribution[dominant_religion]) {
            neighbor.population.religion_distribution[dominant_religion] = 0
          }
          neighbor.population.religion_distribution[dominant_religion]! += spread_amount
        }
      }
    })
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
}

export const demographicsSystem = new DemographicsSystem()
