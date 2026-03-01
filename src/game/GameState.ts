import { GameState, Region, Character, Dynasty, GameEvent, PopGroup, ColonialEntity, StateOwner, TradeCluster, TradeFlow, TradeRoute } from './types'

export class GameStateManager {
  private state: GameState
  private tick_interval: NodeJS.Timeout | null = null
  private listeners: Set<(state: GameState, events: GameEvent[]) => void> = new Set()
  private month_handlers: Set<(state: GameState) => void> = new Set()

  // O(1) lookup indices — kept in sync with their corresponding state arrays
  private regionIndex       = new Map<string, Region>()
  private characterIndex    = new Map<string, Character>()
  private entityIndex       = new Map<string, ColonialEntity>()
  private ownerIndex        = new Map<string, StateOwner>()
  private clusterIndex      = new Map<string, TradeCluster>()
  private popsByRegionIndex = new Map<string, PopGroup[]>()

  constructor() {
    this.state = {
      current_year: 1600,
      current_month: 1,
      current_tick: 0,
      regions: [],
      characters: [],
      dynasties: [],
      trade_routes: [],
      trade_clusters: [],
      trade_flows: [],
      pops: [],
      colonial_entities: [],
      state_owners: [],
      is_paused: true,
      game_speed: 1,
      player_character_id: '',
      focused_character_ids: [],
      previous_player_character_ids: [],
      can_switch_character: true
    }
  }

  getState(): GameState {
    return this.state
  }

  addRegion(region: Region): void {
    this.state.regions.push(region)
    this.regionIndex.set(region.id, region)
  }

  addCharacter(character: Character): void {
    this.state.characters.push(character)
    this.characterIndex.set(character.id, character)
  }

  addDynasty(dynasty: Dynasty): void {
    this.state.dynasties.push(dynasty)
  }

  getRegion(id: string): Region | undefined {
    return this.regionIndex.get(id)
  }

  getCharacter(id: string): Character | undefined {
    return this.characterIndex.get(id)
  }

  /**
   * Player Character Management
   */
  setPlayerCharacter(characterId: string): boolean {
    const character = this.getCharacter(characterId)
    if (!character) {
      return false
    }
    this.state.player_character_id = characterId
    return true
  }

  getPlayerCharacter(): Character | undefined {
    return this.getCharacter(this.state.player_character_id)
  }

  switchPlayerCharacter(characterId: string): boolean {
    const character = this.getCharacter(characterId)
    if (!character || !character.is_alive) {
      return false
    }

    // Store previous character in history
    if (this.state.player_character_id) {
      this.state.previous_player_character_ids.push(this.state.player_character_id)
    }

    this.state.player_character_id = characterId

    // Add to focused characters if not already there
    if (!this.state.focused_character_ids.includes(characterId)) {
      this.addFocusCharacter(characterId)
    }

    return true
  }

  addFocusCharacter(characterId: string): boolean {
    if (this.state.focused_character_ids.includes(characterId)) {
      return false // Already focused
    }

    if (this.state.focused_character_ids.length >= 5) {
      return false // Max 5 focused characters
    }

    const character = this.getCharacter(characterId)
    if (!character) {
      return false
    }

    this.state.focused_character_ids.push(characterId)
    return true
  }

  removeFocusCharacter(characterId: string): boolean {
    const index = this.state.focused_character_ids.indexOf(characterId)
    if (index === -1) {
      return false
    }

    this.state.focused_character_ids.splice(index, 1)
    return true
  }

  getFocusedCharacters(): Character[] {
    return this.state.focused_character_ids
      .map(id => this.getCharacter(id))
      .filter((c): c is Character => c !== undefined)
  }

  getPlayerCharacterHistory(): Character[] {
    return this.state.previous_player_character_ids
      .map(id => this.getCharacter(id))
      .filter((c): c is Character => c !== undefined)
  }

  canPlayerSwitchCharacter(): boolean {
    return this.state.can_switch_character
  }

  setCanSwitchCharacter(canSwitch: boolean): void {
    this.state.can_switch_character = canSwitch
  }

  setPops(pops: PopGroup[]): void {
    this.state.pops = pops
    this.popsByRegionIndex.clear()
    for (const pop of pops) {
      const list = this.popsByRegionIndex.get(pop.region_id)
      if (list) {
        list.push(pop)
      } else {
        this.popsByRegionIndex.set(pop.region_id, [pop])
      }
    }
  }

  getPops(): PopGroup[] {
    return this.state.pops
  }

  getPopsForRegion(regionId: string): PopGroup[] {
    return this.popsByRegionIndex.get(regionId) ?? []
  }

  addColonialEntity(entity: ColonialEntity): void {
    this.state.colonial_entities.push(entity)
    this.entityIndex.set(entity.id, entity)
  }

  getColonialEntity(id: string): ColonialEntity | undefined {
    return this.entityIndex.get(id)
  }

  getColonialEntities(): ColonialEntity[] {
    return this.state.colonial_entities
  }

  updateColonialEntity(id: string, updates: Partial<ColonialEntity>): void {
    const entity = this.getColonialEntity(id)
    if (entity) {
      Object.assign(entity, updates)
    }
  }

  setColonialEntities(entities: ColonialEntity[]): void {
    this.state.colonial_entities = entities
    this.entityIndex = new Map(entities.map(e => [e.id, e]))
  }

  addStateOwner(owner: StateOwner): void {
    this.state.state_owners.push(owner)
    this.ownerIndex.set(owner.id, owner)
  }

  getStateOwner(id: string): StateOwner | undefined {
    return this.ownerIndex.get(id)
  }

  getStateOwners(): StateOwner[] {
    return this.state.state_owners
  }

  updateStateOwner(id: string, updates: Partial<StateOwner>): void {
    const owner = this.getStateOwner(id)
    if (owner) {
      Object.assign(owner, updates)
    }
  }

  setStateOwners(owners: StateOwner[]): void {
    this.state.state_owners = owners
    this.ownerIndex = new Map(owners.map(o => [o.id, o]))
  }

  addTradeCluster(cluster: TradeCluster): void {
    this.state.trade_clusters.push(cluster)
    this.clusterIndex.set(cluster.id, cluster)
  }

  getTradeCluster(id: string): TradeCluster | undefined {
    return this.clusterIndex.get(id)
  }

  getTradeClusters(): TradeCluster[] {
    return this.state.trade_clusters
  }

  setTradeClusters(clusters: TradeCluster[]): void {
    this.state.trade_clusters = clusters
    this.clusterIndex = new Map(clusters.map(c => [c.id, c]))
  }

  getTradeFlows(): TradeFlow[] {
    return this.state.trade_flows
  }

  setTradeFlows(flows: TradeFlow[]): void {
    this.state.trade_flows = flows
  }

  addTradeRoute(route: TradeRoute): void {
    this.state.trade_routes.push(route)
  }

  setTradeRoutes(routes: TradeRoute[]): void {
    this.state.trade_routes = routes
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

  onMonthTick(handler: (state: GameState) => void): () => void {
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

    this.state.current_tick++

    // Advance time based on game speed (100ms per tick at 1x speed)
    // At 1x speed: 1000 ticks = 1 month (10 seconds per month); multiply by game_speed to scale
    if (this.state.current_tick % Math.round(100 / this.state.game_speed) === 0) {
      this.state.current_month++
      if (this.state.current_month > 12) {
        this.state.current_month = 1
        this.state.current_year++
      }

      // Call month handlers with current game state
      this.month_handlers.forEach(handler => handler(this.state))

      // Only notify listeners when state actually changes (on month tick)
      this.notifyListeners([])
    }
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

  getCurrentDay(): number {
    const ticksPerMonth = Math.round(100 / this.state.game_speed)
    const tickWithinMonth = this.state.current_tick % ticksPerMonth
    return Math.floor((tickWithinMonth / ticksPerMonth) * 30) + 1
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
