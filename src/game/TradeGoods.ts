/**
 * TradeGoods.ts
 *
 * Base prices for all trade goods. Kept in a separate module so that
 * ProvinceGenerator can import prices without pulling in TradeSystem
 * (which imports Pathfinding → Map → ProvinceGenerator, creating a cycle).
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
