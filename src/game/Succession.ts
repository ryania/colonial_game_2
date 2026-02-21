import { Character, SuccessionLaw, Title } from './types'

export interface SuccessionEvent {
  type: 'character_died' | 'succession_resolved' | 'no_heir' | 'succession_disputed'
  character_id: string
  year: number
  month: number
  successor_id?: string
  alternative_heirs?: string[]
  reason: string
  is_contested: boolean
}

export class SuccessionSystem {
  private succession_events: SuccessionEvent[] = []

  /**
   * Determine the primary successor to a deceased character.
   *
   * In all laws, an explicitly designated heir_id is honoured first.
   * Remaining priority depends on succession law:
   *   primogeniture / absolute / gavelkind: eldest legitimate child > spouse > sibling
   *   elective: highest-prestige adult relative
   */
  determineSurvivor(
    character: Character,
    allCharacters: Character[],
    successionLaw: SuccessionLaw = 'primogeniture'
  ): Character | null {
    // Always honour an explicitly designated heir first
    if (character.heir_id) {
      const designated = allCharacters.find(c => c.id === character.heir_id && c.is_alive)
      if (designated) return designated
    }

    if (successionLaw === 'elective') {
      return this.getElectiveHeir(character, allCharacters)
    }

    // primogeniture / absolute / gavelkind share the same fallback order
    if (character.legitimate_children_ids.length > 0) {
      const eldest = this.getEldestLivingChild(character.legitimate_children_ids, allCharacters)
      if (eldest) return eldest
    }

    if (character.spouse_id) {
      const spouse = allCharacters.find(c => c.id === character.spouse_id)
      if (spouse && spouse.is_alive) return spouse
    }

    if (character.sibling_ids.length > 0) {
      const livingSibling = allCharacters.find(
        c => character.sibling_ids.includes(c.id) && c.is_alive
      )
      if (livingSibling) return livingSibling
    }

    return null
  }

  /**
   * Return all living legitimate children for gavelkind co-inheritance display.
   * Sorted eldest first.
   */
  getGavelkindHeirs(character: Character, allCharacters: Character[]): Character[] {
    return character.legitimate_children_ids
      .map(id => allCharacters.find(c => c.id === id))
      .filter((c): c is Character => c !== undefined && c.is_alive)
      .sort((a, b) => b.age - a.age)
  }

  /** Elective succession: highest-prestige adult relative */
  private getElectiveHeir(character: Character, allCharacters: Character[]): Character | null {
    const candidates = this.getPlayableAlternatives(character, allCharacters)
    if (candidates.length === 0) return null
    return candidates.reduce((best, c) => (c.prestige > best.prestige ? c : best), candidates[0])
  }

  /**
   * Get all potential heirs in order of succession
   */
  getSuccessionOrder(
    character: Character,
    allCharacters: Character[]
  ): Character[] {
    const heirs: Character[] = []
    const seenIds = new Set<string>()

    // Add legitimate children (in age order)
    const legitChildren = character.legitimate_children_ids
      .map(id => allCharacters.find(c => c.id === id))
      .filter((c): c is Character => c !== undefined && c.is_alive)
      .sort((a, b) => a.age - b.age) // Oldest first

    heirs.push(...legitChildren)
    legitChildren.forEach(c => seenIds.add(c.id))

    // Add illegitimate children
    const illegitChildren = character.illegitimate_children_ids
      .map(id => allCharacters.find(c => c.id === id))
      .filter((c): c is Character => c !== undefined && c.is_alive && !seenIds.has(c.id))
      .sort((a, b) => a.age - b.age)

    heirs.push(...illegitChildren)
    illegitChildren.forEach(c => seenIds.add(c.id))

    // Add spouse
    if (character.spouse_id && !seenIds.has(character.spouse_id)) {
      const spouse = allCharacters.find(c => c.id === character.spouse_id)
      if (spouse && spouse.is_alive) {
        heirs.push(spouse)
        seenIds.add(spouse.id)
      }
    }

    // Add siblings
    character.sibling_ids.forEach(siblingId => {
      if (!seenIds.has(siblingId)) {
        const sibling = allCharacters.find(c => c.id === siblingId)
        if (sibling && sibling.is_alive) {
          heirs.push(sibling)
          seenIds.add(siblingId)
        }
      }
    })

    return heirs
  }

  /**
   * Get alternative playable characters (relatives, allies, spouses)
   */
  getPlayableAlternatives(
    character: Character,
    allCharacters: Character[]
  ): Character[] {
    const alternatives: Character[] = []
    const seenIds = new Set<string>([character.id])

    // Add all blood relatives
    const relatives = [
      ...character.legitimate_children_ids,
      ...character.illegitimate_children_ids,
      character.spouse_id ? [character.spouse_id] : [],
      ...character.sibling_ids
    ].flat()

    relatives.forEach(id => {
      if (!seenIds.has(id)) {
        const char = allCharacters.find(c => c.id === id)
        if (char && char.is_alive && char.age >= 16) { // Only adults
          alternatives.push(char)
          seenIds.add(id)
        }
      }
    })

    // Sort by age (older first - more authority)
    alternatives.sort((a, b) => b.age - a.age)

    return alternatives
  }

  /**
   * Execute succession: transfer titles and regions to successor
   */
  executeSuccession(
    deadCharacter: Character,
    successor: Character,
    titles: Title[] = []
  ): { updatedDeadCharacter: Character; updatedSuccessor: Character; titles: Title[] } {
    // Mark original character as dead with proper death year
    deadCharacter.death_year = deadCharacter.death_year || 1600 + deadCharacter.age
    deadCharacter.is_alive = false

    // Transfer titles to successor
    titles.forEach(title => {
      if (title.current_holder_id === deadCharacter.id) {
        title.current_holder_id = successor.id
        if (!successor.title_ids.includes(title.id)) {
          successor.title_ids.push(title.id)
        }
      }
    })

    // Update successor's succession order
    successor.succession_order = this.getSuccessionOrder(successor, [deadCharacter, successor])
      .map(c => c.id)

    return {
      updatedDeadCharacter: deadCharacter,
      updatedSuccessor: successor,
      titles
    }
  }

  /**
   * Generate succession event for record-keeping
   */
  generateSuccessionEvent(
    character: Character,
    successor: Character | null,
    year: number,
    month: number,
    alternatives: Character[] = []
  ): SuccessionEvent {
    const event: SuccessionEvent = {
      type: successor ? 'succession_resolved' : 'no_heir',
      character_id: character.id,
      successor_id: successor?.id,
      alternative_heirs: alternatives.map(c => c.id),
      year,
      month,
      reason: successor
        ? `${character.name} died at age ${character.age}. Succeeded by ${successor.name}`
        : `${character.name} died at age ${character.age} with no heir`,
      is_contested: alternatives.length > 1
    }

    this.succession_events.push(event)
    return event
  }

  /**
   * Get succession events (for history/logging)
   */
  getSuccessionEvents(): SuccessionEvent[] {
    return [...this.succession_events]
  }

  /**
   * Private helper: Get eldest living child
   */
  private getEldestLivingChild(childIds: string[], allCharacters: Character[]): Character | null {
    let eldest: Character | null = null
    let maxAge = -1

    for (const childId of childIds) {
      const child = allCharacters.find(c => c.id === childId)
      if (child && child.is_alive && child.age > maxAge) {
        eldest = child
        maxAge = child.age
      }
    }

    return eldest
  }

  /**
   * Resolve contested succession (multiple claimants)
   * For future warfare/diplomacy system
   */
  resolveDisputedSuccession(
    contestants: Character[],
    winnerIndex: number = 0
  ): Character {
    // For now, just return the first contestant
    // Future: resolve based on alliances, military strength, etc.
    return contestants[winnerIndex]
  }

  /**
   * Check if character should be adult (can inherit)
   */
  isAdult(character: Character): boolean {
    return character.age >= 16
  }

  /**
   * Check if succession is contested (multiple heirs)
   */
  isSuccessionContested(character: Character, allCharacters: Character[]): boolean {
    const alternatives = this.getPlayableAlternatives(character, allCharacters)
    return alternatives.length > 1
  }
}

export const successionSystem = new SuccessionSystem()
