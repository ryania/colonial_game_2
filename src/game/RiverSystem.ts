/**
 * RiverSystem.ts
 *
 * Manages province-to-province river connections derived from
 * data/rivers/ireland_rivers.geojson via generate_river_connections.py.
 *
 * River connections act as province modifiers:
 *   - Provinces with rivers expose river_names[] for display
 *   - Connected province pairs get reduced effective distance and movement cost
 *
 * Constants exported here are consumed by Map.ts (getDistance) and
 * Pathfinding.ts (edge cost overrides).
 */

import riverConnectionsData from '../data/river_connections.json'
import { RiverConnection, Region } from './types'

// ---------------------------------------------------------------------------
// River travel constants
// ---------------------------------------------------------------------------

/** Multiplier applied to hex distance between river-connected provinces.
 *  0.6 = rivers make travel ~40% faster in distance calculations. */
export const RIVER_DISTANCE_MULTIPLIER = 0.6

/** Movement cost (Dijkstra edge cost) for traversing a river-connected border.
 *  Overrides terrain cost when lower, reflecting navigable waterway. */
export const RIVER_TRANSIT_COST = 2.0

// ---------------------------------------------------------------------------
// RiverSystem
// ---------------------------------------------------------------------------

interface RiverData {
  connections: RiverConnection[]
  province_rivers: Record<string, string[]>
}

export class RiverSystem {
  /** Canonical connection keys: sorted "id1|id2" for O(1) lookup. */
  private readonly connectionKeys: Set<string>

  /** Province ID → river names passing through/by that province. */
  private readonly provinceRivers: Map<string, string[]>

  /** All connections as typed records. */
  private readonly allConnections: RiverConnection[]

  constructor() {
    const data = riverConnectionsData as RiverData
    this.allConnections = data.connections
    this.connectionKeys = new Set()
    this.provinceRivers = new Map()

    for (const conn of data.connections) {
      this.connectionKeys.add(this.makeKey(conn.from_id, conn.to_id))
    }

    for (const [provinceId, rivers] of Object.entries(data.province_rivers)) {
      this.provinceRivers.set(provinceId, rivers)
    }

    console.log(
      `[RiverSystem] Loaded ${this.allConnections.length} river connections ` +
      `across ${this.provinceRivers.size} provinces`
    )
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /** True if the two provinces share a river connection. Order-independent. */
  areRiverConnected(id1: string, id2: string): boolean {
    return this.connectionKeys.has(this.makeKey(id1, id2))
  }

  /** Rivers that pass through or are adjacent to this province (may be empty). */
  getRiversForProvince(provinceId: string): string[] {
    return this.provinceRivers.get(provinceId) ?? []
  }

  /** All river connections (for use in PathfindingGraph edge injection). */
  getConnections(): RiverConnection[] {
    return this.allConnections
  }

  /**
   * Apply river_names modifiers to an array of Region objects in place.
   * Called by MapManager.initialize() after provinces are loaded.
   */
  applyToRegions(regions: Region[]): void {
    for (const region of regions) {
      const rivers = this.provinceRivers.get(region.id)
      if (rivers && rivers.length > 0) {
        region.river_names = rivers
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private makeKey(id1: string, id2: string): string {
    return id1 < id2 ? `${id1}|${id2}` : `${id2}|${id1}`
  }
}

// Singleton — imported by Map.ts and Pathfinding.ts
export const riverSystem = new RiverSystem()
