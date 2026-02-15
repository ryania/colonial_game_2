export type Culture = 'Spanish' | 'English' | 'French' | 'Portuguese' | 'Native' | 'African'
export type Religion = 'Catholic' | 'Protestant' | 'Animist' | 'Other'
export type TraitType = 'ambitious' | 'cautious' | 'charismatic' | 'shrewd' | 'weak' | 'strong'
export type Office = 'Governor' | 'Merchant' | 'Military_Leader' | 'None'

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
  spouse_id?: string
  children_ids: string[]
  wealth: number
}

export interface Dynasty {
  id: string
  name: string
  culture: Culture
  founded_year: number
  member_ids: string[]
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
}

export interface GameEvent {
  type: 'character_born' | 'character_died' | 'culture_spread' | 'trade_income' | 'population_change'
  region_id?: string
  character_id?: string
  data: any
  timestamp: number
}
