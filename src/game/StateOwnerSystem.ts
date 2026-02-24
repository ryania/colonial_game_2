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
    capital_region_id: 'istanbul',
    official_religion: 'Muslim',
    home_region_ids: [
      // Aegean / Eastern Mediterranean
      'rhodes', 'istanbul',
      // Anatolia
      'ankara', 'bursa', 'izmir', 'trabzon', 'erzurum', 'konya',
      // Balkans
      'thessaloniki', 'belgrade', 'sarajevo', 'albania', 'bulgaria', 'serbia',
      // Danubian Principalities (vassals)
      'wallachia', 'moldavia', 'transylvania',
      // Black Sea
      'crimea',
      // Levant (Syria, Palestine, Lebanon)
      'aleppo', 'damascus', 'beirut', 'jerusalem',
      // Mesopotamia
      'mosul', 'baghdad', 'basra',
      // Hejaz (Ottoman vassal: Sharif of Mecca)
      'mecca', 'medina',
      // Arabia (Ottoman-controlled southern Arabia)
      'aden',
      // Egypt
      'egypt_cairo', 'egypt_alexandria',
      // North Africa
      'algiers', 'tunis', 'tripoli', 'benghazi',
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

  // ── Middle East / Central Asia ──────────────────────────────────────────

  {
    id: 'safavid_persia',
    name: 'Safavid Persia',
    short_name: 'Persia',
    government_type: 'sultanate',
    founding_year: 1501,
    capital_region_id: 'isfahan',
    official_religion: 'Muslim',
    home_region_ids: ['isfahan', 'shiraz', 'tabriz', 'tehran', 'herat'],
    colonial_entity_ids: [],
    legitimacy: 80,
    stability: 70,
    prestige: 75,
    succession_law: 'absolute',
    map_color: 0x2a8b4a,
  },

  {
    id: 'uzbek_khanates',
    name: 'Uzbek Khanates',
    short_name: 'Uzbek',
    government_type: 'sultanate',
    founding_year: 1500,
    capital_region_id: 'samarkand',
    official_religion: 'Muslim',
    home_region_ids: ['samarkand', 'bukhara', 'khiva'],
    colonial_entity_ids: [],
    legitimacy: 65,
    stability: 55,
    prestige: 55,
    succession_law: 'elective',
    map_color: 0x6b4a8b,
  },

  {
    id: 'omani_sultanate',
    name: 'Sultanate of Oman',
    short_name: 'Oman',
    government_type: 'sultanate',
    founding_year: 1507,
    capital_region_id: 'muscat',
    official_religion: 'Muslim',
    home_region_ids: ['muscat'],
    colonial_entity_ids: [],
    legitimacy: 65,
    stability: 60,
    prestige: 50,
    map_color: 0xc87820,
  },

  {
    id: 'zaydi_imamate',
    name: 'Zaydi Imamate of Yemen',
    short_name: 'Yemen',
    government_type: 'theocracy',
    founding_year: 897,
    capital_region_id: 'yemen_sanaa',
    official_religion: 'Muslim',
    home_region_ids: ['yemen_sanaa'],
    colonial_entity_ids: [],
    legitimacy: 70,
    stability: 60,
    prestige: 50,
    map_color: 0x4a8b2a,
  },

  {
    id: 'tibetan_theocracy',
    name: 'Tibetan Kingdom',
    short_name: 'Tibet',
    government_type: 'theocracy',
    founding_year: 1354,
    capital_region_id: 'lhasa',
    official_religion: 'Buddhist',
    home_region_ids: ['lhasa', 'tibet'],
    colonial_entity_ids: [],
    legitimacy: 70,
    stability: 60,
    prestige: 55,
    map_color: 0xc85a1a,
  },

  // ── East Asia ───────────────────────────────────────────────────────────

  {
    id: 'ming_dynasty',
    name: 'Ming Dynasty',
    short_name: 'Ming China',
    government_type: 'empire',
    founding_year: 1368,
    capital_region_id: 'beijing',
    official_religion: 'Buddhist',
    home_region_ids: [
      // North China
      'beijing', 'hebei', 'shandong', 'henan', 'shanxi',
      // Central & Yangtze China
      'nanjing', 'shanghai', 'hangzhou', 'hubei', 'hunan',
      // South China
      'guangdong', 'guangzhou', 'guangxi', 'fujian', 'fuzhou', 'xiamen',
      // Southwest China
      'sichuan', 'yunnan',
      // Liaodong (Northeast — still Ming in 1600, before Jurchen takeover)
      'liaodong',
      // Taiwan (under nominal Ming influence)
      'taiwan',
    ],
    colonial_entity_ids: [],
    legitimacy: 75,
    stability: 60,
    prestige: 80,
    succession_law: 'primogeniture',
    map_color: 0xc8a418,
  },

  {
    id: 'mongol_khanates',
    name: 'Mongol Khanates',
    short_name: 'Mongolia',
    government_type: 'tribal_confederacy',
    founding_year: 1206,
    capital_region_id: 'mongolia',
    official_religion: 'Buddhist',
    home_region_ids: ['mongolia', 'manchuria', 'xinjiang'],
    colonial_entity_ids: [],
    legitimacy: 50,
    stability: 40,
    prestige: 45,
    map_color: 0x8b6b2a,
  },

  {
    id: 'tokugawa_shogunate',
    name: 'Tokugawa Shogunate',
    short_name: 'Japan',
    government_type: 'oligarchy',
    founding_year: 1603,
    capital_region_id: 'edo',
    official_religion: 'Shinto',
    home_region_ids: [
      'edo', 'kyoto', 'osaka', 'hiroshima', 'sendai',
      'kanazawa', 'kagoshima', 'nagasaki', 'hokkaido', 'ryukyu',
    ],
    colonial_entity_ids: [],
    legitimacy: 75,
    stability: 70,
    prestige: 70,
    succession_law: 'absolute',
    map_color: 0x8b1a3a,
  },

  {
    id: 'joseon_kingdom',
    name: 'Joseon Kingdom',
    short_name: 'Korea',
    government_type: 'kingdom',
    founding_year: 1392,
    capital_region_id: 'hanseong',
    official_religion: 'Buddhist',
    home_region_ids: ['hanseong', 'busan', 'pyongyang', 'korea_interior'],
    colonial_entity_ids: [],
    legitimacy: 70,
    stability: 65,
    prestige: 60,
    succession_law: 'primogeniture',
    map_color: 0x1a6b8b,
  },

  // ── South Asia ──────────────────────────────────────────────────────────

  {
    id: 'mughal_empire',
    name: 'Mughal Empire',
    short_name: 'Mughals',
    government_type: 'empire',
    founding_year: 1526,
    capital_region_id: 'agra',
    official_religion: 'Muslim',
    home_region_ids: [
      // Heartland (Gangetic plain & northwest)
      'delhi', 'agra', 'lahore', 'punjab', 'sind', 'kashmir',
      // Rajputana (Mughal vassals)
      'rajputana', 'jaipur', 'malwa',
      // Gujarat
      'gujarat', 'gujarat_coast', 'surat',
      // Bengal & Bihar
      'bengal', 'bihar', 'patna', 'chittagong',
      // Eastern
      'orissa',
      // Kabul & Kandahar (Afghan territories under Mughal)
      'kabul', 'kandahar',
    ],
    colonial_entity_ids: [],
    legitimacy: 80,
    stability: 65,
    prestige: 80,
    succession_law: 'absolute',
    map_color: 0x1a4a8b,
  },

  {
    id: 'deccan_sultanates',
    name: 'Deccan Sultanates',
    short_name: 'Deccan',
    government_type: 'sultanate',
    founding_year: 1490,
    capital_region_id: 'hyderabad',
    official_religion: 'Muslim',
    home_region_ids: ['hyderabad', 'hyderabad_deccan', 'deccan', 'gondwana', 'assam'],
    colonial_entity_ids: [],
    legitimacy: 65,
    stability: 55,
    prestige: 55,
    succession_law: 'absolute',
    map_color: 0x8b4a8b,
  },

  {
    id: 'south_indian_kingdoms',
    name: 'South Indian Kingdoms',
    short_name: 'South India',
    government_type: 'kingdom',
    founding_year: 1336,   // Vijayanagara Empire founding
    capital_region_id: 'vijayanagar',
    official_religion: 'Hindu',
    home_region_ids: [
      'vijayanagar', 'mysore', 'calicut', 'malabar', 'konkan',
      'masulipatnam', 'thanjavur', 'vizag', 'deccan_south',
      'quilon', 'nagapattinam', 'pondicherry', 'cochin', 'madras',
    ],
    colonial_entity_ids: [],
    legitimacy: 60,
    stability: 55,
    prestige: 55,
    succession_law: 'primogeniture',
    map_color: 0xc84a1a,
  },

  {
    id: 'himalayan_kingdoms',
    name: 'Himalayan Kingdoms',
    short_name: 'Himalayas',
    government_type: 'kingdom',
    founding_year: 1200,
    capital_region_id: 'nepal',
    official_religion: 'Hindu',
    home_region_ids: ['nepal', 'bhutan', 'sikkim', 'ceylon', 'manipur', 'maldives'],
    colonial_entity_ids: [],
    legitimacy: 65,
    stability: 65,
    prestige: 45,
    succession_law: 'primogeniture',
    map_color: 0x4a8b6b,
  },

  // ── Southeast Asia ──────────────────────────────────────────────────────

  {
    id: 'kingdom_of_ayutthaya',
    name: 'Kingdom of Ayutthaya',
    short_name: 'Ayutthaya',
    government_type: 'kingdom',
    founding_year: 1350,
    capital_region_id: 'ayutthaya',
    official_religion: 'Buddhist',
    home_region_ids: ['ayutthaya', 'chiang_mai'],
    colonial_entity_ids: [],
    legitimacy: 70,
    stability: 65,
    prestige: 60,
    succession_law: 'absolute',
    map_color: 0x8b6b1a,
  },

  {
    id: 'burmese_kingdoms',
    name: 'Toungoo Dynasty',
    short_name: 'Burma',
    government_type: 'kingdom',
    founding_year: 1510,
    capital_region_id: 'pagan',
    official_religion: 'Buddhist',
    home_region_ids: ['mandalay', 'pagan', 'rangoon'],
    colonial_entity_ids: [],
    legitimacy: 65,
    stability: 55,
    prestige: 55,
    succession_law: 'absolute',
    map_color: 0x4a6b1a,
  },

  {
    id: 'vietnamese_kingdoms',
    name: 'Vietnamese Kingdoms',
    short_name: 'Vietnam',
    government_type: 'kingdom',
    founding_year: 939,
    capital_region_id: 'hanoi',
    official_religion: 'Buddhist',
    home_region_ids: ['hanoi', 'hue', 'vietnam_north', 'vietnam_south', 'saigon'],
    colonial_entity_ids: [],
    legitimacy: 65,
    stability: 55,
    prestige: 55,
    succession_law: 'absolute',
    map_color: 0x8b1a6b,
  },

  {
    id: 'khmer_kingdom',
    name: 'Khmer Kingdom',
    short_name: 'Khmer',
    government_type: 'kingdom',
    founding_year: 802,
    capital_region_id: 'phnom_penh',
    official_religion: 'Buddhist',
    home_region_ids: ['angkor', 'phnom_penh'],
    colonial_entity_ids: [],
    legitimacy: 55,
    stability: 50,
    prestige: 50,
    succession_law: 'absolute',
    map_color: 0x1a8b6b,
  },

  {
    id: 'malay_sultanates',
    name: 'Malay Sultanates',
    short_name: 'Malaya',
    government_type: 'sultanate',
    founding_year: 1400,
    capital_region_id: 'malacca',
    official_religion: 'Muslim',
    home_region_ids: [
      // Malay Peninsula
      'malacca', 'johor', 'pahang', 'kedah',
      // Borneo sultanates
      'brunei',
      // Sumatra
      'aceh', 'jambi', 'bengkulu', 'palembang',
      // Java
      'banten', 'cirebon', 'mataram', 'surabaya',
      // Mindanao (Maguindanao Sultanate)
      'mindanao',
    ],
    colonial_entity_ids: [],
    legitimacy: 65,
    stability: 55,
    prestige: 60,
    succession_law: 'absolute',
    map_color: 0xc83a8b,
  },

  {
    id: 'eastern_indonesian_tribes',
    name: 'Eastern Indonesian Peoples',
    short_name: 'East Indies',
    government_type: 'tribal_confederacy',
    founding_year: 1000,
    official_religion: 'Animist',
    home_region_ids: [
      // Maluku / Spice Islands
      'ternate', 'banda', 'ambon',
      // Sulawesi
      'celebes', 'sulawesi_north',
      // Lesser Sunda & Timor
      'lesser_sunda', 'timor',
      // Borneo interior
      'borneo_central', 'borneo_east', 'borneo_north', 'borneo_south',
      // New Guinea
      'new_guinea_west', 'papua_new_guinea',
      // Andaman Islands
      'andaman_islands',
    ],
    colonial_entity_ids: [],
    legitimacy: 40,
    stability: 45,
    prestige: 30,
    map_color: 0x4a8b8b,
  },

  // ── North Africa (extending Ottoman coverage via separate Morocco & Sudan) ─

  {
    id: 'kingdom_of_morocco',
    name: 'Saadian Sultanate of Morocco',
    short_name: 'Morocco',
    government_type: 'sultanate',
    founding_year: 1549,
    capital_region_id: 'morocco_fez',
    official_religion: 'Muslim',
    home_region_ids: ['morocco_fez', 'morocco_marrakesh', 'morocco_tangier'],
    colonial_entity_ids: [],
    legitimacy: 70,
    stability: 60,
    prestige: 60,
    succession_law: 'absolute',
    map_color: 0x2a8b1a,
  },

  {
    id: 'funj_sultanate',
    name: 'Funj Sultanate',
    short_name: 'Funj',
    government_type: 'sultanate',
    founding_year: 1504,
    capital_region_id: 'sudan',
    official_religion: 'Muslim',
    home_region_ids: ['sudan'],
    colonial_entity_ids: [],
    legitimacy: 65,
    stability: 55,
    prestige: 45,
    succession_law: 'absolute',
    map_color: 0x8b7a1a,
  },

  // ── Sub-Saharan Africa ──────────────────────────────────────────────────

  {
    id: 'ethiopian_empire',
    name: 'Ethiopian Empire',
    short_name: 'Ethiopia',
    government_type: 'kingdom',
    founding_year: 1270,
    capital_region_id: 'ethiopia_gondar',
    official_religion: 'Orthodox',
    home_region_ids: [
      'ethiopia_gondar', 'ethiopia', 'ethiopia_coast',
      'abyssinia_highlands', 'eritrea',
    ],
    colonial_entity_ids: [],
    legitimacy: 70,
    stability: 60,
    prestige: 60,
    succession_law: 'primogeniture',
    map_color: 0xc83030,
  },

  {
    id: 'swahili_city_states',
    name: 'Swahili City-States',
    short_name: 'Swahili',
    government_type: 'city_state',
    founding_year: 900,
    capital_region_id: 'zanzibar',
    official_religion: 'Muslim',
    home_region_ids: ['zanzibar', 'malindi', 'kilwa', 'sofala', 'mombasa'],
    colonial_entity_ids: [],
    legitimacy: 65,
    stability: 60,
    prestige: 55,
    map_color: 0x1a8b8b,
  },

  {
    id: 'somali_sultanates',
    name: 'Somali Sultanates',
    short_name: 'Somalia',
    government_type: 'sultanate',
    founding_year: 1200,
    capital_region_id: 'somalia_mogadishu',
    official_religion: 'Muslim',
    home_region_ids: ['somalia_mogadishu', 'djibouti_coast'],
    colonial_entity_ids: [],
    legitimacy: 60,
    stability: 50,
    prestige: 45,
    map_color: 0x8b6b4a,
  },

  {
    id: 'west_african_kingdoms',
    name: 'West African Kingdoms',
    short_name: 'West Africa',
    government_type: 'kingdom',
    founding_year: 1000,
    capital_region_id: 'ghana_kumasi',
    official_religion: 'Animist',
    home_region_ids: [
      // Akan / Gold Coast / Forest zone
      'ghana_kumasi', 'ghana_interior', 'gold_coast', 'ivory_coast', 'togo',
      // Bight of Benin / Niger Delta
      'benin', 'nigeria', 'nigeria_interior', 'niger_delta', 'cameroon',
      // Senegambia / Atlantic coast
      'senegal', 'senegambia', 'dakar', 'gambia',
      // Guinea coast
      'guinea', 'guinea_bissau', 'sierra_leone',
      // Fula highlands
      'fula_highlands',
    ],
    colonial_entity_ids: [],
    legitimacy: 60,
    stability: 55,
    prestige: 50,
    map_color: 0xc86820,
  },

  {
    id: 'sahel_kingdoms',
    name: 'Sahel Kingdoms',
    short_name: 'Sahel',
    government_type: 'tribal_confederacy',
    founding_year: 800,
    capital_region_id: 'mali_timbuktu',
    official_religion: 'Muslim',
    // Successor fragments of Songhai after 1591 Moroccan invasion
    home_region_ids: ['mali_timbuktu', 'sahara_oasis'],
    colonial_entity_ids: [],
    legitimacy: 45,
    stability: 40,
    prestige: 40,
    map_color: 0xc8a860,
  },

  {
    id: 'kongo_kingdom',
    name: 'Kingdom of Kongo',
    short_name: 'Kongo',
    government_type: 'kingdom',
    founding_year: 1390,
    capital_region_id: 'congo',
    official_religion: 'Catholic',  // Kongo converted to Catholicism c.1491
    home_region_ids: ['congo', 'congo_interior', 'angola_interior'],
    colonial_entity_ids: [],
    legitimacy: 70,
    stability: 60,
    prestige: 55,
    succession_law: 'elective',
    map_color: 0x3a6b1a,
  },

  {
    id: 'east_african_interior',
    name: 'Great Lakes Kingdoms',
    short_name: 'Great Lakes',
    government_type: 'kingdom',
    founding_year: 1000,
    capital_region_id: 'kenya_interior',
    official_religion: 'Animist',
    home_region_ids: ['kenya_interior', 'mozambique_interior'],
    colonial_entity_ids: [],
    legitimacy: 55,
    stability: 55,
    prestige: 40,
    map_color: 0x2a6b5a,
  },

  {
    id: 'zimbabwe_kingdom',
    name: 'Kingdom of Zimbabwe',
    short_name: 'Zimbabwe',
    government_type: 'kingdom',
    founding_year: 1220,
    capital_region_id: 'zimbabwe_interior',
    official_religion: 'Animist',
    home_region_ids: ['zimbabwe_interior', 'zambezi'],
    colonial_entity_ids: [],
    legitimacy: 60,
    stability: 55,
    prestige: 50,
    succession_law: 'primogeniture',
    map_color: 0x6b3a1a,
  },

  {
    id: 'southern_african_tribes',
    name: 'Southern African Peoples',
    short_name: 'Southern Africa',
    government_type: 'tribal_confederacy',
    founding_year: 1000,
    official_religion: 'Animist',
    home_region_ids: ['kalahari', 'natal', 'cape_interior'],
    colonial_entity_ids: [],
    legitimacy: 45,
    stability: 50,
    prestige: 35,
    map_color: 0x8b5a2a,
  },

  {
    id: 'malagasy_kingdoms',
    name: 'Malagasy Kingdoms',
    short_name: 'Madagascar',
    government_type: 'tribal_confederacy',
    founding_year: 1200,
    official_religion: 'Animist',
    home_region_ids: ['madagascar_north', 'madagascar_south', 'madagascar_east'],
    colonial_entity_ids: [],
    legitimacy: 50,
    stability: 50,
    prestige: 35,
    map_color: 0xc8507a,
  },

  // ── Native Americas ─────────────────────────────────────────────────────

  {
    id: 'native_north_american_tribes',
    name: 'Native North American Peoples',
    short_name: 'Native America',
    government_type: 'tribal_confederacy',
    founding_year: 1000,
    official_religion: 'Animist',
    home_region_ids: ['great_plains', 'alaska', 'pacific_northwest', 'hudson_interior'],
    colonial_entity_ids: [],
    legitimacy: 55,
    stability: 55,
    prestige: 35,
    map_color: 0x8b4a2a,
  },

  // ── Oceania ─────────────────────────────────────────────────────────────

  {
    id: 'aboriginal_australia',
    name: 'Aboriginal Australian Peoples',
    short_name: 'Australia',
    government_type: 'tribal_confederacy',
    founding_year: 65000,
    official_religion: 'Animist',
    home_region_ids: [
      'australia_east', 'australia_north', 'australia_south', 'australia_west',
    ],
    colonial_entity_ids: [],
    legitimacy: 50,
    stability: 60,
    prestige: 30,
    map_color: 0xc87a30,
  },

  {
    id: 'pacific_peoples',
    name: 'Pacific Peoples',
    short_name: 'Pacific',
    government_type: 'tribal_confederacy',
    founding_year: 1000,
    official_religion: 'Animist',
    home_region_ids: [
      // Polynesia
      'hawaii', 'samoa', 'tonga', 'tahiti', 'new_zealand_north', 'new_zealand_south',
      // Melanesia
      'fiji', 'solomon_islands', 'vanuatu', 'new_caledonia',
      // Micronesia
      'micronesia', 'marshall_islands', 'wake_island',
    ],
    colonial_entity_ids: [],
    legitimacy: 50,
    stability: 60,
    prestige: 30,
    map_color: 0x1a7a8b,
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
