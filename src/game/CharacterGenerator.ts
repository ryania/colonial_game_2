import { Character, CharacterClass, Culture, Religion, Office, TraitType } from './types'
import { characterClassManager } from './CharacterClass'
import { mapManager } from './Map'

interface CharacterGenerationOptions {
  class?: CharacterClass
  name?: string
  culture?: Culture
  religion?: Religion
  region_id?: string
  age?: number
  randomize: boolean
}

// Historical names by culture (partial - unlisted cultures fall back to a generic list)
const NAMES: Partial<Record<Culture, { male: string[]; female: string[] }>> = {
  Spanish: {
    male: ['Cortés', 'Ferdinand', 'Jaime', 'Diego', 'Rodrigo', 'Guillermo', 'Alfonso'],
    female: ['Isabella', 'Maria', 'Catalina', 'Beatrice', 'Leonor', 'Juana', 'Felipa']
  },
  English: {
    male: ['Randolph', 'George', 'Edward', 'William', 'Richard', 'Henry', 'Thomas'],
    female: ['Anne', 'Elizabeth', 'Catherine', 'Mary', 'Margaret', 'Jane', 'Dorothy']
  },
  French: {
    male: ['Louis', 'Henri', 'François', 'Jacques', 'Claude', 'Jean', 'Nicolas'],
    female: ['Marie', 'Jeanne', 'Anne', 'Catherine', 'Françoise', 'Madeleine', 'Marguerite']
  },
  Portuguese: {
    male: ['Silva', 'João', 'Pedro', 'Manuel', 'Afonso', 'Duarte', 'Gonçalo'],
    female: ['Maria', 'Constança', 'Filipa', 'Joana', 'Guida', 'Brites', 'Leonor']
  },
  Native: {
    male: ['Tupac', 'Huaca', 'Inti', 'Manco', 'Atahualpa', 'Carib', 'Taíno'],
    female: ['Mama', 'Coya', 'Quispe', 'Miska', 'Huaca', 'Cocomá', 'Ilu']
  },
  African: {
    male: ['Kwame', 'Kofi', 'Adeyemi', 'Okonkwo', 'Jabari', 'Ndaba', 'Kamau'],
    female: ['Zara', 'Amara', 'Nia', 'Farah', 'Eshe', 'Aisha', 'Adanna']
  }
}

const FALLBACK_NAMES = {
  male: ['Aleksei', 'Ibrahim', 'Wei', 'Arjun', 'Kenji', 'Dmitri', 'Ali', 'Chen', 'Raj', 'Omar'],
  female: ['Fatima', 'Mei', 'Priya', 'Yuki', 'Nadia', 'Layla', 'Sakura', 'Asha', 'Hana', 'Zainab']
}

export class CharacterGenerator {
  private current_id_counter = Math.floor(Math.random() * 100000)

  private generateId(): string {
    this.current_id_counter++
    return `char_${Date.now()}_${this.current_id_counter}`
  }

  generateRandomCharacter(options: CharacterGenerationOptions): Character {
    const id = this.generateId()
    const characterClass = options.class || characterClassManager.getRandomClass()
    const culture = options.culture || this.getRandomCulture()
    const religion = options.religion || this.getRandomReligion()
    const region_id = options.region_id || this.getRandomRegionId()
    const age = options.age || this.getRandomAge()
    const name = options.name || this.generateCharacterName(culture)
    const birth_year = 1600 - age

    // Get class definition
    const classDef = characterClassManager.getClassDefinition(characterClass)
    const classModifiers = characterClassManager.getClassModifiers(characterClass)

    // Generate traits
    const traits = this.generateTraitsForClass(characterClass)

    // Generate starting wealth based on class
    const base_wealth = 100
    const wealth = Math.round(base_wealth * classModifiers.wealth_modifier)

    // Generate starting prestige
    const base_prestige = 50
    const prestige = Math.round(base_prestige * classModifiers.prestige_modifier)

    return {
      id,
      name,
      age,
      birth_year,
      is_alive: true,
      traits,
      culture,
      religion,
      office: 'None',
      region_id,
      dynasty_id: '', // Will be set later
      character_class: characterClass,
      class_traits: classDef.base_traits,
      father_id: undefined,
      mother_id: undefined,
      spouse_id: undefined,
      spouse_ids: [],
      legitimate_children_ids: [],
      illegitimate_children_ids: [],
      sibling_ids: [],
      children_ids: [],
      heir_id: undefined,
      succession_order: [],
      title_ids: [],
      claim_ids: [],
      relationship_ids: [],
      wealth,
      prestige,
      health: 100
    }
  }

  private generateCharacterName(culture: Culture): string {
    const names = NAMES[culture] ?? FALLBACK_NAMES
    const isMale = Math.random() > 0.3 // 70% male, 30% female
    const nameList = isMale ? names.male : names.female

    // Add title prefix to some historical names
    if (Math.random() < 0.3) {
      const titles = ['Lord', 'Lady', 'Governor', 'Captain', 'Merchant', 'Master']
      const title = titles[Math.floor(Math.random() * titles.length)]
      const name = nameList[Math.floor(Math.random() * nameList.length)]
      return `${title} ${name}`
    }

    return nameList[Math.floor(Math.random() * nameList.length)]
  }

  private generateTraitsForClass(characterClass: CharacterClass): TraitType[] {
    const traits: TraitType[] = []
    const classDef = characterClassManager.getClassDefinition(characterClass)

    // Add base traits
    traits.push(...classDef.base_traits)

    // Add 1-2 additional random traits
    const additionalTraits = Math.floor(Math.random() * 2) + 1
    for (let i = 0; i < additionalTraits; i++) {
      const trait = characterClassManager.getRandomTraitForClass(characterClass)
      if (trait && !traits.includes(trait)) {
        traits.push(trait)
      }
    }

    return traits
  }

  private getRandomCulture(): Culture {
    const cultures: Culture[] = ['Spanish', 'English', 'French', 'Portuguese', 'Native', 'African']
    return cultures[Math.floor(Math.random() * cultures.length)]
  }

  private getRandomReligion(): Religion {
    const religions: Religion[] = ['Catholic', 'Protestant', 'Animist', 'Other']
    return religions[Math.floor(Math.random() * religions.length)]
  }

  private getRandomRegionId(): string {
    const regions = mapManager.getAllRegions()
    if (regions.length === 0) return 'cuba' // Fallback
    return regions[Math.floor(Math.random() * regions.length)].id
  }

  private getRandomAge(): number {
    // Characters are 20-60 years old
    return Math.floor(Math.random() * 40) + 20
  }

  // Public method to generate multiple random characters
  generateMultipleRandomCharacters(count: number, startingDynastyId?: string): Character[] {
    const characters: Character[] = []
    for (let i = 0; i < count; i++) {
      const char = this.generateRandomCharacter({ randomize: true })
      if (startingDynastyId) {
        char.dynasty_id = startingDynastyId
      }
      characters.push(char)
    }
    return characters
  }

  // Generate a character with specific parameters pre-filled
  generateCustomCharacter(options: CharacterGenerationOptions): Character {
    return this.generateRandomCharacter(options)
  }
}

export const characterGenerator = new CharacterGenerator()
