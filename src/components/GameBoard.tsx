import { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import { mapManager, MAP_PROJECTION } from '../game/Map'
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

    const HEX_SIZE = 30
    const { worldWidth, worldHeight } = MAP_PROJECTION

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      parent: containerRef.current,
      backgroundColor: '#0a0e27',
      scene: {
        create(this: Phaser.Scene) {
          const regions = mapManager.getAllRegions()

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
            const newZoom = Phaser.Math.Clamp(cam.zoom - deltaY * 0.001, 0.3, 3)
            cam.setZoom(newZoom)
          })

          // Initial camera position centered on the Atlantic
          this.cameras.main.centerOn(
            MAP_PROJECTION.initialCameraX(),
            MAP_PROJECTION.initialCameraY()
          )

          // Draw all hexes
          regions.forEach(region => {
            if (region.lat === undefined || region.lng === undefined) return

            const [worldX, worldY] = MAP_PROJECTION.latLngToPixel(region.lat, region.lng)

            // Store center for selection effect
            hexCentersRef.current.set(region.id, { x: worldX, y: worldY })

            // Hex fill
            const hex = this.add.graphics()
            const points: Phaser.Geom.Point[] = []
            for (let i = 0; i < 6; i++) {
              const angle = (Math.PI / 3) * i
              points.push(new Phaser.Geom.Point(
                worldX + HEX_SIZE * Math.cos(angle),
                worldY + HEX_SIZE * Math.sin(angle)
              ))
            }
            hex.fillStyle(0x2a3f5f, 0.8)
            hex.fillPoints(points, true)
            hex.lineStyle(2, 0x4a6fa5)
            hex.strokePoints(points, true)

            // Interactive zone — use pointerup + distance check to distinguish pan from click
            const circle = this.add.circle(worldX, worldY, HEX_SIZE * 0.9, 0x000000, 0)
            circle.setInteractive(
              new Phaser.Geom.Circle(0, 0, HEX_SIZE * 0.9),
              Phaser.Geom.Circle.Contains
            )
            circle.on('pointerup', (pointer: Phaser.Input.Pointer) => {
              if (pointer.getDistance() < 5) {
                onRegionSelectRef.current(region.id)
              }
            })

            // Labels
            this.add.text(worldX, worldY, region.name, {
              font: 'bold 11px Arial',
              color: '#ffffff',
              align: 'center'
            }).setOrigin(0.5)

            this.add.text(worldX, worldY + 14, `Pop: ${Math.round(region.population.total / 100) * 100}`, {
              font: '10px Arial',
              color: '#aabbcc',
              align: 'center'
            }).setOrigin(0.5)
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

    const HEX_SIZE = 30
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
