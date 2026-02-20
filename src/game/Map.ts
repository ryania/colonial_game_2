import { Region, Population, Culture } from './types'
import { getStartingTier } from './regionTiers'
import { ProvinceGenerator } from './ProvinceGenerator'

export interface MapData {
  width: number
  height: number
  regions: Region[]
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
  private regions: Map<string, Region> = new Map()
  private regionsByCoord: Map<string, Region> = new Map()
  private neighborCache: Map<string, Region[]> = new Map()
  private initialized: boolean = false

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
        this.addRegion(region)
      })

      // Build neighbor cache for O(1) lookups
      this.neighborCache = ProvinceGenerator.buildNeighborCache(regions)

      // Log statistics
      const stats = ProvinceGenerator.getProvinceStats(regions)
      console.log('Provinces loaded:', {
        total: stats.total,
        totalPopulation: stats.totalPopulation,
        totalWealth: stats.totalWealth,
        byTier: stats.byTier,
        byCulture: stats.byCulture
      })

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

  addRegion(region: Region): void {
    this.regions.set(region.id, region)
    const key = `${region.x},${region.y}`
    this.regionsByCoord.set(key, region)
  }

  getRegion(id: string): Region | undefined {
    return this.regions.get(id)
  }

  getRegionByCoord(x: number, y: number): Region | undefined {
    const key = `${x},${y}`
    return this.regionsByCoord.get(key)
  }

  getAllRegions(): Region[] {
    return Array.from(this.regions.values())
  }

  /**
   * Get neighbors for a region - uses cached neighbors for O(1) lookup
   */
  getNeighbors(regionId: string): Region[] {
    // Use cache if available (after initialization)
    if (this.neighborCache.has(regionId)) {
      return this.neighborCache.get(regionId) || []
    }

    // Fallback for backwards compatibility (should not be needed after init)
    const region = this.getRegion(regionId)
    if (!region) return []

    const neighbors: Region[] = []
    HexUtils.getNeighbors(region.x, region.y).forEach(([x, y]) => {
      const neighbor = this.getRegionByCoord(x, y)
      if (neighbor) neighbors.push(neighbor)
    })
    return neighbors
  }

  getDistance(regionId1: string, regionId2: string): number {
    const r1 = this.getRegion(regionId1)
    const r2 = this.getRegion(regionId2)
    if (!r1 || !r2) return Infinity

    return (Math.abs(r1.x - r2.x) + Math.abs(r1.y - r2.y) + Math.abs(r1.x + r1.y - r2.x - r2.y)) / 2
  }

  updateRegion(id: string, updates: Partial<Region>): void {
    const region = this.getRegion(id)
    if (region) {
      Object.assign(region, updates)
    }
  }
}

// Geographic projection utilities (equirectangular)
export const MAP_PROJECTION = {
  worldWidth: 4000,
  worldHeight: 2500,
  minLat: -42,
  maxLat: 62,
  minLng: -100,
  maxLng: 45,

  latLngToPixel(lat: number, lng: number): [number, number] {
    const x = (lng - this.minLng) / (this.maxLng - this.minLng) * this.worldWidth
    const y = (this.maxLat - lat) / (this.maxLat - this.minLat) * this.worldHeight
    return [x, y]
  },

  initialCameraX(): number {
    return ((-30 - this.minLng) / (this.maxLng - this.minLng)) * this.worldWidth
  },

  initialCameraY(): number {
    return ((this.maxLat - 20) / (this.maxLat - this.minLat)) * this.worldHeight
  }
}

// Create singleton instance
export const mapManager = new MapManager()

// Initialize the map (this will be called from App.tsx)
export const initializeMapManager = async () => {
  await mapManager.initialize()
}
