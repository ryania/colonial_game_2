#!/usr/bin/env python3
"""
generate_river_connections.py

Reads river GeoJSON files and src/data/provinces.json, then derives
province-to-province river connections by mapping each river coordinate to
the nearest province in the allowed regions for that river.

Input GeoJSON files processed:
  data/rivers/ireland_rivers.geojson   — 9 major Irish rivers
  data/rivers/western_eu_rivers.geojson — 24 major Western European rivers

Inclusion criteria (see western_eu_rivers.geojson for full text):
  • Total length >= 300 km, OR
  • Historically navigable in the colonial period (1400–1800) and connected
    a major port, capital, or trade hub, OR
  • Formed a key political/territorial boundary between colonial-era powers

Each river feature must carry a "regions" property: a list of province
`region` field values to search when matching coordinates. This prevents
cross-country false matches (e.g. a French river coordinate accidentally
matching a German province near a shared border).

Province region values used:
  ireland             — Ireland
  france              — France
  holy_roman_empire   — Germany (and HRE territories)
  iberia              — Spain and Portugal
  italy               — Italy
  central_europe      — Switzerland (and Alpine territories)
  low_countries       — Netherlands and Belgium

Outputs src/data/river_connections.json with:
  - connections:      list of {from_id, to_id, river_name} pairs
  - province_rivers:  map from province_id -> [river_name, ...]

Usage:
    python3 generate_river_connections.py
"""

import json
import math
import os
from typing import Any

REPO_ROOT = os.path.dirname(os.path.abspath(__file__))

RIVER_FILES = [
    os.path.join(REPO_ROOT, "data", "rivers", "ireland_rivers.geojson"),
    os.path.join(REPO_ROOT, "data", "rivers", "western_eu_rivers.geojson"),
]

PROVINCES_JSON = os.path.join(REPO_ROOT, "src", "data", "provinces.json")
OUTPUT_JSON    = os.path.join(REPO_ROOT, "src", "data", "river_connections.json")

# Only create a connection if the two provinces are within this many hex-steps.
# Prevents spurious long-range connections when river coordinates jump across
# large gaps in province coverage.
MAX_HEX_DIST = 4

# Ireland rivers have no "regions" property; fall back to british_isles,
# which is the `region` value used by ireland_* provinces.
IRELAND_REGION = "british_isles"


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Great-circle distance in km between two lat/lng points."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (math.sin(dlat / 2) ** 2
         + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2))
         * math.sin(dlng / 2) ** 2)
    return R * 2 * math.asin(math.sqrt(a))


def nearest_province(
    lat: float, lng: float, province_pool: list[dict[str, Any]]
) -> dict[str, Any] | None:
    """Return the province in pool whose lat/lng is closest to (lat, lng)."""
    best = None
    best_dist = float("inf")
    for p in province_pool:
        plat = p.get("lat")
        plng = p.get("lng")
        if plat is None or plng is None:
            continue
        d = haversine_km(lat, lng, plat, plng)
        if d < best_dist:
            best_dist = d
            best = p
    return best


def hex_distance(p1: dict, p2: dict) -> int:
    """Axial hex-grid distance between two provinces using their x,y coords."""
    dx = p1["x"] - p2["x"]
    dy = p1["y"] - p2["y"]
    return (abs(dx) + abs(dy) + abs(dx + dy)) // 2


def main() -> None:
    # Load all provinces once, then build per-region lookup maps
    with open(PROVINCES_JSON) as f:
        all_provinces: list[dict[str, Any]] = json.load(f)

    # Index provinces by region (only those with lat/lng and a regular grid ID).
    # City provinces (e.g. id='paris', 'london', 'frankfurt') have anomalous hex
    # coordinates (x/y far outside their region's normal range) because they are
    # placed as special city nodes on a different part of the hex grid. Including
    # them would produce enormous hex_distance values and skip valid connections.
    # Regular provinces have IDs of the form "{region}_{x}_{index}", i.e. at least
    # two underscores / three parts.
    by_region: dict[str, list[dict[str, Any]]] = {}
    for p in all_provinces:
        if p.get("lat") is None or p.get("lng") is None:
            continue
        if len(p["id"].split("_")) < 3:
            continue  # skip city provinces with misaligned hex coordinates
        region = p.get("region", "")
        by_region.setdefault(region, []).append(p)

    print("Province pools by region:")
    for region, pool in sorted(by_region.items()):
        print(f"  {region}: {len(pool)} provinces")

    connections: list[dict[str, str]] = []
    province_rivers: dict[str, list[str]] = {}
    seen_connections: set[tuple[str, str]] = set()

    for geojson_path in RIVER_FILES:
        if not os.path.exists(geojson_path):
            print(f"WARNING: {geojson_path} not found — skipping")
            continue

        with open(geojson_path) as f:
            rivers_geojson: dict[str, Any] = json.load(f)

        print(f"\n=== Processing {os.path.basename(geojson_path)} ===")

        for feature in rivers_geojson["features"]:
            river_name: str = feature["properties"]["name"]
            coords: list[list[float]] = feature["geometry"]["coordinates"]

            # Determine which province regions to search
            allowed_regions: list[str] = feature["properties"].get("regions", [IRELAND_REGION])

            # Build the province pool for this river
            province_pool: list[dict[str, Any]] = []
            for r in allowed_regions:
                province_pool.extend(by_region.get(r, []))

            if not province_pool:
                print(f"  WARNING: no provinces found for regions {allowed_regions} — skipping {river_name}")
                continue

            print(f"\n  {river_name} ({len(coords)} pts, regions={allowed_regions}, pool={len(province_pool)})...")

            prev_province: dict[str, Any] | None = None

            for lng, lat in coords:
                province = nearest_province(lat, lng, province_pool)
                if province is None:
                    continue

                pid = province["id"]

                # Record that this river touches this province
                if pid not in province_rivers:
                    province_rivers[pid] = []
                if river_name not in province_rivers[pid]:
                    province_rivers[pid].append(river_name)

                # Create connection if the nearest province changed
                if prev_province is not None and prev_province["id"] != pid:
                    hex_dist = hex_distance(prev_province, province)
                    if hex_dist <= MAX_HEX_DIST:
                        key = tuple(sorted([prev_province["id"], pid]))
                        if key not in seen_connections:
                            seen_connections.add(key)
                            connections.append({
                                "from_id": key[0],
                                "to_id": key[1],
                                "river_name": river_name,
                            })
                            print(f"    Connect: {prev_province['name']} ({prev_province['id']}) "
                                  f"<-> {province['name']} ({pid})  [dist={hex_dist}]")
                    else:
                        print(f"    SKIP long jump ({hex_dist} hexes): "
                              f"{prev_province['name']} -> {province['name']}")

                prev_province = province

    print(f"\n=== Summary ===")
    print(f"River connections: {len(connections)}")
    print(f"Provinces with rivers: {len(province_rivers)}")

    output = {
        "_comment": (
            "Auto-generated by generate_river_connections.py from "
            "data/rivers/ireland_rivers.geojson and "
            "data/rivers/western_eu_rivers.geojson. "
            "Do not edit manually. Re-run generate_river_connections.py to regenerate."
        ),
        "connections": connections,
        "province_rivers": province_rivers,
    }

    with open(OUTPUT_JSON, "w") as f:
        json.dump(output, f, indent=2)
    print(f"Written to {OUTPUT_JSON}")


if __name__ == "__main__":
    main()
