import { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import { mapManager, HexUtils } from '../game/Map'
import './GameBoard.css'

interface GameBoardProps {
  selectedRegionId: string | null
  onRegionSelect: (regionId: string) => void
}

export default function GameBoard({ selectedRegionId, onRegionSelect }: GameBoardProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<Phaser.Game | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    console.log('GameBoard: Creating Phaser game, container size:', containerRef.current.clientWidth, 'x', containerRef.current.clientHeight)

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      parent: containerRef.current,
      backgroundColor: '#0a0e27',
      scene: {
        create: function (this: Phaser.Scene) {
          const regions = mapManager.getAllRegions()
          console.log('GameBoard Phaser scene: Found', regions.length, 'regions')
          const hex_size = 50

          // Create hex tiles for each region
          regions.forEach(region => {
            const [px, py] = HexUtils.axialToPixel(region.x, region.y, hex_size)
            const centerX = this.cameras.main.width / 2 + px
            const centerY = this.cameras.main.height / 2 + py

            // Draw hexagon
            const hex = this.make.graphics({}, true)
            hex.setPosition(centerX, centerY)
            const points: Phaser.Geom.Point[] = []

            for (let i = 0; i < 6; i++) {
              const angle = (Math.PI / 3) * i
              const x = hex_size * Math.cos(angle)
              const y = hex_size * Math.sin(angle)
              points.push(new Phaser.Geom.Point(x, y))
            }

            hex.fillStyle(0x2a3f5f, 0.8)
            hex.fillPoints(points, true)
            hex.lineStyle(2, selectedRegionId === region.id ? 0xff6b8a : 0x4a6fa5)
            hex.strokePoints(points, true)

            // Add interactive zone
            const circle = this.add.circle(centerX, centerY, hex_size * 0.9, 0x000000, 0)
            circle.setInteractive(new Phaser.Geom.Circle(0, 0, hex_size * 0.9), Phaser.Geom.Circle.Contains)
            circle.on('pointerdown', () => {
              onRegionSelect(region.id)
            })

            // Add region label
            this.add.text(centerX, centerY, region.name, {
              font: 'bold 14px Arial',
              color: '#ffffff',
              align: 'center'
            }).setOrigin(0.5)

            // Add population indicator
            this.add.text(centerX, centerY + 20, `Pop: ${Math.round(region.population.total / 100) * 100}`, {
              font: '12px Arial',
              color: '#aabbcc',
              align: 'center'
            }).setOrigin(0.5)
          })
        },
        update: function (this: Phaser.Scene) {
          // Placeholder for game loop updates
        }
      }
    }

    gameRef.current = new Phaser.Game(config)

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true)
        gameRef.current = null
      }
    }
  }, [selectedRegionId, onRegionSelect])

  return <div ref={containerRef} className="game-canvas-container" />
}
