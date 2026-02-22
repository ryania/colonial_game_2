import { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import { mapManager, MAP_PROJECTION } from '../game/Map'
import { Region, TerrainType, SettlementTier, MapMode, Culture, ColonialEntity, GovernancePhase } from '../game/types'
import './GameBoard.css'

interface GameBoardProps {
  selectedRegionId: string | null
  onRegionSelect: (regionId: string) => void
  mapMode: MapMode
  colonialEntities: ColonialEntity[]
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

// Terrain-based fill/stroke colors (original behavior)
function getTerrainColors(terrainType: TerrainType, tier: SettlementTier): { fill: number; stroke: number; alpha: number } {
  switch (terrainType) {
    case 'ocean': return { fill: 0x0d2844, stroke: 0x1a3a5c, alpha: 1 }
    case 'sea':   return { fill: 0x1a3a5c, stroke: 0x2a5a8c, alpha: 1 }
    case 'coast': return { fill: 0x1e4a5a, stroke: 0x2a6a7a, alpha: 1 }
    case 'lake':  return { fill: 0x1a5a6c, stroke: 0x2a7a8c, alpha: 1 }
    case 'island':
    case 'land':
    default: {
      const tierFill: Record<SettlementTier, number> = {
        wilderness: 0x2d4a3a,
        village:    0x3d5a4a,
        town:       0x4d6a5a,
        city:       0x5d7a6a
      }
      return { fill: tierFill[tier], stroke: 0x4a5f8f, alpha: 0.9 }
    }
  }
}

const WATER_TERRAIN: TerrainType[] = ['ocean', 'sea', 'coast', 'lake']

// Color lookup per culture for owner mode
const CULTURE_COLORS: Record<Culture, number> = {
  Spanish:    0x8b1a1a,
  English:    0x1a2e8b,
  French:     0x6b1a8b,
  Portuguese: 0x1a6b2e,
  Dutch:      0xc87e1a,
  Native:     0x6b4a1a,
  African:    0x1a5a5a,
  Swahili:    0x1a8b5a,
  Flemish:    0x8b5a1a,
  German:     0x8b8b1a,
  Italian:    0x5a1a8b,
  Polish:     0xc81a1a,
}

// Settlement tier colors for settlement mode
const TIER_COLORS: Record<SettlementTier, number> = {
  wilderness: 0x5c4a2a,
  village:    0x6b8c42,
  town:       0xc87e1a,
  city:       0xd4a017,
}

// Shade factor per governance phase (brightness multiplier)
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
  colonialEntities: ColonialEntity[]
): { fill: number; stroke: number; alpha: number } {
  // Water tiles always use terrain colors regardless of mode
  if (WATER_TERRAIN.includes(region.terrain_type)) {
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
      const shadeFactor = PHASE_SHADE[entity.governance_phase]
      return { fill: shadeColor(entity.map_color, shadeFactor), stroke, alpha }
    }

    default:
      return getTerrainColors(region.terrain_type, region.settlement_tier)
  }
}

export default function GameBoard({ selectedRegionId, onRegionSelect, mapMode, colonialEntities }: GameBoardProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<Phaser.Game | null>(null)

  // Refs to avoid stale closures inside Phaser callbacks
  const onRegionSelectRef = useRef(onRegionSelect)
  const selectedRegionIdRef = useRef(selectedRegionId)

  // Shared state between effects
  const hexCentersRef = useRef<Map<string, { x: number; y: number }>>(new Map())
  const selectionGraphicsRef = useRef<Phaser.GameObjects.Graphics | null>(null)

  // Map mode refs — updated each render, read by Effect 3
  const hexGraphicsRef = useRef<Map<string, Phaser.GameObjects.Graphics>>(new Map())
  const namedRegionsRef = useRef<Region[]>([])

  // Colonial entities ref — updated each render, read by Effect 3
  const colonialEntitiesRef = useRef<ColonialEntity[]>(colonialEntities)

  // Keep refs current on every render (no effect overhead)
  onRegionSelectRef.current = onRegionSelect
  selectedRegionIdRef.current = selectedRegionId
  colonialEntitiesRef.current = colonialEntities

  // --- Effect 1: Create Phaser game ONCE ---
  useEffect(() => {
    if (!containerRef.current) return

    const HEX_SIZE = MAP_PROJECTION.hexSize
    const { worldWidth, worldHeight } = MAP_PROJECTION

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      parent: containerRef.current,
      backgroundColor: '#0a0e27',
      scene: {
        create(this: Phaser.Scene) {
          const allRegions = mapManager.getAllRegions()
          const oceanRegions = allRegions.filter(r => r.terrain_type === 'ocean')
          const namedRegions = allRegions.filter(r => r.terrain_type !== 'ocean')

          // Store for later use by Effect 3
          namedRegionsRef.current = namedRegions

          // Grid constants matching ProvinceGenerator
          const COL_SPACING = HEX_SIZE * 1.5
          const ROW_SPACING = HEX_SIZE * Math.sqrt(3)

          // Snap a pixel position to the nearest hex grid cell center
          function snapToGrid(px: number, py: number): [number, number] {
            const col = Math.round(px / COL_SPACING)
            const row = Math.round((py - (col % 2 === 1 ? ROW_SPACING / 2 : 0)) / ROW_SPACING)
            return [
              col * COL_SPACING,
              row * ROW_SPACING + (col % 2 === 1 ? ROW_SPACING / 2 : 0)
            ]
          }

          // Get grid-aligned world position for a region
          function getWorldPos(region: Region): [number, number] {
            if (region.lat === undefined || region.lng === undefined) return [0, 0]
            const [px, py] = MAP_PROJECTION.latLngToPixel(region.lat, region.lng)
            return snapToGrid(px, py)
          }

          // Build hex points array around a center
          function makeHexPoints(wx: number, wy: number): Phaser.Geom.Point[] {
            const pts: Phaser.Geom.Point[] = []
            for (let i = 0; i < 6; i++) {
              const a = (Math.PI / 3) * i
              pts.push(new Phaser.Geom.Point(wx + HEX_SIZE * Math.cos(a), wy + HEX_SIZE * Math.sin(a)))
            }
            return pts
          }

          // Set world bounds so the camera can't scroll off the edge
          this.cameras.main.setBounds(0, 0, worldWidth, worldHeight)

          // Enable drag-to-pan
          this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            if (pointer.isDown) {
              this.cameras.main.scrollX -= (pointer.x - pointer.prevPosition.x) / this.cameras.main.zoom
              this.cameras.main.scrollY -= (pointer.y - pointer.prevPosition.y) / this.cameras.main.zoom
            }
          })

          // Enable scroll-wheel zoom
          this.input.on('wheel', (_ptr: unknown, _objs: unknown, _x: unknown, deltaY: number) => {
            const cam = this.cameras.main
            const newZoom = Phaser.Math.Clamp(cam.zoom - deltaY * 0.001, 0.3, 8)
            cam.setZoom(newZoom)
          })

          // Initial camera position centered on the Atlantic
          this.cameras.main.centerOn(
            MAP_PROJECTION.initialCameraX(),
            MAP_PROJECTION.initialCameraY()
          )

          // --- Render all ocean tiles in one batched Graphics object (depth 0) ---
          const oceanGfx = this.add.graphics()
          oceanGfx.setDepth(0)
          oceanRegions.forEach(region => {
            const [wx, wy] = getWorldPos(region)
            const pts = makeHexPoints(wx, wy)
            oceanGfx.fillStyle(0x0d2844, 1)
            oceanGfx.fillPoints(pts, true)
            oceanGfx.lineStyle(1, 0x1a3a5c, 0.6)
            oceanGfx.strokePoints(pts, true)
          })

          // --- Render named (interactive) provinces individually (depth 1) ---
          namedRegions.forEach(region => {
            if (region.lat === undefined || region.lng === undefined) return

            const [worldX, worldY] = getWorldPos(region)

            // Store center for selection effect and mode recolor
            hexCentersRef.current.set(region.id, { x: worldX, y: worldY })

            const { fill, stroke, alpha } = getTerrainColors(region.terrain_type, region.settlement_tier)

            // Hex fill — store ref for later recoloring by Effect 3
            const hex = this.add.graphics()
            hex.setDepth(1)
            const points = makeHexPoints(worldX, worldY)
            hex.fillStyle(fill, alpha)
            hex.fillPoints(points, true)
            hex.lineStyle(2, stroke)
            hex.strokePoints(points, true)
            hexGraphicsRef.current.set(region.id, hex)

            // Interactive zone — use pointerup + distance check to distinguish pan from click
            const circle = this.add.circle(worldX, worldY, HEX_SIZE * 1.2, 0x000000, 0)
            circle.setDepth(2)
            circle.setInteractive(
              new Phaser.Geom.Circle(0, 0, HEX_SIZE * 1.2),
              Phaser.Geom.Circle.Contains
            )
            circle.on('pointerup', (pointer: Phaser.Input.Pointer) => {
              if (pointer.getDistance() < 5) {
                onRegionSelectRef.current(region.id)
              }
            })

            // Labels (name + population)
            this.add.text(worldX, worldY, region.name, {
              font: 'bold 8px Arial',
              color: '#ffffff',
              align: 'center'
            }).setOrigin(0.5).setDepth(3)

            this.add.text(worldX, worldY + 10, `Pop: ${Math.round(region.population.total / 100) * 100}`, {
              font: '7px Arial',
              color: '#aabbcc',
              align: 'center'
            }).setOrigin(0.5).setDepth(3)
          })

          // Selection overlay — drawn on top of everything, updated by Effect 2
          selectionGraphicsRef.current = this.add.graphics()
          selectionGraphicsRef.current.setDepth(10)
        }
      }
    }

    gameRef.current = new Phaser.Game(config)

    return () => {
      selectionGraphicsRef.current = null
      hexCentersRef.current.clear()
      hexGraphicsRef.current.clear()
      namedRegionsRef.current = []
      gameRef.current?.destroy(true)
      gameRef.current = null
    }
  }, []) // empty deps — game created once, never recreated

  // --- Effect 2: Update selection ring only ---
  useEffect(() => {
    const overlay = selectionGraphicsRef.current
    if (!overlay) return

    const HEX_SIZE = MAP_PROJECTION.hexSize
    overlay.clear()

    if (selectedRegionId) {
      const center = hexCentersRef.current.get(selectedRegionId)
      if (center) {
        overlay.lineStyle(3, 0xff6b8a, 1)
        const points: Phaser.Geom.Point[] = []
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i
          points.push(new Phaser.Geom.Point(
            center.x + HEX_SIZE * Math.cos(angle),
            center.y + HEX_SIZE * Math.sin(angle)
          ))
        }
        overlay.strokePoints(points, true)
      }
    }
  }, [selectedRegionId])

  // --- Effect 3: Recolor provinces when mapMode changes ---
  useEffect(() => {
    const hexGfxMap = hexGraphicsRef.current
    const regions = namedRegionsRef.current
    if (hexGfxMap.size === 0 || regions.length === 0) return

    const HEX_SIZE = MAP_PROJECTION.hexSize

    // Compute normalization ranges from land tiles only
    const landRegions = regions.filter((r: Region) => !WATER_TERRAIN.includes(r.terrain_type))
    const popValues = landRegions.map((r: Region) => r.population.total)
    const wealthValues = landRegions.map((r: Region) => r.wealth)
    const minPop = Math.min(...popValues)
    const maxPop = Math.max(...popValues)
    const minWealth = Math.min(...wealthValues)
    const maxWealth = Math.max(...wealthValues)

    regions.forEach((region: Region) => {
      const gfx = hexGfxMap.get(region.id)
      const center = hexCentersRef.current.get(region.id)
      if (!gfx || !center) return

      const { fill, stroke, alpha } = getColorForMode(mapMode, region, minPop, maxPop, minWealth, maxWealth, colonialEntitiesRef.current)

      // Rebuild hex corner points from stored center
      const pts: Phaser.Geom.Point[] = []
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i
        pts.push(new Phaser.Geom.Point(
          center.x + HEX_SIZE * Math.cos(a),
          center.y + HEX_SIZE * Math.sin(a)
        ))
      }

      gfx.clear()
      gfx.fillStyle(fill, alpha)
      gfx.fillPoints(pts, true)
      gfx.lineStyle(2, stroke, mapMode === 'terrain' ? 1 : 0.4)
      gfx.strokePoints(pts, true)
    })
  }, [mapMode])

  return <div ref={containerRef} className="game-canvas-container" />
}
