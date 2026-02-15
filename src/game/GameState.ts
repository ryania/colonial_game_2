import { GameState, Region, Character, Dynasty, GameEvent } from './types'

export class GameStateManager {
  private state: GameState
  private tick_interval: NodeJS.Timeout | null = null
  private listeners: Set<(state: GameState, events: GameEvent[]) => void> = new Set()
  private month_handlers: Set<() => void> = new Set()

  constructor() {
    this.state = {
      current_year: 1600,
      current_month: 1,
      current_tick: 0,
      regions: [],
      characters: [],
      dynasties: [],
      trade_routes: [],
      is_paused: true,
      game_speed: 1
    }
  }

  getState(): GameState {
    return this.state
  }

  addRegion(region: Region): void {
    this.state.regions.push(region)
  }

  addCharacter(character: Character): void {
    this.state.characters.push(character)
  }

  addDynasty(dynasty: Dynasty): void {
    this.state.dynasties.push(dynasty)
  }

  getRegion(id: string): Region | undefined {
    return this.state.regions.find(r => r.id === id)
  }

  getCharacter(id: string): Character | undefined {
    return this.state.characters.find(c => c.id === id)
  }

  updateRegion(id: string, updates: Partial<Region>): void {
    const region = this.getRegion(id)
    if (region) {
      Object.assign(region, updates)
    }
  }

  updateCharacter(id: string, updates: Partial<Character>): void {
    const character = this.getCharacter(id)
    if (character) {
      Object.assign(character, updates)
    }
  }

  subscribe(listener: (state: GameState, events: GameEvent[]) => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  onMonthTick(handler: () => void): () => void {
    this.month_handlers.add(handler)
    return () => {
      this.month_handlers.delete(handler)
    }
  }

  private notifyListeners(events: GameEvent[]): void {
    this.listeners.forEach(listener => listener(this.state, events))
  }

  private tickGame(): void {
    if (this.state.is_paused) {
      return
    }

    const events: GameEvent[] = []
    this.state.current_tick++

    // Advance time based on game speed (100ms per tick at 1x speed)
    // At 1x speed: 100ms = 1 month, so we advance month every tick
    if (this.state.current_tick % Math.round(10 / this.state.game_speed) === 0) {
      this.state.current_month++
      if (this.state.current_month > 12) {
        this.state.current_month = 1
        this.state.current_year++
      }

      // Call month handlers
      this.month_handlers.forEach(handler => handler())
    }

    this.notifyListeners(events)
  }

  play(): void {
    this.state.is_paused = false
    if (!this.tick_interval) {
      this.tick_interval = setInterval(() => this.tickGame(), 100)
    }
  }

  pause(): void {
    this.state.is_paused = true
    if (this.tick_interval) {
      clearInterval(this.tick_interval)
      this.tick_interval = null
    }
  }

  setGameSpeed(speed: number): void {
    // Speed options: 0.5, 1, 2, 4
    if ([0.5, 1, 2, 4].includes(speed)) {
      this.state.game_speed = speed
    }
  }

  togglePause(): void {
    if (this.state.is_paused) {
      this.play()
    } else {
      this.pause()
    }
  }

  getFormattedDate(): string {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December']
    return `${months[this.state.current_month - 1]} ${this.state.current_year}`
  }

  destroy(): void {
    if (this.tick_interval) {
      clearInterval(this.tick_interval)
      this.tick_interval = null
    }
    this.listeners.clear()
    this.month_handlers.clear()
  }
}

export const gameState = new GameStateManager()
