"""
generate_central_europe_provinces.py
Generates hex-accurate provinces for Central Europe: Switzerland + Austria.

Existing named city provinces are preserved:
  Switzerland: zurich
  Austria: vienna, linz, graz, salzburg, innsbruck

Run from the repo root:
    python generate_central_europe_provinces.py

Requires: Python 3.10+, (optional but recommended) shapely.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from generate_country_provinces import generate_provinces

REMOVE_IDS: list[str] = []

# ── Sub-region definitions ────────────────────────────────────────────────────
# Historical context c.1600–1750:
#   Switzerland: Swiss Confederation, mercenary soldiers, silver, salt, cattle
#   Austria: Habsburg heartland, grain, iron, salt, silver; Catholic stronghold

# ══════════════════════════════════════════════════════════════════════════════
# SWITZERLAND
# ══════════════════════════════════════════════════════════════════════════════

CH_SUB_REGIONS = [
    # German-speaking north (Zurich, Bern, Basel)
    {
        "name": "Swiss Plateau",
        "lat_min": 46.8, "lat_max": 47.9,
        "lng_min": 6.8,  "lng_max": 9.6,
        "culture": "German",
        "religion": "Protestant",
        "trade_goods": ["silver", "cloth", "cattle"],
    },
    # French-speaking west (Vaud, Geneva, Neuchâtel)
    {
        "name": "Romandy",
        "lat_min": 46.2, "lat_max": 47.5,
        "lng_min": 6.0,  "lng_max": 7.2,
        "culture": "French",
        "religion": "Protestant",
        "trade_goods": ["silver", "grain", "wine"],
    },
    # Alps / Graubünden (east)
    {
        "name": "Graubünden",
        "lat_min": 46.1, "lat_max": 47.0,
        "lng_min": 9.0,  "lng_max": 10.7,
        "culture": "German",
        "religion": "Catholic",
        "trade_goods": ["iron", "timber", "cattle"],
    },
    # Ticino (south, Italian-speaking)
    {
        "name": "Ticino",
        "lat_min": 45.8, "lat_max": 46.6,
        "lng_min": 8.3,  "lng_max": 9.2,
        "culture": "Italian",
        "religion": "Catholic",
        "trade_goods": ["iron", "wine", "silk"],
    },
    # Valais (central Alps)
    {
        "name": "Valais",
        "lat_min": 45.9, "lat_max": 46.7,
        "lng_min": 6.8,  "lng_max": 8.4,
        "culture": "French",
        "religion": "Catholic",
        "trade_goods": ["silver", "cattle", "salt"],
    },
    # Catch-all Switzerland
    {
        "name": "Switzerland",
        "lat_min": 45.8, "lat_max": 47.9,
        "lng_min": 5.9,  "lng_max": 10.7,
        "culture": "German",
        "religion": "Catholic",
        "trade_goods": ["silver", "cattle", "timber"],
    },
]

CH_COUNTY_MAP = [
    {"name": "Basel",          "lat_min": 47.3, "lat_max": 47.8, "lng_min": 7.2,  "lng_max": 8.0},
    {"name": "Zurich",         "lat_min": 47.2, "lat_max": 47.7, "lng_min": 8.3,  "lng_max": 8.9},
    {"name": "Schaffhausen",   "lat_min": 47.6, "lat_max": 47.9, "lng_min": 8.4,  "lng_max": 8.8},
    {"name": "Aargau",         "lat_min": 47.2, "lat_max": 47.7, "lng_min": 7.8,  "lng_max": 8.4},
    {"name": "Bern",           "lat_min": 46.5, "lat_max": 47.5, "lng_min": 7.0,  "lng_max": 8.0},
    {"name": "Solothurn",      "lat_min": 47.1, "lat_max": 47.4, "lng_min": 7.2,  "lng_max": 8.0},
    {"name": "Fribourg",       "lat_min": 46.5, "lat_max": 47.1, "lng_min": 6.9,  "lng_max": 7.4},
    {"name": "Neuchâtel",      "lat_min": 46.8, "lat_max": 47.2, "lng_min": 6.5,  "lng_max": 7.1},
    {"name": "Vaud",           "lat_min": 46.2, "lat_max": 47.0, "lng_min": 6.2,  "lng_max": 7.2},
    {"name": "Geneva",         "lat_min": 46.1, "lat_max": 46.5, "lng_min": 5.9,  "lng_max": 6.4},
    {"name": "Valais",         "lat_min": 45.9, "lat_max": 46.5, "lng_min": 6.8,  "lng_max": 8.5},
    {"name": "Lucerne",        "lat_min": 46.8, "lat_max": 47.3, "lng_min": 7.9,  "lng_max": 8.5},
    {"name": "Schwyz",         "lat_min": 46.9, "lat_max": 47.2, "lng_min": 8.5,  "lng_max": 9.0},
    {"name": "Uri",            "lat_min": 46.6, "lat_max": 46.9, "lng_min": 8.5,  "lng_max": 8.9},
    {"name": "Glarus",         "lat_min": 46.8, "lat_max": 47.1, "lng_min": 8.9,  "lng_max": 9.2},
    {"name": "St. Gallen",     "lat_min": 47.1, "lat_max": 47.6, "lng_min": 8.9,  "lng_max": 9.7},
    {"name": "Appenzell",      "lat_min": 47.2, "lat_max": 47.5, "lng_min": 9.3,  "lng_max": 9.7},
    {"name": "Thurgau",        "lat_min": 47.4, "lat_max": 47.8, "lng_min": 8.7,  "lng_max": 9.5},
    {"name": "Graubünden",     "lat_min": 46.1, "lat_max": 47.1, "lng_min": 9.0,  "lng_max": 10.7},
    {"name": "Ticino",         "lat_min": 45.8, "lat_max": 46.6, "lng_min": 8.3,  "lng_max": 9.2},
    # Catch-all
    {"name": "Switzerland",    "lat_min": 45.8, "lat_max": 47.9, "lng_min": 5.9,  "lng_max": 10.7},
]

CH_CONFIG = {
    "id_prefix":          "switzerland",
    "continent":          "europe",
    "region":             "central_europe",
    "sub_regions":        CH_SUB_REGIONS,
    "county_map":         CH_COUNTY_MAP,
    "default_tier":       "village",
    "default_population": 600,
    "default_wealth":     80,
    "bbox": {
        "lat_min": 45.7,
        "lat_max": 47.9,
        "lng_min": 5.8,
        "lng_max": 10.8,
    },
}

# ══════════════════════════════════════════════════════════════════════════════
# AUSTRIA
# ══════════════════════════════════════════════════════════════════════════════

AT_SUB_REGIONS = [
    # Tyrol (west Alps)
    {
        "name": "Tyrol",
        "lat_min": 46.7, "lat_max": 47.8,
        "lng_min": 10.0, "lng_max": 12.2,
        "culture": "German",
        "religion": "Catholic",
        "trade_goods": ["silver", "iron", "timber"],
    },
    # Vorarlberg (far west)
    {
        "name": "Vorarlberg",
        "lat_min": 47.0, "lat_max": 47.7,
        "lng_min": 9.5,  "lng_max": 10.2,
        "culture": "German",
        "religion": "Catholic",
        "trade_goods": ["cattle", "timber", "iron"],
    },
    # Salzburg (north Alps)
    {
        "name": "Salzburg",
        "lat_min": 47.2, "lat_max": 47.9,
        "lng_min": 12.2, "lng_max": 13.5,
        "culture": "German",
        "religion": "Catholic",
        "trade_goods": ["salt", "silver", "iron"],
    },
    # Styria (southeast Alps)
    {
        "name": "Styria",
        "lat_min": 46.5, "lat_max": 47.8,
        "lng_min": 13.5, "lng_max": 16.2,
        "culture": "German",
        "religion": "Catholic",
        "trade_goods": ["iron", "grain", "timber"],
    },
    # Carinthia (south)
    {
        "name": "Carinthia",
        "lat_min": 46.4, "lat_max": 47.2,
        "lng_min": 12.8, "lng_max": 15.0,
        "culture": "German",
        "religion": "Catholic",
        "trade_goods": ["iron", "silver", "cattle"],
    },
    # Upper Austria (Linz region)
    {
        "name": "Upper Austria",
        "lat_min": 47.5, "lat_max": 48.7,
        "lng_min": 12.7, "lng_max": 14.8,
        "culture": "German",
        "religion": "Catholic",
        "trade_goods": ["salt", "grain", "iron"],
    },
    # Lower Austria / Vienna (northeast)
    {
        "name": "Lower Austria",
        "lat_min": 47.5, "lat_max": 49.0,
        "lng_min": 14.5, "lng_max": 17.2,
        "culture": "German",
        "religion": "Catholic",
        "trade_goods": ["grain", "wine", "cattle"],
    },
    # Burgenland (far east)
    {
        "name": "Burgenland",
        "lat_min": 47.0, "lat_max": 47.9,
        "lng_min": 16.1, "lng_max": 17.2,
        "culture": "German",
        "religion": "Catholic",
        "trade_goods": ["grain", "wine", "cattle"],
    },
    # Catch-all Austria
    {
        "name": "Austria",
        "lat_min": 46.3, "lat_max": 49.1,
        "lng_min": 9.5,  "lng_max": 17.3,
        "culture": "German",
        "religion": "Catholic",
        "trade_goods": ["grain", "iron", "salt"],
    },
]

AT_COUNTY_MAP = [
    {"name": "Vorarlberg",     "lat_min": 47.0, "lat_max": 47.7, "lng_min": 9.5,  "lng_max": 10.2},
    {"name": "Tyrol",          "lat_min": 46.7, "lat_max": 47.8, "lng_min": 10.0, "lng_max": 12.2},
    {"name": "Salzburg",       "lat_min": 47.2, "lat_max": 47.9, "lng_min": 12.2, "lng_max": 13.5},
    {"name": "Carinthia",      "lat_min": 46.4, "lat_max": 47.2, "lng_min": 12.8, "lng_max": 15.0},
    {"name": "Styria",         "lat_min": 46.5, "lat_max": 47.8, "lng_min": 13.5, "lng_max": 16.2},
    {"name": "Upper Austria",  "lat_min": 47.6, "lat_max": 48.7, "lng_min": 12.7, "lng_max": 14.8},
    {"name": "Lower Austria",  "lat_min": 47.5, "lat_max": 48.8, "lng_min": 14.5, "lng_max": 17.2},
    {"name": "Burgenland",     "lat_min": 47.0, "lat_max": 47.9, "lng_min": 16.1, "lng_max": 17.2},
    {"name": "Vienna",         "lat_min": 48.0, "lat_max": 48.4, "lng_min": 16.0, "lng_max": 16.7},
    # Catch-all
    {"name": "Austria",        "lat_min": 46.3, "lat_max": 49.1, "lng_min": 9.5,  "lng_max": 17.3},
]

AT_CONFIG = {
    "id_prefix":          "austria",
    "continent":          "europe",
    "region":             "central_europe",
    "sub_regions":        AT_SUB_REGIONS,
    "county_map":         AT_COUNTY_MAP,
    "default_tier":       "village",
    "default_population": 650,
    "default_wealth":     70,
    "bbox": {
        "lat_min": 46.3,
        "lat_max": 49.1,
        "lng_min": 9.5,
        "lng_max": 17.3,
    },
}

# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    repo_root = os.path.dirname(os.path.abspath(__file__))
    pjson = os.path.join(repo_root, "src", "data", "provinces.json")
    bdir  = os.path.join(repo_root, "data", "boundaries")

    generate_provinces(
        boundary_geojson=os.path.join(bdir, "switzerland.geojson"),
        provinces_json=pjson,
        country_config=CH_CONFIG,
        remove_ids=REMOVE_IDS,
    )

    generate_provinces(
        boundary_geojson=os.path.join(bdir, "austria.geojson"),
        provinces_json=pjson,
        country_config=AT_CONFIG,
        remove_ids=[],
    )
