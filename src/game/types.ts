export type Culture =
  // European
  | 'Spanish' | 'English' | 'French' | 'Portuguese' | 'Dutch' | 'Flemish' | 'German' | 'Italian' | 'Polish'
  | 'Swedish' | 'Danish' | 'Russian' | 'Romanian' | 'Serbian' | 'Bulgarian' | 'Bosnian' | 'Albanian'
  | 'Tatar' | 'Estonian'
  // Middle Eastern / North African
  | 'Ottoman' | 'Moroccan' | 'Arab' | 'Persian'
  // Sub-Saharan African
  | 'African' | 'Swahili' | 'Ethiopian' | 'Somali' | 'Malagasy' | 'Amhara' | 'Shona' | 'Mbundu'
  | 'Kikuyu' | 'Afar' | 'Bamileke' | 'Wolof' | 'Ewe' | 'Hausa' | 'Kongo' | 'Nubian' | 'Tigrinya' | 'Akan'
  // South / Southeast Asian
  | 'Indian' | 'Mughal' | 'Gujarati' | 'Marathi' | 'Telugu' | 'Andamanese' | 'Tibetan' | 'Nepali'
  | 'Bhutanese' | 'Sikkimese' | 'Malay' | 'Dayak' | 'Bugis' | 'Uyghur'
  // East Asian
  | 'Chinese' | 'Japanese' | 'Korean' | 'Mongol' | 'Manchu'
  // Southeast Asian mainland
  | 'Vietnamese' | 'Khmer' | 'Burman' | 'Siamese'
  // Americas / Pacific / Indigenous
  | 'Native' | 'Animist'
  // Mediterranean
  | 'Greek'
export type Religion = 'Catholic' | 'Protestant' | 'Animist' | 'Other' | 'Orthodox' | 'Muslim' | 'Buddhist' | 'Shinto' | 'Hindu' | 'Christian'
export type TraitType = 'ambitious' | 'cautious' | 'charismatic' | 'shrewd' | 'weak' | 'strong'
export type Office = 'Governor' | 'Merchant' | 'Military_Leader' | 'None'
export type CharacterClass = 'governor' | 'merchant' | 'military' | 'diplomat' | 'scholar'
export type SuccessionLaw = 'primogeniture' | 'gavelkind' | 'elective' | 'absolute'
export type MenuType = 'character' | 'province' | 'army' | 'trade' | 'diplomacy' | 'governance' | 'none'
export type SettlementTier = 'wilderness' | 'village' | 'town' | 'city'
export type SocialClass = 'aristocrat' | 'clergy' | 'merchant' | 'artisan' | 'peasant' | 'laborer' | 'slave'
export type TerrainType = 'land' | 'ocean' | 'sea' | 'island' | 'lake' | 'coast'
export type MapMode = 'terrain' | 'population' | 'settlement' | 'owner' | 'wealth' | 'governance' | 'sovereignty'

export type ColonialEntityType =
  | 'charter_company'       // Trading company charter (e.g. Virginia Company)
  | 'proprietary_colony'    // Granted to a proprietor
  | 'royal_colony'          // Direct crown control
  | 'loose_confederation'   // Voluntary defensive/trade pact
  | 'crown_consolidation'   // Forced merger under a unified governor
  | 'independent_assembly'  // Mature colony with strong local assembly

export type GovernmentType =
  | 'kingdom'            // Hereditary monarchy under a king or queen
  | 'empire'             // Expansive monarchy under an emperor, controlling vast territories
  | 'republic'           // Elected or council-based governance
  | 'theocracy'          // Rule by religious authority, clergy holds political power
  | 'oligarchy'          // Rule concentrated in a small privileged class
  | 'duchy'              // Feudal territory under a duke, often a vassal state
  | 'sultanate'          // Islamic monarchy under a sultan
  | 'merchant_republic'  // Trade-driven oligarchic republic
  | 'tribal_confederacy' // Loose alliance of tribal or clan leaders
  | 'city_state'         // Independent sovereign city and surrounding territory

export type GovernancePhase =
  | 'early_settlement'      // 1600–1670s
  | 'loose_confederation'   // 1670s–1680s
  | 'crown_consolidation'   // 1680s–1700s
  | 'mature_royal'          // 1700s+
  | 'growing_tension'       // 1750s–1770s (end state for now)

export interface StateOwner {
  id: string
  name: string
  short_name: string               // Abbreviated name, e.g. "England"
  government_type: GovernmentType
  founding_year: number
  capital_region_id?: string       // Home capital (may be outside the game map)

  // Leadership — varies by government type
  head_of_state_id?: string        // Primary ruler (king, doge, sultan, consul...)
  dynasty_id?: string              // Ruling dynasty (monarchies, sultanates)
  succession_law?: SuccessionLaw   // Succession rule (monarchies)
  ruling_council_ids: string[]     // Council members (republics, oligarchies)

  // State religion
  official_religion?: Religion

  // Governance stats (0–100)
  legitimacy: number   // How recognized/accepted the government is
  stability: number    // Internal political stability
  prestige: number     // International standing and reputation

  // Direct home territories (regions owned as sovereign homeland, not via colonial entities)
  home_region_ids: string[]

  // Colonial possessions (controlled via colonial entity structures)
  colonial_entity_ids: string[]

  // Visualization
  map_color: number
}

export interface ColonialEntity {
  id: string
  name: string
  entity_type: ColonialEntityType
  governance_phase: GovernancePhase
  region_ids: string[]
  founding_year: number
  founding_culture: Culture

  // Sovereign owner
  state_owner_id?: string          // The StateOwner that controls this entity

  // Governance metrics (0–100)
  centralization: number
  autonomy: number
  stability: number
  crown_authority: number

  // Economics
  tax_rate: number
  trade_monopoly_goods: string[]

  // Phase progression
  phase_pressure: number
  phase_history: GovernancePhase[]

  // Visualization
  map_color: number
}

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
  succession_law?: SuccessionLaw
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

export interface PopGroup {
  id: string
  region_id: string
  culture: Culture
  religion: Religion
  social_class: SocialClass
  literacy: number   // 0-100 integer
  size: number       // integer >= 0; removed when reaches 0
  happiness: number  // 0-100 float
}

export interface Region {
  id: string
  name: string
  x: number
  y: number
  lat?: number
  lng?: number
  terrain_type: TerrainType
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

  // Governance
  colonial_entity_id?: string  // Parent colonial entity (Americas, Africa, Asia colonies)
  state_owner_id?: string      // Direct sovereign state (home territories bypass colonial entities)
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
  pops: PopGroup[]   // flat array of all pop groups across all regions
  colonial_entities: ColonialEntity[]
  state_owners: StateOwner[]
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
