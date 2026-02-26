import { Region, Population, Culture, Religion, SettlementTier, PopGroup, SocialClass, TerrainType, Continent, GeographicRegion } from './types'
import provincesData from '../data/provinces.json'

export interface ProvinceData {
  id: string
  name: string
  x: number
  y: number
  lat?: number
  lng?: number
  continent?: Continent
  region?: GeographicRegion
  population: number
  wealth: number
  trade_goods: string[]
  owner_culture: Culture
  owner_religion: Religion
  settlement_tier: SettlementTier
  terrain_type?: string
}

export class ProvinceGenerator {
  /**
   * Load provinces from JSON data
   */
  static async loadProvincesFromJSON(): Promise<Region[]> {
    try {
      const data = provincesData as ProvinceData[]
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
      continent: data.continent,
      geographic_region: data.region,
      terrain_type: (data.terrain_type as TerrainType) || 'land',
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
      // European
      Spanish: { Catholic: 0.95, Animist: 0.05 },
      English: { Protestant: 0.8, Catholic: 0.1, Animist: 0.1 },
      French: { Catholic: 0.9, Animist: 0.1 },
      Portuguese: { Catholic: 0.9, Animist: 0.1 },
      Dutch: { Protestant: 0.9, Catholic: 0.1 },
      Flemish: { Catholic: 0.85, Protestant: 0.15 },
      German: { Protestant: 0.6, Catholic: 0.4 },
      Italian: { Catholic: 0.95, Animist: 0.05 },
      Polish: { Catholic: 0.9, Protestant: 0.1 },
      Swedish: { Protestant: 0.95, Catholic: 0.05 },
      Danish: { Protestant: 0.95, Catholic: 0.05 },
      Russian: { Orthodox: 0.95, Animist: 0.05 },
      Romanian: { Orthodox: 0.9, Catholic: 0.1 },
      Serbian: { Orthodox: 0.95, Animist: 0.05 },
      Bulgarian: { Orthodox: 0.95, Animist: 0.05 },
      Bosnian: { Muslim: 0.6, Orthodox: 0.3, Catholic: 0.1 },
      Albanian: { Muslim: 0.7, Orthodox: 0.2, Catholic: 0.1 },
      Tatar: { Muslim: 0.95, Animist: 0.05 },
      Estonian: { Protestant: 0.9, Other: 0.1 },
      // Middle Eastern / North African
      Ottoman: { Muslim: 0.95, Orthodox: 0.05 },
      Moroccan: { Muslim: 0.98, Animist: 0.02 },
      Arab: { Muslim: 0.97, Animist: 0.03 },
      Persian: { Muslim: 0.95, Animist: 0.05 },
      Uyghur: { Muslim: 0.9, Animist: 0.1 },
      // Sub-Saharan African
      Native: { Animist: 0.95, Catholic: 0.05 },
      African: { Animist: 0.95, Catholic: 0.05 },
      Swahili: { Animist: 0.7, Other: 0.3 },
      Ethiopian: { Orthodox: 0.6, Muslim: 0.35, Animist: 0.05 },
      Somali: { Muslim: 0.97, Animist: 0.03 },
      Malagasy: { Animist: 0.9, Muslim: 0.1 },
      Amhara: { Christian: 0.9, Muslim: 0.08, Animist: 0.02 },
      Shona: { Animist: 0.95, Other: 0.05 },
      Mbundu: { Animist: 0.9, Catholic: 0.1 },
      Kikuyu: { Animist: 0.95, Other: 0.05 },
      Afar: { Muslim: 0.9, Animist: 0.1 },
      Bamileke: { Animist: 0.85, Other: 0.15 },
      Wolof: { Muslim: 0.8, Animist: 0.2 },
      Ewe: { Animist: 0.9, Other: 0.1 },
      Hausa: { Muslim: 0.85, Animist: 0.15 },
      Kongo: { Animist: 0.85, Catholic: 0.15 },
      Nubian: { Muslim: 0.8, Animist: 0.2 },
      Tigrinya: { Christian: 0.9, Muslim: 0.1 },
      Akan: { Animist: 0.9, Other: 0.1 },
      // South Asian
      Indian: { Hindu: 0.8, Muslim: 0.15, Animist: 0.05 },
      Mughal: { Muslim: 0.8, Hindu: 0.15, Other: 0.05 },
      Gujarati: { Hindu: 0.7, Muslim: 0.25, Other: 0.05 },
      Marathi: { Hindu: 0.9, Muslim: 0.08, Animist: 0.02 },
      Telugu: { Hindu: 0.85, Muslim: 0.12, Animist: 0.03 },
      Andamanese: { Animist: 1.0 },
      Tibetan: { Buddhist: 0.98, Animist: 0.02 },
      Nepali: { Hindu: 0.8, Buddhist: 0.18, Animist: 0.02 },
      Bhutanese: { Buddhist: 0.97, Hindu: 0.03 },
      Sikkimese: { Buddhist: 0.9, Hindu: 0.1 },
      // Southeast Asian
      Malay: { Muslim: 0.9, Animist: 0.1 },
      Dayak: { Animist: 1.0 },
      Bugis: { Muslim: 0.85, Animist: 0.15 },
      Vietnamese: { Buddhist: 0.85, Animist: 0.1, Other: 0.05 },
      Khmer: { Buddhist: 0.9, Animist: 0.1 },
      Burman: { Buddhist: 0.9, Animist: 0.1 },
      Siamese: { Buddhist: 0.92, Animist: 0.08 },
      // East Asian
      Chinese: { Buddhist: 0.6, Animist: 0.3, Other: 0.1 },
      Japanese: { Shinto: 0.7, Buddhist: 0.3 },
      Korean: { Buddhist: 0.6, Animist: 0.3, Other: 0.1 },
      Mongol: { Animist: 0.7, Buddhist: 0.25, Muslim: 0.05 },
      Manchu: { Animist: 0.6, Buddhist: 0.3, Other: 0.1 },
      Animist: { Animist: 1.0 },
      Greek: { Orthodox: 0.95, Catholic: 0.05 }
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
    const native = new Set<Culture>(['Native'])
    const african = new Set<Culture>([
      'African', 'Ethiopian', 'Somali', 'Malagasy', 'Amhara', 'Shona', 'Mbundu',
      'Kikuyu', 'Afar', 'Bamileke', 'Wolof', 'Ewe', 'Hausa', 'Kongo', 'Nubian', 'Tigrinya', 'Akan'
    ])
    const swahili = new Set<Culture>(['Swahili'])
    if (native.has(culture)) return 'native'
    if (african.has(culture)) return 'african'
    if (swahili.has(culture)) return 'swahili'
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
    if (region.population.total === 0) return []
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
    const validCultures: Culture[] = [
      'Spanish', 'English', 'Irish', 'French', 'Portuguese', 'Dutch', 'Flemish', 'German', 'Italian', 'Polish',
      'Swedish', 'Danish', 'Russian', 'Romanian', 'Serbian', 'Bulgarian', 'Bosnian', 'Albanian', 'Tatar', 'Estonian',
      'Ottoman', 'Moroccan', 'Arab', 'Persian',
      'Native', 'African', 'Swahili', 'Ethiopian', 'Somali', 'Malagasy', 'Amhara', 'Shona', 'Mbundu',
      'Kikuyu', 'Afar', 'Bamileke', 'Wolof', 'Ewe', 'Hausa', 'Kongo', 'Nubian', 'Tigrinya', 'Akan',
      'Indian', 'Mughal', 'Gujarati', 'Marathi', 'Telugu', 'Andamanese', 'Tibetan', 'Nepali',
      'Bhutanese', 'Sikkimese', 'Malay', 'Dayak', 'Bugis', 'Uyghur',
      'Chinese', 'Japanese', 'Korean', 'Mongol', 'Manchu',
      'Vietnamese', 'Khmer', 'Burman', 'Siamese',
      'Animist', 'Greek'
    ]
    const validReligions: Religion[] = ['Catholic', 'Protestant', 'Animist', 'Other', 'Orthodox', 'Muslim', 'Buddhist', 'Shinto', 'Hindu', 'Christian']
    const validTiers: SettlementTier[] = ['unsettled', 'wilderness', 'village', 'town', 'city']

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

      // Check population — water provinces (sea/ocean/lake/river/coast) may have 0 population
      const terrainType = (province as unknown as Region).terrain_type
      const isWater = terrainType && terrainType !== 'land' && terrainType !== 'island'
      if (!isWater) {
        if (province.population.total <= 0) {
          errors.push(`Province ${province.id}: Invalid population total`)
        }
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
   * Generate a full hex grid of ocean/sea tiles covering the entire map,
   * filling grid cells not occupied by a named province.
   */
  static generateOceanGrid(
    namedProvinces: Region[],
    projection: {
      hexSize?: number
      worldWidth: number
      worldHeight: number
      maxLat: number
      minLat: number
      maxLng: number
      minLng: number
      latLngToPixel(lat: number, lng: number): [number, number]
    }
  ): Region[] {
    const HEX_SIZE = projection.hexSize ?? 6
    const COL_SPACING = HEX_SIZE * 1.5               // 15px at hexSize=10
    const ROW_SPACING = HEX_SIZE * Math.sqrt(3)       // ≈ 17.32px at hexSize=10
    const HALF_ROW = ROW_SPACING / 2
    const { worldWidth, worldHeight, maxLat, minLat, maxLng, minLng } = projection

    // Mark grid cells occupied by named provinces (snap each lat/lng to nearest cell)
    const occupied = new Set<string>()
    namedProvinces.forEach(p => {
      if (p.lat === undefined || p.lng === undefined) return
      const [px, py] = projection.latLngToPixel(p.lat, p.lng)
      const col = Math.round(px / COL_SPACING)
      const row = Math.round((py - (col % 2 === 1 ? HALF_ROW : 0)) / ROW_SPACING)
      occupied.add(`${col},${row}`)
    })

    const numCols = Math.ceil(worldWidth / COL_SPACING) + 2
    const numRows = Math.ceil(worldHeight / ROW_SPACING) + 3
    const ocean: Region[] = []

    for (let col = 0; col < numCols; col++) {
      for (let row = 0; row < numRows; row++) {
        const px = col * COL_SPACING
        const py = row * ROW_SPACING + (col % 2 === 1 ? HALF_ROW : 0)
        if (px > worldWidth || py > worldHeight || px < 0 || py < 0) continue
        if (occupied.has(`${col},${row}`)) continue

        const lat = maxLat - (py / worldHeight) * (maxLat - minLat)
        const lng = minLng + (px / worldWidth) * (maxLng - minLng)

        ocean.push({
          id: `ocean_${col}_${row}`,
          name: 'Ocean',
          x: col + 10000,   // high offset avoids axial coord collisions with named provinces
          y: row + 10000,
          lat,
          lng,
          terrain_type: 'ocean',
          population: { total: 0, culture_distribution: {}, religion_distribution: {}, happiness: 50 },
          wealth: 0,
          trade_goods: [],
          owner_culture: 'Native',
          owner_religion: 'Animist',
          settlement_tier: 'wilderness',
          development_progress: 0,
          months_at_tier: 0,
          development_invested: 0
        })
      }
    }

    return ocean
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
