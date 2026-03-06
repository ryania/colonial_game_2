import { Region, ProvinceRegion, GeographicRegion, Continent, isWaterTerrain } from './types'

/**
 * Generates ProvinceRegion objects by grouping hex-tile provinces that share
 * the same root name (e.g. "Pas-de-Calais") and geographic region.
 *
 * Groups of ≤7 provinces become a single ProvinceRegion.  Larger groups are
 * sub-divided into clusters of ~5 using a lat/lng sort-and-slice strategy,
 * then given directional name prefixes (North, Central, South, etc.).
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
        const clusters = this.sortAndSlice(group, k)
        const named = this.nameClusters(rootName, clusters, geo, continent, usedIds)
        named.forEach(r => { usedIds.add(r.id); result.push(r) })
      }
    }

    // Hard requirement: every ProvinceRegion must contain at least MIN_REGION_SIZE provinces.
    const undersized = result.filter(r => r.province_ids.length < MIN_REGION_SIZE)
    if (undersized.length > 0) {
      const details = undersized
        .map(r => `"${r.name}" (${r.province_ids.length} province${r.province_ids.length === 1 ? '' : 's'})`)
        .join(', ')
      throw new Error(
        `ProvinceRegion minimum-size violation: each region must have at least ${MIN_REGION_SIZE} provinces. ` +
        `Undersized regions: ${details}`
      )
    }

    return result
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
   * Sort provinces north-to-south (lat desc) then west-to-east (lng asc)
   * and slice into k equal-ish chunks.  This produces latitudinal bands that
   * align naturally with "North / Central / South" naming.
   */
  private static sortAndSlice(provinces: Region[], k: number): Region[][] {
    const sorted = [...provinces].sort((a, b) => {
      const dLat = (b.lat ?? 0) - (a.lat ?? 0)
      if (Math.abs(dLat) > 0.001) return dLat
      return (a.lng ?? 0) - (b.lng ?? 0)
    })

    const chunkSize = Math.ceil(sorted.length / k)
    const clusters: Region[][] = []
    for (let i = 0; i < k; i++) {
      const chunk = sorted.slice(i * chunkSize, (i + 1) * chunkSize)
      if (chunk.length > 0) clusters.push(chunk)
    }
    return clusters
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
}
