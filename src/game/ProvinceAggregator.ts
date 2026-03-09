import { Locality, District, Province, GeographicRegion, Continent } from './types'

/**
 * Aggregates Districts into Provinces — the third tier of the land hierarchy.
 *
 * Land hierarchy:  Locality (hex) → District → Province → Realm (StateOwner)
 *
 * Province assignment strategy:
 *
 *   1. France (and other areas with `county` on their localities):
 *      - Each locality carries a `county` field (e.g. "Finistère", "Allier").
 *      - A district's province name is the dominant county among its localities.
 *      - All districts whose dominant county is the same are grouped into one
 *        Province named after that county.
 *
 *   2. All other areas (no county data):
 *      - Districts within the same `geographic_region` are grouped using
 *        k-means clustering on their centroid lat/lng coordinates.
 *      - Target: ~5–8 districts per province, named after the geographic
 *        region with optional directional prefixes (North, South, …).
 *
 * The result is a Province[] where each province carries `district_ids[]`
 * and geographic metadata.  The caller is responsible for stamping
 * `province_id` back onto each district and its member localities.
 */

const TARGET_PROVINCE_SIZE = 6    // ideal districts per province
const MIN_PROVINCE_SIZE    = 2    // hard minimum

const DIRECTION_LABELS: Record<number, string[]> = {
  2: ['North', 'South'],
  3: ['North', 'Central', 'South'],
  4: ['North', 'North Central', 'South Central', 'South'],
  5: ['Far North', 'North', 'Central', 'South', 'Far South'],
  6: ['Far North', 'North', 'Upper Central', 'Lower Central', 'South', 'Far South'],
}

export class ProvinceAggregator {
  /**
   * Generate Provinces from the given Districts and their member Localities.
   *
   * @param districts  All districts produced by DistrictGenerator.
   * @param localities All localities (used to read the `county` field).
   * @returns          Province[] with district_ids populated.
   */
  static aggregate(districts: District[], localities: Locality[]): Province[] {
    // Build a locality lookup map for county inspection
    const localityMap = new Map(localities.map(l => [l.id, l]))
    const usedIds = new Set<string>()
    const result: Province[] = []

    // Partition districts into those that have county data vs those that don't
    const countyDistricts: District[] = []
    const nonCountyByGeo  = new Map<string, District[]>()

    for (const district of districts) {
      const dominantCounty = this.dominantCounty(district, localityMap)
      if (dominantCounty) {
        // Tag district for county-based grouping
        ;(district as any).__county__ = dominantCounty
        countyDistricts.push(district)
      } else {
        const geoKey = district.geographic_region ?? '__none__'
        let list = nonCountyByGeo.get(geoKey)
        if (!list) { list = []; nonCountyByGeo.set(geoKey, list) }
        list.push(district)
      }
    }

    // ── County-based provinces (France, etc.) ────────────────────────────
    const byCounty = new Map<string, District[]>()
    for (const d of countyDistricts) {
      const county = (d as any).__county__ as string
      let list = byCounty.get(county)
      if (!list) { list = []; byCounty.set(county, list) }
      list.push(d)
    }

    for (const [county, dists] of byCounty) {
      const id = this.uniqueId(this.slugify(county), usedIds)
      usedIds.add(id)
      result.push(this.buildProvince(id, county, dists, dists[0].geographic_region, dists[0].continent))
    }

    // ── Geographic k-means provinces (non-county areas) ──────────────────
    for (const [, dists] of nonCountyByGeo) {
      if (dists.length === 0) continue
      const geo = dists[0].geographic_region
      const continent = dists[0].continent
      const geoLabel = this.formatGeoName(geo)

      if (dists.length <= TARGET_PROVINCE_SIZE) {
        // Small enough to be a single province
        const id = this.uniqueId(this.slugify(geoLabel), usedIds)
        usedIds.add(id)
        result.push(this.buildProvince(id, geoLabel, dists, geo, continent))
      } else {
        // Split into multiple provinces via k-means
        const k = Math.max(2, Math.round(dists.length / TARGET_PROVINCE_SIZE))
        const clusters = this.kMeansClusters(dists, k)
        const compassLabels = DIRECTION_LABELS[clusters.length]

        clusters.forEach((cluster, i) => {
          const name = compassLabels
            ? `${compassLabels[i]} ${geoLabel}`
            : `${geoLabel} ${i + 1}`
          const id = this.uniqueId(this.slugify(name), usedIds)
          usedIds.add(id)
          result.push(this.buildProvince(id, name, cluster, geo, continent))
        })
      }
    }

    // ── Merge undersized provinces ────────────────────────────────────────
    return this.mergeUndersized(result, usedIds)
  }

  // ─── Private helpers ────────────────────────────────────────────────────

  /**
   * Returns the most common non-empty `county` value among a district's
   * localities, or undefined if none have county data.
   */
  private static dominantCounty(
    district: District,
    localityMap: Map<string, Locality>,
  ): string | undefined {
    const counts = new Map<string, number>()
    for (const lid of district.locality_ids) {
      const loc = localityMap.get(lid)
      if (loc?.county) {
        counts.set(loc.county, (counts.get(loc.county) ?? 0) + 1)
      }
    }
    if (counts.size === 0) return undefined
    let best = ''
    let bestCount = 0
    for (const [county, count] of counts) {
      if (count > bestCount) { bestCount = count; best = county }
    }
    return best || undefined
  }

  private static buildProvince(
    id: string,
    name: string,
    districts: District[],
    geo?: GeographicRegion,
    continent?: Continent,
  ): Province {
    const lats = districts.map(d => d.centroid_lat ?? 0)
    const lngs = districts.map(d => d.centroid_lng ?? 0)
    return {
      id,
      name,
      district_ids: districts.map(d => d.id),
      geographic_region: geo,
      continent,
      centroid_lat: lats.reduce((s, v) => s + v, 0) / lats.length,
      centroid_lng: lngs.reduce((s, v) => s + v, 0) / lngs.length,
    }
  }

  /** k-means on district centroids; seeds spread north→south. */
  private static kMeansClusters(districts: District[], k: number): District[][] {
    if (k <= 1 || districts.length <= k) {
      if (k <= 1) return [districts]
      return districts.map(d => [d])
    }

    const MAX_ITER = 15
    const pts = districts.map(d => ({ lat: d.centroid_lat ?? 0, lng: d.centroid_lng ?? 0 }))
    const byLat = [...districts].sort((a, b) => (b.centroid_lat ?? 0) - (a.centroid_lat ?? 0))
    const step = byLat.length / k
    let centroids = Array.from({ length: k }, (_, i) => {
      const d = byLat[Math.min(Math.round(i * step + step / 2), byLat.length - 1)]
      return { lat: d.centroid_lat ?? 0, lng: d.centroid_lng ?? 0 }
    })

    let assignments = new Array(districts.length).fill(0)

    for (let iter = 0; iter < MAX_ITER; iter++) {
      const next = pts.map(pt => {
        let best = 0, bestDist = Infinity
        for (let c = 0; c < centroids.length; c++) {
          const d = Math.hypot(pt.lat - centroids[c].lat, pt.lng - centroids[c].lng)
          if (d < bestDist) { bestDist = d; best = c }
        }
        return best
      })

      const sums = Array.from({ length: k }, () => ({ lat: 0, lng: 0, count: 0 }))
      next.forEach((c, i) => { sums[c].lat += pts[i].lat; sums[c].lng += pts[i].lng; sums[c].count++ })

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

      const newCentroids = sums.map((s, i) =>
        s.count > 0 ? { lat: s.lat / s.count, lng: s.lng / s.count } : centroids[i]
      )

      const converged = newCentroids.every(
        (c, i) => Math.abs(c.lat - centroids[i].lat) < 1e-4 && Math.abs(c.lng - centroids[i].lng) < 1e-4
      )
      assignments = next
      centroids = newCentroids
      if (converged) break
    }

    const clusters: District[][] = Array.from({ length: k }, () => [])
    districts.forEach((d, i) => clusters[assignments[i]].push(d))
    const nonEmpty = clusters.filter(c => c.length > 0)
    nonEmpty.sort((a, b) => {
      const aLat = a.reduce((s, d) => s + (d.centroid_lat ?? 0), 0) / a.length
      const bLat = b.reduce((s, d) => s + (d.centroid_lat ?? 0), 0) / b.length
      return bLat - aLat
    })
    return nonEmpty
  }

  /** Merge provinces with fewer than MIN_PROVINCE_SIZE districts into nearest neighbor. */
  private static mergeUndersized(provinces: Province[], usedIds: Set<string>): Province[] {
    let changed = true
    const working = [...provinces]

    while (changed) {
      changed = false
      const smallIdx = working.findIndex(p => p.district_ids.length < MIN_PROVINCE_SIZE)
      if (smallIdx === -1 || working.length <= 1) break

      const removed = working.splice(smallIdx, 1)[0]
      changed = true

      const cLat = removed.centroid_lat ?? 0
      const cLng = removed.centroid_lng ?? 0
      let nearestIdx = 0
      let minDist = Infinity
      for (let i = 0; i < working.length; i++) {
        const dist = Math.hypot((working[i].centroid_lat ?? 0) - cLat, (working[i].centroid_lng ?? 0) - cLng)
        if (dist < minDist) { minDist = dist; nearestIdx = i }
      }

      const target = working[nearestIdx]
      const mergedDistrictIds = [...target.district_ids, ...removed.district_ids]
      const allLats = [...(target.centroid_lat ? [target.centroid_lat] : []), ...(removed.centroid_lat ? [removed.centroid_lat] : [])]
      const allLngs = [...(target.centroid_lng ? [target.centroid_lng] : []), ...(removed.centroid_lng ? [removed.centroid_lng] : [])]
      working[nearestIdx] = {
        ...target,
        district_ids: mergedDistrictIds,
        centroid_lat: allLats.reduce((s, v) => s + v, 0) / allLats.length,
        centroid_lng: allLngs.reduce((s, v) => s + v, 0) / allLngs.length,
      }
    }

    return working
  }

  private static slugify(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
  }

  private static uniqueId(base: string, used: Set<string>): string {
    if (!used.has(base)) return base
    let i = 2
    while (used.has(`${base}_${i}`)) i++
    return `${base}_${i}`
  }

  private static formatGeoName(geo?: GeographicRegion): string {
    if (!geo) return 'Unknown Region'
    return geo.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  }
}
