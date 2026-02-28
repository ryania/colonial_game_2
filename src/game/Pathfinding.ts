/**
 * Pathfinding.ts
 *
 * Movement-cost-based trade flow system.
 * Builds a unified offset-grid hex graph from all map tiles (named provinces +
 * ocean tiles) and runs Dijkstra to:
 *   1. Assign each province to its nearest trade cluster by movement cost.
 *   2. Pre-compute cheapest inter-cluster routes (used for monthly trade flows).
 *   3. Record hex-level trade route paths for rendering.
 *
 * Ocean current bonuses are applied directionally: traveling with a current
 * is cheaper than going against it, allowing the Atlantic triangle trade to
 * emerge from supply/demand logic rather than hardcoded routes.
 */

import { Region, TerrainType, TradeCluster, TradeRoute } from './types'
import { MAP_PROJECTION } from './Map'
import { riverSystem, RIVER_TRANSIT_COST } from './RiverSystem'
import { getOceanCurrentMult } from './OceanCurrentSystem'

// ---------------------------------------------------------------------------
// Terrain movement costs (destination-based: cost to enter a hex of this type)
// ---------------------------------------------------------------------------

export const TERRAIN_MOVEMENT_COST: Record<TerrainType, number> = {
  ocean:     1.0,   // Open ocean — fastest sea route
  sea:       1.0,   // Semi-enclosed sea (Caribbean, Mediterranean…)
  coast:     1.5,   // Coastal waters — slightly slower
  river:     2.0,   // Navigable river
  lake:      2.0,   // Lake crossing
  beach:     3.0,   // Sandy coastal land — easy landing
  flatlands: 4.0,   // Open plains — easy overland travel
  farmlands: 4.0,   // Cultivated land — easy overland travel
  island:    5.0,   // Island interior
  land:      5.0,   // Generic land
  hills:     6.0,   // Rolling hills — moderate difficulty
  forest:    7.0,   // Dense forest — slow going
  bog:       8.0,   // Boggy ground — difficult terrain
  swamp:     9.0,   // Swampland — very difficult terrain
  mountains: 10.0,  // Mountain passes — hardest to cross
}

// ---------------------------------------------------------------------------
// Map grid constants — must exactly mirror generateOceanGrid in ProvinceGenerator.ts
// ---------------------------------------------------------------------------

const HEX_SIZE    = MAP_PROJECTION.hexSize                    // 5
const COL_SPACING = HEX_SIZE * 1.5                            // 7.5
const ROW_SPACING = HEX_SIZE * Math.sqrt(3)                   // ≈ 8.66
const HALF_ROW    = ROW_SPACING / 2

// ---------------------------------------------------------------------------
// Coordinate utilities
// ---------------------------------------------------------------------------

/** Convert lat/lng to offset-grid (col, row). Replicates generateOceanGrid formula. */
function latLngToColRow(lat: number, lng: number): [number, number] {
  const px  = (lng - MAP_PROJECTION.minLng) / (MAP_PROJECTION.maxLng - MAP_PROJECTION.minLng) * MAP_PROJECTION.worldWidth
  const py  = (MAP_PROJECTION.maxLat - lat) / (MAP_PROJECTION.maxLat - MAP_PROJECTION.minLat) * MAP_PROJECTION.worldHeight
  const col = Math.round(px / COL_SPACING)
  const row = Math.round((py - (col % 2 === 1 ? HALF_ROW : 0)) / ROW_SPACING)
  return [col, row]
}

/** Inverse: convert (col, row) back to approximate lat/lng. */
function colRowToLatLng(col: number, row: number): [number, number] {
  const px  = col * COL_SPACING
  const py  = row * ROW_SPACING + (col % 2 === 1 ? HALF_ROW : 0)
  const lat = MAP_PROJECTION.maxLat - (py / MAP_PROJECTION.worldHeight) * (MAP_PROJECTION.maxLat - MAP_PROJECTION.minLat)
  const lng = MAP_PROJECTION.minLng + (px / MAP_PROJECTION.worldWidth)  * (MAP_PROJECTION.maxLng - MAP_PROJECTION.minLng)
  return [lat, lng]
}

/** The 6 offset-grid hex neighbours of (col, row) — odd-column-shifted-down layout. */
function offsetNeighbors(col: number, row: number): [number, number][] {
  if (col % 2 === 0) {
    return [
      [col,     row - 1],
      [col,     row + 1],
      [col - 1, row - 1],
      [col - 1, row    ],
      [col + 1, row - 1],
      [col + 1, row    ],
    ]
  } else {
    return [
      [col,     row - 1],
      [col,     row + 1],
      [col - 1, row    ],
      [col - 1, row + 1],
      [col + 1, row    ],
      [col + 1, row + 1],
    ]
  }
}

function geoKey(col: number, row: number): string {
  return `${col},${row}`
}

// ---------------------------------------------------------------------------
// PathfindingGraph
// ---------------------------------------------------------------------------

export interface PathfindingNode {
  nodeId:      number
  regionId:    string
  terrainType: TerrainType
  col:         number
  row:         number
  lat:         number   // approximate real-world latitude
  lng:         number   // approximate real-world longitude
}

/**
 * Immutable hex graph built once at initialisation.
 * Adjacency is stored per node as a flat interleaved number[]:
 *   [neighbourId0, cost0, neighbourId1, cost1, …]
 * Cost is destination-based terrain cost × ocean-current directional multiplier.
 * Ocean current multipliers make edges asymmetric (A→B ≠ B→A for sea tiles).
 */
export class PathfindingGraph {
  readonly nodes: PathfindingNode[]
  private readonly geoKeyToNodeId: Map<string, number>
  private readonly regionIdToNodeId: Map<string, number>
  private readonly adjacency: number[][]

  private constructor(
    nodes: PathfindingNode[],
    geoKeyToNodeId: Map<string, number>,
    regionIdToNodeId: Map<string, number>,
    adjacency: number[][]
  ) {
    this.nodes = nodes
    this.geoKeyToNodeId = geoKeyToNodeId
    this.regionIdToNodeId = regionIdToNodeId
    this.adjacency = adjacency
  }

  /**
   * Build the graph from all map regions (named provinces + ocean tiles).
   * Named provinces are loaded first so they win collisions in the offset grid
   * (first-write-wins: `mapManager.getAllRegions()` returns named provinces before ocean tiles).
   *
   * Ocean current directional bonuses are applied to ocean/sea edges so that
   * traveling with a current is cheaper than going against it.
   */
  static build(allRegions: Region[]): PathfindingGraph {
    const nodes: PathfindingNode[] = []
    const geoKeyToNodeId   = new Map<string, number>()
    const regionIdToNodeId = new Map<string, number>()

    // Phase 1: assign node IDs
    for (const region of allRegions) {
      if (region.lat == null || region.lng == null) continue

      const [col, row] = latLngToColRow(region.lat, region.lng)
      const key = geoKey(col, row)

      let nodeId: number
      if (geoKeyToNodeId.has(key)) {
        nodeId = geoKeyToNodeId.get(key)!
      } else {
        nodeId = nodes.length
        const [nodeLat, nodeLng] = colRowToLatLng(col, row)
        nodes.push({ nodeId, regionId: region.id, terrainType: region.terrain_type, col, row, lat: nodeLat, lng: nodeLng })
        geoKeyToNodeId.set(key, nodeId)
      }

      regionIdToNodeId.set(region.id, nodeId)
    }

    // Phase 2: build adjacency lists with directional ocean current costs
    const adjacency: number[][] = Array.from({ length: nodes.length }, () => [])
    const SEA_TYPES = new Set<TerrainType>(['ocean', 'sea', 'coast'])

    for (let nodeId = 0; nodeId < nodes.length; nodeId++) {
      const from = nodes[nodeId]
      for (const [nc, nr] of offsetNeighbors(from.col, from.row)) {
        const nNodeId = geoKeyToNodeId.get(geoKey(nc, nr))
        if (nNodeId === undefined) continue

        const to = nodes[nNodeId]

        // Base cost: destination-based terrain cost
        let edgeCost = TERRAIN_MOVEMENT_COST[to.terrainType]

        // River connection override: take the lower of terrain cost and river cost
        const hasRiver = riverSystem.areRiverConnected(from.regionId, to.regionId)
        if (hasRiver) edgeCost = Math.min(edgeCost, RIVER_TRANSIT_COST)

        // Ocean current directional bonus: only for ocean/sea-type edges
        if (SEA_TYPES.has(from.terrainType) && SEA_TYPES.has(to.terrainType)) {
          const currentMult = getOceanCurrentMult(from.lat, from.lng, to.lat, to.lng)
          edgeCost *= currentMult
        }

        adjacency[nodeId].push(nNodeId, edgeCost)
      }
    }

    return new PathfindingGraph(nodes, geoKeyToNodeId, regionIdToNodeId, adjacency)
  }

  getNodeId(regionId: string): number | undefined {
    return this.regionIdToNodeId.get(regionId)
  }

  getNodeIdByGeoKey(col: number, row: number): number | undefined {
    return this.geoKeyToNodeId.get(geoKey(col, row))
  }

  getNode(nodeId: number): PathfindingNode {
    return this.nodes[nodeId]
  }

  /** Returns flat interleaved [nId0, cost0, nId1, cost1, …] */
  getNeighbors(nodeId: number): number[] {
    return this.adjacency[nodeId]
  }

  get nodeCount(): number {
    return this.nodes.length
  }
}

// ---------------------------------------------------------------------------
// MinHeap (typed-array backed for performance)
// ---------------------------------------------------------------------------

class MinHeap {
  private costs:   Float32Array
  private nodeIds: Int32Array
  private size_:   number = 0

  constructor(initialCapacity = 1_048_576) {
    this.costs   = new Float32Array(initialCapacity)
    this.nodeIds = new Int32Array(initialCapacity)
  }

  push(cost: number, nodeId: number): void {
    if (this.size_ >= this.costs.length) this._grow()
    let i = this.size_++
    this.costs[i]   = cost
    this.nodeIds[i] = nodeId
    this._bubbleUp(i)
  }

  pop(): [number, number] | null {
    if (this.size_ === 0) return null
    const topCost = this.costs[0]
    const topId   = this.nodeIds[0]
    this.size_--
    if (this.size_ > 0) {
      this.costs[0]   = this.costs[this.size_]
      this.nodeIds[0] = this.nodeIds[this.size_]
      this._sinkDown(0)
    }
    return [topCost, topId]
  }

  get size(): number { return this.size_ }

  private _grow(): void {
    const cap      = this.costs.length * 2
    const newCosts = new Float32Array(cap)
    const newIds   = new Int32Array(cap)
    newCosts.set(this.costs.subarray(0, this.size_))
    newIds.set(this.nodeIds.subarray(0, this.size_))
    this.costs   = newCosts
    this.nodeIds = newIds
  }

  private _bubbleUp(i: number): void {
    while (i > 0) {
      const p = (i - 1) >> 1
      if (this.costs[p] <= this.costs[i]) break
      let t = this.costs[p];   this.costs[p]   = this.costs[i];   this.costs[i]   = t
      let u = this.nodeIds[p]; this.nodeIds[p] = this.nodeIds[i]; this.nodeIds[i] = u
      i = p
    }
  }

  private _sinkDown(i: number): void {
    const n = this.size_
    while (true) {
      let m = i
      const l = (i << 1) + 1, r = l + 1
      if (l < n && this.costs[l] < this.costs[m]) m = l
      if (r < n && this.costs[r] < this.costs[m]) m = r
      if (m === i) break
      let t = this.costs[m];   this.costs[m]   = this.costs[i];   this.costs[i]   = t
      let u = this.nodeIds[m]; this.nodeIds[m] = this.nodeIds[i]; this.nodeIds[i] = u
      i = m
    }
  }
}

// ---------------------------------------------------------------------------
// Multi-source Dijkstra
// ---------------------------------------------------------------------------

export interface DijkstraResult {
  dist:        Float32Array   // dist[nodeId] = cost to nearest source
  parent:      Int32Array     // parent[nodeId] = parent nodeId on shortest path (-1 = source/unreachable)
  sourceLabel: Int32Array     // index into startNodeIds array for the source that reached nodeId (-1 = unreachable)
}

/**
 * Run multi-source Dijkstra, seeding all startNodeIds at cost 0.
 * sourceLabels[i] optionally overrides the label for startNodeIds[i].
 */
export function multiSourceDijkstra(
  graph: PathfindingGraph,
  startNodeIds: number[],
  sourceLabels?: number[]
): DijkstraResult {
  const N     = graph.nodeCount
  const dist  = new Float32Array(N).fill(Infinity)
  const parent      = new Int32Array(N).fill(-1)
  const sourceLabel = new Int32Array(N).fill(-1)
  const heap  = new MinHeap()

  for (let i = 0; i < startNodeIds.length; i++) {
    const nodeId = startNodeIds[i]
    if (nodeId < 0 || nodeId >= N) continue
    dist[nodeId]        = 0
    sourceLabel[nodeId] = sourceLabels ? sourceLabels[i] : i
    heap.push(0, nodeId)
  }

  while (heap.size > 0) {
    const entry = heap.pop()!
    const [cost, nodeId] = entry
    if (cost > dist[nodeId]) continue  // stale

    const adj = graph.getNeighbors(nodeId)
    for (let k = 0; k < adj.length; k += 2) {
      const nId     = adj[k]
      const newCost = dist[nodeId] + adj[k + 1]
      if (newCost < dist[nId]) {
        dist[nId]        = newCost
        parent[nId]      = nodeId
        sourceLabel[nId] = sourceLabel[nodeId]
        heap.push(newCost, nId)
      }
    }
  }

  return { dist, parent, sourceLabel }
}

// ---------------------------------------------------------------------------
// Province → cluster assignment
// ---------------------------------------------------------------------------

/**
 * Multi-source Dijkstra from all cluster anchors simultaneously.
 * Returns a map from province region ID → cluster ID.
 * Water provinces (ocean, sea) are excluded — they don't participate in trade.
 */
export function computeClusterAssignments(
  graph: PathfindingGraph,
  namedProvinces: Region[],
  clusters: TradeCluster[]
): Map<string, string> {
  const sourceNodeIds:    number[] = []
  const sourceClusterIds: string[] = []

  for (const cluster of clusters) {
    const nodeId = graph.getNodeId(cluster.anchor_province_id)
    if (nodeId === undefined) {
      console.warn(`[Pathfinding] Cluster "${cluster.id}": anchor "${cluster.anchor_province_id}" not found in graph`)
      continue
    }
    sourceNodeIds.push(nodeId)
    sourceClusterIds.push(cluster.id)
  }

  const result = multiSourceDijkstra(graph, sourceNodeIds)

  const SKIP = new Set<string>(['ocean', 'sea'])
  const assignment = new Map<string, string>()

  for (const province of namedProvinces) {
    if (SKIP.has(province.terrain_type)) continue
    const nodeId = graph.getNodeId(province.id)
    if (nodeId === undefined) continue
    const label = result.sourceLabel[nodeId]
    if (label >= 0 && label < sourceClusterIds.length) {
      assignment.set(province.id, sourceClusterIds[label])
    }
  }

  return assignment
}

// ---------------------------------------------------------------------------
// Inter-cluster route pre-computation
// ---------------------------------------------------------------------------

export interface ClusterRoute {
  cost: number
  path_region_ids: string[]
}

/**
 * Reconstruct the path from startNodeId following parent pointers toward
 * stopNodeId (inclusive). The parent array must come from a Dijkstra run
 * that was seeded from stopNodeId (so parents point back toward stopNodeId).
 * Returns path in order: [startNodeId, ..., stopNodeId].
 */
function reconstructPath(
  parent: Int32Array,
  startNodeId: number,
  stopNodeId: number,
  graph: PathfindingGraph
): string[] {
  const path: string[] = []
  let cursor = startNodeId
  const visited = new Set<number>()

  while (cursor !== -1 && !visited.has(cursor)) {
    path.push(graph.getNode(cursor).regionId)
    if (cursor === stopNodeId) break
    visited.add(cursor)
    cursor = parent[cursor]
  }

  return path
}

/**
 * Pre-compute cheapest routes between all cluster anchor pairs.
 *
 * Runs one single-source Dijkstra per cluster anchor (~22 passes on ~460K nodes).
 * The directional ocean current costs in the graph naturally make the Atlantic
 * triangle trade routes cheap in the historically correct directions.
 *
 * Returns a map keyed by `"fromClusterId→toClusterId"` with the cheapest
 * cost and the hex-level path for map rendering.
 */
export function computeClusterRoutes(
  graph: PathfindingGraph,
  clusters: TradeCluster[]
): Map<string, ClusterRoute> {
  const routes = new Map<string, ClusterRoute>()

  // Build anchor node ID lookup
  const anchorNodeIds = new Map<string, number>()  // clusterId → nodeId
  for (const cluster of clusters) {
    const nodeId = graph.getNodeId(cluster.anchor_province_id)
    if (nodeId !== undefined) anchorNodeIds.set(cluster.id, nodeId)
  }

  const clusterList = clusters.filter(c => anchorNodeIds.has(c.id))

  for (const fromCluster of clusterList) {
    const fromNodeId = anchorNodeIds.get(fromCluster.id)!

    // Single-source Dijkstra from this cluster's anchor
    const result = multiSourceDijkstra(graph, [fromNodeId])

    for (const toCluster of clusterList) {
      if (toCluster.id === fromCluster.id) continue
      const toNodeId = anchorNodeIds.get(toCluster.id)!

      const cost = result.dist[toNodeId]
      if (!isFinite(cost)) continue  // unreachable

      // Reconstruct path: follow parents from toNode back to fromNode, then reverse
      const pathReversed = reconstructPath(result.parent, toNodeId, fromNodeId, graph)
      const path = pathReversed.slice().reverse()

      routes.set(`${fromCluster.id}→${toCluster.id}`, { cost, path_region_ids: path })
    }
  }

  return routes
}

// ---------------------------------------------------------------------------
// Trade route rendering records (generated from active trade flows)
// ---------------------------------------------------------------------------

/**
 * Build a TradeRoute rendering record from a cluster-to-cluster trade flow.
 * The path_region_ids comes from pre-computed inter-cluster routes.
 */
export function buildTradeRouteRecord(
  fromCluster: TradeCluster,
  toCluster: TradeCluster,
  good: string,
  clusterRoutes: Map<string, ClusterRoute>
): TradeRoute {
  const key = `${fromCluster.id}→${toCluster.id}`
  const route = clusterRoutes.get(key)

  return {
    id:               `route_${fromCluster.id}_to_${toCluster.id}_${good}`,
    from_region_id:   fromCluster.anchor_province_id,
    to_region_id:     toCluster.anchor_province_id,
    goods:            [good],
    income_per_month: 0,
    cluster_path:     [fromCluster.id, toCluster.id],
    path_region_ids:  route?.path_region_ids ?? [],
  }
}
