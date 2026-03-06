#!/usr/bin/env python3
"""
Rename numbered province values to directional region values.
e.g. "Kerry 7" -> "North Kerry 3" based on geographic position.

Grid provinces (id pattern: country_X_Y) are grouped by base name,
then each sub-province is assigned a compass direction relative to
the group centroid. Within each direction, provinces are numbered
sequentially (first one has no number suffix).
"""

import json
import re
import math
from collections import defaultdict


GRID_ID_PATTERN = re.compile(r'^.+_\d+_\d+$')
NUMBERED_NAME_PATTERN = re.compile(r'^(.+?)\s+(\d+)$')

# Direction prefixes for already-directional base names
CARDINAL_PREFIXES = ('North ', 'South ', 'East ', 'West ',
                     'Northeast ', 'Northwest ', 'Southeast ', 'Southwest ',
                     'Central ', 'Upper ', 'Lower ', 'Inner ', 'Outer ')


def is_grid_province(province):
    return bool(GRID_ID_PATTERN.match(province.get('id', '')))


def get_base_name(name):
    """Extract base name, removing trailing number if present."""
    m = NUMBERED_NAME_PATTERN.match(name)
    return m.group(1) if m else name


def get_direction(dlat, dlng, n_provinces):
    """Get compass direction based on offset from centroid."""
    if dlat == 0.0 and dlng == 0.0:
        return 'Central'

    # Angle in degrees: 0 = North, 90 = East, -90 = West, ±180 = South
    angle = math.degrees(math.atan2(dlng, dlat))

    if n_provinces <= 3:
        # Just North/South
        return 'North' if dlat >= 0 else 'South'
    elif n_provinces <= 6:
        # 4 cardinal directions
        if -45 <= angle < 45:
            return 'North'
        elif 45 <= angle < 135:
            return 'East'
        elif angle >= 135 or angle < -135:
            return 'South'
        else:
            return 'West'
    else:
        # 8 compass directions
        if -22.5 <= angle < 22.5:
            return 'North'
        elif 22.5 <= angle < 67.5:
            return 'Northeast'
        elif 67.5 <= angle < 112.5:
            return 'East'
        elif 112.5 <= angle < 157.5:
            return 'Southeast'
        elif angle >= 157.5 or angle < -157.5:
            return 'South'
        elif -157.5 <= angle < -112.5:
            return 'Southwest'
        elif -112.5 <= angle < -67.5:
            return 'West'
        else:
            return 'Northwest'


def build_new_name(direction, base, seq_num):
    """Build the new province name."""
    # For already-directional base names, use different qualifiers
    already_directional = any(base.startswith(p) for p in CARDINAL_PREFIXES)

    if already_directional:
        # Map compass directions to positional qualifiers to avoid "North North X"
        qualifier_map = {
            'North': 'Upper',
            'South': 'Lower',
            'East': 'Eastern',
            'West': 'Western',
            'Northeast': 'Upper Eastern',
            'Northwest': 'Upper Western',
            'Southeast': 'Lower Eastern',
            'Southwest': 'Lower Western',
            'Central': 'Central',
        }
        qualifier = qualifier_map.get(direction, direction)
        core = f'{qualifier} {base}'
    else:
        core = f'{direction} {base}'

    if seq_num == 1:
        return core
    return f'{core} {seq_num}'


def rename_group(provinces):
    """
    Assign new directional names to all grid provinces in a base-name group.
    Returns a dict mapping old_name -> new_name.
    """
    if len(provinces) == 1:
        # Nothing to do for singletons
        return {}

    lats = [p['lat'] for p in provinces]
    lngs = [p['lng'] for p in provinces]
    centroid_lat = sum(lats) / len(lats)
    centroid_lng = sum(lngs) / len(lngs)
    n = len(provinces)

    # Assign each province a direction
    direction_groups = defaultdict(list)
    for p in provinces:
        dlat = p['lat'] - centroid_lat
        dlng = p['lng'] - centroid_lng
        dist = math.sqrt(dlat ** 2 + dlng ** 2)
        direction = get_direction(dlat, dlng, n)
        direction_groups[direction].append((dist, p['lat'], p['lng'], p))

    base = get_base_name(provinces[0].get('name', ''))

    renames = {}
    for direction, items in direction_groups.items():
        # Sort geographically: North→South (lat desc), West→East (lng asc)
        # This gives predictable grid-like sequential numbering
        items.sort(key=lambda x: (-x[1], x[2]))
        for seq, (dist, lat, lng, p) in enumerate(items, start=1):
            new_name = build_new_name(direction, base, seq)
            old_name = p['name']
            if old_name != new_name:
                renames[p['id']] = (old_name, new_name)

    return renames


def main():
    input_path = 'src/data/provinces.json'
    output_path = 'src/data/provinces.json'

    print(f'Loading {input_path}...')
    with open(input_path) as f:
        provinces = json.load(f)

    # Separate European grid provinces from all others
    europe_grid = []
    other = []
    for p in provinces:
        if p.get('continent') == 'europe' and is_grid_province(p):
            europe_grid.append(p)
        else:
            other.append(p)

    print(f'Total provinces: {len(provinces)}')
    print(f'European grid provinces to process: {len(europe_grid)}')

    # Group by base name within each region (to avoid cross-region confusion)
    # e.g., "France" in france region vs "France" in holy_roman_empire
    groups = defaultdict(list)
    for p in europe_grid:
        region = p.get('region', '')
        base = get_base_name(p.get('name', ''))
        key = (region, base)
        groups[key].append(p)

    # Build rename map: province_id -> new_name
    all_renames = {}  # id -> (old_name, new_name)
    for (region, base), provs in groups.items():
        renames = rename_group(provs)
        all_renames.update(renames)

    print(f'Provinces to rename: {len(all_renames)}')

    # Check for collisions (new names that would clash within the same region)
    # Build a set of existing "non-grid" names per region to avoid conflicts
    city_names_by_region = defaultdict(set)
    for p in other:
        if p.get('continent') == 'europe':
            city_names_by_region[p.get('region', '')].add(p.get('name', ''))

    # Apply renames
    id_to_province = {p['id']: p for p in provinces}
    renamed_count = 0
    collision_count = 0

    for pid, (old_name, new_name) in all_renames.items():
        p = id_to_province[pid]
        region = p.get('region', '')
        # Warn on collision with city province
        if new_name in city_names_by_region[region]:
            print(f'  COLLISION WARNING: {old_name!r} -> {new_name!r} conflicts with existing city in {region}')
            collision_count += 1
            # Append the original number to disambiguate
            orig_num = NUMBERED_NAME_PATTERN.match(old_name)
            if orig_num:
                new_name = f'{new_name} (was {orig_num.group(2)})'
        p['name'] = new_name
        renamed_count += 1

    print(f'Renamed: {renamed_count} provinces')
    if collision_count:
        print(f'Collisions: {collision_count}')

    # Save
    print(f'Saving to {output_path}...')
    with open(output_path, 'w') as f:
        json.dump(provinces, f, separators=(',', ':'))
    print('Done.')

    # Print summary stats
    print('\nSample renames:')
    shown = 0
    for pid, (old_name, new_name) in sorted(all_renames.items()):
        if shown >= 30:
            break
        if 'Kerry' in old_name or 'Cork' in old_name or 'Norway' in old_name:
            print(f'  {old_name!r} -> {new_name!r}')
            shown += 1


if __name__ == '__main__':
    main()
