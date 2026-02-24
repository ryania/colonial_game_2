import {
  StateOwner,
  GovernmentType,
  ColonialEntity,
  Religion,
  SuccessionLaw,
} from './types'

// ─── Government type labels and descriptions ───────────────────────────────

export const GOVERNMENT_TYPE_LABELS: Record<GovernmentType, string> = {
  kingdom:            'Kingdom',
  empire:             'Empire',
  republic:           'Republic',
  theocracy:          'Theocracy',
  oligarchy:          'Oligarchy',
  duchy:              'Duchy',
  sultanate:          'Sultanate',
  merchant_republic:  'Merchant Republic',
  tribal_confederacy: 'Tribal Confederacy',
  city_state:         'City-State',
}

export const GOVERNMENT_TYPE_DESCRIPTIONS: Record<GovernmentType, string> = {
  kingdom:
    'A hereditary monarchy where power is vested in a king or queen, typically passed down through dynastic succession. Stability depends heavily on the monarch\'s legitimacy and the strength of noble loyalty.',
  empire:
    'A vast multi-ethnic domain ruled by an emperor. Empires control subject territories across wide distances, but face constant challenges maintaining coherence and loyalty at the periphery.',
  republic:
    'A state in which supreme power is held by elected representatives and councils. Republics tend toward stability through institutional checks, though factional conflict can undermine governance.',
  theocracy:
    'A government in which religious authority and political power are unified under clerical leadership. The state religion is paramount, and the clergy\'s moral authority legitimizes rule.',
  oligarchy:
    'Power concentrated in the hands of a small ruling class — usually landed nobility or wealthy families. Legitimacy is fragile and depends on managing rivalries within the elite.',
  duchy:
    'A feudal territory governed by a duke, typically holding title as a vassal under a higher sovereign. Smaller in scope than a kingdom, a duchy depends on its liege for protection and legitimacy.',
  sultanate:
    'An Islamic monarchy governed by a sultan. Temporal authority is intertwined with Islamic law and religious tradition, granting the sultan legitimacy through faith as much as conquest.',
  merchant_republic:
    'A republic dominated by wealthy merchant guilds and trading families. Commerce is the lifeblood of the state, and political power flows to those who control the most trade routes.',
  tribal_confederacy:
    'A loose alliance of tribal chiefs or clan leaders governing through consensus and tradition. Cohesion depends on shared threats or interests — without them, the confederacy fragments.',
  city_state:
    'An independent sovereign state comprising a single city and its immediate hinterland. City-states are nimble and commercially active, but vulnerable to larger neighbors.',
}

export const GOVERNMENT_TYPE_RULER_TITLE: Record<GovernmentType, string> = {
  kingdom:            'Monarch',
  empire:             'Emperor',
  republic:           'Consul',
  theocracy:          'High Priest',
  oligarchy:          'Archon',
  duchy:              'Duke',
  sultanate:          'Sultan',
  merchant_republic:  'Doge',
  tribal_confederacy: 'High Chief',
  city_state:         'Magistrate',
}

export const GOVERNMENT_TYPE_COLORS: Record<GovernmentType, string> = {
  kingdom:            '#7a4a8b',
  empire:             '#8b2a2a',
  republic:           '#2a6b8b',
  theocracy:          '#6b5a2a',
  oligarchy:          '#4a4a4a',
  duchy:              '#5a3a6b',
  sultanate:          '#8b4a1a',
  merchant_republic:  '#2a6b3a',
  tribal_confederacy: '#5a6b2a',
  city_state:         '#2a5a6b',
}

// ─── Monthly governance modifiers by government type ──────────────────────

interface GovernmentModifiers {
  legitimacyDelta: number
  stabilityDelta: number
  prestigeDelta: number
}

function computeGovernmentModifiers(
  owner: StateOwner,
  ownedEntities: ColonialEntity[]
): GovernmentModifiers {
  const entityCount = ownedEntities.length

  switch (owner.government_type) {
    case 'kingdom':
      return {
        legitimacyDelta: 0,
        stabilityDelta: owner.legitimacy > 60 ? 0.05 : -0.05,
        prestigeDelta: 0.02,
      }
    case 'empire':
      return {
        legitimacyDelta: 0.02,
        stabilityDelta: -0.03 * Math.max(1, entityCount - 1),
        prestigeDelta: 0.05,
      }
    case 'republic':
      return {
        legitimacyDelta: 0.04,
        stabilityDelta: 0.06,
        prestigeDelta: 0.01,
      }
    case 'theocracy':
      return {
        legitimacyDelta: 0.05,
        stabilityDelta: 0.05,
        prestigeDelta: 0.02,
      }
    case 'oligarchy':
      return {
        legitimacyDelta: -0.03,
        stabilityDelta: -0.02,
        prestigeDelta: 0,
      }
    case 'duchy':
      return {
        legitimacyDelta: -0.01,
        stabilityDelta: 0.03,
        prestigeDelta: -0.01,
      }
    case 'sultanate':
      return {
        legitimacyDelta: 0.01,
        stabilityDelta: owner.legitimacy > 55 ? 0.04 : -0.03,
        prestigeDelta: 0.02,
      }
    case 'merchant_republic':
      return {
        legitimacyDelta: 0.03,
        stabilityDelta: 0.05,
        prestigeDelta: 0.03,
      }
    case 'tribal_confederacy':
      return {
        legitimacyDelta: -0.02,
        stabilityDelta: -0.04,
        prestigeDelta: -0.02,
      }
    case 'city_state':
      return {
        legitimacyDelta: 0.03,
        stabilityDelta: 0.05,
        prestigeDelta: -0.01,
      }
  }
}

// ─── State owner definition type ──────────────────────────────────────────

interface StateOwnerDef {
  id: string
  name: string
  short_name: string
  government_type: GovernmentType
  founding_year: number
  capital_region_id?: string
  official_religion?: Religion
  // Home territories — European/homeland provinces owned directly
  home_region_ids: string[]
  // Colonial possessions — controlled via colonial entity structures
  colonial_entity_ids: string[]
  legitimacy: number
  stability: number
  prestige: number
  succession_law?: SuccessionLaw
  map_color: number
}

// ─── Starting state owners ─────────────────────────────────────────────────

const STARTING_STATE_OWNERS: StateOwnerDef[] = [

  // ── Atlantic colonial powers (also have colonial entities) ──────────────

  {
    id: 'kingdom_of_england',
    name: 'Kingdom of England',
    short_name: 'England',
    government_type: 'kingdom',
    founding_year: 927,
    capital_region_id: 'london',
    official_religion: 'Protestant',
    home_region_ids: [
      // England
      'london', 'bristol', 'exeter', 'plymouth', 'norwich', 'york', 'liverpool', 'cardiff',
      // Scotland
      'edinburgh', 'glasgow',
      // Ireland
      'dublin', 'cork', 'galway', 'belfast',
    ],
    colonial_entity_ids: ['virginia_company', 'new_england_council', 'english_caribbean'],
    legitimacy: 75,
    stability: 70,
    prestige: 65,
    succession_law: 'primogeniture',
    map_color: 0x1a3a8b,
  },

  {
    id: 'spanish_empire',
    name: 'Spanish Empire',
    short_name: 'Spain',
    government_type: 'empire',
    founding_year: 1492,
    capital_region_id: 'madrid',
    official_religion: 'Catholic',
    home_region_ids: [
      // Castile & Aragon (Iberian heartland)
      'madrid', 'seville', 'cadiz', 'barcelona', 'valencia', 'toledo',
      'zaragoza', 'granada', 'murcia', 'navarre', 'aragon',
      // Kingdom of Naples / Sicily / Sardinia (Spanish Italy)
      'naples', 'palermo', 'bari', 'cagliari', 'messina',
      // Spanish Netherlands (southern Low Countries, still Habsburg in 1600)
      'bruges', 'ghent', 'brussels', 'antwerp',
    ],
    colonial_entity_ids: ['consejo_de_indias'],
    legitimacy: 80,
    stability: 65,
    prestige: 80,
    succession_law: 'primogeniture',
    map_color: 0x8b1a1a,
  },

  {
    id: 'kingdom_of_portugal',
    name: 'Kingdom of Portugal',
    short_name: 'Portugal',
    government_type: 'kingdom',
    founding_year: 1139,
    capital_region_id: 'lisbon',
    official_religion: 'Catholic',
    home_region_ids: ['lisbon', 'porto', 'coimbra', 'evora', 'faro'],
    colonial_entity_ids: ['estado_do_brasil'],
    legitimacy: 70,
    stability: 60,
    prestige: 60,
    succession_law: 'primogeniture',
    map_color: 0x1a6b2e,
  },

  {
    id: 'dutch_republic',
    name: 'Dutch Republic',
    short_name: 'Netherlands',
    government_type: 'merchant_republic',
    founding_year: 1581,
    capital_region_id: 'amsterdam',
    official_religion: 'Protestant',
    // United Provinces (northern Low Countries); southern provinces are Spanish
    home_region_ids: ['amsterdam', 'rotterdam', 'leiden', 'utrecht'],
    colonial_entity_ids: [],
    legitimacy: 70,
    stability: 75,
    prestige: 60,
    map_color: 0xc87e1a,
  },

  {
    id: 'kingdom_of_france',
    name: 'Kingdom of France',
    short_name: 'France',
    government_type: 'kingdom',
    founding_year: 843,
    capital_region_id: 'paris',
    official_religion: 'Catholic',
    home_region_ids: [
      'paris', 'bordeaux', 'nantes', 'marseille', 'brest', 'rouen', 'lyon',
      'toulouse', 'orleans', 'dijon', 'strasbourg', 'rennes', 'la_rochelle',
      'montpellier', 'avignon', 'calais',
    ],
    colonial_entity_ids: [],
    legitimacy: 80,
    stability: 55,
    prestige: 75,
    succession_law: 'primogeniture',
    map_color: 0x6b1a8b,
  },

  // ── Major European powers ───────────────────────────────────────────────

  {
    id: 'holy_roman_empire',
    name: 'Holy Roman Empire',
    short_name: 'Holy Roman Empire',
    government_type: 'empire',
    founding_year: 962,
    capital_region_id: 'vienna',
    official_religion: 'Catholic',
    home_region_ids: [
      // German heartland
      'hamburg', 'lubeck', 'frankfurt', 'nuremberg', 'cologne', 'augsburg',
      'dresden', 'magdeburg', 'kiel', 'stettin',
      // Habsburg hereditary lands (Austria, Bohemia)
      'vienna', 'prague', 'innsbruck', 'linz', 'graz', 'salzburg',
      // Swiss Confederation (loosely within HRE borders)
      'zurich',
      // Prince-Bishopric of Liège
      'liege',
      // Duchy of Milan (Spanish-held but nominally HRE)
      'milan',
      // Baltic (Teutonic successor states)
      'riga',
    ],
    colonial_entity_ids: [],
    legitimacy: 65,
    stability: 50,
    prestige: 70,
    succession_law: 'elective',
    map_color: 0xc8a420,
  },

  {
    id: 'kingdom_of_sweden',
    name: 'Kingdom of Sweden',
    short_name: 'Sweden',
    government_type: 'kingdom',
    founding_year: 1523,
    capital_region_id: 'stockholm',
    official_religion: 'Protestant',
    home_region_ids: [
      'stockholm', 'gothenburg', 'abo', 'viborg_finland',
      // Reval/Tallinn: Swedish possession since 1561 Livonian War
      'tallinn',
    ],
    colonial_entity_ids: [],
    legitimacy: 70,
    stability: 65,
    prestige: 55,
    succession_law: 'primogeniture',
    map_color: 0x4a90c8,
  },

  {
    id: 'kingdom_of_denmark',
    name: 'Kingdom of Denmark',
    short_name: 'Denmark',
    government_type: 'kingdom',
    founding_year: 958,
    capital_region_id: 'copenhagen',
    official_religion: 'Protestant',
    home_region_ids: [
      // Denmark proper
      'copenhagen', 'malmo',
      // Norway (in personal union with Denmark)
      'oslo', 'bergen', 'trondheim',
      // Iceland
      'reykjavik',
    ],
    colonial_entity_ids: [],
    legitimacy: 70,
    stability: 65,
    prestige: 50,
    succession_law: 'primogeniture',
    map_color: 0xc83a3a,
  },

  {
    id: 'polish_lithuanian_commonwealth',
    name: 'Polish-Lithuanian Commonwealth',
    short_name: 'Poland-Lithuania',
    government_type: 'republic',   // Elected monarchy (szlachta republic)
    founding_year: 1569,
    capital_region_id: 'warsaw',
    official_religion: 'Catholic',
    home_region_ids: [
      // Poland
      'warsaw', 'krakow', 'poznan', 'gdansk',
      // Lithuania and borderlands
      'vilnius', 'lwow',
    ],
    colonial_entity_ids: [],
    legitimacy: 65,
    stability: 55,
    prestige: 60,
    succession_law: 'elective',
    map_color: 0xb82020,
  },

  {
    id: 'russian_tsardom',
    name: 'Tsardom of Russia',
    short_name: 'Russia',
    government_type: 'kingdom',
    founding_year: 1547,
    capital_region_id: 'moscow',
    official_religion: 'Orthodox',
    home_region_ids: ['moscow', 'novgorod', 'smolensk', 'archangel', 'pskov'],
    colonial_entity_ids: [],
    legitimacy: 70,
    stability: 60,
    prestige: 45,
    succession_law: 'primogeniture',
    map_color: 0x2e4a8b,
  },

  {
    id: 'ottoman_empire',
    name: 'Ottoman Empire',
    short_name: 'Ottomans',
    government_type: 'sultanate',
    founding_year: 1299,
    capital_region_id: 'rhodes',   // closest mapped province to Constantinople
    official_religion: 'Muslim',
    home_region_ids: [
      // Aegean / Eastern Mediterranean
      'rhodes',
      // Balkans
      'thessaloniki', 'belgrade', 'sarajevo', 'albania', 'bulgaria', 'serbia',
      // Danubian Principalities (vassals)
      'wallachia', 'moldavia', 'transylvania',
      // Black Sea
      'crimea',
    ],
    colonial_entity_ids: [],
    legitimacy: 80,
    stability: 65,
    prestige: 80,
    succession_law: 'absolute',
    map_color: 0xc84a1a,
  },

  {
    id: 'venetian_republic',
    name: 'Most Serene Republic of Venice',
    short_name: 'Venice',
    government_type: 'merchant_republic',
    founding_year: 697,
    capital_region_id: 'venice',
    official_religion: 'Catholic',
    home_region_ids: [
      'venice',
      // Venetian island possessions
      'corfu', 'crete',
    ],
    colonial_entity_ids: [],
    legitimacy: 75,
    stability: 70,
    prestige: 65,
    map_color: 0x8b2a6b,
  },

  {
    id: 'italian_states',
    name: 'Italian States',
    short_name: 'Italian States',
    government_type: 'oligarchy',   // Umbrella for city-states, Papal States, minor duchies
    founding_year: 1454,            // Peace of Lodi — Italian league balance of power
    official_religion: 'Catholic',
    home_region_ids: [
      // Papal States
      'rome', 'bologna',
      // Grand Duchy of Tuscany
      'florence', 'livorno',
      // Republic of Genoa
      'genoa',
      // Duchy of Savoy-Piedmont
      'turin',
      // Knights Hospitaller
      'malta',
    ],
    colonial_entity_ids: [],
    legitimacy: 60,
    stability: 55,
    prestige: 60,
    map_color: 0x5a1a8b,
  },
]

// ─── StateOwnerSystem class ───────────────────────────────────────────────

export class StateOwnerSystem {
  initializeOwners(): StateOwner[] {
    return STARTING_STATE_OWNERS.map((def): StateOwner => ({
      id: def.id,
      name: def.name,
      short_name: def.short_name,
      government_type: def.government_type,
      founding_year: def.founding_year,
      capital_region_id: def.capital_region_id,
      official_religion: def.official_religion,
      home_region_ids: def.home_region_ids,
      colonial_entity_ids: def.colonial_entity_ids,
      legitimacy: def.legitimacy,
      stability: def.stability,
      prestige: def.prestige,
      succession_law: def.succession_law,
      ruling_council_ids: [],
      map_color: def.map_color,
    }))
  }

  processMonthTick(owners: StateOwner[], entities: ColonialEntity[]): StateOwner[] {
    return owners.map(owner => {
      const ownedEntities = entities.filter(e => owner.colonial_entity_ids.includes(e.id))
      const { legitimacyDelta, stabilityDelta, prestigeDelta } =
        computeGovernmentModifiers(owner, ownedEntities)

      return {
        ...owner,
        legitimacy: Math.max(0, Math.min(100, owner.legitimacy + legitimacyDelta)),
        stability:  Math.max(0, Math.min(100, owner.stability  + stabilityDelta)),
        prestige:   Math.max(0, Math.min(100, owner.prestige   + prestigeDelta)),
      }
    })
  }

  getOwnerForEntity(entityId: string, owners: StateOwner[]): StateOwner | undefined {
    return owners.find(o => o.colonial_entity_ids.includes(entityId))
  }
}

export const stateOwnerSystem = new StateOwnerSystem()
