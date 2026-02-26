"""
assign_terrain_types.py

Assigns specific terrain types to provinces currently using the generic 'land' type.
Uses geographic region, continent, and settlement tier to make educated assignments.
"""

import json
import random

random.seed(42)  # Reproducible results

# Weighted terrain distributions per geographic region.
# Keys are terrain types, values are relative weights.
REGION_TERRAIN: dict[str, dict[str, int]] = {
    # Europe
    'anatolia':          {'hills': 40, 'mountains': 20, 'farmlands': 30, 'flatlands': 10},
    'balkans':           {'hills': 40, 'mountains': 30, 'farmlands': 20, 'forest': 10},
    'british_isles':     {'hills': 30, 'farmlands': 30, 'forest': 20, 'bog': 20},
    'central_europe':    {'farmlands': 35, 'hills': 30, 'forest': 25, 'mountains': 10},
    'eastern_europe':    {'flatlands': 40, 'farmlands': 30, 'forest': 25, 'bog': 5},
    'france':            {'farmlands': 40, 'forest': 30, 'hills': 20, 'mountains': 10},
    'hanseatic':         {'farmlands': 40, 'forest': 30, 'flatlands': 20, 'bog': 10},
    'holy_roman_empire': {'farmlands': 30, 'hills': 30, 'forest': 25, 'mountains': 15},
    'iberia':            {'hills': 40, 'farmlands': 30, 'flatlands': 20, 'mountains': 10},
    'italy':             {'hills': 40, 'farmlands': 35, 'mountains': 15, 'flatlands': 10},
    'low_countries':     {'farmlands': 55, 'flatlands': 30, 'bog': 15},
    'poland':            {'flatlands': 45, 'farmlands': 35, 'forest': 15, 'bog': 5},
    'russia':            {'forest': 45, 'flatlands': 35, 'bog': 15, 'hills': 5},
    'scandinavia':       {'forest': 35, 'hills': 30, 'mountains': 20, 'bog': 15},

    # Middle East & North Africa
    'arabia':            {'flatlands': 60, 'hills': 30, 'farmlands': 10},
    'levant':            {'hills': 45, 'flatlands': 30, 'farmlands': 20, 'mountains': 5},
    'mesopotamia':       {'flatlands': 50, 'farmlands': 40, 'swamp': 10},
    'north_africa':      {'flatlands': 60, 'hills': 25, 'mountains': 15},
    'northeast_africa':  {'hills': 40, 'mountains': 30, 'flatlands': 30},
    'persia':            {'hills': 40, 'flatlands': 35, 'mountains': 20, 'farmlands': 5},

    # Sub-Saharan Africa
    'central_africa':    {'forest': 70, 'swamp': 15, 'hills': 15},
    'east_africa':       {'hills': 40, 'flatlands': 35, 'mountains': 15, 'forest': 10},
    'madagascar':        {'forest': 50, 'hills': 35, 'flatlands': 15},
    'southern_africa':   {'flatlands': 45, 'hills': 30, 'farmlands': 15, 'forest': 10},
    'west_africa':       {'forest': 45, 'flatlands': 30, 'hills': 15, 'swamp': 10},

    # South & Southeast Asia
    'burma':             {'forest': 50, 'hills': 30, 'mountains': 20},
    'india_east':        {'farmlands': 40, 'hills': 30, 'forest': 20, 'swamp': 10},
    'india_interior':    {'hills': 35, 'mountains': 25, 'farmlands': 25, 'forest': 15},
    'india_west':        {'farmlands': 40, 'hills': 30, 'flatlands': 20, 'forest': 10},
    'indochina':         {'forest': 50, 'hills': 30, 'mountains': 20},
    'malaya':            {'forest': 60, 'hills': 30, 'swamp': 10},
    'siam':              {'forest': 50, 'hills': 30, 'flatlands': 15, 'swamp': 5},
    'south_asia':        {'farmlands': 35, 'hills': 30, 'forest': 20, 'flatlands': 15},
    'southeast_asia':    {'forest': 50, 'hills': 30, 'mountains': 15, 'swamp': 5},

    # East Asia
    'china':             {'farmlands': 30, 'hills': 30, 'mountains': 20, 'forest': 20},
    'central_asia':      {'flatlands': 60, 'hills': 25, 'mountains': 15},
    'east_asia':         {'hills': 35, 'farmlands': 30, 'mountains': 20, 'forest': 15},
    'japan':             {'hills': 40, 'mountains': 35, 'forest': 20, 'farmlands': 5},
    'korea':             {'hills': 45, 'mountains': 30, 'forest': 20, 'farmlands': 5},

    # Americas
    'caribbean':         {'hills': 40, 'flatlands': 30, 'forest': 20, 'beach': 10},
    'central_america':   {'forest': 50, 'hills': 30, 'mountains': 20},
    'great_lakes':       {'forest': 50, 'flatlands': 30, 'hills': 20},
    'mexico':            {'hills': 35, 'mountains': 30, 'flatlands': 20, 'forest': 15},
    'north_america':     {'forest': 40, 'flatlands': 35, 'hills': 20, 'bog': 5},
    'south_america':     {'forest': 40, 'mountains': 25, 'hills': 20, 'swamp': 15},
    'gulf_of_mexico':    {'beach': 30, 'flatlands': 30, 'swamp': 25, 'forest': 15},

    # Oceania & Pacific
    'australia':         {'flatlands': 50, 'hills': 30, 'farmlands': 15, 'forest': 5},
    'new_guinea':        {'forest': 60, 'mountains': 25, 'swamp': 15},
    'new_zealand':       {'hills': 40, 'mountains': 30, 'forest': 20, 'farmlands': 10},
    'pacific_islands':   {'hills': 40, 'forest': 35, 'beach': 25},

    # Island / coastal water-adjacent regions (land provinces within these)
    'borneo':            {'forest': 55, 'hills': 30, 'swamp': 15},
    'celebes':           {'forest': 50, 'hills': 35, 'mountains': 15},
    'java':              {'hills': 40, 'forest': 35, 'farmlands': 20, 'swamp': 5},
    'philippines':       {'hills': 50, 'forest': 35, 'mountains': 15},
    'spice_islands':     {'forest': 50, 'hills': 35, 'mountains': 15},
    'sumatra':           {'forest': 50, 'swamp': 25, 'hills': 25},

    # Coastal sea regions that may have land provinces
    'arabian_sea':       {'beach': 50, 'hills': 30, 'flatlands': 20},
    'atlantic':          {'beach': 60, 'flatlands': 40},
    'baltic':            {'beach': 40, 'flatlands': 35, 'forest': 25},
    'bay_of_bengal':     {'beach': 50, 'flatlands': 30, 'forest': 20},
    'black_sea':         {'beach': 50, 'flatlands': 30, 'hills': 20},
    'caspian':           {'flatlands': 60, 'hills': 40},
    'north_sea':         {'beach': 40, 'flatlands': 35, 'farmlands': 25},
    'persian_gulf':      {'flatlands': 60, 'hills': 40},
    'red_sea':           {'hills': 50, 'flatlands': 50},
    'south_china_sea':   {'beach': 50, 'hills': 30, 'forest': 20},
}

# Fallback by continent
CONTINENT_TERRAIN: dict[str, dict[str, int]] = {
    'europe':   {'farmlands': 35, 'hills': 30, 'forest': 25, 'flatlands': 10},
    'africa':   {'flatlands': 40, 'hills': 30, 'forest': 20, 'flatlands': 10},
    'americas': {'forest': 40, 'hills': 30, 'flatlands': 20, 'mountains': 10},
    'asia':     {'hills': 35, 'farmlands': 25, 'forest': 25, 'flatlands': 15},
    'oceania':  {'hills': 40, 'forest': 30, 'flatlands': 20, 'mountains': 10},
}

# Generic fallback
DEFAULT_TERRAIN: dict[str, int] = {
    'hills': 30, 'flatlands': 30, 'forest': 25, 'farmlands': 15
}

# Settled tiers boost farmlands probability (only if farmlands is already in the pool)
SETTLED_TIERS = {'village', 'town', 'city'}
FARMLANDS_BOOST = 20


def weighted_choice(weights: dict[str, int]) -> str:
    """Pick a key from a dict of {key: weight} using weighted random selection."""
    total = sum(weights.values())
    r = random.randint(1, total)
    cumulative = 0
    for key, weight in weights.items():
        cumulative += weight
        if r <= cumulative:
            return key
    return list(weights.keys())[-1]


def assign_terrain(province: dict) -> str:
    """Choose an appropriate terrain type for a land province."""
    region = province.get('region')
    continent = province.get('continent')
    tier = province.get('settlement_tier', 'wilderness')

    # Look up base weights
    if region and region in REGION_TERRAIN:
        weights = dict(REGION_TERRAIN[region])
    elif continent and continent in CONTINENT_TERRAIN:
        weights = dict(CONTINENT_TERRAIN[continent])
    else:
        weights = dict(DEFAULT_TERRAIN)

    # Boost farmlands for settled provinces where farmlands is already an option
    if tier in SETTLED_TIERS and 'farmlands' in weights:
        weights['farmlands'] += FARMLANDS_BOOST

    return weighted_choice(weights)


def main():
    with open('src/data/provinces.json') as f:
        provinces = json.load(f)

    changed = 0
    terrain_counts: dict[str, int] = {}

    for province in provinces:
        terrain = province.get('terrain_type', 'land')

        # Only reclassify generic 'land' provinces
        if terrain == 'land':
            new_terrain = assign_terrain(province)
            province['terrain_type'] = new_terrain
            changed += 1
        else:
            new_terrain = terrain

        terrain_counts[new_terrain] = terrain_counts.get(new_terrain, 0) + 1

    with open('src/data/provinces.json', 'w') as f:
        json.dump(provinces, f, indent=2)
        f.write('\n')

    print(f"Updated {changed} provinces from 'land' to specific terrain types.")
    print("\nFinal terrain distribution:")
    for terrain, count in sorted(terrain_counts.items(), key=lambda x: -x[1]):
        print(f"  {terrain:12s}: {count}")
    print(f"\nTotal provinces: {len(provinces)}")


if __name__ == '__main__':
    main()
