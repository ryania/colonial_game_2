import { Character } from './types'
import { successionSystem } from './Succession'

export interface CharacterSwitchOption {
  character: Character
  relationship_to_current: string
  reason: string
}

export class CharacterSwitchingSystem {
  /**
   * Check if player can switch to a specific character
   * Requirements:
   * - Character must be alive
   * - Character must be an adult (age >= 16)
   * - Character must be related/allied OR player initiated switch
   * - At least in same dynasty or ally
   */
  canSwitchToCharacter(
    currentCharacter: Character,
    targetCharacter: Character,
    allCharacters: Character[],
    playerInitiated: boolean = false
  ): boolean {
    // Character must be alive and adult
    if (!targetCharacter.is_alive || targetCharacter.age < 16) {
      return false
    }

    // Same character
    if (currentCharacter.id === targetCharacter.id) {
      return false
    }

    // Player can always initiate a switch if target is in same dynasty
    if (playerInitiated && targetCharacter.dynasty_id === currentCharacter.dynasty_id) {
      return true
    }

    // Blood relation?
    if (this.isBloodRelated(currentCharacter, targetCharacter)) {
      return true
    }

    // Spouse?
    if (currentCharacter.spouse_id === targetCharacter.id) {
      return true
    }

    // In same dynasty (extended family)?
    if (targetCharacter.dynasty_id === currentCharacter.dynasty_id) {
      return true
    }

    return false
  }

  /**
   * Get all characters player can switch to
   */
  getSwitchableCharacters(
    currentCharacter: Character,
    allCharacters: Character[]
  ): CharacterSwitchOption[] {
    const switchable: CharacterSwitchOption[] = []
    const seenIds = new Set<string>([currentCharacter.id])

    for (const char of allCharacters) {
      if (seenIds.has(char.id)) continue

      if (this.canSwitchToCharacter(currentCharacter, char, allCharacters, false)) {
        const relationship = this.getRelationship(currentCharacter, char)
        switchable.push({
          character: char,
          relationship_to_current: relationship,
          reason: `Switch to ${char.name} (${relationship})`
        })
        seenIds.add(char.id)
      }
    }

    // Sort by relationship priority
    switchable.sort((a, b) => {
      const relationshipPriority: { [key: string]: number } = {
        'heir': 0,
        'spouse': 1,
        'sibling': 2,
        'child': 3,
        'parent': 4,
        'family': 5
      }

      const priorityA = relationshipPriority[a.relationship_to_current] ?? 999
      const priorityB = relationshipPriority[b.relationship_to_current] ?? 999

      return priorityA - priorityB
    })

    return switchable
  }

  /**
   * Switch player character
   * Returns the new player character
   */
  switchPlayerCharacter(
    newCharacterId: string,
    allCharacters: Character[]
  ): Character | null {
    const newCharacter = allCharacters.find(c => c.id === newCharacterId)

    if (!newCharacter || !newCharacter.is_alive) {
      return null
    }

    return newCharacter
  }

  /**
   * Get suggested successor when character dies
   */
  suggestSuccessor(
    deadCharacter: Character,
    allCharacters: Character[]
  ): CharacterSwitchOption | null {
    const playableAlternatives = successionSystem.getPlayableAlternatives(deadCharacter, allCharacters)

    if (playableAlternatives.length === 0) {
      return null
    }

    // Prefer heir (eldest child)
    const successor = playableAlternatives[0]
    return {
      character: successor,
      relationship_to_current: this.getRelationship(deadCharacter, successor),
      reason: `Play as ${successor.name} (your heir)`
    }
  }

  /**
   * Get all playable alternatives when character dies
   */
  getPlayableAlternativesForDeath(
    deadCharacter: Character,
    allCharacters: Character[]
  ): CharacterSwitchOption[] {
    const alternatives = successionSystem.getPlayableAlternatives(deadCharacter, allCharacters)

    return alternatives.map(char => ({
      character: char,
      relationship_to_current: this.getRelationship(deadCharacter, char),
      reason: `Play as ${char.name} (${this.getRelationship(deadCharacter, char)})`
    }))
  }

  /**
   * Private helper: Check if two characters are blood related
   */
  private isBloodRelated(char1: Character, char2: Character): boolean {
    // Children?
    if (char1.legitimate_children_ids.includes(char2.id) ||
        char1.illegitimate_children_ids.includes(char2.id)) {
      return true
    }

    // Parents?
    if (char1.father_id === char2.id || char1.mother_id === char2.id) {
      return true
    }

    // Siblings?
    if (char1.sibling_ids.includes(char2.id)) {
      return true
    }

    return false
  }

  /**
   * Private helper: Get relationship description
   */
  private getRelationship(from: Character, to: Character): string {
    // Check relationship direction
    if (from.legitimate_children_ids.includes(to.id)) {
      return 'child'
    }
    if (from.illegitimate_children_ids.includes(to.id)) {
      return 'illegitimate child'
    }
    if (from.father_id === to.id || from.mother_id === to.id) {
      return 'parent'
    }
    if (from.sibling_ids.includes(to.id)) {
      return 'sibling'
    }
    if (from.spouse_id === to.id) {
      return 'spouse'
    }
    if (from.dynasty_id === to.dynasty_id) {
      return 'family'
    }

    return 'relation'
  }

  /**
   * Check if character can have heir
   */
  hasHeir(character: Character, allCharacters: Character[]): boolean {
    const heir = successionSystem.determineSurvivor(character, allCharacters)
    return heir !== null
  }

  /**
   * Get the character's heir
   */
  getHeir(character: Character, allCharacters: Character[]): Character | null {
    return successionSystem.determineSurvivor(character, allCharacters)
  }
}

export const characterSwitchingSystem = new CharacterSwitchingSystem()
