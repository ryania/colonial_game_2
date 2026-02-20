import { Region, Population, Culture, Religion, SettlementTier, PopGroup, SocialClass } from './types'
import provincesData from '../data/provinces.json'

export interface ProvinceData {
  id: string
  name: string
  x: number
  y: number
  lat?: number
  lng?: number
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
      lat: data.lat,
      lng: data.lng,
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
      Swahili: { African: 0.5, Swahili: 0.4, Portuguese: 0.1 },
      Flemish: { Flemish: 0.6, Dutch: 0.2, French: 0.1, Spanish: 0.1 },
      German: { German: 0.7, Dutch: 0.15, Polish: 0.1, French: 0.05 },
      Italian: { Italian: 0.7, Spanish: 0.15, French: 0.1, Native: 0.05 },
      Polish: { Polish: 0.7, German: 0.15, Native: 0.1, French: 0.05 }
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
      Swahili: { Animist: 0.7, Other: 0.3 },
      Flemish: { Catholic: 0.85, Protestant: 0.15 },
      German: { Protestant: 0.6, Catholic: 0.4 },
      Italian: { Catholic: 0.95, Animist: 0.05 },
      Polish: { Catholic: 0.9, Protestant: 0.1 }
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
   * Class distribution percentages by culture group
   */
  private static readonly CLASS_DISTRIBUTION: Record<string, Record<SocialClass, number>> = {
    european: {
      aristocrat: 0.03, clergy: 0.04, merchant: 0.06, artisan: 0.10,
      peasant: 0.30, laborer: 0.25, slave: 0.22
    },
    native: {
      aristocrat: 0.02, clergy: 0.05, merchant: 0.03, artisan: 0.08,
      peasant: 0.60, laborer: 0.20, slave: 0.02
    },
    african: {
      aristocrat: 0.01, clergy: 0.02, merchant: 0.02, artisan: 0.05,
      peasant: 0.25, laborer: 0.30, slave: 0.35
    },
    swahili: {
      aristocrat: 0.03, clergy: 0.08, merchant: 0.12, artisan: 0.10,
      peasant: 0.35, laborer: 0.25, slave: 0.07
    }
  }

  private static readonly BASE_LITERACY: Record<SocialClass, number> = {
    aristocrat: 70, clergy: 80, merchant: 55, artisan: 35,
    peasant: 10, laborer: 5, slave: 2
  }

  private static readonly LITERACY_VARIANCE: Record<SocialClass, number> = {
    aristocrat: 10, clergy: 10, merchant: 10, artisan: 10,
    peasant: 5, laborer: 5, slave: 3
  }

  private static getCultureGroup(culture: Culture): string {
    if (culture === 'Native') return 'native'
    if (culture === 'African') return 'african'
    if (culture === 'Swahili') return 'swahili'
    return 'european'
  }

  private static generatePopId(regionId: string, culture: Culture, religion: Religion, socialClass: SocialClass): string {
    return `${regionId}_${culture}_${religion}_${socialClass}_${Math.random().toString(36).slice(2, 8)}`
  }

  /**
   * Generate initial pop groups for a region based on its population distribution.
   * Creates one PopGroup per (culture, religion, social_class) combination.
   */
  static generatePopsForRegion(region: Region): PopGroup[] {
    const pops: PopGroup[] = []
    const cultureDist = region.population.culture_distribution
    const religionDist = region.population.religion_distribution

    // Build a religion-to-ratio map from the region's religion distribution
    const religionTotal = Object.values(religionDist).reduce((s, v) => s + (v || 0), 0)
    const religionRatios: Partial<Record<Religion, number>> = {}
    if (religionTotal > 0) {
      for (const [rel, count] of Object.entries(religionDist) as [Religion, number][]) {
        religionRatios[rel] = (count || 0) / religionTotal
      }
    }

    for (const [culture, cultureCount] of Object.entries(cultureDist) as [Culture, number][]) {
      if (!cultureCount || cultureCount <= 0) continue

      const cultureGroup = this.getCultureGroup(culture as Culture)
      const classDist = this.CLASS_DISTRIBUTION[cultureGroup]

      for (const [socialClass, classRatio] of Object.entries(classDist) as [SocialClass, number][]) {
        const classTotal = Math.round(cultureCount * classRatio)
        if (classTotal <= 0) continue

        // Distribute this class total across religions proportionally
        for (const [religion, relRatio] of Object.entries(religionRatios) as [Religion, number][]) {
          if (!relRatio || relRatio <= 0) continue

          const size = Math.round(classTotal * relRatio)
          if (size < 50) continue  // skip trivially small pops

          const baseLit = this.BASE_LITERACY[socialClass]
          const variance = this.LITERACY_VARIANCE[socialClass]
          const literacy = Math.max(0, Math.min(100, Math.round(
            baseLit + (Math.random() * 2 - 1) * variance
          )))

          pops.push({
            id: this.generatePopId(region.id, culture as Culture, religion as Religion, socialClass),
            region_id: region.id,
            culture: culture as Culture,
            religion: religion as Religion,
            social_class: socialClass,
            literacy,
            size,
            happiness: 50
          })
        }
      }
    }

    return pops
  }

  /**
   * Validate provinces for data integrity
   */
  static validateProvinces(provinces: Region[]): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    const seenCoordinates = new Set<string>()
    const seenIds = new Set<string>()

    // Valid values for enums
    const validCultures: Culture[] = ['Spanish', 'English', 'French', 'Portuguese', 'Dutch', 'Native', 'African', 'Swahili', 'Flemish', 'German', 'Italian', 'Polish']
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
