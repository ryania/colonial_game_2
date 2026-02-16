export type Culture = 'Spanish' | 'English' | 'French' | 'Portuguese' | 'Native' | 'African'
export type Religion = 'Catholic' | 'Protestant' | 'Animist' | 'Other'
export type TraitType = 'ambitious' | 'cautious' | 'charismatic' | 'shrewd' | 'weak' | 'strong'
export type Office = 'Governor' | 'Merchant' | 'Military_Leader' | 'None'
export type CharacterClass = 'governor' | 'merchant' | 'military' | 'diplomat' | 'scholar'
export type SuccessionLaw = 'primogeniture' | 'gavelkind' | 'elective' | 'absolute'
export type MenuType = 'character' | 'province' | 'army' | 'trade' | 'diplomacy' | 'none'
export type SettlementTier = 'wilderness' | 'village' | 'town' | 'city'

export interface Trait {
  name: TraitType
  description: string
  modifiers: {
    income?: number
    population_loyalty?: number
    growth?: number
  }
}

export interface Character {
  id: string
  name: string
  age: number
  birth_year: number
  death_year?: number
  is_alive: boolean
  traits: TraitType[]
  culture: Culture
  religion: Religion
  office: Office
  region_id: string
  dynasty_id: string

  // Character class system
  character_class: CharacterClass
  class_traits: TraitType[]

  // Family relationships
  father_id?: string
  mother_id?: string
  spouse_id?: string
  spouse_ids: string[] // For tracking multiple marriages/polygamy
  legitimate_children_ids: string[]
  illegitimate_children_ids: string[]
  sibling_ids: string[]

  // Keep old children_ids for backwards compatibility
  children_ids: string[]

  // Succession and titles
  heir_id?: string
  succession_order: string[]
  title_ids: string[]
  claim_ids: string[]

  // Relationships
  relationship_ids: string[]

  // Personal stats
  wealth: number
  prestige: number
  health: number
}

export interface Dynasty {
  id: string
  name: string
  culture: Culture
  founded_year: number
  member_ids: string[]
}

export interface Title {
  id: string
  name: string
  region_id: string
  current_holder_id: string
  succession_law: SuccessionLaw
  founded_year: number
}

export interface Population {
  total: number
  culture_distribution: {
    [key in Culture]?: number
  }
  religion_distribution: {
    [key in Religion]?: number
  }
  happiness: number
}

export interface Region {
  id: string
  name: string
  x: number
  y: number
  population: Population
  wealth: number
  trade_goods: string[]
  governor_id?: string
  owner_culture: Culture
  owner_religion: Religion

  // Settlement tier system
  settlement_tier: SettlementTier
  development_progress: number // 0-100, progress toward next tier
  months_at_tier: number // time at current tier
  development_invested: number // wealth invested toward tier advancement
}

export interface TradeRoute {
  id: string
  from_region_id: string
  to_region_id: string
  goods: string[]
  income_per_month: number
}

export interface GameState {
  current_year: number
  current_month: number
  current_tick: number
  regions: Region[]
  characters: Character[]
  dynasties: Dynasty[]
  trade_routes: TradeRoute[]
  is_paused: boolean
  game_speed: number // 0.5x, 1x, 2x, 4x

  // Player character system
  player_character_id: string
  focused_character_ids: string[] // Max 5 characters to track
  previous_player_character_ids: string[] // History for death/switch
  can_switch_character: boolean

  // Menu system
  active_menu: MenuType
  menu_context_id?: string // Character ID, Region ID, etc.
}

export interface GameEvent {
  type: 'character_born' | 'character_died' | 'culture_spread' | 'trade_income' | 'population_change'
  region_id?: string
  character_id?: string
  data: any
  timestamp: number
}
