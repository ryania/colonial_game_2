"""
generate_low_countries_provinces.py
Generates hex-accurate provinces for the Low Countries:
  Netherlands, Belgium, Luxembourg.

Existing named city provinces are preserved:
  amsterdam, antwerp, rotterdam, leiden, utrecht, bruges, ghent, brussels, liege

Run from the repo root:
    python generate_low_countries_provinces.py

Requires: Python 3.10+, (optional but recommended) shapely.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from generate_country_provinces import generate_provinces

REMOVE_IDS: list[str] = []

# ── Sub-region definitions ────────────────────────────────────────────────────
# Historical context c.1600–1750:
#   Dutch Republic (north): cloth, herring, spices (re-export), grain, dairy
#   Spanish / Austrian Netherlands (Belgium): cloth, lace, coal, grain
#   Luxembourg: iron, timber, grain

# ══════════════════════════════════════════════════════════════════════════════
# NETHERLANDS
# ══════════════════════════════════════════════════════════════════════════════

NL_SUB_REGIONS = [
    # Holland coast (west — richest trade zone)
    {
        "name": "Holland",
        "lat_min": 51.7, "lat_max": 53.0,
        "lng_min": 3.8,  "lng_max": 5.5,
        "culture": "Dutch",
        "religion": "Protestant",
        "trade_goods": ["cloth", "herring", "grain"],
    },
    # Zeeland (islands, south coast)
    {
        "name": "Zeeland",
        "lat_min": 51.2, "lat_max": 51.8,
        "lng_min": 3.3,  "lng_max": 4.3,
        "culture": "Dutch",
        "religion": "Protestant",
        "trade_goods": ["salt", "grain", "fish"],
    },
    # Friesland / Groningen (north)
    {
        "name": "Friesland",
        "lat_min": 52.8, "lat_max": 53.6,
        "lng_min": 4.5,  "lng_max": 7.2,
        "culture": "Dutch",
        "religion": "Protestant",
        "trade_goods": ["cattle", "dairy", "grain"],
    },
    # Overijssel / Gelderland / Utrecht (interior)
    {
        "name": "Gelderland",
        "lat_min": 51.6, "lat_max": 52.8,
        "lng_min": 5.4,  "lng_max": 7.2,
        "culture": "Dutch",
        "religion": "Protestant",
        "trade_goods": ["grain", "cattle", "timber"],
    },
    # Catch-all Netherlands
    {
        "name": "Netherlands",
        "lat_min": 50.8, "lat_max": 53.7,
        "lng_min": 3.3,  "lng_max": 7.3,
        "culture": "Dutch",
        "religion": "Protestant",
        "trade_goods": ["grain", "cloth", "dairy"],
    },
]

NL_COUNTY_MAP = [
    {"name": "Groningen",      "lat_min": 53.0, "lat_max": 53.5, "lng_min": 6.0,  "lng_max": 7.3},
    {"name": "Friesland",      "lat_min": 52.8, "lat_max": 53.5, "lng_min": 4.6,  "lng_max": 6.2},
    {"name": "Drenthe",        "lat_min": 52.5, "lat_max": 53.2, "lng_min": 6.0,  "lng_max": 7.0},
    {"name": "Overijssel",     "lat_min": 52.0, "lat_max": 52.8, "lng_min": 6.0,  "lng_max": 7.2},
    {"name": "Flevoland",      "lat_min": 52.2, "lat_max": 52.8, "lng_min": 5.0,  "lng_max": 6.0},
    {"name": "Gelderland",     "lat_min": 51.6, "lat_max": 52.5, "lng_min": 5.5,  "lng_max": 7.0},
    {"name": "Utrecht",        "lat_min": 51.9, "lat_max": 52.4, "lng_min": 4.8,  "lng_max": 5.6},
    {"name": "Noord-Holland",  "lat_min": 52.4, "lat_max": 53.0, "lng_min": 4.4,  "lng_max": 5.3},
    {"name": "Zuid-Holland",   "lat_min": 51.7, "lat_max": 52.4, "lng_min": 3.8,  "lng_max": 5.0},
    {"name": "Zeeland",        "lat_min": 51.2, "lat_max": 51.8, "lng_min": 3.3,  "lng_max": 4.3},
    {"name": "Noord-Brabant",  "lat_min": 51.2, "lat_max": 51.8, "lng_min": 4.2,  "lng_max": 5.9},
    {"name": "Limburg",        "lat_min": 50.8, "lat_max": 51.5, "lng_min": 5.6,  "lng_max": 6.3},
    # Catch-all
    {"name": "Netherlands",    "lat_min": 50.8, "lat_max": 53.7, "lng_min": 3.3,  "lng_max": 7.3},
]

NL_CONFIG = {
    "id_prefix":          "netherlands",
    "continent":          "europe",
    "region":             "low_countries",
    "sub_regions":        NL_SUB_REGIONS,
    "county_map":         NL_COUNTY_MAP,
    "default_tier":       "village",
    "default_population": 900,
    "default_wealth":     120,
    "bbox": {
        "lat_min": 50.7,
        "lat_max": 53.6,
        "lng_min": 3.2,
        "lng_max": 7.3,
    },
}

# ══════════════════════════════════════════════════════════════════════════════
# BELGIUM
# ══════════════════════════════════════════════════════════════════════════════

BE_SUB_REGIONS = [
    # Flanders (north, Dutch-speaking)
    {
        "name": "Flanders",
        "lat_min": 50.7, "lat_max": 51.4,
        "lng_min": 2.5,  "lng_max": 4.5,
        "culture": "Dutch",
        "religion": "Catholic",
        "trade_goods": ["cloth", "linen", "lace"],
    },
    # Brabant (central — Brussels, Antwerp)
    {
        "name": "Brabant",
        "lat_min": 50.5, "lat_max": 51.3,
        "lng_min": 4.0,  "lng_max": 5.2,
        "culture": "Dutch",
        "religion": "Catholic",
        "trade_goods": ["cloth", "grain", "lace"],
    },
    # Wallonia / Hainaut / Namur / Liège (south, French-speaking)
    {
        "name": "Wallonia",
        "lat_min": 49.5, "lat_max": 50.7,
        "lng_min": 3.0,  "lng_max": 6.5,
        "culture": "French",
        "religion": "Catholic",
        "trade_goods": ["coal", "iron", "grain"],
    },
    # Catch-all Belgium
    {
        "name": "Belgium",
        "lat_min": 49.4, "lat_max": 51.5,
        "lng_min": 2.5,  "lng_max": 6.5,
        "culture": "Dutch",
        "religion": "Catholic",
        "trade_goods": ["cloth", "grain", "iron"],
    },
]

BE_COUNTY_MAP = [
    {"name": "West Flanders",  "lat_min": 50.7, "lat_max": 51.4, "lng_min": 2.5,  "lng_max": 3.4},
    {"name": "East Flanders",  "lat_min": 50.7, "lat_max": 51.3, "lng_min": 3.4,  "lng_max": 4.3},
    {"name": "Antwerp",        "lat_min": 51.0, "lat_max": 51.5, "lng_min": 4.2,  "lng_max": 5.1},
    {"name": "Mechelen",       "lat_min": 50.9, "lat_max": 51.2, "lng_min": 4.3,  "lng_max": 4.7},
    {"name": "Flemish Brabant","lat_min": 50.5, "lat_max": 51.0, "lng_min": 4.0,  "lng_max": 5.0},
    {"name": "Brussels",       "lat_min": 50.7, "lat_max": 51.0, "lng_min": 4.2,  "lng_max": 4.6},
    {"name": "Limburg",        "lat_min": 50.6, "lat_max": 51.1, "lng_min": 5.0,  "lng_max": 5.9},
    {"name": "Hainaut",        "lat_min": 50.2, "lat_max": 50.8, "lng_min": 3.2,  "lng_max": 4.4},
    {"name": "Namur",          "lat_min": 50.0, "lat_max": 50.7, "lng_min": 4.3,  "lng_max": 5.2},
    {"name": "Liège",          "lat_min": 50.2, "lat_max": 50.9, "lng_min": 5.5,  "lng_max": 6.4},
    {"name": "Walloon Brabant","lat_min": 50.5, "lat_max": 50.8, "lng_min": 4.4,  "lng_max": 4.9},
    {"name": "Luxembourg",     "lat_min": 49.5, "lat_max": 50.2, "lng_min": 5.0,  "lng_max": 6.5},
    {"name": "Ardennes",       "lat_min": 49.9, "lat_max": 50.6, "lng_min": 5.5,  "lng_max": 6.5},
    # Catch-all
    {"name": "Belgium",        "lat_min": 49.4, "lat_max": 51.5, "lng_min": 2.5,  "lng_max": 6.5},
]

BE_CONFIG = {
    "id_prefix":          "belgium",
    "continent":          "europe",
    "region":             "low_countries",
    "sub_regions":        BE_SUB_REGIONS,
    "county_map":         BE_COUNTY_MAP,
    "default_tier":       "village",
    "default_population": 850,
    "default_wealth":     100,
    "bbox": {
        "lat_min": 49.4,
        "lat_max": 51.6,
        "lng_min": 2.5,
        "lng_max": 6.5,
    },
}

# ══════════════════════════════════════════════════════════════════════════════
# LUXEMBOURG
# ══════════════════════════════════════════════════════════════════════════════

LUX_SUB_REGIONS = [
    {
        "name": "Luxembourg",
        "lat_min": 49.4, "lat_max": 50.2,
        "lng_min": 5.7,  "lng_max": 6.6,
        "culture": "French",
        "religion": "Catholic",
        "trade_goods": ["iron", "grain", "timber"],
    },
]

LUX_COUNTY_MAP = [
    {"name": "Oesling",        "lat_min": 49.9, "lat_max": 50.2, "lng_min": 5.7,  "lng_max": 6.6},
    {"name": "Gutland",        "lat_min": 49.4, "lat_max": 50.0, "lng_min": 5.7,  "lng_max": 6.5},
    {"name": "Luxembourg",     "lat_min": 49.4, "lat_max": 50.2, "lng_min": 5.7,  "lng_max": 6.6},
]

LUX_CONFIG = {
    "id_prefix":          "luxembourg",
    "continent":          "europe",
    "region":             "low_countries",
    "sub_regions":        LUX_SUB_REGIONS,
    "county_map":         LUX_COUNTY_MAP,
    "default_tier":       "village",
    "default_population": 700,
    "default_wealth":     80,
    "bbox": {
        "lat_min": 49.4,
        "lat_max": 50.2,
        "lng_min": 5.7,
        "lng_max": 6.6,
    },
}

# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    repo_root = os.path.dirname(os.path.abspath(__file__))
    pjson = os.path.join(repo_root, "src", "data", "provinces.json")
    bdir  = os.path.join(repo_root, "data", "boundaries")

    generate_provinces(
        boundary_geojson=os.path.join(bdir, "netherlands.geojson"),
        provinces_json=pjson,
        country_config=NL_CONFIG,
        remove_ids=REMOVE_IDS,
    )

    generate_provinces(
        boundary_geojson=os.path.join(bdir, "belgium.geojson"),
        provinces_json=pjson,
        country_config=BE_CONFIG,
        remove_ids=[],
    )

    generate_provinces(
        boundary_geojson=os.path.join(bdir, "luxembourg.geojson"),
        provinces_json=pjson,
        country_config=LUX_CONFIG,
        remove_ids=[],
    )
