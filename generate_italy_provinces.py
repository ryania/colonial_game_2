"""
generate_italy_provinces.py
Generates hex-accurate provinces for every land tile in Italy.

Covers mainland Italy, Sicily, and Sardinia.
The 13 existing Italian city/town provinces (Genoa, Venice, Livorno, Milan,
Florence, Rome, Naples, Palermo, Bologna, Turin, Bari, Cagliari, Messina)
are preserved as occupied cells and will not be overwritten.

Run from the repo root:
    python generate_italy_provinces.py

Requires: Python 3.10+, (optional) shapely for accurate pip test.
"""

import os
import sys

# Ensure we can import the framework from the repo root
sys.path.insert(0, os.path.dirname(__file__))
from generate_country_provinces import generate_provinces

# ── No placeholders to remove ─────────────────────────────────────────────────
# All existing Italian provinces (genoa, venice, milan, florence, rome, naples,
# palermo, bologna, turin, bari, cagliari, messina, livorno) have proper lat/lng
# and will be preserved as occupied cells.
REMOVE_IDS: list[str] = []

# ── Sub-region definitions ────────────────────────────────────────────────────
# Checked in order; first match wins.  Last entry is the catch-all.
#
# Historical context (c.1500-1700):
#   - North Italy (Lombardy, Piedmont, Veneto): wealthy commercial/industrial zones
#   - Tuscany / Umbria / Marche: Florentine influence, banking, wool trade
#   - Papal States (Lazio, Umbria, Romagna): Church dominion
#   - South Italy / Kingdom of Naples (Campania, Calabria, Apulia, Basilicata):
#     Spanish Habsburg rule
#   - Sicily: Spanish rule, grain exporter
#   - Sardinia: Spanish rule, more pastoral

SUB_REGIONS = [
    # Sardinia
    {
        "name": "Sardinia",
        "lat_min": 38.8, "lat_max": 41.3,
        "lng_min": 8.0,  "lng_max": 10.0,
        "culture": "Italian",
        "religion": "Catholic",
        "trade_goods": ["grain", "silver"],
    },
    # Sicily
    {
        "name": "Sicily",
        "lat_min": 36.6, "lat_max": 38.4,
        "lng_min": 12.2, "lng_max": 16.0,
        "culture": "Italian",
        "religion": "Catholic",
        "trade_goods": ["grain", "wine"],
    },
    # Piedmont / Liguria (northwest)
    {
        "name": "Piedmont",
        "lat_min": 43.7, "lat_max": 46.5,
        "lng_min": 6.5,  "lng_max": 9.5,
        "culture": "Italian",
        "religion": "Catholic",
        "trade_goods": ["cloth", "iron"],
    },
    # Lombardy / Po Valley (north-central)
    {
        "name": "Lombardy",
        "lat_min": 44.5, "lat_max": 46.5,
        "lng_min": 9.5,  "lng_max": 12.5,
        "culture": "Italian",
        "religion": "Catholic",
        "trade_goods": ["silk", "grain"],
    },
    # Veneto / Friuli (northeast)
    {
        "name": "Veneto",
        "lat_min": 44.5, "lat_max": 46.7,
        "lng_min": 12.5, "lng_max": 14.0,
        "culture": "Italian",
        "religion": "Catholic",
        "trade_goods": ["cloth", "glass"],
    },
    # Emilia-Romagna (north Adriatic)
    {
        "name": "Emilia",
        "lat_min": 43.8, "lat_max": 45.0,
        "lng_min": 9.5,  "lng_max": 12.8,
        "culture": "Italian",
        "religion": "Catholic",
        "trade_goods": ["grain", "silk"],
    },
    # Tuscany (central-west)
    {
        "name": "Tuscany",
        "lat_min": 42.3, "lat_max": 44.2,
        "lng_min": 9.5,  "lng_max": 12.5,
        "culture": "Italian",
        "religion": "Catholic",
        "trade_goods": ["wool", "banking"],
    },
    # Papal States / Umbria / Marche / Lazio (central)
    {
        "name": "Papal States",
        "lat_min": 41.2, "lat_max": 43.8,
        "lng_min": 11.0, "lng_max": 14.5,
        "culture": "Italian",
        "religion": "Catholic",
        "trade_goods": ["grain", "marble"],
    },
    # Kingdom of Naples / Campania (south, west of Apennines)
    {
        "name": "Naples",
        "lat_min": 39.0, "lat_max": 41.5,
        "lng_min": 13.5, "lng_max": 16.0,
        "culture": "Italian",
        "religion": "Catholic",
        "trade_goods": ["grain", "wine"],
    },
    # Apulia / Puglia (heel, east of Apennines)
    {
        "name": "Apulia",
        "lat_min": 39.8, "lat_max": 42.0,
        "lng_min": 15.0, "lng_max": 18.6,
        "culture": "Italian",
        "religion": "Catholic",
        "trade_goods": ["grain", "olive_oil"],
    },
    # Calabria (toe)
    {
        "name": "Calabria",
        "lat_min": 37.9, "lat_max": 39.5,
        "lng_min": 15.5, "lng_max": 17.0,
        "culture": "Italian",
        "religion": "Catholic",
        "trade_goods": ["olive_oil", "timber"],
    },
    # Catch-all: generic Italian
    {
        "name": "Italy",
        "lat_min": 35.0, "lat_max": 48.0,
        "lng_min": 6.0,  "lng_max": 19.0,
        "culture": "Italian",
        "religion": "Catholic",
        "trade_goods": ["grain", "wine"],
    },
]

# ── County / region bounding boxes ───────────────────────────────────────────
# Ordered roughly north-to-south; multiple hexes within a region get " 2", " 3"
# suffixes automatically.

COUNTY_MAP = [
    # Sardinia
    {"name": "Gallura",       "lat_min": 40.8, "lat_max": 41.3, "lng_min": 8.8,  "lng_max": 9.8},
    {"name": "Sassari",       "lat_min": 40.5, "lat_max": 40.9, "lng_min": 8.2,  "lng_max": 9.0},
    {"name": "Nuoro",         "lat_min": 39.8, "lat_max": 40.6, "lng_min": 9.0,  "lng_max": 9.8},
    {"name": "Oristano",      "lat_min": 39.7, "lat_max": 40.5, "lng_min": 8.1,  "lng_max": 9.1},
    {"name": "Cagliari Coast","lat_min": 38.8, "lat_max": 39.8, "lng_min": 8.1,  "lng_max": 9.8},
    # Sicily
    {"name": "Palermo",       "lat_min": 37.9, "lat_max": 38.3, "lng_min": 12.8, "lng_max": 13.8},
    {"name": "Trapani",       "lat_min": 37.6, "lat_max": 38.2, "lng_min": 12.2, "lng_max": 13.0},
    {"name": "Agrigento",     "lat_min": 36.8, "lat_max": 37.6, "lng_min": 12.8, "lng_max": 14.0},
    {"name": "Caltanissetta", "lat_min": 37.2, "lat_max": 37.8, "lng_min": 13.8, "lng_max": 14.6},
    {"name": "Catania",       "lat_min": 37.2, "lat_max": 37.8, "lng_min": 14.6, "lng_max": 15.3},
    {"name": "Messina",       "lat_min": 37.9, "lat_max": 38.3, "lng_min": 14.8, "lng_max": 15.7},
    {"name": "Syracuse",      "lat_min": 36.7, "lat_max": 37.3, "lng_min": 14.8, "lng_max": 15.3},
    {"name": "Ragusa",        "lat_min": 36.7, "lat_max": 37.2, "lng_min": 14.3, "lng_max": 15.0},
    # Northwest - Piedmont / Liguria
    {"name": "Aosta Valley",  "lat_min": 45.5, "lat_max": 46.0, "lng_min": 6.8,  "lng_max": 8.0},
    {"name": "Piedmont",      "lat_min": 44.2, "lat_max": 45.5, "lng_min": 6.8,  "lng_max": 8.5},
    {"name": "Liguria",       "lat_min": 43.7, "lat_max": 44.6, "lng_min": 7.5,  "lng_max": 9.6},
    # Lombardy
    {"name": "Lombardy",      "lat_min": 44.6, "lat_max": 46.2, "lng_min": 8.5,  "lng_max": 11.0},
    # Trentino / Alto Adige (northern Alps)
    {"name": "Trentino",      "lat_min": 45.8, "lat_max": 47.1, "lng_min": 10.8, "lng_max": 12.5},
    # Veneto / Friuli
    {"name": "Veneto",        "lat_min": 44.8, "lat_max": 46.0, "lng_min": 11.0, "lng_max": 12.8},
    {"name": "Friuli",        "lat_min": 45.5, "lat_max": 46.7, "lng_min": 12.5, "lng_max": 14.0},
    # Emilia-Romagna
    {"name": "Emilia",        "lat_min": 44.2, "lat_max": 45.0, "lng_min": 9.5,  "lng_max": 12.0},
    {"name": "Romagna",       "lat_min": 43.8, "lat_max": 44.5, "lng_min": 11.8, "lng_max": 13.0},
    # Tuscany
    {"name": "Tuscany",       "lat_min": 42.8, "lat_max": 44.2, "lng_min": 9.6,  "lng_max": 12.2},
    # Marche
    {"name": "Marche",        "lat_min": 42.8, "lat_max": 44.0, "lng_min": 12.5, "lng_max": 14.0},
    # Umbria
    {"name": "Umbria",        "lat_min": 42.2, "lat_max": 43.2, "lng_min": 11.8, "lng_max": 13.2},
    # Lazio / Rome
    {"name": "Lazio",         "lat_min": 41.2, "lat_max": 42.8, "lng_min": 11.5, "lng_max": 13.8},
    # Abruzzo / Molise
    {"name": "Abruzzo",       "lat_min": 41.5, "lat_max": 42.8, "lng_min": 13.5, "lng_max": 15.0},
    {"name": "Molise",        "lat_min": 41.2, "lat_max": 41.8, "lng_min": 14.2, "lng_max": 15.2},
    # Campania
    {"name": "Campania",      "lat_min": 40.2, "lat_max": 41.2, "lng_min": 13.8, "lng_max": 15.8},
    # Basilicata
    {"name": "Basilicata",    "lat_min": 39.8, "lat_max": 40.7, "lng_min": 15.2, "lng_max": 16.8},
    # Apulia / Puglia
    {"name": "Apulia",        "lat_min": 40.8, "lat_max": 42.0, "lng_min": 15.5, "lng_max": 18.6},
    # Calabria
    {"name": "Calabria",      "lat_min": 37.9, "lat_max": 40.2, "lng_min": 15.5, "lng_max": 17.0},
    # Catch-all
    {"name": "Italy",         "lat_min": 35.0, "lat_max": 48.0, "lng_min": 6.0,  "lng_max": 19.0},
]

# ── Config ────────────────────────────────────────────────────────────────────

ITALY_CONFIG = {
    "id_prefix":          "italy",
    "continent":          "europe",
    "region":             "italy",
    "sub_regions":        SUB_REGIONS,
    "county_map":         COUNTY_MAP,
    "default_tier":       "village",
    "default_population": 800,
    "default_wealth":     80,
    # Bounding box: covers mainland + Sicily + Sardinia with margin
    "bbox": {
        "lat_min": 36.5,
        "lat_max": 47.2,
        "lng_min": 6.5,
        "lng_max": 18.7,
    },
}

# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    repo_root = os.path.dirname(os.path.abspath(__file__))

    generate_provinces(
        boundary_geojson=os.path.join(repo_root, "data", "boundaries", "italy.geojson"),
        provinces_json=os.path.join(repo_root, "src", "data", "provinces.json"),
        country_config=ITALY_CONFIG,
        remove_ids=REMOVE_IDS,
    )
