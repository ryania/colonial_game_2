import { useEffect, useRef } from 'react'
import { mapManager, MAP_PROJECTION } from '../game/Map'
import { Region, TerrainType, SettlementTier, MapMode, Culture, ColonialEntity, GovernancePhase, StateOwner, TradeRoute, isWaterTerrain } from '../game/types'
import { riverSystem } from '../game/RiverSystem'
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

// Per-river packed RGB colors — used for connection lines in rivers map mode
const RIVER_COLORS: Record<string, number> = {
  'River Shannon':    0x1a6bcc,  // bright blue — the main artery
  'River Liffey':     0x3a9ad4,  // sky blue
  'River Lee':        0x1a5aaa,  // deep blue
  'River Barrow':     0x2a80c0,  // medium blue
  'River Nore':       0x3a72b8,  // slate blue
  'River Suir':       0x4a84c8,  // periwinkle blue
  'River Blackwater': 0x1a5898,  // dark navy blue
  'River Erne':       0x2a6ab0,  // steel blue
  'River Bann':       0x3a7cc0,  // cobalt blue
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
  colonialEntities: ColonialEntity[],
  stateOwners: StateOwner[]
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

    case 'owner':
      return { fill: CULTURE_COLORS[region.owner_culture] ?? 0x555555, stroke, alpha }

    case 'wealth': {
      const range = maxWealth - minWealth
      const t = range > 0 ? (region.wealth - minWealth) / range : 0
      return { fill: lerpColor(0x2e2416, 0xffd700, t), stroke, alpha }
    }

    case 'governance': {
      const entityId = region.colonial_entity_id
      if (!entityId) return getTerrainColors(region.terrain_type, region.settlement_tier)
      const entity = colonialEntities.find(e => e.id === entityId)
      if (!entity) return getTerrainColors(region.terrain_type, region.settlement_tier)
      return { fill: shadeColor(entity.map_color, PHASE_SHADE[entity.governance_phase]), stroke, alpha }
    }

    case 'sovereignty': {
      // 1. Direct assignment — home territories (European homeland provinces)
      if (region.state_owner_id) {
        const owner = stateOwners.find(o => o.id === region.state_owner_id)
        if (owner) return { fill: owner.map_color, stroke, alpha }
      }
      // 2. Colonial entity chain — colonial territories in Americas/Africa/Asia
      const entityId = region.colonial_entity_id
      if (!entityId) return getTerrainColors(region.terrain_type, region.settlement_tier)
      const entity = colonialEntities.find(e => e.id === entityId)
      if (!entity?.state_owner_id) return getTerrainColors(region.terrain_type, region.settlement_tier)
      const owner = stateOwners.find(o => o.id === entity.state_owner_id)
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

// Add a flat-top hex path to the current canvas path (no stroke/fill — caller does that)
function hexPath(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  ctx.beginPath()
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i
    const x = cx + HEX_SIZE * Math.cos(angle)
    const y = cy + HEX_SIZE * Math.sin(angle)
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
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
  stateOwners: StateOwner[]
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

  const strokeWidth = mode === 'terrain' ? 1 : 0.5

  allRegions.forEach(region => {
    const center = hexCenters.get(region.id)
    if (!center) return

    const { fill, stroke, alpha } = getColorForMode(
      mode, region, minPop, maxPop, minWealth, maxWealth, colonialEntities, stateOwners
    )

    hexPath(ctx, center.x, center.y)
    ctx.globalAlpha = alpha
    ctx.fillStyle = numToCSS(fill)
    ctx.fill()
    ctx.globalAlpha = 1
    ctx.strokeStyle = numToCSS(stroke)
    ctx.lineWidth = strokeWidth
    ctx.stroke()
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
}

function computeGroupLabels(
  mode: MapMode,
  landRegions: Region[],
  hexCenters: Map<string, { x: number; y: number }>,
  colonialEntities: ColonialEntity[],
  stateOwners: StateOwner[]
): GroupLabel[] {
  // Gradient and overlay modes have no meaningful discrete groups
  if (mode === 'population' || mode === 'wealth' || mode === 'rivers') return []

  const entityMap = new Map(colonialEntities.map(e => [e.id, e]))
  const ownerMap  = new Map(stateOwners.map(o => [o.id, o]))

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
      default:            return undefined
    }
  }

  function getLabel(key: string): string {
    switch (mode) {
      case 'governance':
        return entityMap.get(key)?.name ?? key
      case 'sovereignty':
        return ownerMap.get(key)?.short_name ?? key
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

export default function GameBoard({ selectedRegionId, onRegionSelect, mapMode, colonialEntities, stateOwners, tradeRoutes, onReady }: GameBoardProps) {
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
  const onReadyRef           = useRef(onReady)

  onRegionSelectRef.current   = onRegionSelect
  selectedRegionIdRef.current = selectedRegionId
  colonialEntitiesRef.current = colonialEntities
  stateOwnersRef.current      = stateOwners
  onReadyRef.current          = onReady

  // Update trade routes ref and mark dirty when routes change
  if (tradeRoutes !== undefined && tradeRoutes !== tradeRoutesRef.current) {
    tradeRoutesRef.current = tradeRoutes
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

    const { worldWidth, worldHeight } = MAP_PROJECTION
    const offscreen = document.createElement('canvas')
    offscreen.width  = worldWidth
    offscreen.height = worldHeight
    bakeOffscreen(offscreen, allRegions, hexCentersRef.current, 'terrain', [], [])
    offscreenRef.current = offscreen
    groupLabelsRef.current = computeGroupLabels('terrain', namedRegions.filter((r: Region) => !isWaterTerrain(r.terrain_type)), hexCentersRef.current, [], [])
    dirtyRef.current = true

    return () => {
      offscreenRef.current = null
      hexCentersRef.current.clear()
      allRegionsRef.current   = []
      namedRegionsRef.current = []
      groupLabelsRef.current  = []
    }
  }, [])

  // --- Effect 2: Rebake offscreen canvas when mapMode or entity/owner data changes ---
  useEffect(() => {
    if (!offscreenRef.current || allRegionsRef.current.length === 0) return
    bakeOffscreen(
      offscreenRef.current,
      allRegionsRef.current,
      hexCentersRef.current,
      mapMode,
      colonialEntitiesRef.current,
      stateOwnersRef.current
    )
    groupLabelsRef.current = computeGroupLabels(
      mapMode,
      allRegionsRef.current.filter((r: Region) => !isWaterTerrain(r.terrain_type)),
      hexCentersRef.current,
      colonialEntitiesRef.current,
      stateOwnersRef.current
    )
    dirtyRef.current = true
  }, [mapMode, colonialEntities, stateOwners])

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

      // Trade route paths — drawn as polylines between hex centers
      const routes = tradeRoutesRef.current
      if (routes.length > 0) {
        const { worldWidth: ww } = MAP_PROJECTION
        ctx.lineWidth = 1.5 / zoom
        ctx.globalAlpha = 0.7

        for (const route of routes) {
          const pathIds = route.path_region_ids
          if (!pathIds || pathIds.length < 2) continue

          // Collect pixel centers for this route's path
          const points: { x: number; y: number }[] = []
          for (const rid of pathIds) {
            const c = hexCentersRef.current.get(rid)
            if (c) points.push(c)
          }
          if (points.length < 2) continue

          // Draw three copies (centre + ±worldWidth) for horizontal wrap
          for (const offsetX of [0, -ww, ww]) {
            // Viewport cull: skip copies entirely off-screen
            const x0 = (points[0].x + offsetX - scrollX) * zoom
            const xN = (points[points.length - 1].x + offsetX - scrollX) * zoom
            if (Math.min(x0, xN) > canvas.width + 200 || Math.max(x0, xN) < -200) continue

            // Color based on whether path passes mostly over water or land
            ctx.strokeStyle = '#d4a017'   // gold for trade routes

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
      />
    </div>
  )
}
