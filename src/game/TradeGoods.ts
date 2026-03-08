/**
 * TradeGoods.ts
 *
 * Base prices for all trade goods. Kept in a separate module so that
 * ProvinceGenerator can import prices without pulling in TradeSystem
 * (which imports Pathfinding → Map → ProvinceGenerator, creating a cycle).
 *
 * Also contains food system metadata:
 *   FOOD_GOODS        — set of trade goods that have nutritional value
 *   FOOD_SATIATION    — effective food units per trade unit (grain = 1.0 reference)
 *   FOOD_SPOILAGE_RATE — fraction of food lost per month in storage / per transit hop
 */

export const TRADE_GOOD_PRICES: Record<string, number> = {
  // Tier 1 — staples (1–3)
  grain:        2,
  rice:         2,
  fish:         2,
  salt:         2,
  clay:         2,
  hemp:         2,
  wool:         3,
  flax:         3,
  timber:       3,
  cattle:       3,
  coal:         3,
  dates:        3,
  coconut:      3,
  bison:        3,
  // Tier 2 — semi-processed goods (4–7)
  cloth:        4,
  naval_stores: 4,
  rum:          5,
  sugar:        5,
  iron:         5,
  cotton:       5,
  beer:         4,
  wax:          4,
  leather:      4,
  tin:          5,
  cork:         4,
  palm_oil:     5,
  wine:         4,
  linen:        4,
  horses:       5,
  brazilwood:   6,
  olive_oil:    4,
  slaves:       6,
  dye:          6,
  indigo:       8,
  cocoa:        7,
  cacao:        7,
  tobacco:      7,
  copper:       7,
  banking:      5,
  glass:        5,
  marble:       6,
  // Tier 3 — luxury goods (8–12)
  furs:         8,
  fur:          8,
  spices:      12,
  pepper:      10,
  coffee:       9,
  tea:         10,
  ivory:       10,
  porcelain:   12,
  amber:        8,
  sandalwood:   9,
  camphor:      9,
  teak:         7,
  cloves:      12,
  pearls:      10,
  incense:      8,
  // Tier 4 — high-value (13–20)
  silver:      15,
  silk:        15,
  gold:        20,
  diamonds:    18,
}

// ---------------------------------------------------------------------------
// Food system metadata
// ---------------------------------------------------------------------------

/**
 * Satiation value per trade unit of each food good, relative to grain = 1.0.
 * Represents how much a unit of this good satisfies population food demand.
 * Goods not listed here are not food goods and contribute nothing to nutrition.
 *
 * Primary staples (grain, rice) are the reference.
 * Condiments (spices, pepper) add modest satiation but are not primary sustenance.
 * Alcohol (rum, wine, beer) provides calories but poor nutrition.
 * Cattle and bison are highly nutritious — provinces that raise them produce
 *   food (beef + dairy / pemmican + hide) even though leather is a byproduct.
 */
export const FOOD_SATIATION: Record<string, number> = {
  grain:     1.00,  // Reference staple
  rice:      1.00,
  fish:      0.80,  // Good protein, limited calories
  dates:     0.90,  // Calorie-dense dried fruit
  coconut:   0.70,  // Flesh + milk; useful but not a staple alone
  cattle:    1.20,  // Beef + dairy — very nutritious
  bison:     1.20,  // Meat + pemmican — highly nutritious
  sugar:     0.50,  // Pure carbohydrate — calorie-dense but incomplete
  rum:       0.35,  // Fermented sugarcane — alcohol, limited nutrition
  beer:      0.45,  // Fermented grain — some nutrition
  wine:      0.40,  // Fermented grape — modest calories
  olive_oil: 0.80,  // Fat-dense; essential in Mediterranean diet
  palm_oil:  0.75,  // Cooking fat
  spices:    0.20,  // Condiment — improves palatability; not primary sustenance
  pepper:    0.20,  // Condiment
  coffee:    0.25,  // Stimulant; minimal nutrition
  tea:       0.25,  // Same
  cocoa:     0.60,  // Nutrient-rich seed
  cacao:     0.60,
}

/**
 * Fraction of food units lost per month in storage, and per transit "hop"
 * (province → region, region → cluster).
 *   0.00 = never spoils (salt, spices, dried goods)
 *   0.01 = extremely stable (rum, sugar, wine in barrels)
 *   0.20 = moderately perishable (beer goes flat; coconut flesh dries out)
 *   0.45 = highly perishable (fresh fish, live cattle on long journeys)
 *
 * High spoilage goods cannot reach distant trade clusters in meaningful
 * quantities — they are effectively consumed locally or regionally only.
 * This naturally prevents fresh fish from becoming a transatlantic commodity
 * while salt-cured goods, grain, and dried spices trade globally.
 */
export const FOOD_SPOILAGE_RATE: Record<string, number> = {
  grain:     0.04,  // Dry grain stores for years in good granaries
  rice:      0.03,  // Hulled rice — very stable
  fish:      0.45,  // Fresh fish is extremely perishable; some is salted (averaged)
  dates:     0.04,  // Dried dates — naturally long-lasting
  coconut:   0.25,  // Fresh flesh spoils; copra (dried) is more stable (averaged)
  cattle:    0.45,  // Live animal transport is risky; salt beef is better (averaged)
  bison:     0.45,  // Same as cattle
  sugar:     0.01,  // Refined sugar — very stable crystalline form
  rum:       0.01,  // High alcohol content — excellent preservation
  beer:      0.20,  // Flat beer after long voyages; hops help preservation
  wine:      0.04,  // Ages well in barrels; some evaporation
  olive_oil: 0.03,  // Stable amphora-packed oil
  palm_oil:  0.05,  // Slightly less stable than olive oil
  spices:    0.01,  // Dried spices last years; hence their immense trade value
  pepper:    0.01,
  coffee:    0.04,  // Roasted beans lose freshness; green beans are more stable
  tea:       0.02,  // Dried tea leaves — very stable
  cocoa:     0.07,  // Dried cacao beans — moderately stable
  cacao:     0.07,
}

/** Set of all trade goods with food/nutritional value. */
export const FOOD_GOODS: ReadonlySet<string> = new Set(Object.keys(FOOD_SATIATION))
