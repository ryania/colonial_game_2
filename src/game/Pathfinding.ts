/**
 * Pathfinding.ts
 *
 * Movement-cost-based trade flow chain system.
 * Builds a unified offset-grid hex graph from all map tiles (named provinces +
 * ocean tiles) and runs Dijkstra to:
 *   1. Assign each province to its nearest market by movement cost.
 *   2. Derive market-to-market flow chains (upstream_market_ids).
 *   3. Record hex-level trade route paths for rendering.
 */

import { Region, TerrainType, TradeMarket, TradeRoute } from './types'
import { MAP_PROJECTION } from './Map'

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
// Market anchor overrides (market IDs that differ from their province IDs)
// ---------------------------------------------------------------------------

const MARKET_REGION_ID_MAP: Record<string, string> = {
  recife: 'pernambuco',
  canton: 'guangzhou',
}

// Terminal markets: goods flow ends here; no further upstream
export const TERMINAL_MARKET_IDS = new Set([
  'amsterdam', 'london', 'seville', 'lisbon', 'venice', 'hamburg',
])

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
}

/**
 * Immutable hex graph built once at initialisation.
 * Adjacency is stored per node as a flat interleaved number[]:
 *   [neighbourId0, cost0, neighbourId1, cost1, …]
 * Cost is the destination-based terrain cost (entering the neighbour hex).
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
   */
  static build(allRegions: Region[]): PathfindingGraph {
    const nodes: PathfindingNode[] = []
    const geoKeyToNodeId  = new Map<string, number>()
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
        nodes.push({ nodeId, regionId: region.id, terrainType: region.terrain_type, col, row })
        geoKeyToNodeId.set(key, nodeId)
      }

      regionIdToNodeId.set(region.id, nodeId)
    }

    // Phase 2: build adjacency lists
    const adjacency: number[][] = Array.from({ length: nodes.length }, () => [])

    for (let nodeId = 0; nodeId < nodes.length; nodeId++) {
      const { col, row } = nodes[nodeId]
      for (const [nc, nr] of offsetNeighbors(col, row)) {
        const nNodeId = geoKeyToNodeId.get(geoKey(nc, nr))
        if (nNodeId === undefined) continue
        // Cost to enter the neighbour = neighbour's terrain cost
        const edgeCost = TERRAIN_MOVEMENT_COST[nodes[nNodeId].terrainType]
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
// Helpers
// ---------------------------------------------------------------------------

export function getMarketAnchorRegionId(marketId: string): string {
  return MARKET_REGION_ID_MAP[marketId] ?? marketId
}

function findMarketAnchorNodeId(market: TradeMarket, graph: PathfindingGraph): number | undefined {
  const regionId = getMarketAnchorRegionId(market.id)
  const byId = graph.getNodeId(regionId)
  if (byId !== undefined) return byId

  // Fallback: find node at this market's lat/lng offset-grid position
  if (market.lat != null && market.lng != null) {
    const [col, row] = latLngToColRow(market.lat, market.lng)
    return graph.getNodeIdByGeoKey(col, row)
  }

  return undefined
}

// ---------------------------------------------------------------------------
// Province → market assignment
// ---------------------------------------------------------------------------

/**
 * Run 1: multi-source Dijkstra from all market anchors simultaneously.
 * Returns a map from province region ID → market ID.
 * Named ocean/sea provinces are excluded (they don't participate in trade).
 */
export function computeMarketAssignments(
  graph: PathfindingGraph,
  namedProvinces: Region[],
  markets: TradeMarket[]
): Map<string, string> {
  const sourceNodeIds:   number[] = []
  const sourceMarketIds: string[] = []

  for (const market of markets) {
    const nodeId = findMarketAnchorNodeId(market, graph)
    if (nodeId === undefined) {
      console.warn(`[Pathfinding] Market "${market.id}": anchor not found in graph`)
      continue
    }
    sourceNodeIds.push(nodeId)
    sourceMarketIds.push(market.id)
  }

  const result = multiSourceDijkstra(graph, sourceNodeIds)

  const SKIP = new Set<string>(['ocean', 'sea'])
  const assignment = new Map<string, string>()

  for (const province of namedProvinces) {
    if (SKIP.has(province.terrain_type)) continue
    const nodeId = graph.getNodeId(province.id)
    if (nodeId === undefined) continue
    const label = result.sourceLabel[nodeId]
    if (label >= 0 && label < sourceMarketIds.length) {
      assignment.set(province.id, sourceMarketIds[label])
    }
  }

  return assignment
}

// ---------------------------------------------------------------------------
// Market flow chain derivation
// ---------------------------------------------------------------------------

export interface FlowChainResult {
  upstreamMap:    Map<string, string[]>   // marketId → [upstream marketId]
  terminalResult: DijkstraResult
  marketNodeIds:  Map<string, number>     // marketId → nodeId
}

/**
 * Run 2: multi-source Dijkstra from terminal markets only.
 * For each non-terminal market, walks the parent chain to find the first
 * intermediate market anchor → that becomes the direct upstream market.
 */
export function computeFlowChains(
  graph: PathfindingGraph,
  markets: TradeMarket[]
): FlowChainResult {
  // Build nodeId for every market
  const marketNodeIds = new Map<string, number>()
  for (const market of markets) {
    const nodeId = findMarketAnchorNodeId(market, graph)
    if (nodeId !== undefined) marketNodeIds.set(market.id, nodeId)
  }

  // Seed from terminal markets
  const terminalSourceNodeIds: number[] = []
  const terminalSourceMarkets: string[] = []
  for (const market of markets) {
    if (!TERMINAL_MARKET_IDS.has(market.id)) continue
    const nodeId = marketNodeIds.get(market.id)
    if (nodeId !== undefined) {
      terminalSourceNodeIds.push(nodeId)
      terminalSourceMarkets.push(market.id)
    }
  }

  const terminalResult = multiSourceDijkstra(graph, terminalSourceNodeIds)

  // Reverse lookup: nodeId → marketId (for finding intermediate markets on paths)
  const nodeIdToMarketId = new Map<number, string>()
  for (const [marketId, nodeId] of marketNodeIds) {
    nodeIdToMarketId.set(nodeId, marketId)
  }

  // Derive upstream for each non-terminal market
  const upstreamMap = new Map<string, string[]>()

  for (const market of markets) {
    if (TERMINAL_MARKET_IDS.has(market.id)) {
      upstreamMap.set(market.id, [])
      continue
    }

    const startNodeId = marketNodeIds.get(market.id)
    if (startNodeId === undefined) {
      upstreamMap.set(market.id, [])
      continue
    }

    // Walk parent chain toward nearest terminal
    let cursor = terminalResult.parent[startNodeId]
    let foundUpstream: string | null = null
    const visited = new Set<number>([startNodeId])

    while (cursor !== -1 && !visited.has(cursor)) {
      visited.add(cursor)
      const marketAtCursor = nodeIdToMarketId.get(cursor)
      if (marketAtCursor && marketAtCursor !== market.id) {
        foundUpstream = marketAtCursor
        break
      }
      cursor = terminalResult.parent[cursor]
    }

    // If no intermediate market found, upstream is the nearest terminal
    if (!foundUpstream) {
      const label = terminalResult.sourceLabel[startNodeId]
      if (label >= 0 && label < terminalSourceMarkets.length) {
        foundUpstream = terminalSourceMarkets[label]
      }
    }

    upstreamMap.set(market.id, foundUpstream ? [foundUpstream] : [])
  }

  return { upstreamMap, terminalResult, marketNodeIds }
}

// ---------------------------------------------------------------------------
// Trade route path reconstruction
// ---------------------------------------------------------------------------

/**
 * Reconstruct the sequence of region IDs from startNodeId following parent
 * pointers until reaching stopNodeId (inclusive) or a dead end.
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
 * Build TradeRoute records — one per non-terminal market, recording the
 * hex-level path from that market to its direct upstream market.
 */
export function computeMarketTradeRoutes(
  graph: PathfindingGraph,
  markets: TradeMarket[],
  flowResult: FlowChainResult
): TradeRoute[] {
  const { upstreamMap, terminalResult, marketNodeIds } = flowResult
  const marketById = new Map(markets.map(m => [m.id, m]))
  const routes: TradeRoute[] = []

  for (const market of markets) {
    if (TERMINAL_MARKET_IDS.has(market.id)) continue

    const upstreamIds = upstreamMap.get(market.id) ?? []
    if (upstreamIds.length === 0) continue

    const upstreamId     = upstreamIds[0]
    const upstreamMarket = marketById.get(upstreamId)
    if (!upstreamMarket) continue

    const startNodeId = marketNodeIds.get(market.id)
    const stopNodeId  = marketNodeIds.get(upstreamId)

    const pathRegionIds: string[] =
      startNodeId !== undefined && stopNodeId !== undefined
        ? reconstructPath(terminalResult.parent, startNodeId, stopNodeId, graph)
        : []

    routes.push({
      id:               `route_${market.id}_to_${upstreamId}`,
      from_region_id:   market.hex_region_id,
      to_region_id:     upstreamMarket.hex_region_id,
      goods:            [],
      income_per_month: 0,
      market_path:      [market.id, upstreamId],
      path_region_ids:  pathRegionIds,
    })
  }

  return routes
}
