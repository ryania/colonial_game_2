import { Region, ProvinceRegion, GeographicRegion, Continent, isWaterTerrain } from './types'

/**
 * Generates ProvinceRegion objects by grouping hex-tile provinces that share
 * the same root name (e.g. "Pas-de-Calais") and geographic region.
 *
 * Groups of ≤7 provinces become a single ProvinceRegion.  Larger groups are
 * sub-divided into clusters of ~5 using a lat/lng sort-and-slice strategy,
 * then given directional name prefixes (North, Central, South, etc.).
 *
 * Hard requirement: every ProvinceRegion must have at least MIN_REGION_SIZE
 * provinces.  Groups that are too small are re-clustered within their shared
 * geographic_region; any leftovers that still can't form a full group are
 * merged into the nearest already-formed region by centroid distance.
 *
 * Contiguity rule: every ProvinceRegion must be contiguous (all provinces
 * reachable from each other via hex adjacency), UNLESS every disconnected
 * component borders at least one ocean/water tile.  This allows island groups
 * and coastal archipelagos while preventing landlocked exclaves.
 *
 * Hierarchy:  Province (hex) → ProvinceRegion → StateOwner (realm)
 */

const MAX_SINGLE_REGION_SIZE = 7
const TARGET_CLUSTER_SIZE = 5
const MIN_REGION_SIZE = 3

// Positional name prefixes keyed by total cluster count then cluster index (N→S order)
const DIRECTION_LABELS: Record<number, string[]> = {
  2: ['North', 'South'],
  3: ['North', 'Central', 'South'],
  4: ['North', 'North Central', 'South Central', 'South'],
  5: ['Far North', 'North', 'Central', 'South', 'Far South'],
  6: ['Far North', 'North', 'Upper Central', 'Lower Central', 'South', 'Far South'],
}

export class ProvinceRegionGenerator {
  /**
   * Generate all province regions from a flat list of provinces.
   * Only land provinces with lat/lng coordinates participate in grouping;
   * water tiles are skipped.
   */
  static generate(provinces: Region[]): ProvinceRegion[] {
    const landProvinces = provinces.filter(
      p => p.lat !== undefined && p.lng !== undefined && !isWaterTerrain(p.terrain_type)
    )

    // Build a coordinate map from named provinces (land + water) for neighbor lookups.
    // Generated ocean tiles use high-offset coords (x >= 10000) and are excluded here
    // because they never appear as neighbours of named provinces in axial space.
    // A missing entry in this map means the cell is open water (ocean) — exactly the
    // condition we want to detect in the contiguity checker.
    const allByCoord = new Map<string, Region>()
    for (const p of provinces) {
      if (p.x < 10000 && p.y < 10000) {
        allByCoord.set(`${p.x},${p.y}`, p)
      }
    }

    // Group by (rootName, geographic_region)
    const groups = new Map<string, Region[]>()
    for (const province of landProvinces) {
      const rootName = this.getRootName(province.name)
      const geoKey = province.geographic_region ?? ''
      const key = `${rootName}|||${geoKey}`
      let list = groups.get(key)
      if (!list) { list = []; groups.set(key, list) }
      list.push(province)
    }

    const result: ProvinceRegion[] = []
    const usedIds = new Set<string>()

    for (const [key, group] of groups) {
      const sepIdx = key.indexOf('|||')
      const rootName = key.slice(0, sepIdx)
      const geo = (key.slice(sepIdx + 3) || undefined) as GeographicRegion | undefined
      const continent = group[0].continent

      if (group.length <= MAX_SINGLE_REGION_SIZE) {
        const id = this.uniqueId(this.slugify(rootName), usedIds)
        usedIds.add(id)
        result.push(this.buildRegion(id, rootName, group, geo, continent))
      } else {
        const k = Math.ceil(group.length / TARGET_CLUSTER_SIZE)
        const clusters = this.kMeansCluster(group, k)
        const named = this.nameClusters(rootName, clusters, geo, continent, usedIds)
        named.forEach(r => { usedIds.add(r.id); result.push(r) })
      }
    }

    // Contiguity rule: split any ProvinceRegion whose provinces form disconnected
    // components where at least one component does NOT border a water/ocean tile.
    const provinceMap = new Map(landProvinces.map(p => [p.id, p]))
    const afterContiguity = this.enforceContiguity(result, provinceMap, allByCoord, usedIds)

    // Hard requirement: merge any ProvinceRegion with fewer than MIN_REGION_SIZE
    // provinces into geographic neighbors rather than failing at runtime.
    return this.mergeUndersized(afterContiguity, provinceMap, allByCoord, usedIds)
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  /** Strip trailing number from province name to get the root name. */
  private static getRootName(name: string): string {
    return name.replace(/\s+\d+$/, '').trim()
  }

  private static slugify(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
  }

  /** Return `base` if unused, otherwise `base_2`, `base_3`, … */
  private static uniqueId(base: string, used: Set<string>): string {
    if (!used.has(base)) return base
    let i = 2
    while (used.has(`${base}_${i}`)) i++
    return `${base}_${i}`
  }

  private static centroid(provinces: Region[]): { lat: number; lng: number } {
    const lat = provinces.reduce((s, p) => s + (p.lat ?? 0), 0) / provinces.length
    const lng = provinces.reduce((s, p) => s + (p.lng ?? 0), 0) / provinces.length
    return { lat, lng }
  }

  private static buildRegion(
    id: string,
    name: string,
    provinces: Region[],
    geo?: GeographicRegion,
    continent?: Continent,
  ): ProvinceRegion {
    const { lat, lng } = this.centroid(provinces)
    return {
      id,
      name,
      province_ids: provinces.map(p => p.id),
      geographic_region: geo,
      continent,
      centroid_lat: lat,
      centroid_lng: lng,
    }
  }

  /**
   * Cluster provinces into k compact groups using k-means on lat/lng.
   *
   * Replaces the old sort-and-slice approach which produced thin latitudinal
   * bands (e.g. a 6-hex horizontal strip for a France sub-region).  K-means
   * converges on roughly circular, geographically compact clusters instead.
   *
   * Initialisation: k seeds are drawn at evenly-spaced positions from a
   * north-to-south sorted list — a lightweight k-means++ variant that spreads
   * seeds across the full extent of the province group.
   *
   * Empty clusters (rare with well-spread seeds) are resolved by stealing the
   * most isolated province from the largest cluster before updating centroids.
   *
   * The returned clusters are sorted north-to-south by centroid latitude so
   * that directional names (North / Central / South) remain meaningful.
   */
  private static kMeansCluster(provinces: Region[], k: number): Region[][] {
    if (k <= 1) return [provinces]
    if (provinces.length <= k) return provinces.map(p => [p])

    const MAX_ITER = 15
    const pts = provinces.map(p => ({ lat: p.lat ?? 0, lng: p.lng ?? 0 }))

    // Seeds: evenly spaced from north→south sorted list
    const byLat = [...provinces].sort((a, b) => (b.lat ?? 0) - (a.lat ?? 0))
    const step = byLat.length / k
    let centroids: Array<{ lat: number; lng: number }> = Array.from({ length: k }, (_, i) => {
      const p = byLat[Math.min(Math.round(i * step + step / 2), byLat.length - 1)]
      return { lat: p.lat ?? 0, lng: p.lng ?? 0 }
    })

    let assignments: number[] = new Array(provinces.length).fill(0)

    for (let iter = 0; iter < MAX_ITER; iter++) {
      // Assignment: each province → nearest centroid
      const next = pts.map(pt => {
        let best = 0, bestDist = Infinity
        for (let c = 0; c < centroids.length; c++) {
          const d = Math.hypot(pt.lat - centroids[c].lat, pt.lng - centroids[c].lng)
          if (d < bestDist) { bestDist = d; best = c }
        }
        return best
      })

      // Accumulate cluster sums
      const sums = Array.from({ length: k }, () => ({ lat: 0, lng: 0, count: 0 }))
      next.forEach((c, i) => { sums[c].lat += pts[i].lat; sums[c].lng += pts[i].lng; sums[c].count++ })

      // Resolve empty clusters: steal from largest
      sums.forEach((s, c) => {
        if (s.count > 0) return
        const largestC = sums.reduce((best, cur, idx) => cur.count > sums[best].count ? idx : best, 0)
        const victimIdx = next.findIndex(a => a === largestC)
        next[victimIdx] = c
        sums[c] = { lat: pts[victimIdx].lat, lng: pts[victimIdx].lng, count: 1 }
        sums[largestC].lat -= pts[victimIdx].lat
        sums[largestC].lng -= pts[victimIdx].lng
        sums[largestC].count--
      })

      // Update centroids
      const newCentroids = sums.map((s, i) =>
        s.count > 0 ? { lat: s.lat / s.count, lng: s.lng / s.count } : centroids[i]
      )

      // Convergence check
      const converged = newCentroids.every(
        (c, i) => Math.abs(c.lat - centroids[i].lat) < 1e-4 && Math.abs(c.lng - centroids[i].lng) < 1e-4
      )
      assignments = next
      centroids = newCentroids
      if (converged) break
    }

    // Build clusters and sort north-to-south so directional labels align correctly
    const clusters: Region[][] = Array.from({ length: k }, () => [])
    provinces.forEach((p, i) => clusters[assignments[i]].push(p))
    const nonEmpty = clusters.filter(c => c.length > 0)
    nonEmpty.sort((a, b) => {
      const aLat = a.reduce((s, p) => s + (p.lat ?? 0), 0) / a.length
      const bLat = b.reduce((s, p) => s + (p.lat ?? 0), 0) / b.length
      return bLat - aLat  // descending → north first
    })
    return nonEmpty
  }

  /**
   * Assign directional names to clusters ordered north-to-south.
   * Uses compass labels for k ≤ 6 (e.g. "North Pas-de-Calais"),
   * and sequential ordinal suffixes for larger k (e.g. "Lapland 1").
   */
  private static nameClusters(
    rootName: string,
    clusters: Region[][],
    geo: GeographicRegion | undefined,
    continent: Continent | undefined,
    usedIds: Set<string>,
  ): ProvinceRegion[] {
    const k = clusters.length
    const compassLabels = DIRECTION_LABELS[k]

    return clusters.map((cluster, i) => {
      const name = compassLabels
        ? `${compassLabels[i]} ${rootName}`   // "North Pas-de-Calais"
        : `${rootName} ${i + 1}`              // "Lapland 1"
      const id = this.uniqueId(this.slugify(name), usedIds)
      usedIds.add(id)
      return this.buildRegion(id, name, cluster, geo, continent)
    })
  }

  /** Format a GeographicRegion enum value into a human-readable name. */
  private static formatGeoName(geo?: GeographicRegion): string {
    if (!geo) return 'Unknown Region'
    return geo.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  }

  /**
   * Returns the 6 axial hex neighbor coordinates for a given (x, y).
   */
  private static hexNeighborCoords(x: number, y: number): Array<[number, number]> {
    return [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1],
      [x + 1, y - 1],
      [x - 1, y + 1],
    ]
  }

  /**
   * Returns true if the given province borders at least one water/ocean tile.
   *
   * A province is considered to border water when any of its 6 hex neighbors:
   *   (a) has a water terrain type (ocean, sea, coast, lake, river), OR
   *   (b) has no province at all in the map — unoccupied cells represent open
   *       ocean that will later be filled by the generated ocean grid.
   */
  private static bordersWater(province: Region, allByCoord: Map<string, Region>): boolean {
    for (const [nx, ny] of this.hexNeighborCoords(province.x, province.y)) {
      const neighbor = allByCoord.get(`${nx},${ny}`)
      if (!neighbor) return true                      // empty cell = ocean
      if (isWaterTerrain(neighbor.terrain_type)) return true
    }
    return false
  }

  /**
   * Enforce the contiguity rule on a set of ProvinceRegions.
   *
   * For each region, BFS through hex-adjacent provinces within the region to
   * find connected components.  If all provinces are reachable from each other
   * the region is contiguous and kept unchanged.
   *
   * If multiple components exist, each component is tested for water adjacency:
   *   - If ALL components border a water tile the non-contiguous layout is
   *     valid (island groups, coastal archipelagos) and the region is kept.
   *   - If ANY component does NOT border water it is a landlocked exclave that
   *     violates the rule.  In that case EVERY component is split into its own
   *     (potentially undersized) region so the subsequent mergeUndersized pass
   *     can absorb them into geographically appropriate neighbours.
   *
   * Violations are logged to the console so they can be tracked and fixed in
   * the underlying province data.
   */
  private static enforceContiguity(
    regions: ProvinceRegion[],
    provinceMap: Map<string, Region>,
    allByCoord: Map<string, Region>,
    usedIds: Set<string>,
  ): ProvinceRegion[] {
    const result: ProvinceRegion[] = []
    let violationCount = 0

    for (const region of regions) {
      const provinceSet = new Set(region.province_ids)
      const provinces = region.province_ids
        .map(id => provinceMap.get(id))
        .filter(Boolean) as Region[]

      if (provinces.length === 0) {
        result.push(region)
        continue
      }

      // BFS to find all connected components within this region
      const visited = new Set<string>()
      const components: Region[][] = []

      for (const startProvince of provinces) {
        if (visited.has(startProvince.id)) continue

        const component: Region[] = []
        const queue: Region[] = [startProvince]
        visited.add(startProvince.id)

        while (queue.length > 0) {
          const current = queue.shift()!
          component.push(current)

          for (const [nx, ny] of this.hexNeighborCoords(current.x, current.y)) {
            const neighbor = allByCoord.get(`${nx},${ny}`)
            if (!neighbor) continue
            if (visited.has(neighbor.id)) continue
            if (!provinceSet.has(neighbor.id)) continue  // not in this region
            visited.add(neighbor.id)
            queue.push(neighbor)
          }
        }

        components.push(component)
      }

      // Single component → already contiguous
      if (components.length === 1) {
        result.push(region)
        continue
      }

      // Multiple components: check whether each borders water
      const waterFlags = components.map(comp =>
        comp.some(p => this.bordersWater(p, allByCoord))
      )

      const allBorderWater = waterFlags.every(Boolean)

      if (allBorderWater) {
        // All components are coastal/island — the non-contiguous layout is valid
        result.push(region)
        continue
      }

      // At least one landlocked exclave → violation; split every component
      violationCount++
      const landlockedComponents = components.filter((_, i) => !waterFlags[i])
      console.warn(
        `[ContiguityAudit] Region "${region.name}" (${region.id}) has ` +
        `${components.length} disconnected components, ` +
        `${landlockedComponents.length} of which do not border any water tile. ` +
        `Splitting all components for re-merge.`
      )

      for (const component of components) {
        const splitId = this.uniqueId(this.slugify(region.name), usedIds)
        usedIds.add(splitId)
        result.push(
          this.buildRegion(splitId, region.name, component, region.geographic_region, region.continent)
        )
      }
    }

    if (violationCount > 0) {
      console.warn(`[ContiguityAudit] ${violationCount} region(s) violated the contiguity rule and were split.`)
    } else {
      console.log('[ContiguityAudit] All regions pass the contiguity rule.')
    }

    return result
  }

  /**
   * Enforce MIN_REGION_SIZE by merging undersized ProvinceRegions.
   *
   * Pass 1 — re-cluster within geographic_region:
   *   Provinces from all undersized regions are pooled by geographic_region.
   *   If a pool has enough provinces it is re-clustered into valid regions.
   *
   * Pass 2 — absorb orphans into best-adjacent formed region:
   *   Pools that are still too small (and any remaining lone provinces) are
   *   merged one-by-one.  Preference is given to regions that are already
   *   hex-adjacent to the orphan (sharing a border), which keeps merges
   *   geographically local and avoids elongated strip artifacts.  Centroid
   *   distance is used as a tie-breaker / fallback when no adjacent region
   *   exists.
   *
   * Pass 3 — final sweep:
   *   Any region that is still undersized (edge-case: entire dataset tiny)
   *   is merged into its nearest neighbor until the invariant holds.
   */
  private static mergeUndersized(
    regions: ProvinceRegion[],
    provinceMap: Map<string, Region>,
    allByCoord: Map<string, Region>,
    usedIds: Set<string>,
  ): ProvinceRegion[] {
    const adequate = regions.filter(r => r.province_ids.length >= MIN_REGION_SIZE)
    const small    = regions.filter(r => r.province_ids.length <  MIN_REGION_SIZE)

    if (small.length === 0) return regions

    // ── Pass 1: re-cluster by geographic_region ───────────────────────────
    type GeoEntry = { provinces: Region[]; geo?: GeographicRegion; continent?: Continent }
    const byGeo = new Map<string, GeoEntry>()

    for (const r of small) {
      const geoKey = r.geographic_region ?? '__none__'
      let entry = byGeo.get(geoKey)
      if (!entry) {
        entry = { provinces: [], geo: r.geographic_region, continent: undefined }
        byGeo.set(geoKey, entry)
      }
      for (const pid of r.province_ids) {
        const p = provinceMap.get(pid)
        if (p) {
          entry.provinces.push(p)
          if (!entry.continent) entry.continent = p.continent
        }
      }
    }

    const working: ProvinceRegion[] = [...adequate]
    const orphans: Region[] = []

    for (const [, { provinces, geo, continent }] of byGeo) {
      if (provinces.length >= MIN_REGION_SIZE) {
        // Cluster into groups of ≥ MIN_REGION_SIZE
        const maxK = Math.floor(provinces.length / MIN_REGION_SIZE)
        const k    = Math.min(Math.ceil(provinces.length / TARGET_CLUSTER_SIZE), maxK)
        const regionName = this.formatGeoName(geo)

        if (k <= 1) {
          const id = this.uniqueId(this.slugify(regionName), usedIds)
          usedIds.add(id)
          working.push(this.buildRegion(id, regionName, provinces, geo, continent))
        } else {
          const clusters = this.kMeansCluster(provinces, k)
          const named = this.nameClusters(regionName, clusters, geo, continent, usedIds)
          named.forEach(r => { usedIds.add(r.id); working.push(r) })
        }
      } else {
        // Too few in this geographic pool — defer to pass 2
        orphans.push(...provinces)
      }
    }

    // ── Pass 2: absorb orphans — prefer hex-adjacent region ───────────────
    // Build reverse lookup: province id → working-array index
    const rebuildIndex = (): Map<string, number> => {
      const idx = new Map<string, number>()
      working.forEach((r, i) => r.province_ids.forEach(pid => idx.set(pid, i)))
      return idx
    }

    let provToRegionIdx = rebuildIndex()

    for (const province of orphans) {
      if (working.length === 0) {
        const id = this.uniqueId(this.slugify(province.name), usedIds)
        usedIds.add(id)
        working.push(this.buildRegion(id, province.name, [province], province.geographic_region, province.continent))
        provToRegionIdx = rebuildIndex()
        continue
      }

      // Try to find a hex-adjacent region — prefer the one with fewest provinces
      // (absorb into smallest neighbour to keep sizes balanced).
      let targetIdx = -1
      let targetSize = Infinity
      for (const [nx, ny] of this.hexNeighborCoords(province.x, province.y)) {
        const nb = allByCoord.get(`${nx},${ny}`)
        if (!nb) continue
        const ri = provToRegionIdx.get(nb.id)
        if (ri === undefined) continue
        const size = working[ri].province_ids.length
        if (size < targetSize) { targetSize = size; targetIdx = ri }
      }

      // Fallback: nearest centroid
      if (targetIdx === -1) {
        const lat = province.lat ?? 0
        const lng = province.lng ?? 0
        let minDist = Infinity
        for (let i = 0; i < working.length; i++) {
          const r = working[i]
          const d = Math.hypot((r.centroid_lat ?? 0) - lat, (r.centroid_lng ?? 0) - lng)
          if (d < minDist) { minDist = d; targetIdx = i }
        }
      }

      const target      = working[targetIdx]
      const mergedIds   = [...target.province_ids, province.id]
      const mergedProvs = mergedIds.map(id => provinceMap.get(id)).filter(Boolean) as Region[]
      working[targetIdx] = this.buildRegion(
        target.id, target.name, mergedProvs, target.geographic_region, target.continent,
      )
      // Update the index for the newly added province
      provToRegionIdx.set(province.id, targetIdx)
    }

    // ── Pass 3: final sweep for any remaining undersized ──────────────────
    let changed = true
    while (changed) {
      changed = false
      const smallIdx = working.findIndex(r => r.province_ids.length < MIN_REGION_SIZE)
      if (smallIdx === -1) break
      if (working.length === 1) break

      const removed = working.splice(smallIdx, 1)[0]
      changed = true

      const c = { lat: removed.centroid_lat ?? 0, lng: removed.centroid_lng ?? 0 }
      let nearestIdx = 0
      let minDist    = Infinity
      for (let i = 0; i < working.length; i++) {
        const r = working[i]
        const d = Math.hypot((r.centroid_lat ?? 0) - c.lat, (r.centroid_lng ?? 0) - c.lng)
        if (d < minDist) { minDist = d; nearestIdx = i }
      }

      const target      = working[nearestIdx]
      const mergedIds   = [...target.province_ids, ...removed.province_ids]
      const mergedProvs = mergedIds.map(id => provinceMap.get(id)).filter(Boolean) as Region[]
      working[nearestIdx] = this.buildRegion(
        target.id, target.name, mergedProvs, target.geographic_region, target.continent,
      )
    }

    return working
  }
}
