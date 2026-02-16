import { SettlementTier } from './types'

export interface RegionTierConfig {
  regionId: string
  startingTier: SettlementTier
}

// Pre-defined starting settlement tiers for all regions
export const REGION_TIER_CONFIG: RegionTierConfig[] = [
  // Caribbean - Mix of developed and underdeveloped
  { regionId: 'cuba', startingTier: 'city' }, // Largest population (8000)
  { regionId: 'hispaniola', startingTier: 'town' }, // 5000 pop
  { regionId: 'jamaica', startingTier: 'village' }, // 3000 pop

  // North America - Developing frontier colonies
  { regionId: 'virginia', startingTier: 'village' }, // 4000 pop
  { regionId: 'massachusetts', startingTier: 'village' }, // 3500 pop
  { regionId: 'charleston', startingTier: 'village' }, // 2500 pop

  // Brazil - Portuguese trade centers
  { regionId: 'pernambuco', startingTier: 'town' }, // 6000 pop
  { regionId: 'bahia', startingTier: 'town' }, // 5500 pop

  // West Africa - Early colonial outposts
  { regionId: 'senegal', startingTier: 'wilderness' }, // 2000 pop, early settlement
  { regionId: 'angola', startingTier: 'village' }, // 3000 pop
]

export function getStartingTier(regionId: string): SettlementTier {
  const config = REGION_TIER_CONFIG.find(c => c.regionId === regionId)
  return config?.startingTier ?? 'wilderness'
}
