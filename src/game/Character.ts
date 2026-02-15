import { Character, Trait, TraitType, Culture, Religion, Office, Dynasty } from './types'

const TRAITS: Record<TraitType, Trait> = {
  'ambitious': {
    name: 'ambitious',
    description: 'Seeks power and wealth',
    modifiers: { income: 0.15, growth: 0.05 }
  },
  'cautious': {
    name: 'cautious',
    description: 'Prefers stability',
    modifiers: { income: -0.1, population_loyalty: 0.1 }
  },
  'charismatic': {
    name: 'charismatic',
    description: 'Inspires people',
    modifiers: { population_loyalty: 0.2, income: 0.1 }
  },
  'shrewd': {
    name: 'shrewd',
    description: 'Good with money',
    modifiers: { income: 0.25 }
  },
  'weak': {
    name: 'weak',
    description: 'Physically frail',
    modifiers: { income: -0.15, population_loyalty: -0.1 }
  },
  'strong': {
    name: 'strong',
    description: 'Physically strong',
    modifiers: { growth: 0.1 }
  }
}

export class CharacterManager {
  private characters: Map<string, Character> = new Map()
  private dynasties: Map<string, Dynasty> = new Map()

  createCharacter(
    name: string,
    culture: Culture,
    religion: Religion,
    office: Office,
    region_id: string,
    dynasty_id: string,
    age: number = 30
  ): Character {
    const id = `char_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const current_year = 1600
    const birth_year = current_year - age

    const traits: TraitType[] = this.generateRandomTraits()

    const character: Character = {
      id,
      name,
      age,
      birth_year,
      is_alive: true,
      traits,
      culture,
      religion,
      office,
      region_id,
      dynasty_id,
      children_ids: [],
      wealth: 100 + Math.random() * 200,
    }

    this.characters.set(id, character)
    return character
  }

  private generateRandomTraits(): TraitType[] {
    const trait_names: TraitType[] = ['ambitious', 'cautious', 'charismatic', 'shrewd', 'weak', 'strong']
    const traits: TraitType[] = []

    for (let i = 0; i < 2; i++) {
      const random_trait = trait_names[Math.floor(Math.random() * trait_names.length)]
      if (!traits.includes(random_trait)) {
        traits.push(random_trait)
      }
    }

    return traits
  }

  createDynasty(name: string, culture: Culture, founded_year: number): Dynasty {
    const id = `dynasty_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const dynasty: Dynasty = {
      id,
      name,
      culture,
      founded_year,
      member_ids: []
    }

    this.dynasties.set(id, dynasty)
    return dynasty
  }

  getCharacter(id: string): Character | undefined {
    return this.characters.get(id)
  }

  getDynasty(id: string): Dynasty | undefined {
    return this.dynasties.get(id)
  }

  getAllCharacters(): Character[] {
    return Array.from(this.characters.values())
  }

  getAllDynasties(): Dynasty[] {
    return Array.from(this.dynasties.values())
  }

  ageCharacter(id: string): void {
    const character = this.getCharacter(id)
    if (!character) return

    character.age++

    // Random death chance increases with age
    const death_chance = 0.01 * (character.age - 16)
    if (character.age > 16 && Math.random() < death_chance) {
      character.is_alive = false
      character.death_year = 1600 + (character.age - (1600 - character.birth_year))
    }
  }

  addTraitToCharacter(character_id: string, trait: TraitType): void {
    const character = this.getCharacter(character_id)
    if (character && !character.traits.includes(trait)) {
      character.traits.push(trait)
    }
  }

  getCharacterTrait(trait_name: TraitType): Trait {
    return TRAITS[trait_name]
  }

  getCharacterModifiers(character: Character): {
    income: number
    population_loyalty: number
    growth: number
  } {
    const modifiers = { income: 0, population_loyalty: 0, growth: 0 }

    character.traits.forEach(trait => {
      const trait_data = this.getCharacterTrait(trait)
      if (trait_data.modifiers.income !== undefined) {
        modifiers.income += trait_data.modifiers.income
      }
      if (trait_data.modifiers.population_loyalty !== undefined) {
        modifiers.population_loyalty += trait_data.modifiers.population_loyalty
      }
      if (trait_data.modifiers.growth !== undefined) {
        modifiers.growth += trait_data.modifiers.growth
      }
    })

    return modifiers
  }

  addMemberToDynasty(dynasty_id: string, character_id: string): void {
    const dynasty = this.getDynasty(dynasty_id)
    if (dynasty && !dynasty.member_ids.includes(character_id)) {
      dynasty.member_ids.push(character_id)
    }
  }

  getSuccessor(character: Character): Character | null {
    if (character.children_ids.length === 0) {
      return null
    }

    // Return first living child
    for (const child_id of character.children_ids) {
      const child = this.getCharacter(child_id)
      if (child && child.is_alive) {
        return child
      }
    }

    return null
  }
}

export const characterManager = new CharacterManager()
