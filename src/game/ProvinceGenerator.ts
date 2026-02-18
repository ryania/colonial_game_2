import { Region, Population, Culture, Religion, SettlementTier } from './types'
import provincesData from '../data/provinces.json'

export interface ProvinceData {
  id: string
  name: string
  x: number
  y: number
  continent: string
  region: string
  population: number
  wealth: number
  trade_goods: string[]
  owner_culture: Culture
  owner_religion: Religion
  settlement_tier: SettlementTier
}

export class ProvinceGenerator {
  /**
   * Load provinces from JSON data
   */
  static async loadProvincesFromJSON(): Promise<Region[]> {
    try {
      const data: ProvinceData[] = provincesData
      return this.parseProvinces(data)
    } catch (error) {
      console.error('Error loading provinces:', error)
      throw error
    }
  }

  /**
   * Convert raw province data to Region objects
   */
  private static parseProvinces(data: ProvinceData[]): Region[] {
    return data.map(province => this.convertToRegion(province))
  }

  /**
   * Convert a single ProvinceData object to a Region
   */
  private static convertToRegion(data: ProvinceData): Region {
    return {
      id: data.id,
      name: data.name,
      x: data.x,
      y: data.y,
      population: this.createPopulation(data.population, data.owner_culture),
      wealth: data.wealth,
      trade_goods: data.trade_goods,
      owner_culture: data.owner_culture,
      owner_religion: data.owner_religion,
      settlement_tier: data.settlement_tier,
      development_progress: 0,
      months_at_tier: 0,
      development_invested: 0
    }
  }

  /**
   * Create population distribution based on total population and dominant culture
   */
  private static createPopulation(total: number, dominantCulture: Culture): Population {
    // Distribution varies by culture
    const distributionMap: { [key in Culture]?: { [key in Culture]?: number } } = {
      Spanish: { Spanish: 0.4, Native: 0.2, African: 0.2, Portuguese: 0.1, English: 0.1 },
      English: { English: 0.4, Native: 0.2, African: 0.2, Spanish: 0.1, Portuguese: 0.1 },
      French: { French: 0.4, Native: 0.3, African: 0.2, Spanish: 0.05, English: 0.05 },
      Portuguese: { Portuguese: 0.4, African: 0.3, Native: 0.15, Spanish: 0.1, English: 0.05 },
      Dutch: { Dutch: 0.5, African: 0.25, Native: 0.15, English: 0.1 },
      Native: { Native: 0.6, Spanish: 0.2, African: 0.1, English: 0.1 },
      African: { African: 0.6, Spanish: 0.15, Portuguese: 0.15, English: 0.1 },
      Swahili: { African: 0.5, Swahili: 0.4, Portuguese: 0.1 }
    }

    const distribution = distributionMap[dominantCulture] || {
      [dominantCulture]: 0.3,
      Native: 0.3,
      African: 0.2,
      English: 0.1,
      Spanish: 0.1
    }

    // Create culture distribution
    const culture_distribution: { [key in Culture]?: number } = {}
    Object.entries(distribution).forEach(([culture, ratio]) => {
      if (ratio > 0) {
        culture_distribution[culture as Culture] = total * ratio
      }
    })

    // Create religion distribution
    const religionMap: { [key in Culture]?: { [key in Religion]?: number } } = {
      Spanish: { Catholic: 0.95, Animist: 0.05 },
      English: { Protestant: 0.8, Catholic: 0.1, Animist: 0.1 },
      French: { Catholic: 0.9, Animist: 0.1 },
      Portuguese: { Catholic: 0.9, Animist: 0.1 },
      Dutch: { Protestant: 0.9, Catholic: 0.1 },
      Native: { Animist: 0.95, Catholic: 0.05 },
      African: { Animist: 0.95, Catholic: 0.05 },
      Swahili: { Animist: 0.7, Other: 0.3 }
    }

    const religionDist = religionMap[dominantCulture] || {
      Catholic: 0.5,
      Protestant: 0.3,
      Animist: 0.2
    }

    const religion_distribution: { [key in Religion]?: number } = {}
    Object.entries(religionDist).forEach(([religion, ratio]) => {
      if (ratio > 0) {
        religion_distribution[religion as Religion] = total * ratio
      }
    })

    return {
      total,
      culture_distribution,
      religion_distribution,
      happiness: 50
    }
  }

  /**
   * Validate provinces for data integrity
   */
  static validateProvinces(provinces: Region[]): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    const seenCoordinates = new Set<string>()
    const seenIds = new Set<string>()

    // Valid values for enums
    const validCultures: Culture[] = ['Spanish', 'English', 'French', 'Portuguese', 'Dutch', 'Native', 'African', 'Swahili']
    const validReligions: Religion[] = ['Catholic', 'Protestant', 'Animist', 'Other']
    const validTiers: SettlementTier[] = ['wilderness', 'village', 'town', 'city']

    provinces.forEach((province, index) => {
      // Check required fields
      if (!province.id) errors.push(`Province ${index}: Missing id`)
      if (!province.name) errors.push(`Province ${index}: Missing name`)
      if (province.x === undefined) errors.push(`Province ${index}: Missing x coordinate`)
      if (province.y === undefined) errors.push(`Province ${index}: Missing y coordinate`)

      // Check for duplicate IDs
      if (province.id && seenIds.has(province.id)) {
        errors.push(`Province ${index}: Duplicate id "${province.id}"`)
      }
      if (province.id) seenIds.add(province.id)

      // Check for duplicate coordinates
      const coordKey = `${province.x},${province.y}`
      if (seenCoordinates.has(coordKey)) {
        errors.push(`Province ${index} (${province.name}): Duplicate coordinates (${province.x}, ${province.y})`)
      }
      seenCoordinates.add(coordKey)

      // Check enum values
      if (!validCultures.includes(province.owner_culture)) {
        errors.push(`Province ${province.id}: Invalid culture "${province.owner_culture}"`)
      }

      if (!validReligions.includes(province.owner_religion)) {
        errors.push(`Province ${province.id}: Invalid religion "${province.owner_religion}"`)
      }

      if (!validTiers.includes(province.settlement_tier)) {
        errors.push(`Province ${province.id}: Invalid settlement tier "${province.settlement_tier}"`)
      }

      // Check population
      if (province.population.total <= 0) {
        errors.push(`Province ${province.id}: Invalid population total`)
      }

      // Check wealth is non-negative
      if (province.wealth < 0) {
        errors.push(`Province ${province.id}: Negative wealth`)
      }

      // Check trade goods is array
      if (!Array.isArray(province.trade_goods)) {
        errors.push(`Province ${province.id}: trade_goods is not an array`)
      }
    })

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Build neighbor cache for all provinces (for O(1) lookups)
   */
  static buildNeighborCache(
    provinces: Region[]
  ): Map<string, Region[]> {
    const cache = new Map<string, Region[]>()
    const coordMap = new Map<string, Region>()

    // First pass: build coordinate map
    provinces.forEach(province => {
      const key = `${province.x},${province.y}`
      coordMap.set(key, province)
    })

    // Second pass: compute and cache neighbors
    provinces.forEach(province => {
      const neighbors: Region[] = []
      const neighborCoords = [
        [province.x + 1, province.y],
        [province.x - 1, province.y],
        [province.x, province.y + 1],
        [province.x, province.y - 1],
        [province.x + 1, province.y - 1],
        [province.x - 1, province.y + 1]
      ]

      neighborCoords.forEach(([x, y]) => {
        const neighbor = coordMap.get(`${x},${y}`)
        if (neighbor) {
          neighbors.push(neighbor)
        }
      })

      cache.set(province.id, neighbors)
    })

    return cache
  }

  /**
   * Get statistics about loaded provinces
   */
  static getProvinceStats(provinces: Region[]): {
    total: number
    byContinent: { [key: string]: number }
    byCulture: { [key in Culture]?: number }
    byReligion: { [key in Religion]?: number }
    byTier: { [key in SettlementTier]?: number }
    totalPopulation: number
    totalWealth: number
  } {
    const stats = {
      total: provinces.length,
      byContinent: {} as { [key: string]: number },
      byCulture: {} as { [key in Culture]?: number },
      byReligion: {} as { [key in Religion]?: number },
      byTier: {} as { [key in SettlementTier]?: number },
      totalPopulation: 0,
      totalWealth: 0
    }

    provinces.forEach(province => {
      // Count by tier
      stats.byTier[province.settlement_tier] = (stats.byTier[province.settlement_tier] || 0) + 1

      // Count by culture
      stats.byCulture[province.owner_culture] = (stats.byCulture[province.owner_culture] || 0) + 1

      // Count by religion
      stats.byReligion[province.owner_religion] = (stats.byReligion[province.owner_religion] || 0) + 1

      // Sum population and wealth
      stats.totalPopulation += province.population.total
      stats.totalWealth += province.wealth
    })

    return stats
  }
}
