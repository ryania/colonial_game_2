import { useEffect, useRef } from 'react'
import { mapManager, MAP_PROJECTION } from '../game/Map'
import { Region, TerrainType, SettlementTier, MapMode, Culture, ColonialEntity, GovernancePhase, StateOwner, TradeRoute, TradeCluster, TradeFlow, isWaterTerrain } from '../game/types'
import { riverSystem } from '../game/RiverSystem'
import { FOOD_GOODS, FOOD_SATIATION, FOOD_SPOILAGE_RATE } from '../game/TradeGoods'
import './GameBoard.css'

interface GroupLabel {
  text: string
  x: number       // world-space centroid X
  y: number       // world-space centroid Y
  hexCount: number
}

interface GameBoardProps {
  selectedRegionId: string | null
  onRegionSelect: (regionId: string) => void
  mapMode: MapMode
  colonialEntities: ColonialEntity[]
  stateOwners: StateOwner[]
  tradeRoutes?: TradeRoute[]
  tradeClusters?: TradeCluster[]
  tradeFlows?: TradeFlow[]
  onReady?: () => void
}

// Linear interpolation between two packed RGB hex colors
function lerpColor(from: number, to: number, t: number): number {
  const tc = Math.max(0, Math.min(1, t))
  const r1 = (from >> 16) & 0xff, g1 = (from >> 8) & 0xff, b1 = from & 0xff
  const r2 = (to >> 16) & 0xff,   g2 = (to >> 8) & 0xff,   b2 = to & 0xff
  const r = Math.round(r1 + (r2 - r1) * tc)
  const g = Math.round(g1 + (g2 - g1) * tc)
  const b = Math.round(b1 + (b2 - b1) * tc)
  return (r << 16) | (g << 8) | b
}

// Terrain-based fill/stroke colors
function getTerrainColors(terrainType: TerrainType, tier: SettlementTier): { fill: number; stroke: number; alpha: number } {
  switch (terrainType) {
    // Deep open ocean — darkest blue
    case 'ocean': return { fill: 0x0a1e3c, stroke: 0x1a3a5c, alpha: 1 }
    // Semi-enclosed salt water (Mediterranean, Caribbean, Black Sea, etc.)
    case 'sea':   return { fill: 0x1a4a80, stroke: 0x2a5a9c, alpha: 1 }
    // Coastal transitional zone
    case 'coast': return { fill: 0x1e5060, stroke: 0x2a6a7a, alpha: 1 }
    // Freshwater lakes — blue-green tint
    case 'lake':  return { fill: 0x1e6b5a, stroke: 0x2a8a6a, alpha: 1 }
    // Major navigable rivers — bright teal
    case 'river': return { fill: 0x2a7a8a, stroke: 0x3a8a9a, alpha: 1 }
    // Sandy coastal land — warm tan
    case 'beach':     return { fill: 0xc8a96e, stroke: 0xa88a50, alpha: 0.95 }
    // Open plains — bright yellow-green
    case 'flatlands': return { fill: 0x8ab84a, stroke: 0x6a9a30, alpha: 0.95 }
    // Cultivated agricultural land — warm yellow-green
    case 'farmlands': return { fill: 0x9ab040, stroke: 0x7a9020, alpha: 0.95 }
    // Rolling hills — muted olive green
    case 'hills':     return { fill: 0x7a8a44, stroke: 0x5a6a28, alpha: 0.95 }
    // Dense woodland — deep green
    case 'forest':    return { fill: 0x2e5e2e, stroke: 0x1a4a1a, alpha: 0.95 }
    // Boggy ground — dark muddy olive
    case 'bog':       return { fill: 0x4e5a30, stroke: 0x3a4420, alpha: 0.95 }
    // Swampland — murky dark green
    case 'swamp':     return { fill: 0x3a4e28, stroke: 0x263818, alpha: 0.95 }
    // Mountain terrain — grey-brown stone
    case 'mountains': return { fill: 0x7a7060, stroke: 0x5a5248, alpha: 0.95 }
    case 'island':
    case 'land':
    default: {
      const tierFill: Record<SettlementTier, number> = {
        unsettled:  0x3a3528,
        wilderness: 0x2d4a3a,
        village:    0x3d5a4a,
        town:       0x4d6a5a,
        city:       0x5d7a6a
      }
      return { fill: tierFill[tier], stroke: 0x4a5f8f, alpha: 0.9 }
    }
  }
}

const CULTURE_COLORS: Partial<Record<Culture, number>> = {
  Spanish:    0x8b1a1a,
  English:    0x1a2e8b,
  Irish:      0x2d8b4a,
  French:     0x6b1a8b,
  Portuguese: 0x1a6b2e,
  Dutch:      0xc87e1a,
  Flemish:    0x8b5a1a,
  German:     0x8b8b1a,
  Italian:    0x5a1a8b,
  Polish:     0xc81a1a,
  Swedish:    0x4a90c8,
  Danish:     0xc84a4a,
  Russian:    0x2e6b8b,
  Romanian:   0x8b6b1a,
  Serbian:    0x4a1a6b,
  Bulgarian:  0x1a4a8b,
  Bosnian:    0x6b8b1a,
  Albanian:   0x8b1a6b,
  Tatar:      0xc86b1a,
  Estonian:   0x1a8b8b,
  Ottoman:    0xc84a1a,
  Moroccan:   0x8b4a1a,
  Arab:       0xd4a017,
  Persian:    0x6b1a4a,
  Uyghur:     0x8b6b4a,
  Native:     0x6b4a1a,
  African:    0x1a5a5a,
  Swahili:    0x1a8b5a,
  Ethiopian:  0x4a8b1a,
  Somali:     0x8b8b4a,
  Malagasy:   0x4a6b8b,
  Amhara:     0x6b8b4a,
  Shona:      0x2a5a2a,
  Mbundu:     0x5a3a1a,
  Kikuyu:     0x3a6b3a,
  Afar:       0x8b4a4a,
  Bamileke:   0x4a4a8b,
  Wolof:      0x6b3a6b,
  Ewe:        0x3a6b6b,
  Hausa:      0x6b6b2a,
  Kongo:      0x2a4a6b,
  Nubian:     0x8b6b2a,
  Tigrinya:   0x4a8b8b,
  Akan:       0x8b5a2a,
  Indian:     0xe07b39,
  Mughal:     0x8b2a8b,
  Gujarati:   0xd48b1a,
  Marathi:    0xb85c1a,
  Telugu:     0x8b3a4a,
  Andamanese: 0x4a8b6b,
  Tibetan:    0x8b6b8b,
  Nepali:     0x4a6b4a,
  Bhutanese:  0x6b8b6b,
  Sikkimese:  0x8b8b6b,
  Malay:      0x2a8b6b,
  Dayak:      0x5a8b3a,
  Bugis:      0x3a6b5a,
  Vietnamese: 0xc84a6b,
  Khmer:      0x8b4a2a,
  Burman:     0x6b4a8b,
  Siamese:    0xd4a03a,
  Chinese:    0xc83a3a,
  Japanese:   0xc85a5a,
  Korean:     0x3a5a8b,
  Mongol:     0x8b6b3a,
  Manchu:     0x4a3a6b,
  Animist:    0x5a7a4a,
  Greek:      0x3a8bb5,
}

const TIER_COLORS: Record<SettlementTier, number> = {
  unsettled:  0x4a4030,
  wilderness: 0x5c4a2a,
  village:    0x6b8c42,
  town:       0xc87e1a,
  city:       0xd4a017,
}

const PHASE_SHADE: Record<GovernancePhase, number> = {
  early_settlement:    0.6,
  loose_confederation: 0.75,
  crown_consolidation: 0.85,
  mature_royal:        1.0,
  growing_tension:     1.2,
}

// Per-river packed RGB colors — used for connection lines in rivers map mode.
// Rivers are grouped by region; colors are distinct shades of blue/teal across the spectrum.
const RIVER_COLORS: Record<string, number> = {
  // Ireland
  'River Shannon':    0x1a6bcc,  // bright blue — longest Irish river
  'River Liffey':     0x3a9ad4,  // sky blue
  'River Lee':        0x1a5aaa,  // deep blue
  'River Barrow':     0x2a80c0,  // medium blue
  'River Nore':       0x3a72b8,  // slate blue
  'River Suir':       0x4a84c8,  // periwinkle blue
  'River Blackwater': 0x1a5898,  // dark navy blue
  'River Erne':       0x2a6ab0,  // steel blue
  'River Bann':       0x3a7cc0,  // cobalt blue
  // France
  'River Loire':      0x2a9abd,  // teal-blue — longest French river
  'River Seine':      0x1a7aaa,  // medium blue — Paris
  'River Rhône':      0x2a60b0,  // royal blue — Mediterranean artery
  'River Garonne':    0x4a90c0,  // sky blue — Bordeaux
  'River Meuse':      0x1a50a0,  // deep blue — Verdun to North Sea
  'River Moselle':    0x3a82c8,  // cornflower — wine river
  'River Saône':      0x2a75b5,  // medium blue — Burgundy
  // Germany / Holy Roman Empire
  'River Rhine':      0x0a4a9a,  // dark blue — the great trade river
  'River Elbe':       0x1a5888,  // dark steel — Hamburg
  'River Weser':      0x2a6888,  // muted blue — Bremen
  'River Main':       0x3a7890,  // steel teal — Frankfurt
  'River Neckar':     0x4a6880,  // slate — Heidelberg
  'River Ems':        0x3a7888,  // teal — Emden
  'River Danube':     0x1a3a8a,  // deep navy — Bavarian spine
  // Iberia
  'River Tagus':      0x1a6a9a,  // medium-dark blue — Lisbon
  'River Douro':      0x2a7888,  // teal — Porto wine valley
  'River Ebro':       0x3a88a0,  // blue-green — Zaragoza
  'River Guadalquivir':0x5a90a8, // lighter blue-teal — Seville / Americas trade
  'River Guadiana':   0x2a6880,  // dark teal — Spain-Portugal border
  'River Minho':      0x4a82a0,  // blue-gray — Galician border river
  // Italy
  'River Po':         0x1a70b0,  // azure — Po plain
  'River Arno':       0x3a88c0,  // lighter blue — Florence / Pisa
  'River Tiber':      0x2a5ea8,  // Roman blue — Rome
  'River Adige':      0x3a7ac0,  // bright blue — Brenner route
  // Low Countries
  'River Scheldt':    0x2a80b8,  // Dutch blue — Antwerp
}

// Distinct colors for each of the 22 trade clusters — used in trade map mode
export const TRADE_CLUSTER_COLORS: Record<string, number> = {
  iberia:           0xc83a3a,  // crimson
  france:           0x4a6ad4,  // royal blue
  british_isles:    0xd47a1a,  // amber
  low_countries:    0xe8a02a,  // gold
  mediterranean:    0x8a3ab8,  // violet
  ottoman:          0xc84a6a,  // rose
  baltic:           0x5ab4d4,  // sky blue
  russia:           0x2a7a4a,  // forest green
  north_africa:     0xd4a44a,  // sandy gold
  west_africa:      0x3aaa6a,  // emerald
  east_africa:      0x6a8a3a,  // olive
  southern_africa:  0x8a6a2a,  // bronze
  middle_east:      0xb85a3a,  // terracotta
  caribbean:        0x2ab4b4,  // teal
  central_america:  0x8ab43a,  // lime green
  eastern_seaboard: 0x3a6ab4,  // steel blue
  brazil:           0x4ac43a,  // bright green
  india_west:       0xe07b39,  // saffron
  india_east:       0xc4603a,  // burnt orange
  southeast_asia:   0x7a4ab4,  // purple
  spice_islands:    0xb43a8a,  // magenta
  china_japan:      0xd44a4a,  // red
}

function shadeColor(color: number, factor: number): number {
  const r = Math.min(255, Math.round(((color >> 16) & 0xff) * factor))
  const g = Math.min(255, Math.round(((color >> 8) & 0xff) * factor))
  const b = Math.min(255, Math.round((color & 0xff) * factor))
  return (r << 16) | (g << 8) | b
}

function getColorForMode(
  mode: MapMode,
  region: Region,
  minPop: number, maxPop: number,
  minWealth: number, maxWealth: number,
  entityById: Map<string, ColonialEntity>,
  ownerById: Map<string, StateOwner>,
  clusterById?: Map<string, TradeCluster>
): { fill: number; stroke: number; alpha: number } {
  if (isWaterTerrain(region.terrain_type)) {
    return getTerrainColors(region.terrain_type, region.settlement_tier)
  }

  const stroke = 0x000000
  const alpha = 0.9

  switch (mode) {
    case 'terrain':
      return getTerrainColors(region.terrain_type, region.settlement_tier)

    case 'population': {
      const range = maxPop - minPop
      const t = range > 0 ? (region.population.total - minPop) / range : 0
      return { fill: lerpColor(0x2d4a3a, 0xd4a44a, t), stroke, alpha }
    }

    case 'settlement':
      return { fill: TIER_COLORS[region.settlement_tier], stroke, alpha }

    case 'wealth': {
      const range = maxWealth - minWealth
      const t = range > 0 ? (region.wealth - minWealth) / range : 0
      return { fill: lerpColor(0x2e2416, 0xffd700, t), stroke, alpha }
    }

    case 'culture': {
      const dist = region.population.culture_distribution
      let dominantCulture: Culture | null = null
      let maxCount = 0
      for (const [culture, count] of Object.entries(dist) as [Culture, number][]) {
        if ((count ?? 0) > maxCount) { maxCount = count; dominantCulture = culture }
      }
      if (!dominantCulture) return getTerrainColors(region.terrain_type, region.settlement_tier)
      return { fill: CULTURE_COLORS[dominantCulture] ?? 0x555555, stroke, alpha }
    }

    case 'governance': {
      const entityId = region.colonial_entity_id
      if (!entityId) return getTerrainColors(region.terrain_type, region.settlement_tier)
      const entity = entityById.get(entityId)
      if (!entity) return getTerrainColors(region.terrain_type, region.settlement_tier)
      return { fill: shadeColor(entity.map_color, PHASE_SHADE[entity.governance_phase]), stroke, alpha }
    }

    case 'sovereignty': {
      // 1. Direct assignment — home territories (European homeland provinces)
      if (region.state_owner_id) {
        const owner = ownerById.get(region.state_owner_id)
        if (owner) return { fill: owner.map_color, stroke, alpha }
      }
      // 2. Colonial entity chain — colonial territories in Americas/Africa/Asia
      const entityId = region.colonial_entity_id
      if (!entityId) return getTerrainColors(region.terrain_type, region.settlement_tier)
      const entity = entityById.get(entityId)
      if (!entity?.state_owner_id) return getTerrainColors(region.terrain_type, region.settlement_tier)
      const owner = ownerById.get(entity.state_owner_id)
      if (!owner) return getTerrainColors(region.terrain_type, region.settlement_tier)
      return { fill: owner.map_color, stroke, alpha }
    }

    case 'rivers': {
      const hasRiver = (region.river_names?.length ?? 0) > 0
      const base = getTerrainColors(region.terrain_type, region.settlement_tier)
      if (hasRiver) {
        // Blend terrain color toward a river-blue wash to highlight river provinces
        return { fill: lerpColor(base.fill, 0x2a6aaa, 0.45), stroke: 0x1a4a7a, alpha: 0.95 }
      }
      // Dim provinces without any river
      return { fill: lerpColor(base.fill, 0x111111, 0.5), stroke: 0x0a0a0a, alpha: 0.6 }
    }

    case 'trade': {
      const clusterId = region.cluster_id
      if (!clusterId) {
        // Provinces not assigned to a cluster — dim them
        const base = getTerrainColors(region.terrain_type, region.settlement_tier)
        return { fill: lerpColor(base.fill, 0x111111, 0.55), stroke: 0x0a0a0a, alpha: 0.5 }
      }
      const clusterColor = TRADE_CLUSTER_COLORS[clusterId] ?? 0x555555
      // Shade by settlement tier: higher tier = brighter within the cluster color
      const tierBrightness: Record<SettlementTier, number> = {
        unsettled: 0.5, wilderness: 0.65, village: 0.8, town: 0.95, city: 1.1,
      }
      return {
        fill: shadeColor(clusterColor, tierBrightness[region.settlement_tier]),
        stroke: shadeColor(clusterColor, 0.5),
        alpha: 0.9,
      }
    }

    case 'food': {
      // Three-stop gradient: red (starving) → amber (struggling) → green (feast)
      // Bands: 0.0 = starvation, 0.75 = struggling, 1.0 = adequate, 1.5 = feast
      const sat = region.food_satisfaction ?? 1.0
      let fill: number
      if (sat <= 0.75) {
        // Dark red → amber
        const t = Math.max(0, sat / 0.75)
        fill = lerpColor(0x8b1a1a, 0xc87e1a, t)
      } else {
        // Amber → green
        const t = Math.min(1, (sat - 0.75) / 0.75)
        fill = lerpColor(0xc87e1a, 0x4aaa4a, t)
      }
      return { fill, stroke: 0x000000, alpha: 0.9 }
    }

    default:
      return getTerrainColors(region.terrain_type, region.settlement_tier)
  }
}

// Convert packed RGB integer to CSS hex string
function numToCSS(n: number): string {
  return '#' + n.toString(16).padStart(6, '0')
}

const HEX_SIZE = MAP_PROJECTION.hexSize
const COL_SPACING = HEX_SIZE * 1.5
const ROW_SPACING = HEX_SIZE * Math.sqrt(3)

// Snap a raw pixel coordinate to the nearest hex grid cell center
function snapToGrid(px: number, py: number): [number, number] {
  const col = Math.round(px / COL_SPACING)
  const row = Math.round((py - (col % 2 === 1 ? ROW_SPACING / 2 : 0)) / ROW_SPACING)
  return [
    col * COL_SPACING,
    row * ROW_SPACING + (col % 2 === 1 ? ROW_SPACING / 2 : 0)
  ]
}

// Convert lat/lng to grid-snapped world pixel position
function getWorldPos(region: Region): [number, number] | null {
  if (region.lat === undefined || region.lng === undefined) return null
  const [px, py] = MAP_PROJECTION.latLngToPixel(region.lat, region.lng)
  return snapToGrid(px, py)
}

// Pre-computed vertex offsets for a flat-top hex — eliminates 6 trig calls per hex per bake
const HEX_VERTICES: Array<[number, number]> = Array.from({ length: 6 }, (_, i) => [
  HEX_SIZE * Math.cos((Math.PI / 3) * i),
  HEX_SIZE * Math.sin((Math.PI / 3) * i),
])

// Add a flat-top hex path to the current canvas path (no stroke/fill — caller does that)
function hexPath(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  ctx.beginPath()
  ctx.moveTo(cx + HEX_VERTICES[0][0], cy + HEX_VERTICES[0][1])
  for (let i = 1; i < 6; i++) {
    ctx.lineTo(cx + HEX_VERTICES[i][0], cy + HEX_VERTICES[i][1])
  }
  ctx.closePath()
}

// Render all hexes into the provided offscreen canvas under the given map mode.
// This is called once at startup (terrain mode) and again whenever mapMode changes.
function bakeOffscreen(
  offscreen: HTMLCanvasElement,
  allRegions: Region[],
  hexCenters: Map<string, { x: number; y: number }>,
  mode: MapMode,
  colonialEntities: ColonialEntity[],
  stateOwners: StateOwner[],
  tradeClusters?: TradeCluster[]
): void {
  const ctx = offscreen.getContext('2d')!
  ctx.fillStyle = '#0a0e27'
  ctx.fillRect(0, 0, offscreen.width, offscreen.height)

  const landRegions = allRegions.filter(r => !isWaterTerrain(r.terrain_type))
  const popValues = landRegions.map(r => r.population.total)
  const wealthValues = landRegions.map(r => r.wealth)
  const minPop    = popValues.length    ? Math.min(...popValues)    : 0
  const maxPop    = popValues.length    ? Math.max(...popValues)    : 1
  const minWealth = wealthValues.length ? Math.min(...wealthValues) : 0
  const maxWealth = wealthValues.length ? Math.max(...wealthValues) : 1

  const entityById  = new Map(colonialEntities.map(e => [e.id, e]))
  const ownerById   = new Map(stateOwners.map(o => [o.id, o]))
  const clusterById = tradeClusters ? new Map(tradeClusters.map(c => [c.id, c])) : undefined

  // Stroke alpha varies by mode: gradient modes (population/wealth) get a lighter border
  // so the continuous colour ramp isn't broken up; discrete modes get a more visible border.
  const strokeAlpha = (mode === 'population' || mode === 'wealth') ? 0.22 : 0.50
  ctx.lineWidth = 0.8

  allRegions.forEach(region => {
    const center = hexCenters.get(region.id)
    if (!center) return

    const { fill, stroke, alpha } = getColorForMode(
      mode, region, minPop, maxPop, minWealth, maxWealth, entityById, ownerById, clusterById
    )

    hexPath(ctx, center.x, center.y)
    ctx.globalAlpha = alpha
    ctx.fillStyle = numToCSS(fill)
    ctx.fill()
    ctx.strokeStyle = numToCSS(stroke)
    ctx.globalAlpha = strokeAlpha
    ctx.stroke()
    ctx.globalAlpha = 1
  })

  // River mode: draw connection lines between river-linked province centers
  if (mode === 'rivers') {
    ctx.lineCap   = 'round'
    ctx.lineWidth = 3
    ctx.globalAlpha = 0.92

    for (const conn of riverSystem.getConnections()) {
      const from = hexCenters.get(conn.from_id)
      const to   = hexCenters.get(conn.to_id)
      if (!from || !to) continue

      const color = RIVER_COLORS[conn.river_name] ?? 0x2a6acc
      ctx.strokeStyle = numToCSS(color)
      ctx.beginPath()
      ctx.moveTo(from.x, from.y)
      ctx.lineTo(to.x, to.y)
      ctx.stroke()
    }

    ctx.globalAlpha = 1
    ctx.lineCap = 'butt'
  }

  // Trade mode: draw cluster anchor markers and proximity borders
  if (mode === 'trade' && tradeClusters) {
    ctx.globalAlpha = 1

    // Draw anchor province markers (diamond + ring)
    for (const cluster of tradeClusters) {
      const anchorCenter = hexCenters.get(cluster.anchor_province_id)
      if (!anchorCenter) continue
      const color = TRADE_CLUSTER_COLORS[cluster.id] ?? 0x555555

      // Outer glow
      ctx.beginPath()
      ctx.arc(anchorCenter.x, anchorCenter.y, HEX_SIZE * 2.5, 0, Math.PI * 2)
      ctx.fillStyle = numToCSS(color)
      ctx.globalAlpha = 0.2
      ctx.fill()

      // Inner ring
      ctx.beginPath()
      ctx.arc(anchorCenter.x, anchorCenter.y, HEX_SIZE * 1.5, 0, Math.PI * 2)
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      ctx.globalAlpha = 0.9
      ctx.stroke()

      // Center diamond
      const ds = HEX_SIZE * 0.8
      ctx.beginPath()
      ctx.moveTo(anchorCenter.x, anchorCenter.y - ds)
      ctx.lineTo(anchorCenter.x + ds, anchorCenter.y)
      ctx.lineTo(anchorCenter.x, anchorCenter.y + ds)
      ctx.lineTo(anchorCenter.x - ds, anchorCenter.y)
      ctx.closePath()
      ctx.fillStyle = numToCSS(shadeColor(color, 1.3))
      ctx.globalAlpha = 0.95
      ctx.fill()
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 1
      ctx.stroke()
    }

    ctx.globalAlpha = 1
  }

  // --- Province-region perimeter borders ---
  // For every edge shared by two land hexes that belong to different province regions,
  // overdraw a bolder stroke so region boundaries are distinct in all map modes.
  {
    // Each entry: [axial-Δx, axial-Δy, vertexA, vertexB]
    // Maps each of the 6 neighbor directions to the two HEX_VERTICES that form their shared edge.
    // Derived from flat-top hex axial coordinate geometry (x = q, y = r).
    const BORDER_EDGES = [
      [ 1,  0, 0, 1],  // E  (q+1, r  ) → edge V0–V1
      [-1,  0, 3, 4],  // W  (q-1, r  ) → edge V3–V4
      [ 0,  1, 1, 2],  // SE (q,   r+1) → edge V1–V2
      [ 0, -1, 4, 5],  // NW (q,   r-1) → edge V4–V5
      [ 1, -1, 5, 0],  // NE (q+1, r-1) → edge V5–V0
      [-1,  1, 2, 3],  // SW (q-1, r+1) → edge V2–V3
    ] as const

    ctx.lineWidth   = 1
    ctx.lineCap     = 'round'
    ctx.strokeStyle = '#0d0800'
    ctx.globalAlpha = 0.78

    for (const region of allRegions) {
      if (isWaterTerrain(region.terrain_type)) continue
      if (!region.province_region_id) continue
      const center = hexCenters.get(region.id)
      if (!center) continue

      for (const [dx, dy, vA, vB] of BORDER_EDGES) {
        const nb = mapManager.getRegionByCoord(region.x + dx, region.y + dy)
        if (!nb || isWaterTerrain(nb.terrain_type)) continue
        if (!nb.province_region_id) continue
        if (nb.province_region_id === region.province_region_id) continue

        ctx.beginPath()
        ctx.moveTo(center.x + HEX_VERTICES[vA][0], center.y + HEX_VERTICES[vA][1])
        ctx.lineTo(center.x + HEX_VERTICES[vB][0], center.y + HEX_VERTICES[vB][1])
        ctx.stroke()
      }
    }

    ctx.globalAlpha = 1
    ctx.lineCap     = 'butt'
  }
}

function computeGroupLabels(
  mode: MapMode,
  landRegions: Region[],
  hexCenters: Map<string, { x: number; y: number }>,
  colonialEntities: ColonialEntity[],
  stateOwners: StateOwner[],
  tradeClusters?: TradeCluster[]
): GroupLabel[] {
  // Gradient and overlay modes have no meaningful discrete groups
  if (mode === 'population' || mode === 'wealth' || mode === 'rivers' || mode === 'food') return []

  const entityMap  = new Map(colonialEntities.map(e => [e.id, e]))
  const ownerMap   = new Map(stateOwners.map(o => [o.id, o]))
  const clusterMap = tradeClusters ? new Map(tradeClusters.map(c => [c.id, c])) : new Map<string, TradeCluster>()

  function getKey(r: Region): string | undefined {
    switch (mode) {
      case 'terrain':     return r.terrain_type
      case 'owner':       return r.owner_culture
      case 'settlement':  return r.settlement_tier
      case 'governance':  return r.colonial_entity_id ?? undefined
      case 'sovereignty': {
        if (r.state_owner_id) return r.state_owner_id
        const eid = r.colonial_entity_id
        if (!eid) return undefined
        return entityMap.get(eid)?.state_owner_id ?? undefined
      }
      case 'trade':       return r.cluster_id ?? undefined
      default:            return undefined
    }
  }

  function getLabel(key: string): string {
    switch (mode) {
      case 'governance':
        return entityMap.get(key)?.name ?? key
      case 'sovereignty':
        return ownerMap.get(key)?.short_name ?? key
      case 'trade':
        return clusterMap.get(key)?.name ?? key.charAt(0).toUpperCase() + key.slice(1)
      default:
        return key.charAt(0).toUpperCase() + key.slice(1)
    }
  }

  const visited = new Set<string>()
  const labels: GroupLabel[] = []

  for (const region of landRegions) {
    if (visited.has(region.id)) continue
    const key = getKey(region)
    if (!key) { visited.add(region.id); continue }

    // BFS flood-fill: collect contiguous regions sharing the same key
    const queue = [region]
    const component: Region[] = []
    visited.add(region.id)

    while (queue.length > 0) {
      const current = queue.shift()!
      component.push(current)
      for (const neighbor of mapManager.getNeighbors(current.id)) {
        if (visited.has(neighbor.id)) continue
        if (isWaterTerrain(neighbor.terrain_type)) { visited.add(neighbor.id); continue }
        if (getKey(neighbor) !== key) { visited.add(neighbor.id); continue }
        visited.add(neighbor.id)
        queue.push(neighbor)
      }
    }

    // Skip tiny groups to avoid noise
    if (component.length < 3) continue

    // Centroid = average of hex center positions
    let sumX = 0, sumY = 0, count = 0
    for (const r of component) {
      const c = hexCenters.get(r.id)
      if (c) { sumX += c.x; sumY += c.y; count++ }
    }
    if (count === 0) continue

    labels.push({
      text:     getLabel(key),
      x:        sumX / count,
      y:        sumY / count,
      hexCount: component.length
    })
  }

  return labels
}

export default function GameBoard({ selectedRegionId, onRegionSelect, mapMode, colonialEntities, stateOwners, tradeRoutes, tradeClusters, tradeFlows, onReady }: GameBoardProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const offscreenRef = useRef<HTMLCanvasElement | null>(null)

  // Camera state — mutated directly to avoid triggering React re-renders
  const scrollRef = useRef({ x: 0, y: 0 })
  const zoomRef   = useRef(1)
  const cameraInitRef = useRef(false)

  // Drag tracking
  const dragRef = useRef<{ startX: number; startY: number; startScrollX: number; startScrollY: number } | null>(null)

  // Province data
  const hexCentersRef   = useRef<Map<string, { x: number; y: number }>>(new Map())
  const allRegionsRef   = useRef<Region[]>([])
  const namedRegionsRef = useRef<Region[]>([])
  const groupLabelsRef  = useRef<GroupLabel[]>([])

  // Rendering
  const dirtyRef         = useRef(true)
  const rafRef           = useRef<number | null>(null)
  const hasCalledReadyRef = useRef(false)

  // Stable refs so Phaser-style callbacks always see latest values
  const selectedRegionIdRef  = useRef(selectedRegionId)
  const onRegionSelectRef    = useRef(onRegionSelect)
  const colonialEntitiesRef  = useRef(colonialEntities)
  const stateOwnersRef       = useRef(stateOwners)
  const tradeRoutesRef       = useRef<TradeRoute[]>([])
  const tradeClustersRef     = useRef<TradeCluster[]>([])
  const tradeFlowsRef        = useRef<TradeFlow[]>([])
  const mapModeRef           = useRef<MapMode>(mapMode)
  const onReadyRef           = useRef(onReady)
  const mousePosRef          = useRef<{ x: number, y: number } | null>(null)

  // Map tooltip (shared between trade cluster + food province hover)
  const tooltipRef                 = useRef<HTMLDivElement>(null)
  const regionByIdRef              = useRef<Map<string, Region>>(new Map())
  const currentTooltipClusterIdRef = useRef<string | null>(null)
  const currentFoodHoverRegionIdRef = useRef<string | null>(null)

  onRegionSelectRef.current   = onRegionSelect
  selectedRegionIdRef.current = selectedRegionId
  colonialEntitiesRef.current = colonialEntities
  stateOwnersRef.current      = stateOwners
  mapModeRef.current          = mapMode
  onReadyRef.current          = onReady

  // Update trade routes ref and mark dirty when routes change
  if (tradeRoutes !== undefined && tradeRoutes !== tradeRoutesRef.current) {
    tradeRoutesRef.current = tradeRoutes
    dirtyRef.current = true
  }
  if (tradeClusters !== undefined && tradeClusters !== tradeClustersRef.current) {
    tradeClustersRef.current = tradeClusters
    dirtyRef.current = true
  }
  if (tradeFlows !== undefined && tradeFlows !== tradeFlowsRef.current) {
    tradeFlowsRef.current = tradeFlows
    dirtyRef.current = true
  }

  // --- Effect 1: Build hex center map and bake the initial offscreen canvas ---
  useEffect(() => {
    const allRegions   = mapManager.getAllRegions()
    const namedRegions = allRegions.filter(r => r.terrain_type !== 'ocean')
    allRegionsRef.current   = allRegions
    namedRegionsRef.current = namedRegions

    allRegions.forEach(region => {
      const pos = getWorldPos(region)
      if (pos) hexCentersRef.current.set(region.id, { x: pos[0], y: pos[1] })
    })
    regionByIdRef.current = new Map(allRegions.map(r => [r.id, r]))

    const { worldWidth, worldHeight } = MAP_PROJECTION
    const offscreen = document.createElement('canvas')
    offscreen.width  = worldWidth
    offscreen.height = worldHeight
    bakeOffscreen(offscreen, allRegions, hexCentersRef.current, 'terrain', [], [], [])
    offscreenRef.current = offscreen
    groupLabelsRef.current = computeGroupLabels('terrain', namedRegions.filter((r: Region) => !isWaterTerrain(r.terrain_type)), hexCentersRef.current, [], [], [])
    dirtyRef.current = true

    return () => {
      offscreenRef.current = null
      hexCentersRef.current.clear()
      regionByIdRef.current.clear()
      allRegionsRef.current   = []
      namedRegionsRef.current = []
      groupLabelsRef.current  = []
    }
  }, [])

  // --- Effect 2: Rebake offscreen canvas when mapMode or entity/owner/trade data changes ---
  useEffect(() => {
    if (!offscreenRef.current || allRegionsRef.current.length === 0) return
    bakeOffscreen(
      offscreenRef.current,
      allRegionsRef.current,
      hexCentersRef.current,
      mapMode,
      colonialEntitiesRef.current,
      stateOwnersRef.current,
      tradeClustersRef.current
    )
    groupLabelsRef.current = computeGroupLabels(
      mapMode,
      allRegionsRef.current.filter((r: Region) => !isWaterTerrain(r.terrain_type)),
      hexCentersRef.current,
      colonialEntitiesRef.current,
      stateOwnersRef.current,
      tradeClustersRef.current
    )
    dirtyRef.current = true
  }, [mapMode, colonialEntities, stateOwners, tradeClusters])

  // --- Effect 3: Mark dirty when selection changes (selection ring is drawn at render time) ---
  useEffect(() => {
    dirtyRef.current = true
  }, [selectedRegionId])

  // --- Render loop: runs every rAF, only redraws when dirty ---
  useEffect(() => {
    function render() {
      rafRef.current = requestAnimationFrame(render)

      const canvas = canvasRef.current
      if (!canvas || !dirtyRef.current) return
      dirtyRef.current = false

      const ctx = canvas.getContext('2d')!
      const { worldWidth } = MAP_PROJECTION
      const { x: scrollX, y: scrollY } = scrollRef.current
      const zoom = zoomRef.current

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.save()
      ctx.scale(zoom, zoom)
      ctx.translate(-scrollX, -scrollY)

      // Three copies of the baked map — center plus ±worldWidth ghost copies for seamless horizontal wrap
      if (offscreenRef.current) {
        ctx.drawImage(offscreenRef.current,  0,          0)
        ctx.drawImage(offscreenRef.current, -worldWidth, 0)
        ctx.drawImage(offscreenRef.current,  worldWidth, 0)
      }

      // Trade visualization — style depends on current map mode
      const currentMapMode = mapModeRef.current
      const flows = tradeFlowsRef.current
      const routes = tradeRoutesRef.current

      if (currentMapMode === 'trade' && flows.length > 0) {
        // ── Trade mode: rich flow visualization ──
        // Aggregate flows between cluster pairs to get total value per route
        const routeValues = new Map<string, { value: number; pathIds: string[] }>()
        for (const flow of flows) {
          const key = `${flow.from_cluster_id}→${flow.to_cluster_id}`
          const existing = routeValues.get(key)
          if (existing) {
            existing.value += flow.value
          } else {
            routeValues.set(key, { value: flow.value, pathIds: flow.path_region_ids ?? [] })
          }
        }

        // Find max value for normalization
        let maxVal = 0
        for (const rv of routeValues.values()) {
          if (rv.value > maxVal) maxVal = rv.value
        }
        if (maxVal === 0) maxVal = 1

        const { worldWidth: ww } = MAP_PROJECTION
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'

        for (const [key, { value, pathIds }] of routeValues) {
          if (pathIds.length < 2) continue

          // Collect pixel centers for this route's path
          const points: { x: number; y: number }[] = []
          for (const rid of pathIds) {
            const c = hexCentersRef.current.get(rid)
            if (c) points.push(c)
          }
          if (points.length < 2) continue

          // Line thickness: 1-6px world-space, proportional to value
          const t = value / maxVal
          const lineWidth = 1 + t * 5

          // Color: blend from dim amber to bright gold based on value
          const fromClusterId = key.split('→')[0]
          const routeColor = TRADE_CLUSTER_COLORS[fromClusterId] ?? 0xd4a017
          const alpha = 0.5 + t * 0.4

          // Draw three copies for horizontal wrap
          for (const offsetX of [0, -ww, ww]) {
            const x0 = (points[0].x + offsetX - scrollX) * zoom
            const xN = (points[points.length - 1].x + offsetX - scrollX) * zoom
            if (Math.min(x0, xN) > canvas.width + 300 || Math.max(x0, xN) < -300) continue

            // Draw the route line
            ctx.strokeStyle = numToCSS(routeColor)
            ctx.lineWidth = lineWidth
            ctx.globalAlpha = alpha

            ctx.beginPath()
            ctx.moveTo(points[0].x + offsetX, points[0].y)
            for (let i = 1; i < points.length; i++) {
              ctx.lineTo(points[i].x + offsetX, points[i].y)
            }
            ctx.stroke()

            // Draw arrowhead at destination (last segment)
            const lastIdx = points.length - 1
            const prevIdx = Math.max(0, lastIdx - 3) // use a few-segment look-back for stable direction
            const dx = points[lastIdx].x - points[prevIdx].x
            const dy = points[lastIdx].y - points[prevIdx].y
            const angle = Math.atan2(dy, dx)
            const arrowLen = 4 + t * 6
            const arrowWidth = 3 + t * 4
            const tipX = points[lastIdx].x + offsetX
            const tipY = points[lastIdx].y

            ctx.fillStyle = numToCSS(shadeColor(routeColor, 1.3))
            ctx.globalAlpha = alpha + 0.15
            ctx.beginPath()
            ctx.moveTo(tipX, tipY)
            ctx.lineTo(
              tipX - arrowLen * Math.cos(angle) + arrowWidth * Math.sin(angle),
              tipY - arrowLen * Math.sin(angle) - arrowWidth * Math.cos(angle)
            )
            ctx.lineTo(
              tipX - arrowLen * Math.cos(angle) - arrowWidth * Math.sin(angle),
              tipY - arrowLen * Math.sin(angle) + arrowWidth * Math.cos(angle)
            )
            ctx.closePath()
            ctx.fill()
          }
        }

        ctx.globalAlpha = 1
        ctx.lineCap = 'butt'
        ctx.lineJoin = 'miter'
      } else if (routes.length > 0) {
        // ── Non-trade modes: simple gold polylines (existing behavior) ──
        const { worldWidth: ww } = MAP_PROJECTION
        ctx.lineWidth = 1.5 / zoom
        ctx.globalAlpha = 0.7

        for (const route of routes) {
          const pathIds = route.path_region_ids
          if (!pathIds || pathIds.length < 2) continue

          const points: { x: number; y: number }[] = []
          for (const rid of pathIds) {
            const c = hexCentersRef.current.get(rid)
            if (c) points.push(c)
          }
          if (points.length < 2) continue

          for (const offsetX of [0, -ww, ww]) {
            const x0 = (points[0].x + offsetX - scrollX) * zoom
            const xN = (points[points.length - 1].x + offsetX - scrollX) * zoom
            if (Math.min(x0, xN) > canvas.width + 200 || Math.max(x0, xN) < -200) continue

            ctx.strokeStyle = '#d4a017'
            ctx.beginPath()
            ctx.moveTo(points[0].x + offsetX, points[0].y)
            for (let i = 1; i < points.length; i++) {
              ctx.lineTo(points[i].x + offsetX, points[i].y)
            }
            ctx.stroke()
          }
        }

        ctx.globalAlpha = 1
      }

      // Group labels — one label per contiguous block of same-keyed regions
      if (zoom >= 0.4 && groupLabelsRef.current.length > 0) {
        ctx.textAlign    = 'center'
        ctx.textBaseline = 'middle'

        for (const label of groupLabelsRef.current) {
          // Viewport cull
          const sx = (label.x - scrollX) * zoom
          const sy = (label.y - scrollY) * zoom
          if (sx < -150 || sx > canvas.width  + 150) continue
          if (sy < -30  || sy > canvas.height + 30 ) continue

          // Font size scales with group area; world-space so it zooms naturally
          const fontSize = Math.min(14, Math.max(6, Math.sqrt(label.hexCount) * 1.5))
          ctx.font = `bold ${fontSize}px Arial`

          // Dark outline for readability on any background
          ctx.strokeStyle = 'rgba(0,0,0,0.75)'
          ctx.lineWidth   = fontSize * 0.3
          ctx.lineJoin    = 'round'
          ctx.strokeText(label.text, label.x, label.y)

          ctx.fillStyle = '#ffffff'
          ctx.fillText(label.text, label.x, label.y)
        }

        ctx.textBaseline = 'alphabetic'
      }

      // Hover hex-grid ripple effect — grid is hidden in the baked canvas and only
      // revealed dynamically here, with a smooth alpha falloff + circular clip that
      // produces "fractional" hex outlines at the edge of the cursor's influence.
      const mousePos = mousePosRef.current
      if (mousePos) {
        const rect    = canvas.getBoundingClientRect()
        const screenX = mousePos.x - rect.left
        const screenY = mousePos.y - rect.top
        const worldX  = screenX / zoom + scrollX
        const worldY  = screenY / zoom + scrollY

        const HOVER_RADIUS = HEX_SIZE * 9          // world-space reach of the ripple
        const { worldWidth: ww } = MAP_PROJECTION

        // Circular clip creates genuine fractional hexes at the boundary
        ctx.save()
        ctx.beginPath()
        ctx.arc(worldX, worldY, HOVER_RADIUS, 0, Math.PI * 2)
        ctx.clip()

        ctx.lineWidth = 0.9 / zoom

        let nearestX    = 0
        let nearestY    = 0
        let nearestDist = Infinity

        for (const [, center] of hexCentersRef.current) {
          for (const offsetX of [0, -ww, ww]) {
            const cx  = center.x + offsetX
            const ddx = worldX - cx
            const ddy = worldY - center.y
            const dist = Math.sqrt(ddx * ddx + ddy * ddy)
            if (dist > HOVER_RADIUS) continue

            if (dist < nearestDist) {
              nearestDist = dist
              nearestX    = cx
              nearestY    = center.y
            }

            // Smooth power-curve falloff: full brightness at center, fades to 0 at edge
            const t     = 1 - dist / HOVER_RADIUS
            const alpha = Math.pow(t, 1.5) * 0.85

            ctx.globalAlpha = alpha
            hexPath(ctx, cx, center.y)
            ctx.strokeStyle = '#b8d8ff'
            ctx.stroke()
          }
        }

        ctx.globalAlpha = 1
        ctx.restore() // remove circular clip

        // Extra bright outline on the hex closest to cursor
        if (nearestDist < HEX_SIZE * 2) {
          hexPath(ctx, nearestX, nearestY)
          ctx.strokeStyle = '#e8f4ff'
          ctx.lineWidth   = 1.5 / zoom
          ctx.globalAlpha = 0.95
          ctx.stroke()
          ctx.globalAlpha = 1
        }
      }

      // Selection ring drawn on top of everything
      const selId = selectedRegionIdRef.current
      if (selId) {
        const center = hexCentersRef.current.get(selId)
        if (center) {
          hexPath(ctx, center.x, center.y)
          ctx.strokeStyle = '#ff6b8a'
          ctx.lineWidth = 3 / zoom
          ctx.stroke()
        }
      }

      ctx.restore()

      // Signal that the first frame has been drawn to the visible canvas
      if (!hasCalledReadyRef.current) {
        hasCalledReadyRef.current = true
        onReadyRef.current?.()
      }
    }

    rafRef.current = requestAnimationFrame(render)
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current) }
  }, [])

  // --- Canvas sizing: match canvas pixel dimensions to its CSS display size ---
  useEffect(() => {
    const container = containerRef.current
    const canvas    = canvasRef.current
    if (!container || !canvas) return

    const resize = (width: number, height: number) => {
      canvas.width  = width
      canvas.height = height
      // Center the initial camera view once we know canvas dimensions
      if (!cameraInitRef.current && width > 0 && height > 0) {
        const zoom = zoomRef.current
        scrollRef.current = {
          x: MAP_PROJECTION.initialCameraX() - width  / (2 * zoom),
          y: MAP_PROJECTION.initialCameraY() - height / (2 * zoom),
        }
        cameraInitRef.current = true
      }
      dirtyRef.current = true
    }

    const observer = new ResizeObserver(entries => {
      for (const entry of entries) resize(entry.contentRect.width, entry.contentRect.height)
    })
    observer.observe(container)
    resize(container.clientWidth, container.clientHeight)

    return () => observer.disconnect()
  }, [])

  // --- Wheel zoom: must be a non-passive native listener so preventDefault works ---
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()

      const rect    = canvas.getBoundingClientRect()
      const screenX = e.clientX - rect.left
      const screenY = e.clientY - rect.top
      const oldZoom = zoomRef.current
      const newZoom = Math.max(0.3, Math.min(8, oldZoom - e.deltaY * 0.001))

      // Zoom toward pointer: keep the world point under the cursor stationary
      const worldX = screenX / oldZoom + scrollRef.current.x
      const worldY = screenY / oldZoom + scrollRef.current.y
      scrollRef.current = {
        x: worldX - screenX / newZoom,
        y: worldY - screenY / newZoom,
      }
      zoomRef.current  = newZoom
      dirtyRef.current = true
    }

    canvas.addEventListener('wheel', onWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', onWheel)
  }, [])

  // --- Trade map tooltip helpers ---

  function findHoveredCluster(worldX: number, worldY: number): TradeCluster | null {
    const { worldWidth } = MAP_PROJECTION
    const DETECT_RADIUS = HEX_SIZE * 3
    let nearest: TradeCluster | null = null
    let nearestDist = DETECT_RADIUS

    for (const cluster of tradeClustersRef.current) {
      const center = hexCentersRef.current.get(cluster.anchor_province_id)
      if (!center) continue
      for (const offsetX of [0, -worldWidth, worldWidth]) {
        const dx = worldX - (center.x + offsetX)
        const dy = worldY - center.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < nearestDist) {
          nearestDist = dist
          nearest = cluster
        }
      }
    }
    return nearest
  }

  function positionTooltip(tooltip: HTMLDivElement, containerX: number, containerY: number): void {
    const container = containerRef.current
    if (!container) return
    const cw = container.clientWidth
    const ch = container.clientHeight
    const tw = tooltip.offsetWidth  || 230
    const th = tooltip.offsetHeight || 200
    let left = containerX + 18
    let top  = containerY + 18
    if (left + tw > cw - 8) left = containerX - tw - 18
    if (top  + th > ch - 8) top  = containerY - th - 18
    tooltip.style.left = Math.max(4, left) + 'px'
    tooltip.style.top  = Math.max(4, top)  + 'px'
  }

  function showClusterTooltip(cluster: TradeCluster, containerX: number, containerY: number): void {
    const tooltip = tooltipRef.current
    if (!tooltip) return

    if (currentTooltipClusterIdRef.current !== cluster.id) {
      currentTooltipClusterIdRef.current = cluster.id

      const flows    = tradeFlowsRef.current
      const flowsOut = flows.filter((f: TradeFlow) => f.from_cluster_id === cluster.id)
      const flowsIn  = flows.filter((f: TradeFlow) => f.to_cluster_id   === cluster.id)

      const allGoods     = new Set([...Object.keys(cluster.supply), ...Object.keys(cluster.demand)])
      const surplusGoods: string[] = []
      const demandGoods:  string[] = []
      for (const good of allGoods) {
        const sup = cluster.supply[good] ?? 0
        const dem = cluster.demand[good] ?? 0
        if (sup > dem + 0.5) surplusGoods.push(good)
        else if (dem > sup + 0.5) demandGoods.push(good)
      }

      const anchorName  = regionByIdRef.current.get(cluster.anchor_province_id)?.name ?? cluster.anchor_province_id
      const colorCSS    = numToCSS(TRADE_CLUSTER_COLORS[cluster.id] ?? 0x888888)
      const fmtGood     = (g: string) => g.replace(/_/g, ' ')
      const fmtVal      = (v: number) => v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v.toFixed(1)
      const pluralRoute  = (n: number) => n === 1 ? '1 route' : `${n} routes`

      // ── Food section ──────────────────────────────────────────────────────
      const foodSat    = cluster.food_satisfaction ?? 1.0
      const foodStatus = foodSat >= 1.2 ? 'Feast' : foodSat >= 0.9 ? 'Adequate' : foodSat >= 0.5 ? 'Hungry' : 'Starving'
      const foodColor  = foodSat >= 1.2 ? '#6dd46d' : foodSat >= 0.9 ? '#c8c040' : foodSat >= 0.5 ? '#e07a3a' : '#cc3333'
      const foodBarPct = Math.min(100, (foodSat / 1.5) * 100).toFixed(1)

      const foodStockpile = Object.entries(cluster.food_stockpile ?? {})
        .filter(([, u]) => u > 0.01)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 4)

      const foodStockpileHtml = foodStockpile.length > 0
        ? foodStockpile.map(([good, units]) => `
            <div class="tmt-row">
              <span class="tmt-label" style="text-transform:capitalize">${fmtGood(good)}</span>
              <span class="tmt-value">${units.toFixed(1)} units</span>
            </div>`).join('')
        : '<div class="tmt-label" style="font-style:italic">Cluster stockpile empty</div>'

      tooltip.innerHTML = `
        <div class="tmt-header" style="border-left-color:${colorCSS}">
          <div class="tmt-name">${cluster.name}</div>
          <div class="tmt-sub">Market Center: ${anchorName}</div>
        </div>
        <div class="tmt-body">
          <div class="tmt-row">
            <span class="tmt-label">Total Market Value</span>
            <span class="tmt-value">${fmtVal(cluster.total_trade_value)} ducats/mo</span>
          </div>
          ${surplusGoods.length > 0 ? `
          <div class="tmt-section">
            <div class="tmt-section-label tmt-surplus-label">Surplus Goods</div>
            <div class="tmt-tags">${surplusGoods.map(g => `<span class="tmt-tag tmt-surplus-tag">${fmtGood(g)}</span>`).join('')}</div>
          </div>` : ''}
          ${demandGoods.length > 0 ? `
          <div class="tmt-section">
            <div class="tmt-section-label tmt-demand-label">Goods in Demand</div>
            <div class="tmt-tags">${demandGoods.map(g => `<span class="tmt-tag tmt-demand-tag">${fmtGood(g)}</span>`).join('')}</div>
          </div>` : ''}
          <div class="tmt-divider"></div>
          <div class="tmt-row">
            <span class="tmt-label">Flows Out</span>
            <span class="tmt-value">${pluralRoute(flowsOut.length)}</span>
          </div>
          <div class="tmt-row">
            <span class="tmt-label">Flows In</span>
            <span class="tmt-value">${pluralRoute(flowsIn.length)}</span>
          </div>
          <div class="tmt-divider"></div>
          <div class="tmt-section">
            <div class="tmt-section-label" style="color:#7a8eaa">Food Supply</div>
            <div class="tmt-row" style="margin-bottom:4px">
              <span class="tmt-label">Cluster food status</span>
              <span class="tmt-value" style="color:${foodColor}">${foodStatus} · ${Math.round(foodSat * 100)}%</span>
            </div>
            <div style="height:5px;background:#1a2233;border-radius:3px;margin-bottom:6px;overflow:hidden">
              <div style="height:100%;width:${foodBarPct}%;background:${foodColor};border-radius:3px"></div>
            </div>
            ${foodStockpileHtml}
          </div>
        </div>
      `
    }

    tooltip.style.display = 'block'
    positionTooltip(tooltip, containerX, containerY)
  }

  function hideClusterTooltip(): void {
    const tooltip = tooltipRef.current
    if (tooltip && tooltip.style.display !== 'none') {
      tooltip.style.display = 'none'
      currentTooltipClusterIdRef.current = null
    }
  }

  // ── Food map: province hover tooltip ──────────────────────────────────────

  /** Find the nearest land province within one hex-radius of a world coordinate. */
  function findHoveredProvince(worldX: number, worldY: number): Region | null {
    const { worldWidth } = MAP_PROJECTION
    const DETECT_RADIUS = HEX_SIZE * 0.95
    let nearest: Region | null = null
    let nearestDist = DETECT_RADIUS

    for (const [id, center] of hexCentersRef.current) {
      for (const offsetX of [0, -worldWidth, worldWidth]) {
        const ddx = worldX - (center.x + offsetX)
        const ddy = worldY - center.y
        const d   = Math.sqrt(ddx * ddx + ddy * ddy)
        if (d < nearestDist) {
          nearestDist = d
          nearest = regionByIdRef.current.get(id) ?? null
        }
      }
    }
    return nearest && !isWaterTerrain(nearest.terrain_type) ? nearest : null
  }

  function showFoodProvinceTooltip(region: Region, containerX: number, containerY: number): void {
    const tooltip = tooltipRef.current
    if (!tooltip) return

    if (currentFoodHoverRegionIdRef.current !== region.id) {
      currentFoodHoverRegionIdRef.current = region.id

      const sat       = region.food_satisfaction ?? 1.0
      const status    = sat >= 1.2 ? 'Feast' : sat >= 0.9 ? 'Adequate' : sat >= 0.5 ? 'Hungry' : 'Starving'
      const statusColor = sat >= 1.2 ? '#6dd46d' : sat >= 0.9 ? '#c8c040' : sat >= 0.5 ? '#e07a3a' : '#cc3333'
      const satPct    = Math.round(sat * 100)

      // Bar fill width capped 0–100% visually (sat up to 1.5 = 100%)
      const barFill   = Math.min(100, (sat / 1.5) * 100).toFixed(1)

      const fmtGood = (g: string) => g.replace(/_/g, ' ')

      // Stockpile contents sorted by quantity
      const stockpile = Object.entries(region.food_stockpile ?? {})
        .filter(([, u]) => u > 0.01)
        .sort(([, a], [, b]) => b - a)

      const stockpileHtml = stockpile.length > 0
        ? stockpile.slice(0, 6).map(([good, units]) => {
            const spoil   = FOOD_SPOILAGE_RATE[good] ?? 0
            const satVal  = FOOD_SATIATION[good] ?? 0
            const spoilLabel = spoil >= 0.35 ? 'perishable' : spoil >= 0.15 ? 'moderate' : 'stable'
            const spoilColor = spoil >= 0.35 ? '#e07a3a' : spoil >= 0.15 ? '#c8c040' : '#6dd46d'
            return `
              <div class="tmt-row" style="align-items:flex-start;gap:4px">
                <span class="tmt-label" style="text-transform:capitalize;flex:1">${fmtGood(good)}</span>
                <span class="tmt-value">${units.toFixed(1)}</span>
                <span style="font-size:9px;color:${spoilColor};min-width:52px;text-align:right">${spoilLabel} · ${satVal.toFixed(1)}×</span>
              </div>`
          }).join('')
        : '<div class="tmt-label" style="font-style:italic;padding:2px 0">No food stored</div>'

      // Production sources
      const isFoodGood = FOOD_GOODS.has(region.trade_good)
      const terrainFarmLabels: Partial<Record<string, string>> = {
        farmlands: 'Excellent', flatlands: 'Good', river: 'Very Good',
        coast: 'Modest (fishing)', island: 'Modest', lake: 'Modest',
        land: 'Average', hills: 'Poor', forest: 'Poor',
        bog: 'Very Poor', swamp: 'Very Poor', mountains: 'Very Poor', beach: 'Poor',
      }
      const farmQuality = terrainFarmLabels[region.terrain_type] ?? 'Minimal'

      tooltip.innerHTML = `
        <div class="tmt-header" style="border-left-color:${statusColor}">
          <div class="tmt-name">${region.name}</div>
          <div class="tmt-sub" style="color:${statusColor};font-weight:bold">${status} &nbsp;${satPct}%</div>
        </div>
        <div class="tmt-body">
          <div style="height:6px;background:#1a2233;border-radius:3px;margin-bottom:4px;overflow:hidden">
            <div style="height:100%;width:${barFill}%;background:${statusColor};border-radius:3px;transition:width .2s"></div>
          </div>
          <div class="tmt-section">
            <div class="tmt-section-label" style="color:#7a8eaa">Production</div>
            ${isFoodGood
              ? `<div class="tmt-row"><span class="tmt-label">Trade good</span><span class="tmt-value" style="text-transform:capitalize">${fmtGood(region.trade_good)}</span></div>`
              : `<div class="tmt-row"><span class="tmt-label">Trade good</span><span class="tmt-value" style="color:#666">${fmtGood(region.trade_good)} (non-food)</span></div>`
            }
            <div class="tmt-row"><span class="tmt-label">Subsistence farming</span><span class="tmt-value">${farmQuality}</span></div>
          </div>
          ${stockpile.length > 0 ? `
          <div class="tmt-section" style="margin-top:6px">
            <div class="tmt-section-label" style="color:#7a8eaa">Stockpile · spoilage · satiation</div>
            ${stockpileHtml}
          </div>` : `
          <div class="tmt-section" style="margin-top:4px">
            <div class="tmt-section-label" style="color:#7a8eaa">Stockpile</div>
            ${stockpileHtml}
          </div>`}
        </div>
      `
    }

    tooltip.style.display = 'block'
    positionTooltip(tooltip, containerX, containerY)
  }

  function hideFoodTooltip(): void {
    const tooltip = tooltipRef.current
    if (tooltip && tooltip.style.display !== 'none') {
      tooltip.style.display = 'none'
      currentFoodHoverRegionIdRef.current = null
    }
  }

  // Hide tooltip when leaving trade or food modes
  useEffect(() => {
    if (mapMode !== 'trade' && mapMode !== 'food') {
      hideClusterTooltip()
      hideFoodTooltip()
    }
    if (mapMode === 'trade') hideFoodTooltip()
    if (mapMode === 'food')  hideClusterTooltip()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapMode])

  // --- Pointer events: pan and click-to-select ---
  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    dragRef.current = {
      startX:       e.clientX,
      startY:       e.clientY,
      startScrollX: scrollRef.current.x,
      startScrollY: scrollRef.current.y,
    }
    ;(e.target as HTMLCanvasElement).setPointerCapture(e.pointerId)
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    // Always track mouse position for hover grid effect
    mousePosRef.current = { x: e.clientX, y: e.clientY }
    dirtyRef.current = true

    // Mode-specific hover tooltips
    const canvas     = canvasRef.current!
    const rect       = canvas.getBoundingClientRect()
    const containerX = e.clientX - rect.left
    const containerY = e.clientY - rect.top
    const zoom       = zoomRef.current
    const worldX     = containerX / zoom + scrollRef.current.x
    const worldY     = containerY / zoom + scrollRef.current.y

    if (mapModeRef.current === 'trade' && tradeClustersRef.current.length > 0) {
      // Trade mode: hover over cluster anchor markers
      const hovered = findHoveredCluster(worldX, worldY)
      if (hovered) {
        showClusterTooltip(hovered, containerX, containerY)
      } else {
        hideClusterTooltip()
      }
    } else if (mapModeRef.current === 'food') {
      // Food mode: hover over any land province
      const hovered = findHoveredProvince(worldX, worldY)
      if (hovered) {
        showFoodProvinceTooltip(hovered, containerX, containerY)
      } else {
        hideFoodTooltip()
      }
    } else {
      hideClusterTooltip()
      hideFoodTooltip()
    }

    if (!dragRef.current) return

    const zoom = zoomRef.current
    const dx   = (e.clientX - dragRef.current.startX) / zoom
    const dy   = (e.clientY - dragRef.current.startY) / zoom
    const { worldWidth, worldHeight } = MAP_PROJECTION
    const canvas = canvasRef.current!

    let newX = dragRef.current.startScrollX - dx
    let newY = dragRef.current.startScrollY - dy

    // Horizontal wrap
    if      (newX >= worldWidth) newX -= worldWidth
    else if (newX < 0)           newX += worldWidth

    // Vertical clamp
    newY = Math.max(0, Math.min(worldHeight - canvas.height / zoom, newY))

    scrollRef.current = { x: newX, y: newY }
    dirtyRef.current  = true
  }

  function handlePointerLeave() {
    mousePosRef.current = null
    dirtyRef.current = true
    hideClusterTooltip()
  }

  function handlePointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!dragRef.current) return

    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    const wasDrag = Math.sqrt(dx * dx + dy * dy) >= 5
    dragRef.current = null

    if (!wasDrag) {
      // Click — find nearest province center in world space
      const canvas  = canvasRef.current!
      const rect    = canvas.getBoundingClientRect()
      const screenX = e.clientX - rect.left
      const screenY = e.clientY - rect.top
      const zoom    = zoomRef.current
      const worldX  = screenX / zoom + scrollRef.current.x
      const worldY  = screenY / zoom + scrollRef.current.y

      const { worldWidth } = MAP_PROJECTION
      let nearest:     string | null = null
      let nearestDist: number        = HEX_SIZE * 1.2

      for (const [id, center] of hexCentersRef.current) {
        // Check all three copies so clicks near the wrap edge work correctly
        for (const offsetX of [0, -worldWidth, worldWidth]) {
          const ddx = worldX - (center.x + offsetX)
          const ddy = worldY - center.y
          const d   = Math.sqrt(ddx * ddx + ddy * ddy)
          if (d < nearestDist) {
            nearestDist = d
            nearest     = id
          }
        }
      }

      if (nearest) onRegionSelectRef.current(nearest)
    }
  }

  return (
    <div ref={containerRef} className="game-canvas-container">
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
      />
      <div ref={tooltipRef} className="trade-map-tooltip" style={{ display: 'none' }} />
    </div>
  )
}
