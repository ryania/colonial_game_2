import { TraitType, Office } from './types'

export type CharacterClass = 'governor' | 'merchant' | 'military' | 'diplomat' | 'scholar'

export interface CharacterClassDef {
  name: string
  description: string
  base_traits: TraitType[]
  trait_probabilities: Record<string, number>
  starting_wealth_modifier: number // 0.5 to 2.0
  wealth_per_month_modifier: number
  starting_prestige_modifier: number
  possible_offices: Office[]
  color: string // For UI display
}

export const CLASS_DEFINITIONS: Record<CharacterClass, CharacterClassDef> = {
  governor: {
    name: 'Governor',
    description: 'Authority over regions, strong leadership',
    base_traits: ['ambitious', 'charismatic'],
    trait_probabilities: {
      'ambitious': 0.4,
      'charismatic': 0.3,
      'shrewd': 0.3,
      'strong': 0.2,
      'cautious': 0.1
    },
    starting_wealth_modifier: 1.5,
    wealth_per_month_modifier: 1.2,
    starting_prestige_modifier: 1.3,
    possible_offices: ['Governor', 'Military_Leader'],
    color: '#e94560'
  },

  merchant: {
    name: 'Merchant',
    description: 'Trade and commerce expertise, rich',
    base_traits: ['shrewd', 'cautious'],
    trait_probabilities: {
      'shrewd': 0.5,
      'ambitious': 0.2,
      'cautious': 0.3,
      'charismatic': 0.2,
      'strong': 0.1
    },
    starting_wealth_modifier: 2.0,
    wealth_per_month_modifier: 1.5,
    starting_prestige_modifier: 0.7,
    possible_offices: ['Merchant'],
    color: '#ffdd99'
  },

  military: {
    name: 'Military Commander',
    description: 'Combat expertise, strong and brave',
    base_traits: ['strong', 'ambitious'],
    trait_probabilities: {
      'strong': 0.4,
      'ambitious': 0.4,
      'shrewd': 0.2,
      'charismatic': 0.2,
      'cautious': 0.1
    },
    starting_wealth_modifier: 1.0,
    wealth_per_month_modifier: 1.0,
    starting_prestige_modifier: 1.2,
    possible_offices: ['Military_Leader', 'Governor'],
    color: '#6b8aff'
  },

  diplomat: {
    name: 'Diplomat',
    description: 'Relationships and alliances, charismatic',
    base_traits: ['charismatic', 'ambitious'],
    trait_probabilities: {
      'charismatic': 0.5,
      'ambitious': 0.3,
      'shrewd': 0.2,
      'cautious': 0.2,
      'strong': 0.1
    },
    starting_wealth_modifier: 1.0,
    wealth_per_month_modifier: 0.9,
    starting_prestige_modifier: 1.4,
    possible_offices: ['Governor', 'Merchant'],
    color: '#99dd99'
  },

  scholar: {
    name: 'Scholar',
    description: 'Knowledge and wisdom, patient',
    base_traits: ['shrewd', 'cautious'],
    trait_probabilities: {
      'shrewd': 0.4,
      'cautious': 0.4,
      'ambitious': 0.2,
      'charismatic': 0.1,
      'strong': 0.1
    },
    starting_wealth_modifier: 0.8,
    wealth_per_month_modifier: 0.8,
    starting_prestige_modifier: 1.1,
    possible_offices: ['Merchant', 'Governor'],
    color: '#aabbcc'
  }
}

export class CharacterClassManager {
  getClassDefinition(characterClass: CharacterClass): CharacterClassDef {
    return CLASS_DEFINITIONS[characterClass]
  }

  getAllClasses(): CharacterClass[] {
    return Object.keys(CLASS_DEFINITIONS) as CharacterClass[]
  }

  getClassByName(name: string): CharacterClass | null {
    for (const [key, classDef] of Object.entries(CLASS_DEFINITIONS)) {
      if (classDef.name === name) {
        return key as CharacterClass
      }
    }
    return null
  }

  getClassModifiers(characterClass: CharacterClass): {
    wealth_modifier: number
    wealth_per_month_modifier: number
    prestige_modifier: number
  } {
    const classDef = this.getClassDefinition(characterClass)
    return {
      wealth_modifier: classDef.starting_wealth_modifier,
      wealth_per_month_modifier: classDef.wealth_per_month_modifier,
      prestige_modifier: classDef.starting_prestige_modifier
    }
  }

  getRandomTraitForClass(characterClass: CharacterClass): TraitType | null {
    const classDef = this.getClassDefinition(characterClass)
    const traits = Object.entries(classDef.trait_probabilities)

    // Weighted random selection
    let total = 0
    const probabilities: Array<[TraitType, number]> = []

    for (const [trait, prob] of traits) {
      total += prob
      probabilities.push([trait as TraitType, total])
    }

    const random = Math.random() * total
    for (const [trait, cumulative] of probabilities) {
      if (random <= cumulative) {
        return trait
      }
    }

    return probabilities[0]?.[0] || null
  }

  getRandomClass(): CharacterClass {
    const classes = this.getAllClasses()
    return classes[Math.floor(Math.random() * classes.length)]
  }

  getDescription(characterClass: CharacterClass): string {
    return this.getClassDefinition(characterClass).description
  }

  getColor(characterClass: CharacterClass): string {
    return this.getClassDefinition(characterClass).color
  }
}

export const characterClassManager = new CharacterClassManager()
