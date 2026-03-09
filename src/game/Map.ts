import { Locality, Population, Culture } from './types'
import { getStartingTier } from './regionTiers'
import { ProvinceGenerator } from './ProvinceGenerator'
import { riverSystem, RIVER_DISTANCE_MULTIPLIER } from './RiverSystem'

export interface MapData {
  width: number
  height: number
  localities: Locality[]
}

// Hexagonal grid utilities
export const HexUtils = {
  axialToPixel: (q: number, r: number, size: number): [number, number] => {
    const x = size * (3/2 * q)
    const y = size * (Math.sqrt(3)/2 * q + Math.sqrt(3) * r)
    return [x, y]
  },

  pixelToAxial: (x: number, y: number, size: number): [number, number] => {
    const q = (2/3 * x) / size
    const r = (-1/3 * x + Math.sqrt(3)/3 * y) / size
    return [Math.round(q), Math.round(r)]
  },

  getNeighbors: (q: number, r: number): Array<[number, number]> => {
    return [
      [q + 1, r],
      [q - 1, r],
      [q, r + 1],
      [q, r - 1],
      [q + 1, r - 1],
      [q - 1, r + 1]
    ]
  }
}

export class MapManager {
  private localities: Map<string, Locality> = new Map()
  private localitiesByCoord: Map<string, Locality> = new Map()
  private neighborCache: Map<string, Locality[]> = new Map()
  private initialized: boolean = false
  private allLocalitiesCache: Locality[] | null = null

  constructor() {
    // Async initialization must be called separately
  }

  /**
   * Initialize provinces from JSON file
   * Must be called before using any map methods
   */
  async initialize(): Promise<void> {
    if (this.initialized) return

    try {
      // Load provinces from JSON
      const regions = await ProvinceGenerator.loadProvincesFromJSON()

      // Validate provinces
      const validation = ProvinceGenerator.validateProvinces(regions)
      if (!validation.valid) {
        console.error('Province validation errors:', validation.errors)
        throw new Error(`Province data contains ${validation.errors.length} validation errors`)
      }

      // Add all regions
      regions.forEach(region => {
        this.addLocality(region)
      })

      // Apply river modifiers (river_names) to provinces that have rivers
      riverSystem.applyToRegions(regions)

      // Build neighbor cache for O(1) lookups (named provinces only)
      this.neighborCache = ProvinceGenerator.buildNeighborCache(regions)

      // Generate ocean grid and add tiles AFTER neighbor cache (excluded from cache)
      const oceanRegions = ProvinceGenerator.generateOceanGrid(regions, MAP_PROJECTION)
      oceanRegions.forEach(region => {
        this.addLocality(region)
      })

      // Log statistics
      const stats = ProvinceGenerator.getProvinceStats(regions)
      console.log('Provinces loaded:', {
        total: stats.total,
        totalPopulation: stats.totalPopulation,
        totalWealth: stats.totalWealth,
        byTier: stats.byTier,
        byCulture: stats.byCulture
      })
      console.log(`Ocean tiles generated: ${oceanRegions.length}`)

      this.initialized = true
    } catch (error) {
      console.error('Failed to initialize map:', error)
      throw error
    }
  }

  /**
   * Check if map is initialized
   */
  isInitialized(): boolean {
    return this.initialized
  }

  addLocality(locality: Locality): void {
    this.localities.set(locality.id, locality)
    const key = `${locality.x},${locality.y}`
    this.localitiesByCoord.set(key, locality)
    this.allLocalitiesCache = null
  }

  getLocality(id: string): Locality | undefined {
    return this.localities.get(id)
  }

  getLocalityByCoord(x: number, y: number): Locality | undefined {
    const key = `${x},${y}`
    return this.localitiesByCoord.get(key)
  }

  getAllLocalities(): Locality[] {
    if (!this.allLocalitiesCache) {
      this.allLocalitiesCache = Array.from(this.localities.values())
    }
    return this.allLocalitiesCache
  }

  /**
   * Get neighbors for a region - uses cached neighbors for O(1) lookup
   */
  getNeighbors(localityId: string): Locality[] {
    // Use cache if available (after initialization)
    if (this.neighborCache.has(localityId)) {
      return this.neighborCache.get(localityId) || []
    }

    // Fallback for backwards compatibility (should not be needed after init)
    const region = this.getLocality(localityId)
    if (!region) return []

    const neighbors: Locality[] = []
    HexUtils.getNeighbors(region.x, region.y).forEach(([x, y]) => {
      const neighbor = this.getLocalityByCoord(x, y)
      if (neighbor) neighbors.push(neighbor)
    })
    return neighbors
  }

  getDistance(regionId1: string, regionId2: string): number {
    const r1 = this.getLocality(regionId1)
    const r2 = this.getLocality(regionId2)
    if (!r1 || !r2) return Infinity

    const hexDist = (Math.abs(r1.x - r2.x) + Math.abs(r1.y - r2.y) + Math.abs(r1.x + r1.y - r2.x - r2.y)) / 2

    // River connections reduce effective distance between linked provinces
    if (riverSystem.areRiverConnected(regionId1, regionId2)) {
      return hexDist * RIVER_DISTANCE_MULTIPLIER
    }

    return hexDist
  }

  updateLocality(id: string, updates: Partial<Locality>): void {
    const region = this.getLocality(id)
    if (region) {
      Object.assign(region, updates)
    }
  }

  // ── Deprecated aliases for migration ────────────────────────────────────

  /** @deprecated Use getAllLocalities */
  getAllRegions(): Locality[] { return this.getAllLocalities() }
  /** @deprecated Use getLocality */
  getRegion(id: string): Locality | undefined { return this.getLocality(id) }
  /** @deprecated Use addLocality */
  addRegion(loc: Locality): void { this.addLocality(loc) }
}

// Geographic projection utilities (equirectangular, full world coverage)
export const MAP_PROJECTION = {
  hexSize: 3,
  worldWidth: 9000,
  worldHeight: 3300,
  minLat: -60,
  maxLat: 72,
  minLng: -180,
  maxLng: 180,

  latLngToPixel(lat: number, lng: number): [number, number] {
    const x = (lng - this.minLng) / (this.maxLng - this.minLng) * this.worldWidth
    const y = (this.maxLat - lat) / (this.maxLat - this.minLat) * this.worldHeight
    return [x, y]
  },

  pixelToLatLng(px: number, py: number): [number, number] {
    const lat = this.maxLat - (py / this.worldHeight) * (this.maxLat - this.minLat)
    const lng = this.minLng + (px / this.worldWidth) * (this.maxLng - this.minLng)
    return [lat, lng]
  },

  initialCameraX(): number {
    // Start centered on the Atlantic (lng ≈ -30)
    return ((-30 - this.minLng) / (this.maxLng - this.minLng)) * this.worldWidth
  },

  initialCameraY(): number {
    // Start at roughly lat 20 (tropical Atlantic)
    return ((this.maxLat - 20) / (this.maxLat - this.minLat)) * this.worldHeight
  }
}

// Create singleton instance
export const mapManager = new MapManager()

// Initialize the map (this will be called from App.tsx)
export const initializeMapManager = async () => {
  await mapManager.initialize()
}
