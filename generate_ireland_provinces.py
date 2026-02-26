"""
generate_ireland_provinces.py
Generates a hex-accurate province for every land tile in Ireland.

Removes the 5 placeholder interior provinces (fake x,y coords) and replaces
them with properly positioned hex provinces derived from Ireland's coastline
boundary polygon.

Run from the repo root:
    python generate_ireland_provinces.py

Requires: Python 3.10+, (optional) shapely for accurate pip test.
"""

import os
import sys

# Ensure we can import the framework from the repo root
sys.path.insert(0, os.path.dirname(__file__))
from generate_country_provinces import generate_provinces

# ── Province IDs to remove before generation ──────────────────────────────────
# These use fake/arbitrary x,y coordinates and will be superseded by proper
# hex-accurate provinces generated below.
REMOVE_IDS = [
    "munster_interior",
    "connacht_interior",
    "ulster_interior",
    "leinster_interior",
    "kerry",
]

# ── Sub-region definitions ────────────────────────────────────────────────────
# Checked in order; first match wins.  Last entry is the catch-all.
#
# Historical context (c.1600-1800):
#   - Ulster east (Plantation of Ulster, post-1610): English/Protestant settlers
#   - Ulster west & Connacht: predominantly Gaelic Irish / Catholic
#   - Leinster: mixed; long-established English Pale around Dublin already in JSON
#   - Munster: largely Gaelic / Catholic

SUB_REGIONS = [
    # Ulster – Plantation zone (Antrim, Down, Derry settled by English/Scottish)
    {
        "name": "Ulster East (Plantation)",
        "lat_min": 54.0, "lat_max": 55.5,
        "lng_min": -7.0, "lng_max": -5.0,
        "culture": "English",
        "religion": "Protestant",
        "trade_goods": ["linen", "wool"],
    },
    # Ulster – Gaelic west (Donegal, Tyrone, Fermanagh, Monaghan, Cavan)
    {
        "name": "Ulster West (Gaelic)",
        "lat_min": 54.0, "lat_max": 55.5,
        "lng_min": -11.0, "lng_max": -7.0,
        "culture": "Irish",
        "religion": "Catholic",
        "trade_goods": ["cattle", "wool"],
    },
    # Connacht (west coast: Galway, Mayo, Sligo, Leitrim, Roscommon)
    {
        "name": "Connacht",
        "lat_min": 53.0, "lat_max": 54.5,
        "lng_min": -11.0, "lng_max": -8.0,
        "culture": "Irish",
        "religion": "Catholic",
        "trade_goods": ["cattle", "fish"],
    },
    # Munster (south: Cork, Kerry, Limerick, Tipperary, Waterford, Clare)
    {
        "name": "Munster",
        "lat_min": 50.5, "lat_max": 53.0,
        "lng_min": -11.0, "lng_max": -6.5,
        "culture": "Irish",
        "religion": "Catholic",
        "trade_goods": ["cattle", "wool", "fish"],
    },
    # Leinster catch-all (Dublin/Kildare/Wicklow/Wexford/Kilkenny etc.)
    {
        "name": "Leinster",
        "lat_min": 50.5, "lat_max": 54.5,
        "lng_min": -11.0, "lng_max": -5.0,
        "culture": "Irish",
        "religion": "Catholic",
        "trade_goods": ["grain", "cattle"],
    },
]

# ── County bounding boxes ─────────────────────────────────────────────────────
# Ordered roughly north-to-south, west-to-east within each province.
# Multiple hexes within a county get " 2", " 3" suffixes automatically.

COUNTY_MAP = [
    # Ulster
    {"name": "Donegal",       "lat_min": 54.3,  "lat_max": 55.4,  "lng_min": -8.8,  "lng_max": -7.1},
    {"name": "Londonderry",   "lat_min": 54.7,  "lat_max": 55.2,  "lng_min": -7.5,  "lng_max": -6.5},
    {"name": "Antrim",        "lat_min": 54.5,  "lat_max": 55.3,  "lng_min": -6.8,  "lng_max": -5.5},
    {"name": "Tyrone",        "lat_min": 54.3,  "lat_max": 55.0,  "lng_min": -7.8,  "lng_max": -6.6},
    {"name": "Down",          "lat_min": 54.0,  "lat_max": 54.6,  "lng_min": -6.2,  "lng_max": -5.4},
    {"name": "Armagh",        "lat_min": 54.0,  "lat_max": 54.4,  "lng_min": -6.8,  "lng_max": -6.1},
    {"name": "Fermanagh",     "lat_min": 54.1,  "lat_max": 54.5,  "lng_min": -8.2,  "lng_max": -7.2},
    {"name": "Monaghan",      "lat_min": 53.8,  "lat_max": 54.2,  "lng_min": -7.3,  "lng_max": -6.5},
    {"name": "Cavan",         "lat_min": 53.8,  "lat_max": 54.1,  "lng_min": -7.7,  "lng_max": -6.9},
    # Connacht
    {"name": "Mayo",          "lat_min": 53.5,  "lat_max": 54.4,  "lng_min": -10.2, "lng_max": -8.8},
    {"name": "Sligo",         "lat_min": 54.0,  "lat_max": 54.4,  "lng_min": -8.8,  "lng_max": -8.2},
    {"name": "Leitrim",       "lat_min": 53.9,  "lat_max": 54.3,  "lng_min": -8.2,  "lng_max": -7.8},
    {"name": "Roscommon",     "lat_min": 53.5,  "lat_max": 54.0,  "lng_min": -8.5,  "lng_max": -7.9},
    {"name": "Galway",        "lat_min": 53.1,  "lat_max": 53.7,  "lng_min": -10.2, "lng_max": -8.2},
    # Leinster
    {"name": "Louth",         "lat_min": 53.8,  "lat_max": 54.2,  "lng_min": -6.7,  "lng_max": -6.1},
    {"name": "Meath",         "lat_min": 53.4,  "lat_max": 53.8,  "lng_min": -7.1,  "lng_max": -6.4},
    {"name": "Westmeath",     "lat_min": 53.4,  "lat_max": 53.8,  "lng_min": -7.8,  "lng_max": -7.1},
    {"name": "Longford",      "lat_min": 53.5,  "lat_max": 54.0,  "lng_min": -8.0,  "lng_max": -7.4},
    {"name": "Dublin",        "lat_min": 53.2,  "lat_max": 53.6,  "lng_min": -6.6,  "lng_max": -6.0},
    {"name": "Kildare",       "lat_min": 53.0,  "lat_max": 53.4,  "lng_min": -7.0,  "lng_max": -6.4},
    {"name": "Offaly",        "lat_min": 53.0,  "lat_max": 53.5,  "lng_min": -8.0,  "lng_max": -7.2},
    {"name": "Laois",         "lat_min": 52.8,  "lat_max": 53.2,  "lng_min": -7.7,  "lng_max": -7.0},
    {"name": "Wicklow",       "lat_min": 52.8,  "lat_max": 53.2,  "lng_min": -6.5,  "lng_max": -5.9},
    {"name": "Carlow",        "lat_min": 52.5,  "lat_max": 53.0,  "lng_min": -7.0,  "lng_max": -6.5},
    {"name": "Kilkenny",      "lat_min": 52.3,  "lat_max": 52.8,  "lng_min": -7.5,  "lng_max": -6.8},
    {"name": "Wexford",       "lat_min": 52.0,  "lat_max": 52.8,  "lng_min": -6.9,  "lng_max": -6.2},
    # Munster
    {"name": "Clare",         "lat_min": 52.5,  "lat_max": 53.2,  "lng_min": -9.8,  "lng_max": -8.5},
    {"name": "Tipperary",     "lat_min": 52.3,  "lat_max": 52.8,  "lng_min": -8.5,  "lng_max": -7.5},
    {"name": "Waterford",     "lat_min": 52.0,  "lat_max": 52.4,  "lng_min": -7.8,  "lng_max": -6.9},
    {"name": "Limerick",      "lat_min": 52.3,  "lat_max": 52.8,  "lng_min": -9.0,  "lng_max": -8.0},
    {"name": "Kerry",         "lat_min": 51.7,  "lat_max": 52.5,  "lng_min": -10.5, "lng_max": -9.2},
    {"name": "Cork",          "lat_min": 51.6,  "lat_max": 52.4,  "lng_min": -9.5,  "lng_max": -7.5},
    # Fallback
    {"name": "Ireland",       "lat_min": 50.5,  "lat_max": 56.0,  "lng_min": -11.0, "lng_max": -5.0},
]

# ── Config ────────────────────────────────────────────────────────────────────

IRELAND_CONFIG = {
    "id_prefix":          "ireland",
    "continent":          "europe",
    "region":             "british_isles",
    "sub_regions":        SUB_REGIONS,
    "county_map":         COUNTY_MAP,
    "default_tier":       "unsettled",
    "default_population": 600,
    "default_wealth":     60,
    # Bounding box slightly larger than the island to catch all edge hexes
    "bbox": {
        "lat_min": 50.8,
        "lat_max": 55.6,
        "lng_min": -11.0,
        "lng_max": -5.0,
    },
}

# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    repo_root = os.path.dirname(os.path.abspath(__file__))

    generate_provinces(
        boundary_geojson=os.path.join(repo_root, "data", "boundaries", "ireland.geojson"),
        provinces_json=os.path.join(repo_root, "src", "data", "provinces.json"),
        country_config=IRELAND_CONFIG,
        remove_ids=REMOVE_IDS,
    )
