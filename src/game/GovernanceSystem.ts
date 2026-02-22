import {
  ColonialEntity,
  ColonialEntityType,
  GovernancePhase,
  Region,
  PopGroup,
  Culture,
} from './types'

// Phase-specific centralization targets
const PHASE_CENTRALIZATION_TARGETS: Record<GovernancePhase, number> = {
  early_settlement:   20,
  loose_confederation: 30,
  crown_consolidation: 70,
  mature_royal:        55,
  growing_tension:     35,
}

// Phase pressure thresholds per year/condition
// Returns pressure increase per month (accumulates to 100 to trigger transition)
function computePhasePressure(
  entity: ColonialEntity,
  memberRegions: Region[],
  memberPops: PopGroup[],
  year: number
): number {
  switch (entity.governance_phase) {
    case 'early_settlement': {
      let pressure = 0.3 // base: ~28 years to max naturally
      if (year >= 1670) pressure += 0.5
      const totalPop = memberRegions.reduce((sum, r) => sum + r.population.total, 0)
      const avgPop = memberRegions.length > 0 ? totalPop / memberRegions.length : 0
      if (avgPop > 5000) pressure += 0.3
      return pressure
    }
    case 'loose_confederation': {
      let pressure = 0.2
      if (entity.crown_authority > 50) pressure += 0.4
      if (year >= 1685) pressure += 0.3
      return pressure
    }
    case 'crown_consolidation': {
      let pressure = 0.15
      if (entity.stability > 60) pressure += 0.3
      if (year >= 1700) pressure += 0.2
      return pressure
    }
    case 'mature_royal': {
      let pressure = 0.1
      // Average literacy across member pops
      const popCount = memberPops.length
      if (popCount > 0) {
        const avgLiteracy = memberPops.reduce((sum, p) => sum + p.literacy, 0) / popCount
        if (avgLiteracy > 40) pressure += 0.3
      }
      if (year >= 1750) pressure += 0.5
      return pressure
    }
    case 'growing_tension':
      return 0 // end state
  }
}

function getNextPhase(phase: GovernancePhase): GovernancePhase | null {
  const progression: GovernancePhase[] = [
    'early_settlement',
    'loose_confederation',
    'crown_consolidation',
    'mature_royal',
    'growing_tension',
  ]
  const idx = progression.indexOf(phase)
  return idx >= 0 && idx < progression.length - 1 ? progression[idx + 1] : null
}

function applyTransitionEffects(entity: ColonialEntity, nextPhase: GovernancePhase): Partial<ColonialEntity> {
  switch (nextPhase) {
    case 'loose_confederation':
      return {
        autonomy: Math.min(100, entity.autonomy + 10),
        entity_type: 'loose_confederation' as ColonialEntityType,
      }
    case 'crown_consolidation':
      return {
        centralization: Math.min(100, entity.centralization + 20),
        crown_authority: Math.min(100, entity.crown_authority + 25),
        autonomy: Math.max(0, entity.autonomy - 10),
        entity_type: 'crown_consolidation' as ColonialEntityType,
      }
    case 'mature_royal':
      return {
        stability: Math.min(100, entity.stability + 15),
        tax_rate: Math.min(0.5, entity.tax_rate + 0.05),
        entity_type: 'royal_colony' as ColonialEntityType,
      }
    case 'growing_tension':
      return {
        autonomy: Math.min(100, entity.autonomy + 20),
        crown_authority: Math.max(0, entity.crown_authority - 15),
        entity_type: 'independent_assembly' as ColonialEntityType,
      }
    default:
      return {}
  }
}

// Starting entity definitions
interface EntityDef {
  id: string
  name: string
  entity_type: ColonialEntityType
  governance_phase: GovernancePhase
  founding_culture: Culture
  region_ids: string[]
  centralization: number
  autonomy: number
  stability: number
  crown_authority: number
  tax_rate: number
  trade_monopoly_goods: string[]
  map_color: number
}

const STARTING_ENTITIES: EntityDef[] = [
  {
    id: 'virginia_company',
    name: 'Virginia Company of London',
    entity_type: 'charter_company',
    governance_phase: 'early_settlement',
    founding_culture: 'English',
    region_ids: ['virginia', 'charleston', 'georgia', 'maryland', 'delaware', 'new_jersey'],
    centralization: 20,
    autonomy: 30,
    stability: 45,
    crown_authority: 35,
    tax_rate: 0.05,
    trade_monopoly_goods: ['tobacco', 'indigo', 'naval_stores'],
    map_color: 0x1a3a8b,
  },
  {
    id: 'new_england_council',
    name: 'Plymouth Council for New England',
    entity_type: 'charter_company',
    governance_phase: 'early_settlement',
    founding_culture: 'English',
    region_ids: ['massachusetts', 'connecticut', 'rhode_island', 'pennsylvania', 'newyork'],
    centralization: 15,
    autonomy: 40,
    stability: 50,
    crown_authority: 25,
    tax_rate: 0.05,
    trade_monopoly_goods: ['furs', 'fish', 'timber'],
    map_color: 0x2a62b0,
  },
  {
    id: 'english_caribbean',
    name: 'English Caribbean Company',
    entity_type: 'charter_company',
    governance_phase: 'early_settlement',
    founding_culture: 'English',
    region_ids: ['jamaica', 'barbados', 'nassau'],
    centralization: 25,
    autonomy: 25,
    stability: 55,
    crown_authority: 40,
    tax_rate: 0.08,
    trade_monopoly_goods: ['sugar', 'rum'],
    map_color: 0x4a86c8,
  },
  {
    id: 'consejo_de_indias',
    name: 'Consejo de Indias',
    entity_type: 'royal_colony',
    governance_phase: 'mature_royal',
    founding_culture: 'Spanish',
    region_ids: [
      'cuba', 'hispaniola', 'puerto_rico', 'havana', 'santiago', 'santo_domingo',
      'belize', 'veracruz', 'cartagena', 'florida', 'louisiana',
      'cumana', 'margarita', 'callao', 'potosi', 'guayaquil',
      'buenos_aires', 'uruguay', 'valdivia',
    ],
    centralization: 70,
    autonomy: 20,
    stability: 60,
    crown_authority: 80,
    tax_rate: 0.15,
    trade_monopoly_goods: ['silver', 'gold', 'sugar', 'tobacco'],
    map_color: 0x8b1a1a,
  },
  {
    id: 'estado_do_brasil',
    name: 'Estado do Brasil',
    entity_type: 'royal_colony',
    governance_phase: 'mature_royal',
    founding_culture: 'Portuguese',
    region_ids: ['pernambuco', 'bahia', 'rio_janeiro', 'sao_paulo'],
    centralization: 65,
    autonomy: 25,
    stability: 55,
    crown_authority: 75,
    tax_rate: 0.12,
    trade_monopoly_goods: ['sugar', 'brazilwood', 'gold'],
    map_color: 0x1a6b2e,
  },
]

export class GovernanceSystem {
  initializeEntities(regions: Region[]): ColonialEntity[] {
    const regionIds = new Set(regions.map(r => r.id))

    return STARTING_ENTITIES.map((def): ColonialEntity => {
      // Only include region IDs that actually exist in the loaded regions
      const validRegionIds = def.region_ids.filter(id => regionIds.has(id))
      return {
        id: def.id,
        name: def.name,
        entity_type: def.entity_type,
        governance_phase: def.governance_phase,
        founding_culture: def.founding_culture,
        region_ids: validRegionIds,
        founding_year: 1600,
        centralization: def.centralization,
        autonomy: def.autonomy,
        stability: def.stability,
        crown_authority: def.crown_authority,
        tax_rate: def.tax_rate,
        trade_monopoly_goods: def.trade_monopoly_goods,
        phase_pressure: 0,
        phase_history: [],
        map_color: def.map_color,
      }
    })
  }

  processMonthTick(
    entities: ColonialEntity[],
    regions: Region[],
    pops: PopGroup[],
    year: number
  ): ColonialEntity[] {
    return entities.map(entity => {
      const memberRegions = regions.filter(r => entity.region_ids.includes(r.id))
      const memberPops = pops.filter(p => entity.region_ids.includes(p.region_id))

      // Compute phase pressure
      const pressureIncrease = computePhasePressure(entity, memberRegions, memberPops, year)
      let newPressure = entity.phase_pressure + pressureIncrease

      // Check for phase transition
      let newPhase = entity.governance_phase
      let newPhaseHistory = entity.phase_history
      let transitionUpdates: Partial<ColonialEntity> = {}

      if (newPressure >= 100) {
        const nextPhase = getNextPhase(entity.governance_phase)
        if (nextPhase) {
          newPhase = nextPhase
          newPhaseHistory = [...entity.phase_history, entity.governance_phase]
          transitionUpdates = applyTransitionEffects(entity, nextPhase)
        }
        newPressure = 0
      }

      // Monthly stat drifts
      const centralTarget = PHASE_CENTRALIZATION_TARGETS[newPhase]
      const centralDiff = centralTarget - entity.centralization
      const newCentralization = Math.max(0, Math.min(100,
        entity.centralization + (transitionUpdates.centralization !== undefined
          ? 0
          : centralDiff * 0.1)
      ))

      // Autonomy drifts up slowly (colonists become more independent)
      const autonomyBase = transitionUpdates.autonomy ?? entity.autonomy
      const newAutonomy = Math.max(0, Math.min(100, autonomyBase + 0.05))

      // Stability drifts toward equilibrium based on centralization vs autonomy balance
      const effectiveCentralization = transitionUpdates.centralization ?? newCentralization
      const stabilityTarget = Math.max(0, Math.min(100,
        50 + (effectiveCentralization - newAutonomy) * 0.2
      ))
      const stabilityBase = transitionUpdates.stability ?? entity.stability
      const newStability = Math.max(0, Math.min(100,
        stabilityBase + (stabilityTarget - stabilityBase) * 0.02
      ))

      return {
        ...entity,
        ...transitionUpdates,
        governance_phase: newPhase,
        phase_pressure: newPressure,
        phase_history: newPhaseHistory,
        centralization: transitionUpdates.centralization !== undefined
          ? transitionUpdates.centralization
          : newCentralization,
        autonomy: newAutonomy,
        stability: newStability,
      }
    })
  }

  getEntityForRegion(regionId: string, entities: ColonialEntity[]): ColonialEntity | undefined {
    return entities.find(e => e.region_ids.includes(regionId))
  }
}

export const governanceSystem = new GovernanceSystem()
