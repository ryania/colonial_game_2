import { SettlementTier } from './types'

export interface TierProgression {
  minPopulation: number // Population threshold to advance to next tier
  investmentCost: number // Wealth required to advance to next tier
  monthsRequired: number // Months required at current tier to advance
  growthModifier: number // Population growth multiplier (1.0 = 100%)
  wealthModifier: number // Wealth generation multiplier
  recruitmentBonus: number // Troop recruitment bonus (%)
  cultureSpreadRate: number // Culture spreading multiplier
  religionSpreadRate: number // Religion spreading multiplier
}

// Define progression requirements for each tier
const TIER_PROGRESSION: Record<SettlementTier, TierProgression> = {
  wilderness: {
    minPopulation: 0,
    investmentCost: 0,
    monthsRequired: 0,
    growthModifier: 1.0,
    wealthModifier: 1.0,
    recruitmentBonus: 0,
    cultureSpreadRate: 1.0,
    religionSpreadRate: 1.0,
  },
  village: {
    minPopulation: 5000,
    investmentCost: 500,
    monthsRequired: 6,
    growthModifier: 1.3,
    wealthModifier: 1.2,
    recruitmentBonus: 10,
    cultureSpreadRate: 1.1,
    religionSpreadRate: 1.1,
  },
  town: {
    minPopulation: 10000,
    investmentCost: 1500,
    monthsRequired: 12,
    growthModifier: 1.6,
    wealthModifier: 1.5,
    recruitmentBonus: 25,
    cultureSpreadRate: 1.3,
    religionSpreadRate: 1.3,
  },
  city: {
    minPopulation: 20000,
    investmentCost: 3000,
    monthsRequired: 24,
    growthModifier: 2.0,
    wealthModifier: 2.0,
    recruitmentBonus: 50,
    cultureSpreadRate: 1.6,
    religionSpreadRate: 1.6,
  },
}

// Get the next tier after the given tier
export function getNextTier(currentTier: SettlementTier): SettlementTier | null {
  const tierOrder: SettlementTier[] = ['wilderness', 'village', 'town', 'city']
  const currentIndex = tierOrder.indexOf(currentTier)
  if (currentIndex === -1 || currentIndex === tierOrder.length - 1) {
    return null
  }
  return tierOrder[currentIndex + 1]
}

// Get the previous tier before the given tier
export function getPreviousTier(currentTier: SettlementTier): SettlementTier | null {
  const tierOrder: SettlementTier[] = ['wilderness', 'village', 'town', 'city']
  const currentIndex = tierOrder.indexOf(currentTier)
  if (currentIndex <= 0) {
    return null
  }
  return tierOrder[currentIndex - 1]
}

// Get tier progression data for a specific tier
export function getTierProgression(tier: SettlementTier): TierProgression {
  return TIER_PROGRESSION[tier]
}

// Get progression data for the next tier
export function getNextTierProgression(
  currentTier: SettlementTier,
): TierProgression | null {
  const nextTier = getNextTier(currentTier)
  if (!nextTier) {
    return null
  }
  return getTierProgression(nextTier)
}

// Get the minimum population threshold for a tier
export function getMinPopulationForTier(tier: SettlementTier): number {
  return getTierProgression(tier).minPopulation
}

// Check if a settlement can advance to the next tier
export function canAdvanceTier(
  currentTier: SettlementTier,
  population: number,
  investedWealth: number,
  monthsAtTier: number,
): boolean {
  const nextTier = getNextTier(currentTier)
  if (!nextTier) {
    return false // Already at max tier
  }

  const nextTierProgression = getTierProgression(nextTier)
  return (
    population >= nextTierProgression.minPopulation &&
    investedWealth >= nextTierProgression.investmentCost &&
    monthsAtTier >= nextTierProgression.monthsRequired
  )
}

// Check if a settlement should regress to the previous tier
export function shouldRegressTier(
  currentTier: SettlementTier,
  population: number,
): boolean {
  if (currentTier === 'wilderness') {
    return false // Wilderness is the minimum tier
  }

  const tierProgression = getTierProgression(currentTier)
  return population < tierProgression.minPopulation
}
