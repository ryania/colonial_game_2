/**
 * OceanCurrentSystem.ts
 *
 * Defines major ocean currents as directional zones. When a sea/ocean edge
 * in the pathfinding graph runs in the same direction as a current, the
 * edge cost is multiplied by with_mult (< 1.0 = faster travel).
 *
 * This makes the Atlantic triangle trade routes naturally cheaper than
 * their reverse, allowing the triangle trade to emerge from supply/demand
 * and geography rather than hardcoded flow chains.
 */

interface OceanCurrent {
  id: string
  lat_min: number
  lat_max: number
  lng_min: number
  lng_max: number
  /** Normalized direction vector. N=+1, S=-1 for lat; E=+1, W=-1 for lng. */
  dir_lat: number
  dir_lng: number
  /** Cost multiplier when traveling WITH this current (< 1.0 = cheaper/faster). */
  with_mult: number
}

const OCEAN_CURRENTS: OceanCurrent[] = [
  // ── Atlantic ───────────────────────────────────────────────────────────────

  // North Atlantic Trade Winds: Portugal/West Africa → Caribbean (westward, tropics)
  // Ships run downwind from the Canaries to the Caribbean in 3-4 weeks.
  {
    id: 'n_atlantic_trade_winds',
    lat_min: 5, lat_max: 28,
    lng_min: -82, lng_max: 15,
    dir_lat: -0.1, dir_lng: -1.0,   // slightly south-westward
    with_mult: 0.52,
  },

  // Gulf Stream / North Atlantic Drift: Caribbean → British Isles (NE)
  // The return leg of the Atlantic circuit; Columbus and Spanish treasure fleets used it.
  {
    id: 'gulf_stream',
    lat_min: 20, lat_max: 62,
    lng_min: -82, lng_max: 18,
    dir_lat: 0.7, dir_lng: 0.7,    // north-eastward
    with_mult: 0.52,
  },

  // South Atlantic SE arm: Portugal/West Africa → Brazil (SW)
  // Used by Cabral to discover Brazil; natural sailing route.
  {
    id: 's_atlantic_se',
    lat_min: -42, lat_max: 8,
    lng_min: -52, lng_max: 22,
    dir_lat: -0.5, dir_lng: -0.87,  // south-westward
    with_mult: 0.63,
  },

  // South Atlantic NW return arm: Brazil / Cape of Good Hope → NE
  {
    id: 's_atlantic_nw',
    lat_min: -48, lat_max: -2,
    lng_min: -52, lng_max: 28,
    dir_lat: 0.5, dir_lng: 0.87,   // north-eastward
    with_mult: 0.63,
  },

  // ── Indian Ocean ───────────────────────────────────────────────────────────

  // Indian Ocean SW Monsoon (May–Sept): India/SE Asia → Arabia/East Africa
  {
    id: 'indian_sw_monsoon',
    lat_min: -5, lat_max: 28,
    lng_min: 42, lng_max: 95,
    dir_lat: 0.1, dir_lng: -1.0,   // westward
    with_mult: 0.62,
  },

  // Indian Ocean NE Monsoon (Oct–Apr): Arabia/East Africa → India/SE Asia
  {
    id: 'indian_ne_monsoon',
    lat_min: -5, lat_max: 28,
    lng_min: 42, lng_max: 95,
    dir_lat: -0.1, dir_lng: 1.0,   // eastward
    with_mult: 0.62,
  },

  // South Indian Ocean / Roaring Forties: Cape of Good Hope → Indian subcontinent (E)
  // The Portuguese Cape Route; enabled direct trade from Lisbon to Goa.
  {
    id: 's_indian_ocean',
    lat_min: -48, lat_max: 8,
    lng_min: 12, lng_max: 118,
    dir_lat: 0.1, dir_lng: 1.0,    // eastward
    with_mult: 0.60,
  },

  // ── Pacific ────────────────────────────────────────────────────────────────

  // Kuroshio Current: SE Asia / Philippines → Japan (NE)
  {
    id: 'kuroshio',
    lat_min: 8, lat_max: 48,
    lng_min: 108, lng_max: 175,
    dir_lat: 0.7, dir_lng: 0.7,    // north-eastward
    with_mult: 0.70,
  },
]

/**
 * Compute the ocean current cost multiplier for a sea/ocean edge.
 *
 * Returns a value in (0,1] — lower means faster (going with the current).
 * Returns 1.0 if no current applies or the edge goes against/across currents.
 *
 * Only apply this to edges where BOTH nodes are ocean or sea terrain.
 */
export function getOceanCurrentMult(
  fromLat: number, fromLng: number,
  toLat: number, toLng: number
): number {
  const dLat = toLat - fromLat
  const dLng = toLng - fromLng
  const len  = Math.sqrt(dLat * dLat + dLng * dLng)
  if (len === 0) return 1.0

  const normLat = dLat / len
  const normLng = dLng / len

  // Check the midpoint of the edge for current membership
  const midLat = (fromLat + toLat) * 0.5
  const midLng = (fromLng + toLng) * 0.5

  let bestMult = 1.0
  for (const c of OCEAN_CURRENTS) {
    if (midLat < c.lat_min || midLat > c.lat_max) continue
    if (midLng < c.lng_min || midLng > c.lng_max) continue

    // Dot product: positive means going WITH the current
    const dot = normLat * c.dir_lat + normLng * c.dir_lng
    if (dot > 0.3) {
      bestMult = Math.min(bestMult, c.with_mult)
    }
  }

  return bestMult
}
