import { Locality, District, GeographicRegion, Continent, isWaterTerrain } from './types'

/**
 * Generates District objects by grouping Locality hexes that share the same
 * root name (e.g. "Pas-de-Calais") and geographic region.
 *
 * Land hierarchy:  Locality (hex) → District → Province → Realm
 *
 * Groups of ≤7 localities become a single District.  Larger groups are
 * sub-divided into clusters of ~5 using a lat/lng k-means strategy, then
 * given directional name prefixes (North, Central, South, etc.).
 *
 * Hard requirement: every District must have at least MIN_DISTRICT_SIZE
 * localities.  Groups that are too small are re-clustered within their shared
 * geographic_region; any leftovers that still can't form a full group are
 * merged into the nearest already-formed district by centroid distance.
 *
 * Contiguity rule: every District must be contiguous (all localities
 * reachable from each other via hex adjacency), UNLESS every disconnected
 * component borders at least one ocean/water tile.  This allows island groups
 * and coastal archipelagos while preventing landlocked exclaves.
 */

const MAX_SINGLE_DISTRICT_SIZE = 7
const TARGET_CLUSTER_SIZE = 5
const MIN_DISTRICT_SIZE = 3

// Positional name prefixes keyed by total cluster count then cluster index (N→S order)
const DIRECTION_LABELS: Record<number, string[]> = {
  2: ['North', 'South'],
  3: ['North', 'Central', 'South'],
  4: ['North', 'North Central', 'South Central', 'South'],
  5: ['Far North', 'North', 'Central', 'South', 'Far South'],
  6: ['Far North', 'North', 'Upper Central', 'Lower Central', 'South', 'Far South'],
}

export class DistrictGenerator {
  /**
   * Generate all districts from a flat list of localities.
   * Only land localities with lat/lng coordinates participate in grouping;
   * water tiles are skipped.
   */
  static generate(localities: Locality[]): District[] {
    const landLocalities = localities.filter(
      p => p.lat !== undefined && p.lng !== undefined && !isWaterTerrain(p.terrain_type)
    )

    // Build a coordinate map from named localities (land + water) for neighbor lookups.
    // Generated ocean tiles use high-offset coords (x >= 10000) and are excluded here
    // because they never appear as neighbours of named localities in axial space.
    // A missing entry in this map means the cell is open water (ocean) — exactly the
    // condition we want to detect in the contiguity checker.
    const allByCoord = new Map<string, Locality>()
    for (const p of localities) {
      if (p.x < 10000 && p.y < 10000) {
        allByCoord.set(`${p.x},${p.y}`, p)
      }
    }

    // Group by (rootName, geographic_region)
    const groups = new Map<string, Locality[]>()
    for (const locality of landLocalities) {
      const rootName = this.getRootName(locality.name)
      const geoKey = locality.geographic_region ?? ''
      const key = `${rootName}|||${geoKey}`
      let list = groups.get(key)
      if (!list) { list = []; groups.set(key, list) }
      list.push(locality)
    }

    const result: District[] = []
    const usedIds = new Set<string>()

    for (const [key, group] of groups) {
      const sepIdx = key.indexOf('|||')
      const rootName = key.slice(0, sepIdx)
      const geo = (key.slice(sepIdx + 3) || undefined) as GeographicRegion | undefined
      const continent = group[0].continent

      if (group.length <= MAX_SINGLE_DISTRICT_SIZE) {
        const id = this.uniqueId(this.slugify(rootName), usedIds)
        usedIds.add(id)
        result.push(this.buildDistrict(id, rootName, group, geo, continent))
      } else {
        const k = Math.ceil(group.length / TARGET_CLUSTER_SIZE)
        const clusters = this.kMeansCluster(group, k)
        const named = this.nameClusters(rootName, clusters, geo, continent, usedIds)
        named.forEach(d => { usedIds.add(d.id); result.push(d) })
      }
    }

    // Contiguity rule: split any District whose localities form disconnected
    // components where at least one component does NOT border a water/ocean tile.
    const localityMap = new Map(landLocalities.map(p => [p.id, p]))
    const afterContiguity = this.enforceContiguity(result, localityMap, allByCoord, usedIds)

    // Hard requirement: merge any District with fewer than MIN_DISTRICT_SIZE
    // localities into geographic neighbors rather than failing at runtime.
    return this.mergeUndersized(afterContiguity, localityMap, allByCoord, usedIds)
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  /** Strip trailing number from locality name to get the root name. */
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

  private static centroid(localities: Locality[]): { lat: number; lng: number } {
    const lat = localities.reduce((s, p) => s + (p.lat ?? 0), 0) / localities.length
    const lng = localities.reduce((s, p) => s + (p.lng ?? 0), 0) / localities.length
    return { lat, lng }
  }

  private static buildDistrict(
    id: string,
    name: string,
    localities: Locality[],
    geo?: GeographicRegion,
    continent?: Continent,
  ): District {
    const { lat, lng } = this.centroid(localities)
    return {
      id,
      name,
      locality_ids: localities.map(p => p.id),
      geographic_region: geo,
      continent,
      centroid_lat: lat,
      centroid_lng: lng,
    }
  }

  /**
   * Cluster localities into k compact groups using k-means on lat/lng.
   *
   * Initialisation: k seeds are drawn at evenly-spaced positions from a
   * north-to-south sorted list — a lightweight k-means++ variant that spreads
   * seeds across the full extent of the locality group.
   *
   * Empty clusters (rare with well-spread seeds) are resolved by stealing the
   * most isolated locality from the largest cluster before updating centroids.
   *
   * The returned clusters are sorted north-to-south by centroid latitude so
   * that directional names (North / Central / South) remain meaningful.
   */
  private static kMeansCluster(localities: Locality[], k: number): Locality[][] {
    if (k <= 1) return [localities]
    if (localities.length <= k) return localities.map(p => [p])

    const MAX_ITER = 15
    const pts = localities.map(p => ({ lat: p.lat ?? 0, lng: p.lng ?? 0 }))

    // Seeds: evenly spaced from north→south sorted list
    const byLat = [...localities].sort((a, b) => (b.lat ?? 0) - (a.lat ?? 0))
    const step = byLat.length / k
    let centroids: Array<{ lat: number; lng: number }> = Array.from({ length: k }, (_, i) => {
      const p = byLat[Math.min(Math.round(i * step + step / 2), byLat.length - 1)]
      return { lat: p.lat ?? 0, lng: p.lng ?? 0 }
    })

    let assignments: number[] = new Array(localities.length).fill(0)

    for (let iter = 0; iter < MAX_ITER; iter++) {
      // Assignment: each locality → nearest centroid
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
    const clusters: Locality[][] = Array.from({ length: k }, () => [])
    localities.forEach((p, i) => clusters[assignments[i]].push(p))
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
    clusters: Locality[][],
    geo: GeographicRegion | undefined,
    continent: Continent | undefined,
    usedIds: Set<string>,
  ): District[] {
    const k = clusters.length
    const compassLabels = DIRECTION_LABELS[k]

    return clusters.map((cluster, i) => {
      const name = compassLabels
        ? `${compassLabels[i]} ${rootName}`   // "North Pas-de-Calais"
        : `${rootName} ${i + 1}`              // "Lapland 1"
      const id = this.uniqueId(this.slugify(name), usedIds)
      usedIds.add(id)
      return this.buildDistrict(id, name, cluster, geo, continent)
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
   * Returns true if the given locality borders at least one water/ocean tile.
   */
  private static bordersWater(locality: Locality, allByCoord: Map<string, Locality>): boolean {
    for (const [nx, ny] of this.hexNeighborCoords(locality.x, locality.y)) {
      const neighbor = allByCoord.get(`${nx},${ny}`)
      if (!neighbor) return true                      // empty cell = ocean
      if (isWaterTerrain(neighbor.terrain_type)) return true
    }
    return false
  }

  /**
   * Enforce the contiguity rule on a set of Districts.
   *
   * For each district, BFS through hex-adjacent localities within the district
   * to find connected components.  If all localities are reachable from each
   * other the district is contiguous and kept unchanged.
   *
   * If multiple components exist, each is tested for water adjacency:
   *   - If ALL components border a water tile the layout is valid (island
   *     groups, coastal archipelagos) and the district is kept.
   *   - If ANY component does NOT border water it is a landlocked exclave.
   *     Every component is then split into its own (potentially undersized)
   *     district so the subsequent mergeUndersized pass can absorb them.
   */
  private static enforceContiguity(
    districts: District[],
    localityMap: Map<string, Locality>,
    allByCoord: Map<string, Locality>,
    usedIds: Set<string>,
  ): District[] {
    const result: District[] = []
    let violationCount = 0

    for (const district of districts) {
      const localitySet = new Set(district.locality_ids)
      const localities = district.locality_ids
        .map(id => localityMap.get(id))
        .filter(Boolean) as Locality[]

      if (localities.length === 0) {
        result.push(district)
        continue
      }

      // BFS to find all connected components within this district
      const visited = new Set<string>()
      const components: Locality[][] = []

      for (const startLocality of localities) {
        if (visited.has(startLocality.id)) continue

        const component: Locality[] = []
        const queue: Locality[] = [startLocality]
        visited.add(startLocality.id)

        while (queue.length > 0) {
          const current = queue.shift()!
          component.push(current)

          for (const [nx, ny] of this.hexNeighborCoords(current.x, current.y)) {
            const neighbor = allByCoord.get(`${nx},${ny}`)
            if (!neighbor) continue
            if (visited.has(neighbor.id)) continue
            if (!localitySet.has(neighbor.id)) continue  // not in this district
            visited.add(neighbor.id)
            queue.push(neighbor)
          }
        }

        components.push(component)
      }

      // Single component → already contiguous
      if (components.length === 1) {
        result.push(district)
        continue
      }

      // Multiple components: check whether each borders water
      const waterFlags = components.map(comp =>
        comp.some(p => this.bordersWater(p, allByCoord))
      )

      const allBorderWater = waterFlags.every(Boolean)

      if (allBorderWater) {
        // All components are coastal/island — the non-contiguous layout is valid
        result.push(district)
        continue
      }

      // At least one landlocked exclave → violation; split every component
      violationCount++
      const landlockedComponents = components.filter((_, i) => !waterFlags[i])
      console.warn(
        `[ContiguityAudit] District "${district.name}" (${district.id}) has ` +
        `${components.length} disconnected components, ` +
        `${landlockedComponents.length} of which do not border any water tile. ` +
        `Splitting all components for re-merge.`
      )

      for (const component of components) {
        const splitId = this.uniqueId(this.slugify(district.name), usedIds)
        usedIds.add(splitId)
        result.push(
          this.buildDistrict(splitId, district.name, component, district.geographic_region, district.continent)
        )
      }
    }

    if (violationCount > 0) {
      console.warn(`[ContiguityAudit] ${violationCount} district(s) violated the contiguity rule and were split.`)
    } else {
      console.log('[ContiguityAudit] All districts pass the contiguity rule.')
    }

    return result
  }

  /**
   * Enforce MIN_DISTRICT_SIZE by merging undersized Districts.
   *
   * Pass 1 — re-cluster within geographic_region.
   * Pass 2 — absorb orphans into best-adjacent formed district.
   * Pass 3 — final sweep for any remaining undersized.
   */
  private static mergeUndersized(
    districts: District[],
    localityMap: Map<string, Locality>,
    allByCoord: Map<string, Locality>,
    usedIds: Set<string>,
  ): District[] {
    const adequate = districts.filter(d => d.locality_ids.length >= MIN_DISTRICT_SIZE)
    const small    = districts.filter(d => d.locality_ids.length <  MIN_DISTRICT_SIZE)

    if (small.length === 0) return districts

    // ── Pass 1: re-cluster by geographic_region ───────────────────────────
    type GeoEntry = { localities: Locality[]; geo?: GeographicRegion; continent?: Continent }
    const byGeo = new Map<string, GeoEntry>()

    for (const d of small) {
      const geoKey = d.geographic_region ?? '__none__'
      let entry = byGeo.get(geoKey)
      if (!entry) {
        entry = { localities: [], geo: d.geographic_region, continent: undefined }
        byGeo.set(geoKey, entry)
      }
      for (const lid of d.locality_ids) {
        const l = localityMap.get(lid)
        if (l) {
          entry.localities.push(l)
          if (!entry.continent) entry.continent = l.continent
        }
      }
    }

    const working: District[] = [...adequate]
    const orphans: Locality[] = []

    for (const [, { localities, geo, continent }] of byGeo) {
      if (localities.length >= MIN_DISTRICT_SIZE) {
        const maxK = Math.floor(localities.length / MIN_DISTRICT_SIZE)
        const k    = Math.min(Math.ceil(localities.length / TARGET_CLUSTER_SIZE), maxK)
        const regionName = this.formatGeoName(geo)

        if (k <= 1) {
          const id = this.uniqueId(this.slugify(regionName), usedIds)
          usedIds.add(id)
          working.push(this.buildDistrict(id, regionName, localities, geo, continent))
        } else {
          const clusters = this.kMeansCluster(localities, k)
          const named = this.nameClusters(regionName, clusters, geo, continent, usedIds)
          named.forEach(d => { usedIds.add(d.id); working.push(d) })
        }
      } else {
        orphans.push(...localities)
      }
    }

    // ── Pass 2: absorb orphans — prefer hex-adjacent district ─────────────
    const rebuildIndex = (): Map<string, number> => {
      const idx = new Map<string, number>()
      working.forEach((d, i) => d.locality_ids.forEach(lid => idx.set(lid, i)))
      return idx
    }

    let locToDistrictIdx = rebuildIndex()

    for (const locality of orphans) {
      if (working.length === 0) {
        const id = this.uniqueId(this.slugify(locality.name), usedIds)
        usedIds.add(id)
        working.push(this.buildDistrict(id, locality.name, [locality], locality.geographic_region, locality.continent))
        locToDistrictIdx = rebuildIndex()
        continue
      }

      // Try to find a hex-adjacent district — prefer the smallest
      let targetIdx = -1
      let targetSize = Infinity
      for (const [nx, ny] of this.hexNeighborCoords(locality.x, locality.y)) {
        const nb = allByCoord.get(`${nx},${ny}`)
        if (!nb) continue
        const di = locToDistrictIdx.get(nb.id)
        if (di === undefined) continue
        const size = working[di].locality_ids.length
        if (size < targetSize) { targetSize = size; targetIdx = di }
      }

      // Fallback: nearest centroid
      if (targetIdx === -1) {
        const lat = locality.lat ?? 0
        const lng = locality.lng ?? 0
        let minDist = Infinity
        for (let i = 0; i < working.length; i++) {
          const d = working[i]
          const dist = Math.hypot((d.centroid_lat ?? 0) - lat, (d.centroid_lng ?? 0) - lng)
          if (dist < minDist) { minDist = dist; targetIdx = i }
        }
      }

      const target      = working[targetIdx]
      const mergedIds   = [...target.locality_ids, locality.id]
      const mergedLocs  = mergedIds.map(id => localityMap.get(id)).filter(Boolean) as Locality[]
      working[targetIdx] = this.buildDistrict(
        target.id, target.name, mergedLocs, target.geographic_region, target.continent,
      )
      locToDistrictIdx.set(locality.id, targetIdx)
    }

    // ── Pass 3: final sweep for any remaining undersized ──────────────────
    let changed = true
    while (changed) {
      changed = false
      const smallIdx = working.findIndex(d => d.locality_ids.length < MIN_DISTRICT_SIZE)
      if (smallIdx === -1) break
      if (working.length === 1) break

      const removed = working.splice(smallIdx, 1)[0]
      changed = true

      const c = { lat: removed.centroid_lat ?? 0, lng: removed.centroid_lng ?? 0 }
      let nearestIdx = 0
      let minDist    = Infinity
      for (let i = 0; i < working.length; i++) {
        const d = working[i]
        const dist = Math.hypot((d.centroid_lat ?? 0) - c.lat, (d.centroid_lng ?? 0) - c.lng)
        if (dist < minDist) { minDist = dist; nearestIdx = i }
      }

      const target      = working[nearestIdx]
      const mergedIds   = [...target.locality_ids, ...removed.locality_ids]
      const mergedLocs  = mergedIds.map(id => localityMap.get(id)).filter(Boolean) as Locality[]
      working[nearestIdx] = this.buildDistrict(
        target.id, target.name, mergedLocs, target.geographic_region, target.continent,
      )
    }

    return working
  }
}

/** @deprecated Use DistrictGenerator instead */
export { DistrictGenerator as ProvinceRegionGenerator }
