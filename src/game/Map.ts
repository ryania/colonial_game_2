import { Region, Population, Culture } from './types'

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

  constructor() {
    this.initializeColonialRegions()
  }

  private initializeColonialRegions(): void {
    // Define 8-10 major Atlantic colonial regions
    // Using axial hex coordinates (q, r)
    const regions: Region[] = [
      // Caribbean
      { id: 'cuba', name: 'Cuba', x: 0, y: 0, population: this.createPopulation(8000), wealth: 1000, trade_goods: ['sugar', 'tobacco'], owner_culture: 'Spanish', owner_religion: 'Catholic' },
      { id: 'hispaniola', name: 'Hispaniola', x: 1, y: 0, population: this.createPopulation(5000), wealth: 800, trade_goods: ['sugar', 'timber'], owner_culture: 'Spanish', owner_religion: 'Catholic' },
      { id: 'jamaica', name: 'Jamaica', x: 2, y: 0, population: this.createPopulation(3000), wealth: 600, trade_goods: ['sugar'], owner_culture: 'English', owner_religion: 'Protestant' },

      // North America
      { id: 'virginia', name: 'Virginia', x: 1, y: 1, population: this.createPopulation(4000), wealth: 700, trade_goods: ['tobacco', 'timber'], owner_culture: 'English', owner_religion: 'Protestant' },
      { id: 'massachusetts', name: 'Massachusetts', x: 0, y: 2, population: this.createPopulation(3500), wealth: 650, trade_goods: ['timber', 'furs'], owner_culture: 'English', owner_religion: 'Protestant' },
      { id: 'charleston', name: 'Charleston', x: 2, y: 1, population: this.createPopulation(2500), wealth: 500, trade_goods: ['rice', 'indigo'], owner_culture: 'English', owner_religion: 'Protestant' },

      // Brazil
      { id: 'pernambuco', name: 'Pernambuco', x: -1, y: 1, population: this.createPopulation(6000), wealth: 900, trade_goods: ['sugar'], owner_culture: 'Portuguese', owner_religion: 'Catholic' },
      { id: 'bahia', name: 'Bahia', x: -2, y: 1, population: this.createPopulation(5500), wealth: 850, trade_goods: ['sugar', 'tobacco'], owner_culture: 'Portuguese', owner_religion: 'Catholic' },

      // West Africa
      { id: 'senegal', name: 'Senegal', x: -1, y: -1, population: this.createPopulation(2000), wealth: 400, trade_goods: ['slaves', 'ivory', 'gold'], owner_culture: 'French', owner_religion: 'Animist' },
      { id: 'angola', name: 'Angola', x: -2, y: -1, population: this.createPopulation(3000), wealth: 600, trade_goods: ['slaves', 'ivory'], owner_culture: 'Portuguese', owner_religion: 'Animist' }
    ]

    regions.forEach(region => {
      this.addRegion(region)
    })
  }

  private createPopulation(total: number): Population {
    return {
      total,
      culture_distribution: {
        'Spanish': total * 0.3,
        'English': total * 0.2,
        'Portuguese': total * 0.2,
        'Native': total * 0.2,
        'African': total * 0.1
      },
      religion_distribution: {
        'Catholic': total * 0.6,
        'Protestant': total * 0.2,
        'Animist': total * 0.2
      },
      happiness: 50
    }
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

  getNeighbors(regionId: string): Region[] {
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

export const mapManager = new MapManager()
