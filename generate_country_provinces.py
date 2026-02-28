"""
generate_country_provinces.py
Reusable framework for generating hex-accurate land provinces for any country.

Usage:
    from generate_country_provinces import generate_provinces
    generate_provinces(
        boundary_geojson="data/boundaries/ireland.geojson",
        provinces_json="src/data/provinces.json",
        country_config=IRELAND_CONFIG,
        remove_ids=["munster_interior", ...]
    )

The function:
  1. Loads provinces.json and builds an occupied-cell set (matching ProvinceGenerator.ts logic).
  2. Optionally removes placeholder province IDs.
  3. Loads a GeoJSON Polygon boundary as the land mask.
  4. Iterates every hex cell in the bounding box, checks point-in-polygon, and emits a
     province entry for each unoccupied land cell.
  5. Assigns culture/religion/trade_goods from sub_regions (first match wins).
  6. Assigns a human-readable name from county_map (first match wins, with de-dup counter).
  7. Writes the updated provinces.json.
"""

import json
import math
import os
from typing import Any

# Optional: import terrain assigner so generated provinces get a specific type immediately.
# Falls back to the generic "land" sentinel if the module is unavailable.
try:
    from assign_terrain_types import assign_terrain as _assign_terrain  # type: ignore
    _HAS_TERRAIN_ASSIGNER = True
except ImportError:
    _HAS_TERRAIN_ASSIGNER = False

# ── hex-grid constants (must match ProvinceGenerator.ts / Map.ts) ─────────────
HEX_SIZE    = 3
COL_SPACING = HEX_SIZE * 1.5           # 4.5 px
ROW_SPACING = HEX_SIZE * math.sqrt(3)  # ≈ 5.196 px
HALF_ROW    = ROW_SPACING / 2          # ≈ 2.598 px

WORLD_WIDTH  = 9000
WORLD_HEIGHT = 3300
MAX_LAT =  72.0
MIN_LAT = -60.0
MAX_LNG =  180.0
MIN_LNG = -180.0

LAT_SPAN = MAX_LAT - MIN_LAT  # 132
LNG_SPAN = MAX_LNG - MIN_LNG  # 360


# ── coordinate helpers ────────────────────────────────────────────────────────

def lat_lng_to_pixel(lat: float, lng: float) -> tuple[float, float]:
    px = (lng - MIN_LNG) / LNG_SPAN * WORLD_WIDTH
    py = (MAX_LAT - lat) / LAT_SPAN * WORLD_HEIGHT
    return px, py


def pixel_to_lat_lng(px: float, py: float) -> tuple[float, float]:
    lat = MAX_LAT - (py / WORLD_HEIGHT) * LAT_SPAN
    lng = MIN_LNG + (px / WORLD_WIDTH) * LNG_SPAN
    return lat, lng


def pixel_to_axial(px: float, py: float) -> tuple[int, int]:
    """Convert world-pixel centre to axial hex (q, r) coordinates.
    Matches HexUtils.pixelToAxial in Map.ts."""
    q = (2.0 / 3.0 * px) / HEX_SIZE
    r = (-1.0 / 3.0 * px + math.sqrt(3) / 3.0 * py) / HEX_SIZE
    return round(q), round(r)


def lat_lng_to_col_row(lat: float, lng: float) -> tuple[int, int]:
    """Snap a lat/lng to its nearest pixel-grid cell (col, row).
    Matches the occupied-cell logic in generateOceanGrid."""
    px, py = lat_lng_to_pixel(lat, lng)
    col = round(px / COL_SPACING)
    offset = HALF_ROW if col % 2 == 1 else 0.0
    row = round((py - offset) / ROW_SPACING)
    return col, row


# ── point-in-polygon ──────────────────────────────────────────────────────────

def _ray_cast(point: tuple[float, float], polygon: list[tuple[float, float]]) -> bool:
    """Ray-casting point-in-polygon test (pure Python fallback)."""
    x, y = point
    n = len(polygon)
    inside = False
    j = n - 1
    for i in range(n):
        xi, yi = polygon[i]
        xj, yj = polygon[j]
        if ((yi > y) != (yj > y)) and (x < (xj - xi) * (y - yi) / (yj - yi) + xi):
            inside = not inside
        j = i
    return inside


def make_point_in_polygon(coords: list[list[float]]):
    """Return a callable point_in_polygon(lng, lat) -> bool."""
    try:
        from shapely.geometry import Point, Polygon  # type: ignore
        poly = Polygon(coords)
        def _shapely(lng: float, lat: float) -> bool:
            return poly.contains(Point(lng, lat))
        return _shapely
    except ImportError:
        ring = [(c[0], c[1]) for c in coords]
        def _raycast(lng: float, lat: float) -> bool:
            return _ray_cast((lng, lat), ring)
        return _raycast


# ── sub-region lookup ─────────────────────────────────────────────────────────

def get_sub_region(lat: float, lng: float, sub_regions: list[dict]) -> dict:
    """Return the first sub_region whose bounds contain (lat, lng).
    Falls back to the last entry (which should be a catch-all default)."""
    for sr in sub_regions:
        if (sr.get("lat_min", -90) <= lat <= sr.get("lat_max", 90) and
                sr.get("lng_min", -180) <= lng <= sr.get("lng_max", 180)):
            return sr
    return sub_regions[-1]


# ── county / place-name lookup ────────────────────────────────────────────────

def get_county_name(lat: float, lng: float, county_map: list[dict]) -> str:
    """Return the name of the first county whose bounding box contains (lat, lng)."""
    for c in county_map:
        if (c["lat_min"] <= lat <= c["lat_max"] and
                c["lng_min"] <= lng <= c["lng_max"]):
            return c["name"]
    return "Unknown"


# ── main generator ────────────────────────────────────────────────────────────

def generate_provinces(
    boundary_geojson: str,
    provinces_json: str,
    country_config: dict,
    remove_ids: list[str] | None = None,
    dry_run: bool = False,
) -> list[dict]:
    """
    Generate hex-accurate land provinces for one country/island.

    Parameters
    ----------
    boundary_geojson : path to GeoJSON file (Feature or FeatureCollection with a
                       Polygon or MultiPolygon geometry).
    provinces_json   : path to src/data/provinces.json.
    country_config   : dict with keys:
        id_prefix        str   e.g. "ireland"
        continent        str   e.g. "europe"
        region           str   GeographicRegion value, e.g. "british_isles"
        sub_regions      list  ordered list of sub-region dicts; each has:
                               lat_min, lat_max, lng_min, lng_max,
                               culture, religion, trade_goods (list)
        county_map       list  ordered list of county dicts; each has:
                               name, lat_min, lat_max, lng_min, lng_max
        default_tier     str   e.g. "unsettled"
        default_population int
        default_wealth   int
        bbox             dict  lat_min, lat_max, lng_min, lng_max for search area
    remove_ids        : list of province IDs to remove before adding new ones.
    dry_run           : if True, print results but do not write file.

    Returns
    -------
    List of newly created province dicts.
    """

    # 1. Load existing provinces
    with open(provinces_json, "r", encoding="utf-8") as f:
        provinces: list[dict] = json.load(f)

    # 2. Optionally remove placeholder provinces
    if remove_ids:
        before = len(provinces)
        provinces = [p for p in provinces if p["id"] not in remove_ids]
        removed = before - len(provinces)
        print(f"Removed {removed} placeholder province(s): {remove_ids}")

    # 3. Build occupied-cell set (mirrors generateOceanGrid in ProvinceGenerator.ts)
    occupied: set[tuple[int, int]] = set()
    for p in provinces:
        if p.get("lat") is None or p.get("lng") is None:
            continue
        col, row = lat_lng_to_col_row(float(p["lat"]), float(p["lng"]))
        occupied.add((col, row))

    # 4. Load GeoJSON boundary
    with open(boundary_geojson, "r", encoding="utf-8") as f:
        gj = json.load(f)

    # Support Feature, FeatureCollection, or bare geometry
    if gj["type"] == "FeatureCollection":
        geom = gj["features"][0]["geometry"]
    elif gj["type"] == "Feature":
        geom = gj["geometry"]
    else:
        geom = gj

    if geom["type"] == "MultiPolygon":
        # Use the largest ring for simplicity
        rings = [ring for poly in geom["coordinates"] for ring in poly[:1]]
        all_coords = [c for ring in rings for c in ring]
        point_in_polygon = make_point_in_polygon(all_coords)
        # For MultiPolygon, test against each sub-polygon
        try:
            from shapely.geometry import Point, shape  # type: ignore
            mp = shape(geom)
            def pip(lng: float, lat: float) -> bool:
                return mp.contains(Point(lng, lat))
            point_in_polygon = pip
        except ImportError:
            # Fallback: union of ray-cast tests on all outer rings
            outer_rings = [[(c[0], c[1]) for c in poly[0]]
                           for poly in geom["coordinates"]]
            def pip(lng: float, lat: float) -> bool:  # type: ignore
                return any(_ray_cast((lng, lat), ring) for ring in outer_rings)
            point_in_polygon = pip
    else:
        coords = geom["coordinates"][0]  # outer ring of Polygon
        point_in_polygon = make_point_in_polygon(coords)

    # 5. Compute pixel-grid bounding box
    bbox = country_config["bbox"]
    px_west,  py_north = lat_lng_to_pixel(bbox["lat_max"], bbox["lng_min"])
    px_east,  py_south = lat_lng_to_pixel(bbox["lat_min"], bbox["lng_max"])

    col_min = math.floor(px_west  / COL_SPACING) - 1
    col_max = math.ceil (px_east  / COL_SPACING) + 1
    row_min = math.floor(py_north / ROW_SPACING) - 1
    row_max = math.ceil (py_south / ROW_SPACING) + 1

    # 6. Iterate cells and generate provinces
    id_prefix    = country_config["id_prefix"]
    continent    = country_config["continent"]
    region       = country_config["region"]
    sub_regions  = country_config["sub_regions"]
    county_map   = country_config["county_map"]
    default_tier = country_config.get("default_tier", "unsettled")
    default_pop  = country_config.get("default_population", 600)
    default_wlth = country_config.get("default_wealth", 60)

    # track how many hexes per county name for de-duplication
    county_counts: dict[str, int] = {}
    # track existing axial coords to avoid collisions
    existing_axial: set[tuple[int, int]] = {
        (int(p["x"]), int(p["y"])) for p in provinces
    }

    new_provinces: list[dict] = []

    for col in range(col_min, col_max + 1):
        offset = HALF_ROW if col % 2 == 1 else 0.0
        for row in range(row_min, row_max + 1):
            if (col, row) in occupied:
                continue

            # Hex centre in world pixels
            px = col * COL_SPACING
            py = row * ROW_SPACING + offset

            # Guard world bounds
            if px < 0 or px > WORLD_WIDTH or py < 0 or py > WORLD_HEIGHT:
                continue

            lat, lng = pixel_to_lat_lng(px, py)

            # Point-in-polygon test
            if not point_in_polygon(lng, lat):
                continue

            # Axial coordinates
            q, r = pixel_to_axial(px, py)
            if (q, r) in existing_axial:
                # Extremely rare collision — shift q by 1 to resolve
                q += 1
            existing_axial.add((q, r))
            occupied.add((col, row))

            # Sub-region attributes
            sr = get_sub_region(lat, lng, sub_regions)

            # County name (with de-dup counter)
            county = get_county_name(lat, lng, county_map)
            county_counts[county] = county_counts.get(county, 0) + 1
            count = county_counts[county]
            name = county if count == 1 else f"{county} {count}"

            prov_id = f"{id_prefix}_{col}_{row}"

            prov: dict[str, Any] = {
                "id": prov_id,
                "name": name,
                "x": q,
                "y": r,
                "lat": round(lat, 4),
                "lng": round(lng, 4),
                "continent": continent,
                "region": region,
                "terrain_type": _assign_terrain({
                    "region": region,
                    "continent": continent,
                    "settlement_tier": default_tier,
                }) if _HAS_TERRAIN_ASSIGNER else "land",
                "settlement_tier": default_tier,
                "population": default_pop,
                "wealth": default_wlth,
                "trade_goods": list(sr["trade_goods"]),
                "owner_culture": sr["culture"],
                "owner_religion": sr["religion"],
                "development_progress": 0,
                "months_at_tier": 0,
                "development_invested": 0,
            }
            new_provinces.append(prov)

    print(f"Generated {len(new_provinces)} new '{id_prefix}' land provinces.")

    # Guard: every land province must have a specific terrain type.
    # Generic "land" is a placeholder that should be resolved by assign_terrain_types.
    generic_terrain = [p["id"] for p in new_provinces if p.get("terrain_type") == "land"]
    if generic_terrain:
        raise RuntimeError(
            f"{len(generic_terrain)} generated province(s) still have the generic 'land' terrain type. "
            f"Ensure assign_terrain_types.py is present in the repo root. "
            f"Affected IDs (first 5): {generic_terrain[:5]}"
        )

    # Guard: every land province must have at least one trade good.
    no_goods = [p["id"] for p in new_provinces if not p.get("trade_goods")]
    if no_goods:
        raise RuntimeError(
            f"{len(no_goods)} generated province(s) have no trade_goods. "
            f"Ensure each sub_region entry in the country config lists at least one good. "
            f"Affected IDs (first 5): {no_goods[:5]}"
        )

    if not dry_run:
        provinces.extend(new_provinces)
        with open(provinces_json, "w", encoding="utf-8") as f:
            json.dump(provinces, f, indent=2)
        print(f"Written to {provinces_json}. Total provinces: {len(provinces)}")

    return new_provinces
