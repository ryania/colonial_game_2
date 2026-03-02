"""
generate_iberia_provinces.py
Generates hex-accurate provinces for the Iberian Peninsula (Spain + Portugal).

Existing named city provinces are preserved as occupied cells:
  Portugal: lisbon, porto, coimbra, evora, faro
  Spain: cadiz, seville, madrid, barcelona, valencia, toledo, zaragoza,
         granada, murcia, navarre, aragon
  Removed placeholder unsettled tiles: unsettled_castile_interior,
                                       unsettled_aragon_interior

Run from the repo root:
    python generate_iberia_provinces.py

Requires: Python 3.10+, (optional but recommended) shapely.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from generate_country_provinces import generate_provinces

# ── Placeholder IDs to remove before generation ───────────────────────────────
# These are vestigial unsettled tiles superseded by proper hex fill.
REMOVE_IDS: list[str] = [
    "unsettled_castile_interior",
    "unsettled_aragon_interior",
]

# ── Shared sub-region helpers ─────────────────────────────────────────────────
# Historical context c.1600–1750:
#   Portugal: Atlantic fishing, wine (Douro), cork, salt, olive oil
#   Galicia: cattle, fish; Castilian control
#   Andalusia: olive oil, wine, grain; Moorish heritage, major ports
#   Catalonia: cloth, trade; semi-independent culture
#   Valencia: silk, rice, fruit
#   Castile (interior): grain, wool (Mesta), cattle
#   Aragon: grain, wool; arid interior
#   Navarre / Basque: iron, fish, wool

# ══════════════════════════════════════════════════════════════════════════════
# SPAIN
# ══════════════════════════════════════════════════════════════════════════════

SPAIN_SUB_REGIONS = [
    # Galicia (northwest)
    {
        "name": "Galicia",
        "lat_min": 41.8, "lat_max": 43.8,
        "lng_min": -9.3, "lng_max": -7.0,
        "culture": "Spanish",
        "religion": "Catholic",
        "trade_goods": ["fish", "cattle", "linen"],
    },
    # Basque Country / Navarre (north)
    {
        "name": "Basque-Navarre",
        "lat_min": 42.4, "lat_max": 43.5,
        "lng_min": -3.5, "lng_max": -1.6,
        "culture": "Spanish",
        "religion": "Catholic",
        "trade_goods": ["iron", "fish", "wool"],
    },
    # Asturias / Cantabria (north coast)
    {
        "name": "Cantabria",
        "lat_min": 42.8, "lat_max": 43.6,
        "lng_min": -7.0, "lng_max": -3.5,
        "culture": "Spanish",
        "religion": "Catholic",
        "trade_goods": ["iron", "fish", "cattle"],
    },
    # Catalonia (northeast)
    {
        "name": "Catalonia",
        "lat_min": 40.5, "lat_max": 42.5,
        "lng_min": 0.3,  "lng_max": 3.3,
        "culture": "Spanish",
        "religion": "Catholic",
        "trade_goods": ["cloth", "wine", "grain"],
    },
    # Aragon (northeast interior)
    {
        "name": "Aragon",
        "lat_min": 40.5, "lat_max": 42.5,
        "lng_min": -2.0, "lng_max": 0.5,
        "culture": "Spanish",
        "religion": "Catholic",
        "trade_goods": ["grain", "wool", "wine"],
    },
    # Valencia / Murcia (east coast)
    {
        "name": "Valencia",
        "lat_min": 37.5, "lat_max": 40.5,
        "lng_min": -1.5, "lng_max": 0.8,
        "culture": "Spanish",
        "religion": "Catholic",
        "trade_goods": ["silk", "rice", "olive_oil"],
    },
    # Andalusia (south)
    {
        "name": "Andalusia",
        "lat_min": 36.0, "lat_max": 38.5,
        "lng_min": -7.2, "lng_max": -1.5,
        "culture": "Spanish",
        "religion": "Catholic",
        "trade_goods": ["olive_oil", "wine", "grain"],
    },
    # Extremadura (west border)
    {
        "name": "Extremadura",
        "lat_min": 37.8, "lat_max": 40.2,
        "lng_min": -7.5, "lng_max": -5.0,
        "culture": "Spanish",
        "religion": "Catholic",
        "trade_goods": ["cattle", "wool", "grain"],
    },
    # Old Castile / León (north-central)
    {
        "name": "Castile-León",
        "lat_min": 40.5, "lat_max": 43.0,
        "lng_min": -7.0, "lng_max": -2.0,
        "culture": "Spanish",
        "religion": "Catholic",
        "trade_goods": ["grain", "wool", "cattle"],
    },
    # New Castile / La Mancha (central plateau)
    {
        "name": "Castile",
        "lat_min": 38.5, "lat_max": 41.0,
        "lng_min": -5.5, "lng_max": -1.5,
        "culture": "Spanish",
        "religion": "Catholic",
        "trade_goods": ["grain", "wool", "wine"],
    },
    # Catch-all
    {
        "name": "Spain",
        "lat_min": 35.5, "lat_max": 44.0,
        "lng_min": -9.5, "lng_max": 3.5,
        "culture": "Spanish",
        "religion": "Catholic",
        "trade_goods": ["grain", "wool", "olive_oil"],
    },
]

SPAIN_COUNTY_MAP = [
    # Galicia
    {"name": "A Coruña",       "lat_min": 42.8, "lat_max": 43.8, "lng_min": -9.3, "lng_max": -7.9},
    {"name": "Lugo",           "lat_min": 42.5, "lat_max": 43.6, "lng_min": -7.9, "lng_max": -6.8},
    {"name": "Pontevedra",     "lat_min": 41.8, "lat_max": 42.8, "lng_min": -8.9, "lng_max": -7.8},
    {"name": "Ourense",        "lat_min": 41.8, "lat_max": 42.6, "lng_min": -8.0, "lng_max": -6.8},
    # Asturias / Cantabria
    {"name": "Asturias",       "lat_min": 42.9, "lat_max": 43.7, "lng_min": -7.1, "lng_max": -4.6},
    {"name": "Cantabria",      "lat_min": 42.8, "lat_max": 43.5, "lng_min": -4.6, "lng_max": -3.5},
    # Basque / Navarre
    {"name": "Álava",          "lat_min": 42.4, "lat_max": 43.1, "lng_min": -3.2, "lng_max": -2.2},
    {"name": "Guipúzcoa",      "lat_min": 42.9, "lat_max": 43.5, "lng_min": -2.5, "lng_max": -1.7},
    {"name": "Vizcaya",        "lat_min": 43.0, "lat_max": 43.5, "lng_min": -3.5, "lng_max": -2.4},
    {"name": "Navarre",        "lat_min": 41.9, "lat_max": 43.2, "lng_min": -2.2, "lng_max": -0.9},
    # Aragon
    {"name": "Huesca",         "lat_min": 41.5, "lat_max": 42.9, "lng_min": -1.5, "lng_max": 0.8},
    {"name": "Zaragoza",       "lat_min": 40.5, "lat_max": 41.9, "lng_min": -2.0, "lng_max": 0.1},
    {"name": "Teruel",         "lat_min": 39.9, "lat_max": 41.0, "lng_min": -1.9, "lng_max": 0.4},
    # Catalonia
    {"name": "Lleida",         "lat_min": 41.3, "lat_max": 42.5, "lng_min": 0.3,  "lng_max": 1.5},
    {"name": "Girona",         "lat_min": 41.5, "lat_max": 42.5, "lng_min": 2.5,  "lng_max": 3.3},
    {"name": "Barcelona",      "lat_min": 41.0, "lat_max": 42.0, "lng_min": 1.4,  "lng_max": 2.6},
    {"name": "Tarragona",      "lat_min": 40.5, "lat_max": 41.3, "lng_min": 0.5,  "lng_max": 1.6},
    # Old Castile / León
    {"name": "Burgos",         "lat_min": 41.8, "lat_max": 42.8, "lng_min": -4.2, "lng_max": -2.8},
    {"name": "León",           "lat_min": 42.0, "lat_max": 43.1, "lng_min": -7.0, "lng_max": -5.0},
    {"name": "Valladolid",     "lat_min": 41.3, "lat_max": 42.0, "lng_min": -5.5, "lng_max": -4.3},
    {"name": "Salamanca",      "lat_min": 40.4, "lat_max": 41.5, "lng_min": -7.0, "lng_max": -5.5},
    {"name": "Zamora",         "lat_min": 41.3, "lat_max": 42.1, "lng_min": -7.0, "lng_max": -5.6},
    {"name": "Segovia",        "lat_min": 40.6, "lat_max": 41.5, "lng_min": -4.5, "lng_max": -3.5},
    {"name": "Ávila",          "lat_min": 40.1, "lat_max": 41.0, "lng_min": -5.4, "lng_max": -4.2},
    {"name": "Palencia",       "lat_min": 41.8, "lat_max": 42.8, "lng_min": -5.0, "lng_max": -4.0},
    {"name": "Soria",          "lat_min": 41.2, "lat_max": 42.0, "lng_min": -3.3, "lng_max": -2.0},
    {"name": "Rioja",          "lat_min": 42.0, "lat_max": 42.7, "lng_min": -3.1, "lng_max": -2.0},
    # New Castile / La Mancha
    {"name": "Madrid",         "lat_min": 40.0, "lat_max": 41.0, "lng_min": -4.3, "lng_max": -3.2},
    {"name": "Guadalajara",    "lat_min": 40.3, "lat_max": 41.3, "lng_min": -3.3, "lng_max": -1.8},
    {"name": "Cuenca",         "lat_min": 39.4, "lat_max": 40.7, "lng_min": -2.8, "lng_max": -1.4},
    {"name": "Toledo",         "lat_min": 39.2, "lat_max": 40.5, "lng_min": -5.5, "lng_max": -3.3},
    {"name": "Ciudad Real",    "lat_min": 38.2, "lat_max": 39.5, "lng_min": -5.0, "lng_max": -2.5},
    {"name": "Albacete",       "lat_min": 38.3, "lat_max": 39.5, "lng_min": -2.6, "lng_max": -1.0},
    # Valencia / Murcia
    {"name": "Castellón",      "lat_min": 39.8, "lat_max": 40.9, "lng_min": -0.8, "lng_max": 0.5},
    {"name": "Valencia",       "lat_min": 39.0, "lat_max": 40.1, "lng_min": -1.4, "lng_max": 0.2},
    {"name": "Alicante",       "lat_min": 38.0, "lat_max": 39.1, "lng_min": -1.2, "lng_max": 0.2},
    {"name": "Murcia",         "lat_min": 37.4, "lat_max": 38.2, "lng_min": -2.2, "lng_max": -0.7},
    # Extremadura
    {"name": "Cáceres",        "lat_min": 39.3, "lat_max": 40.5, "lng_min": -7.5, "lng_max": -5.5},
    {"name": "Badajoz",        "lat_min": 38.0, "lat_max": 39.6, "lng_min": -7.5, "lng_max": -5.2},
    # Andalusia
    {"name": "Huelva",         "lat_min": 37.0, "lat_max": 38.0, "lng_min": -7.6, "lng_max": -6.3},
    {"name": "Sevilla",        "lat_min": 36.8, "lat_max": 38.0, "lng_min": -6.5, "lng_max": -5.2},
    {"name": "Cádiz",          "lat_min": 36.0, "lat_max": 37.0, "lng_min": -6.5, "lng_max": -5.2},
    {"name": "Málaga",         "lat_min": 36.3, "lat_max": 37.2, "lng_min": -5.5, "lng_max": -3.8},
    {"name": "Granada",        "lat_min": 36.5, "lat_max": 37.5, "lng_min": -4.2, "lng_max": -2.8},
    {"name": "Almería",        "lat_min": 36.5, "lat_max": 37.5, "lng_min": -2.9, "lng_max": -1.5},
    {"name": "Jaén",           "lat_min": 37.3, "lat_max": 38.3, "lng_min": -4.2, "lng_max": -2.8},
    {"name": "Córdoba",        "lat_min": 37.5, "lat_max": 38.6, "lng_min": -5.5, "lng_max": -4.0},
    # Catch-all
    {"name": "Spain",          "lat_min": 35.5, "lat_max": 44.0, "lng_min": -9.5, "lng_max": 3.5},
]

SPAIN_CONFIG = {
    "id_prefix":          "spain",
    "continent":          "europe",
    "region":             "iberia",
    "sub_regions":        SPAIN_SUB_REGIONS,
    "county_map":         SPAIN_COUNTY_MAP,
    "default_tier":       "village",
    "default_population": 650,
    "default_wealth":     65,
    "bbox": {
        "lat_min": 35.8,
        "lat_max": 44.0,
        "lng_min": -9.5,
        "lng_max": 3.5,
    },
}

# ══════════════════════════════════════════════════════════════════════════════
# PORTUGAL
# ══════════════════════════════════════════════════════════════════════════════

PORTUGAL_SUB_REGIONS = [
    # Minho / Douro (north – wine, linen)
    {
        "name": "Minho",
        "lat_min": 41.3, "lat_max": 42.2,
        "lng_min": -8.8, "lng_max": -7.5,
        "culture": "Portuguese",
        "religion": "Catholic",
        "trade_goods": ["wine", "linen", "cattle"],
    },
    # Douro / Trás-os-Montes (northeast)
    {
        "name": "Trás-os-Montes",
        "lat_min": 41.2, "lat_max": 42.2,
        "lng_min": -7.5, "lng_max": -6.2,
        "culture": "Portuguese",
        "religion": "Catholic",
        "trade_goods": ["wine", "grain", "cattle"],
    },
    # Beiras (centre – grain, cork)
    {
        "name": "Beiras",
        "lat_min": 39.5, "lat_max": 41.3,
        "lng_min": -8.9, "lng_max": -6.5,
        "culture": "Portuguese",
        "religion": "Catholic",
        "trade_goods": ["grain", "cork", "olive_oil"],
    },
    # Alentejo (south interior – wheat, cork)
    {
        "name": "Alentejo",
        "lat_min": 37.5, "lat_max": 39.5,
        "lng_min": -8.8, "lng_max": -6.8,
        "culture": "Portuguese",
        "religion": "Catholic",
        "trade_goods": ["grain", "cork", "olive_oil"],
    },
    # Algarve (far south – fish, salt)
    {
        "name": "Algarve",
        "lat_min": 36.9, "lat_max": 37.6,
        "lng_min": -8.9, "lng_max": -7.4,
        "culture": "Portuguese",
        "religion": "Catholic",
        "trade_goods": ["fish", "salt", "figs"],
    },
    # Estremadura / Lisbon coast
    {
        "name": "Estremadura",
        "lat_min": 38.4, "lat_max": 40.0,
        "lng_min": -9.5, "lng_max": -8.3,
        "culture": "Portuguese",
        "religion": "Catholic",
        "trade_goods": ["fish", "wine", "salt"],
    },
    # Catch-all
    {
        "name": "Portugal",
        "lat_min": 36.8, "lat_max": 42.2,
        "lng_min": -9.6, "lng_max": -6.0,
        "culture": "Portuguese",
        "religion": "Catholic",
        "trade_goods": ["wine", "cork", "fish"],
    },
]

PORTUGAL_COUNTY_MAP = [
    {"name": "Viana do Castelo","lat_min": 41.7,"lat_max": 42.2,"lng_min": -8.9,"lng_max": -8.0},
    {"name": "Braga",          "lat_min": 41.3, "lat_max": 41.9, "lng_min": -8.7, "lng_max": -8.0},
    {"name": "Vila Real",      "lat_min": 41.2, "lat_max": 42.0, "lng_min": -8.0, "lng_max": -7.0},
    {"name": "Bragança",       "lat_min": 41.4, "lat_max": 42.2, "lng_min": -7.2, "lng_max": -6.2},
    {"name": "Porto",          "lat_min": 40.9, "lat_max": 41.4, "lng_min": -8.8, "lng_max": -8.0},
    {"name": "Aveiro",         "lat_min": 40.5, "lat_max": 41.1, "lng_min": -8.8, "lng_max": -7.9},
    {"name": "Viseu",          "lat_min": 40.5, "lat_max": 41.2, "lng_min": -8.0, "lng_max": -7.0},
    {"name": "Guarda",         "lat_min": 40.2, "lat_max": 41.0, "lng_min": -7.6, "lng_max": -6.7},
    {"name": "Coimbra",        "lat_min": 39.9, "lat_max": 40.6, "lng_min": -8.8, "lng_max": -8.0},
    {"name": "Castelo Branco", "lat_min": 39.5, "lat_max": 40.3, "lng_min": -8.0, "lng_max": -6.8},
    {"name": "Leiria",         "lat_min": 39.5, "lat_max": 40.2, "lng_min": -9.0, "lng_max": -8.2},
    {"name": "Santarém",       "lat_min": 38.9, "lat_max": 39.8, "lng_min": -8.8, "lng_max": -7.8},
    {"name": "Portalegre",     "lat_min": 38.9, "lat_max": 39.7, "lng_min": -8.0, "lng_max": -7.0},
    {"name": "Lisboa",         "lat_min": 38.4, "lat_max": 39.2, "lng_min": -9.5, "lng_max": -8.7},
    {"name": "Setúbal",        "lat_min": 37.9, "lat_max": 38.8, "lng_min": -9.1, "lng_max": -8.2},
    {"name": "Évora",          "lat_min": 38.0, "lat_max": 39.0, "lng_min": -8.3, "lng_max": -7.2},
    {"name": "Beja",           "lat_min": 37.3, "lat_max": 38.2, "lng_min": -8.5, "lng_max": -7.2},
    {"name": "Faro",           "lat_min": 36.9, "lat_max": 37.5, "lng_min": -8.9, "lng_max": -7.4},
    # Catch-all
    {"name": "Portugal",       "lat_min": 36.8, "lat_max": 42.2, "lng_min": -9.6, "lng_max": -6.0},
]

PORTUGAL_CONFIG = {
    "id_prefix":          "portugal",
    "continent":          "europe",
    "region":             "iberia",
    "sub_regions":        PORTUGAL_SUB_REGIONS,
    "county_map":         PORTUGAL_COUNTY_MAP,
    "default_tier":       "village",
    "default_population": 600,
    "default_wealth":     60,
    "bbox": {
        "lat_min": 36.8,
        "lat_max": 42.2,
        "lng_min": -9.6,
        "lng_max": -6.0,
    },
}

# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    repo_root = os.path.dirname(os.path.abspath(__file__))
    pjson = os.path.join(repo_root, "src", "data", "provinces.json")
    bdir  = os.path.join(repo_root, "data", "boundaries")

    # Spain first (removes placeholder unsettled tiles)
    generate_provinces(
        boundary_geojson=os.path.join(bdir, "spain.geojson"),
        provinces_json=pjson,
        country_config=SPAIN_CONFIG,
        remove_ids=REMOVE_IDS,
    )

    # Portugal second (no removals – Spain already cleared the unsettled IDs)
    generate_provinces(
        boundary_geojson=os.path.join(bdir, "portugal.geojson"),
        provinces_json=pjson,
        country_config=PORTUGAL_CONFIG,
        remove_ids=[],
    )
