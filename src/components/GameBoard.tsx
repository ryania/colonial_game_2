import { useEffect, useRef } from 'react'
import { mapManager, MAP_PROJECTION } from '../game/Map'
import { Region, TerrainType, SettlementTier, MapMode, Culture, ColonialEntity, GovernancePhase, StateOwner, TradeRoute, isWaterTerrain } from '../game/types'
import './GameBoard.css'

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

  // Rendering
  const dirtyRef = useRef(true)
  const rafRef   = useRef<number | null>(null)

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
    dirtyRef.current = true
    onReadyRef.current?.()

    return () => {
      offscreenRef.current = null
      hexCentersRef.current.clear()
      allRegionsRef.current   = []
      namedRegionsRef.current = []
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

      // Province name + population labels — only shown when zoomed in enough to be legible
      if (zoom >= 1.5) {
        ctx.textAlign = 'center'
        namedRegionsRef.current.forEach(region => {
          const center = hexCentersRef.current.get(region.id)
          if (!center) return

          // Screen-space cull: skip hexes outside the viewport
          const sx = (center.x - scrollX) * zoom
          const sy = (center.y - scrollY) * zoom
          if (sx < -80 || sx > canvas.width + 80) return
          if (sy < -20 || sy > canvas.height + 20) return

          ctx.fillStyle = '#ffffff'
          ctx.font = 'bold 8px Arial'
          ctx.fillText(region.name, center.x, center.y)

          ctx.fillStyle = '#aabbcc'
          ctx.font = '7px Arial'
          ctx.fillText(
            `Pop: ${Math.round(region.population.total / 100) * 100}`,
            center.x,
            center.y + 10
          )
        })
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
