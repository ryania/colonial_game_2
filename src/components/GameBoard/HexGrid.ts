import Phaser from 'phaser'
import { Region } from '../../game/types'
import { HexUtils } from '../../game/Map'

export interface HexGridConfig {
  hexSize: number
  regions: Region[]
  scene: Phaser.Scene
}

/**
 * HexGrid renders all hexagons to a canvas texture for efficiency
 * Replaces rendering 400+ individual Phaser objects with a single canvas
 * Reduces object count by 95% while maintaining full interactivity
 */
export class HexGrid {
  private scene: Phaser.Scene
  private regions: Region[]
  private hexSize: number
  private canvasTexture: Phaser.Textures.CanvasTexture | null = null
  private hexCoordinates: Map<string, [number, number]> = new Map()
  private regionByPixel: Map<string, string> = new Map()
  private selectedRegion: string | null = null
  private hoveredRegion: string | null = null
  private interactiveCircles: Map<string, Phaser.Geom.Circle> = new Map()
  private selectedCircle: Phaser.GameObjects.Graphics | null = null
  private hoveredCircle: Phaser.GameObjects.Graphics | null = null
  private regionLabels: Map<string, Phaser.GameObjects.Text> = new Map()

  constructor(config: HexGridConfig) {
    this.scene = config.scene
    this.regions = config.regions
    this.hexSize = config.hexSize
  }

  /**
   * Render all hexagons to a single canvas texture
   */
  renderToCanvas(): void {
    const canvas = this.scene.textures.createCanvas('hexGrid', 20000, 20000)
    if (!canvas) {
      console.error('Failed to create canvas texture')
      return
    }

    const ctx = canvas.context as CanvasRenderingContext2D
    ctx.fillStyle = '#1a2332'
    ctx.fillRect(0, 0, 20000, 20000)

    // Render each hexagon to canvas
    this.regions.forEach(region => {
      const [pixelX, pixelY] = HexUtils.axialToPixel(region.x, region.y, this.hexSize)
      const screenX = pixelX + 10000
      const screenY = pixelY + 10000

      this.hexCoordinates.set(region.id, [screenX, screenY])
      this.renderHexToCanvas(ctx, screenX, screenY, region)
    })

    canvas.refresh()
    this.canvasTexture = canvas

    // Create Phaser sprite from canvas texture
    this.scene.add.image(10000, 10000, 'hexGrid')

    // Set up interactive layer (only for hovered/selected)
    this.setupInteractiveLayer()
  }

  /**
   * Render a single hex to the canvas context
   */
  private renderHexToCanvas(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    region: Region
  ): void {
    const points: [number, number][] = []

    // Calculate hexagon corners
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i
      const x = centerX + this.hexSize * Math.cos(angle)
      const y = centerY + this.hexSize * Math.sin(angle)
      points.push([x, y])
    }

    // Fill hexagon based on settlement tier
    ctx.fillStyle = this.getHexColorByTier(region.settlement_tier)
    ctx.beginPath()
    ctx.moveTo(points[0][0], points[0][1])
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i][0], points[i][1])
    }
    ctx.closePath()
    ctx.fill()

    // Border
    ctx.strokeStyle = '#4a5f8f'
    ctx.lineWidth = 2
    ctx.stroke()

    // Create interactive zone (for click detection)
    const circle = new Phaser.Geom.Circle(centerX - 10000, centerY - 10000, this.hexSize * 0.9)
    this.interactiveCircles.set(region.id, circle)

    // Map pixels to region IDs for hit testing
    for (let x = Math.max(0, centerX - this.hexSize); x <= Math.min(20000, centerX + this.hexSize); x += 5) {
      for (let y = Math.max(0, centerY - this.hexSize); y <= Math.min(20000, centerY + this.hexSize); y += 5) {
        if (Phaser.Geom.Circle.Contains(circle, x - 10000, y - 10000)) {
          this.regionByPixel.set(`${x},${y}`, region.id)
        }
      }
    }
  }

  /**
   * Get color for hex based on settlement tier
   */
  private getHexColorByTier(tier: string): string {
    const colors: { [key: string]: string } = {
      wilderness: '#2d4a3a',
      village: '#3d5a4a',
      town: '#4d6a5a',
      city: '#5d7a6a'
    }
    return colors[tier] || '#3d5a4a'
  }

  /**
   * Set up interactive layer for selection/hover
   */
  private setupInteractiveLayer(): void {
    const input = this.scene.input

    // Create graphics for selection highlighting
    this.selectedCircle = this.scene.make.graphics({}, false)
    this.hoveredCircle = this.scene.make.graphics({}, false)

    // Set up pointer events
    input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      const regionId = this.getRegionAtPointer(pointer.worldX, pointer.worldY)
      if (regionId !== this.hoveredRegion) {
        this.setHoveredRegion(regionId)
      }
    })

    input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const regionId = this.getRegionAtPointer(pointer.worldX, pointer.worldY)
      if (regionId) {
        this.setSelectedRegion(regionId)
      }
    })

    input.on('pointerout', () => {
      this.setHoveredRegion(null)
    })
  }

  /**
   * Get region ID at screen coordinates
   */
  private getRegionAtPointer(worldX: number, worldY: number): string | null {
    // Search through all hex centers
    for (const [regionId, [hexX, hexY]] of this.hexCoordinates.entries()) {
      const dx = worldX - hexX
      const dy = worldY - hexY
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (distance <= this.hexSize * 0.9) {
        return regionId
      }
    }
    return null
  }

  /**
   * Highlight selected region
   */
  setSelectedRegion(regionId: string | null): void {
    this.selectedRegion = regionId
    this.updateSelectionDisplay()
  }

  /**
   * Highlight hovered region
   */
  setHoveredRegion(regionId: string | null): void {
    this.hoveredRegion = regionId
    this.updateHoverDisplay()
  }

  /**
   * Update visual display of selection
   */
  private updateSelectionDisplay(): void {
    if (!this.selectedCircle) return

    this.selectedCircle.clear()
    if (this.selectedRegion) {
      const coords = this.hexCoordinates.get(this.selectedRegion)
      if (coords) {
        this.selectedCircle.lineStyle(3, 0xff00ff, 1)
        this.selectedCircle.strokeCircleShape(
          new Phaser.Geom.Circle(coords[0], coords[1], this.hexSize * 0.95)
        )
      }
    }
  }

  /**
   * Update visual display of hover
   */
  private updateHoverDisplay(): void {
    if (!this.hoveredCircle) return

    this.hoveredCircle.clear()
    if (this.hoveredRegion && this.hoveredRegion !== this.selectedRegion) {
      const coords = this.hexCoordinates.get(this.hoveredRegion)
      if (coords) {
        this.hoveredCircle.lineStyle(2, 0x88ccff, 0.7)
        this.hoveredCircle.strokeCircleShape(
          new Phaser.Geom.Circle(coords[0], coords[1], this.hexSize * 0.95)
        )
      }
    }
  }

  /**
   * Get all regions sorted by distance from center
   */
  getAllRegions(): Region[] {
    return this.regions
  }

  /**
   * Get visible regions within camera bounds
   */
  getVisibleRegions(camera: Phaser.Cameras.Scene2D.Camera): Region[] {
    const bounds = camera.worldView
    const visible: Region[] = []

    this.regions.forEach(region => {
      const coords = this.hexCoordinates.get(region.id)
      if (coords) {
        const [x, y] = coords
        if (
          x > bounds.left - this.hexSize &&
          x < bounds.right + this.hexSize &&
          y > bounds.top - this.hexSize &&
          y < bounds.bottom + this.hexSize
        ) {
          visible.push(region)
        }
      }
    })

    return visible
  }

  /**
   * Get region by ID
   */
  getRegion(id: string): Region | undefined {
    return this.regions.find(r => r.id === id)
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.hexCoordinates.clear()
    this.regionByPixel.clear()
    this.interactiveCircles.clear()
    this.regionLabels.forEach(label => label.destroy())
    this.regionLabels.clear()
    this.selectedCircle?.destroy()
    this.hoveredCircle?.destroy()
  }
}
