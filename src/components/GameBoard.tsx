import { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import { mapManager, MAP_PROJECTION } from '../game/Map'
import { Region, TerrainType, SettlementTier } from '../game/types'
import './GameBoard.css'

interface GameBoardProps {
  selectedRegionId: string | null
  onRegionSelect: (regionId: string) => void
}

export default function GameBoard({ selectedRegionId, onRegionSelect }: GameBoardProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<Phaser.Game | null>(null)

  // Refs to avoid stale closures inside Phaser callbacks
  const onRegionSelectRef = useRef(onRegionSelect)
  const selectedRegionIdRef = useRef(selectedRegionId)

  // Shared state between the two effects
  const hexCentersRef = useRef<Map<string, { x: number; y: number }>>(new Map())
  const selectionGraphicsRef = useRef<Phaser.GameObjects.Graphics | null>(null)

  // Keep refs current on every render (no effect overhead)
  onRegionSelectRef.current = onRegionSelect
  selectedRegionIdRef.current = selectedRegionId

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

          // Terrain-based fill/stroke colors
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

            // Store center for selection effect
            hexCentersRef.current.set(region.id, { x: worldX, y: worldY })

            const { fill, stroke, alpha } = getTerrainColors(region.terrain_type, region.settlement_tier)

            // Hex fill
            const hex = this.add.graphics()
            hex.setDepth(1)
            const points = makeHexPoints(worldX, worldY)
            hex.fillStyle(fill, alpha)
            hex.fillPoints(points, true)
            hex.lineStyle(2, stroke)
            hex.strokePoints(points, true)

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

  return <div ref={containerRef} className="game-canvas-container" />
}
