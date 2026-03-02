"""
generate_france_provinces.py
Generates hex-accurate provinces for every land tile in France (including Corsica).

The 16 existing French city/town provinces are preserved as occupied cells and will
not be overwritten (bordeaux, nantes, marseille, brest, rouen, paris, lyon,
toulouse, orleans, dijon, strasbourg, rennes, la_rochelle, montpellier, avignon,
calais).

Run from the repo root:
    python generate_france_provinces.py

Requires: Python 3.10+, (optional but recommended) shapely.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from generate_country_provinces import generate_provinces

# ── No placeholder IDs to remove ─────────────────────────────────────────────
# All 16 existing French provinces are proper named cities with lat/lng coords.
REMOVE_IDS: list[str] = []

# ── Sub-region definitions ────────────────────────────────────────────────────
# Historical context c.1600–1750:
#   - Île-de-France / Paris Basin: royal heartland, grain & linen
#   - Normandy: cattle, dairy, cider, linen; Channel trade
#   - Brittany: fishing, linen, coastal trade
#   - Loire Valley: wine, grain, silk (Tours), crafts
#   - Gascony / Guyenne / Bordeaux: wine, brandy
#   - Languedoc / Provence: wool, silk, wine, olive oil
#   - Burgundy / Champagne: wine, grain, cloth
#   - Alsace / Lorraine: iron, grain, timber, Protestant minority
#   - Massif Central / Auvergne: cattle, wool, coal
#   - Corsica: wine, olive oil, timber; Genoese until 1768

SUB_REGIONS = [
    # Corsica
    {
        "name": "Corsica",
        "lat_min": 41.3, "lat_max": 43.1,
        "lng_min": 8.5,  "lng_max": 9.6,
        "culture": "French",
        "religion": "Catholic",
        "trade_goods": ["wine", "olive_oil", "timber"],
    },
    # Brittany (peninsula, northwest)
    {
        "name": "Brittany",
        "lat_min": 47.3, "lat_max": 48.9,
        "lng_min": -5.2, "lng_max": -1.5,
        "culture": "French",
        "religion": "Catholic",
        "trade_goods": ["fish", "linen", "salt"],
    },
    # Normandy (north coast, west of Seine)
    {
        "name": "Normandy",
        "lat_min": 48.5, "lat_max": 50.0,
        "lng_min": -2.0, "lng_max": 1.8,
        "culture": "French",
        "religion": "Catholic",
        "trade_goods": ["cattle", "linen", "wool"],
    },
    # Calais / Artois / Picardy (far north)
    {
        "name": "Picardy",
        "lat_min": 49.8, "lat_max": 51.1,
        "lng_min": 1.5,  "lng_max": 4.0,
        "culture": "French",
        "religion": "Catholic",
        "trade_goods": ["grain", "linen", "wool"],
    },
    # Alsace / Lorraine (northeast, border region)
    {
        "name": "Alsace-Lorraine",
        "lat_min": 47.8, "lat_max": 49.5,
        "lng_min": 5.8,  "lng_max": 8.3,
        "culture": "French",
        "religion": "Catholic",
        "trade_goods": ["iron", "grain", "timber"],
    },
    # Champagne / Ardennes
    {
        "name": "Champagne",
        "lat_min": 48.4, "lat_max": 50.0,
        "lng_min": 3.8,  "lng_max": 5.8,
        "culture": "French",
        "religion": "Catholic",
        "trade_goods": ["wine", "grain", "wool"],
    },
    # Île-de-France / Paris Basin (centre-north)
    {
        "name": "Ile-de-France",
        "lat_min": 47.5, "lat_max": 49.5,
        "lng_min": 1.0,  "lng_max": 4.0,
        "culture": "French",
        "religion": "Catholic",
        "trade_goods": ["grain", "cloth", "wine"],
    },
    # Burgundy / Franche-Comté (east-central)
    {
        "name": "Burgundy",
        "lat_min": 46.5, "lat_max": 48.4,
        "lng_min": 4.0,  "lng_max": 6.5,
        "culture": "French",
        "religion": "Catholic",
        "trade_goods": ["wine", "grain", "cattle"],
    },
    # Loire Valley / Anjou / Touraine (centre-west)
    {
        "name": "Loire Valley",
        "lat_min": 46.8, "lat_max": 48.0,
        "lng_min": -2.5, "lng_max": 3.0,
        "culture": "French",
        "religion": "Catholic",
        "trade_goods": ["wine", "grain", "silk"],
    },
    # Poitou / Saintonge / La Rochelle (centre-west coast)
    {
        "name": "Poitou",
        "lat_min": 45.5, "lat_max": 47.1,
        "lng_min": -2.0, "lng_max": 0.5,
        "culture": "French",
        "religion": "Catholic",
        "trade_goods": ["salt", "grain", "brandy"],
    },
    # Gascony / Guyenne / Bordeaux (southwest)
    {
        "name": "Gascony",
        "lat_min": 43.8, "lat_max": 46.0,
        "lng_min": -2.0, "lng_max": 1.0,
        "culture": "French",
        "religion": "Catholic",
        "trade_goods": ["wine", "brandy", "timber"],
    },
    # Languedoc / Roussillon (south coast)
    {
        "name": "Languedoc",
        "lat_min": 42.3, "lat_max": 44.0,
        "lng_min": 1.5,  "lng_max": 5.5,
        "culture": "French",
        "religion": "Catholic",
        "trade_goods": ["wine", "wool", "cloth"],
    },
    # Provence / Rhône delta (south-east coast)
    {
        "name": "Provence",
        "lat_min": 43.0, "lat_max": 44.5,
        "lng_min": 4.5,  "lng_max": 7.8,
        "culture": "French",
        "religion": "Catholic",
        "trade_goods": ["olive_oil", "wine", "silk"],
    },
    # Dauphiné / Savoy (Alps)
    {
        "name": "Dauphiné",
        "lat_min": 44.5, "lat_max": 46.5,
        "lng_min": 5.5,  "lng_max": 7.8,
        "culture": "French",
        "religion": "Catholic",
        "trade_goods": ["iron", "timber", "grain"],
    },
    # Massif Central / Auvergne (highlands, centre-south)
    {
        "name": "Auvergne",
        "lat_min": 44.0, "lat_max": 46.5,
        "lng_min": 2.0,  "lng_max": 5.0,
        "culture": "French",
        "religion": "Catholic",
        "trade_goods": ["cattle", "wool", "coal"],
    },
    # Pyrenees / Béarn / Foix (south border)
    {
        "name": "Pyrenees",
        "lat_min": 42.3, "lat_max": 43.8,
        "lng_min": -2.0, "lng_max": 3.5,
        "culture": "French",
        "religion": "Catholic",
        "trade_goods": ["cattle", "wool", "iron"],
    },
    # Catch-all: generic France
    {
        "name": "France",
        "lat_min": 41.0, "lat_max": 51.5,
        "lng_min": -5.5, "lng_max": 9.6,
        "culture": "French",
        "religion": "Catholic",
        "trade_goods": ["grain", "wine", "cloth"],
    },
]

# ── County / region bounding boxes ───────────────────────────────────────────
COUNTY_MAP = [
    # Corsica
    {"name": "Haute-Corse",    "lat_min": 42.1, "lat_max": 43.1, "lng_min": 8.5,  "lng_max": 9.6},
    {"name": "Corse-du-Sud",   "lat_min": 41.3, "lat_max": 42.2, "lng_min": 8.5,  "lng_max": 9.3},
    # Brittany
    {"name": "Finistère",      "lat_min": 47.8, "lat_max": 48.7, "lng_min": -5.2, "lng_max": -3.8},
    {"name": "Côtes-d'Armor",  "lat_min": 48.0, "lat_max": 48.8, "lng_min": -3.8, "lng_max": -2.2},
    {"name": "Morbihan",       "lat_min": 47.4, "lat_max": 48.1, "lng_min": -3.5, "lng_max": -2.0},
    {"name": "Ille-et-Vilaine","lat_min": 47.6, "lat_max": 48.7, "lng_min": -2.2, "lng_max": -1.0},
    {"name": "Loire-Atlantique","lat_min": 46.9,"lat_max": 47.7, "lng_min": -2.5, "lng_max": -1.0},
    # Normandy
    {"name": "Manche",         "lat_min": 48.5, "lat_max": 49.7, "lng_min": -2.0, "lng_max": -0.4},
    {"name": "Calvados",       "lat_min": 48.7, "lat_max": 49.4, "lng_min": -0.8, "lng_max": 0.5},
    {"name": "Orne",           "lat_min": 48.0, "lat_max": 48.9, "lng_min": -0.9, "lng_max": 0.8},
    {"name": "Seine-Maritime", "lat_min": 49.2, "lat_max": 50.1, "lng_min": 0.0,  "lng_max": 1.8},
    {"name": "Eure",           "lat_min": 48.7, "lat_max": 49.5, "lng_min": 0.5,  "lng_max": 1.8},
    # Picardy / Artois / Flanders
    {"name": "Somme",          "lat_min": 49.5, "lat_max": 50.4, "lng_min": 1.5,  "lng_max": 3.0},
    {"name": "Pas-de-Calais",  "lat_min": 50.2, "lat_max": 51.1, "lng_min": 1.5,  "lng_max": 2.9},
    {"name": "Aisne",          "lat_min": 49.3, "lat_max": 50.1, "lng_min": 2.8,  "lng_max": 4.2},
    {"name": "Nord",           "lat_min": 50.0, "lat_max": 51.1, "lng_min": 2.8,  "lng_max": 4.3},
    # Île-de-France
    {"name": "Seine-et-Marne", "lat_min": 48.1, "lat_max": 48.9, "lng_min": 2.3,  "lng_max": 3.5},
    {"name": "Oise",           "lat_min": 49.0, "lat_max": 49.7, "lng_min": 1.8,  "lng_max": 3.2},
    {"name": "Val-d'Oise",     "lat_min": 48.9, "lat_max": 49.4, "lng_min": 1.8,  "lng_max": 2.7},
    # Champagne / Ardennes
    {"name": "Marne",          "lat_min": 48.5, "lat_max": 49.5, "lng_min": 3.4,  "lng_max": 5.0},
    {"name": "Ardennes",       "lat_min": 49.4, "lat_max": 50.1, "lng_min": 4.2,  "lng_max": 5.4},
    {"name": "Aube",           "lat_min": 47.9, "lat_max": 48.8, "lng_min": 3.5,  "lng_max": 4.8},
    {"name": "Haute-Marne",    "lat_min": 47.5, "lat_max": 48.3, "lng_min": 4.8,  "lng_max": 5.8},
    # Alsace / Lorraine
    {"name": "Moselle",        "lat_min": 48.8, "lat_max": 49.5, "lng_min": 6.0,  "lng_max": 7.3},
    {"name": "Meurthe-et-Moselle","lat_min": 48.2,"lat_max": 49.1,"lng_min": 5.5, "lng_max": 6.7},
    {"name": "Vosges",         "lat_min": 47.8, "lat_max": 48.6, "lng_min": 5.8,  "lng_max": 7.3},
    {"name": "Bas-Rhin",       "lat_min": 48.0, "lat_max": 49.1, "lng_min": 7.2,  "lng_max": 8.3},
    {"name": "Haut-Rhin",      "lat_min": 47.5, "lat_max": 48.3, "lng_min": 7.0,  "lng_max": 7.8},
    # Burgundy / Franche-Comté
    {"name": "Côte-d'Or",      "lat_min": 47.0, "lat_max": 47.9, "lng_min": 4.0,  "lng_max": 5.5},
    {"name": "Saône-et-Loire", "lat_min": 46.2, "lat_max": 47.2, "lng_min": 3.8,  "lng_max": 5.3},
    {"name": "Doubs",          "lat_min": 46.9, "lat_max": 47.7, "lng_min": 5.7,  "lng_max": 6.9},
    {"name": "Jura",           "lat_min": 46.3, "lat_max": 47.1, "lng_min": 5.4,  "lng_max": 6.5},
    # Centre / Loire Valley
    {"name": "Loiret",         "lat_min": 47.4, "lat_max": 48.2, "lng_min": 1.5,  "lng_max": 3.0},
    {"name": "Loir-et-Cher",   "lat_min": 47.3, "lat_max": 47.9, "lng_min": 0.7,  "lng_max": 2.2},
    {"name": "Indre-et-Loire", "lat_min": 47.0, "lat_max": 47.6, "lng_min": 0.0,  "lng_max": 1.3},
    {"name": "Maine-et-Loire", "lat_min": 47.0, "lat_max": 47.9, "lng_min": -1.2, "lng_max": 0.3},
    {"name": "Sarthe",         "lat_min": 47.6, "lat_max": 48.4, "lng_min": -0.5, "lng_max": 1.0},
    {"name": "Mayenne",        "lat_min": 47.8, "lat_max": 48.5, "lng_min": -1.4, "lng_max": -0.2},
    # Poitou / Saintonge
    {"name": "Vendée",         "lat_min": 46.3, "lat_max": 47.2, "lng_min": -2.3, "lng_max": -0.8},
    {"name": "Deux-Sèvres",    "lat_min": 46.2, "lat_max": 47.0, "lng_min": -0.8, "lng_max": 0.3},
    {"name": "Charente-Maritime","lat_min": 45.4,"lat_max": 46.4,"lng_min": -1.7, "lng_max": -0.2},
    {"name": "Charente",       "lat_min": 45.2, "lat_max": 46.2, "lng_min": -0.4, "lng_max": 1.0},
    # Gascony / Bordeaux
    {"name": "Gironde",        "lat_min": 44.2, "lat_max": 45.6, "lng_min": -1.5, "lng_max": 0.3},
    {"name": "Landes",         "lat_min": 43.5, "lat_max": 44.4, "lng_min": -1.5, "lng_max": 0.0},
    {"name": "Lot-et-Garonne", "lat_min": 43.9, "lat_max": 44.7, "lng_min": 0.0,  "lng_max": 1.2},
    {"name": "Dordogne",       "lat_min": 44.5, "lat_max": 45.3, "lng_min": 0.2,  "lng_max": 1.4},
    # Pyrenees
    {"name": "Pyrénées-Atlantiques","lat_min": 42.8,"lat_max": 43.7,"lng_min": -2.0,"lng_max": -0.2},
    {"name": "Hautes-Pyrénées","lat_min": 42.5, "lat_max": 43.4, "lng_min": -0.3, "lng_max": 0.7},
    {"name": "Ariège",         "lat_min": 42.5, "lat_max": 43.3, "lng_min": 0.8,  "lng_max": 2.0},
    {"name": "Pyrénées-Orientales","lat_min": 42.2,"lat_max": 42.9,"lng_min": 1.8,"lng_max": 3.2},
    # Languedoc
    {"name": "Aude",           "lat_min": 42.7, "lat_max": 43.5, "lng_min": 1.8,  "lng_max": 3.0},
    {"name": "Hérault",        "lat_min": 43.2, "lat_max": 43.9, "lng_min": 2.8,  "lng_max": 4.0},
    {"name": "Gard",           "lat_min": 43.5, "lat_max": 44.5, "lng_min": 3.5,  "lng_max": 4.8},
    {"name": "Aveyron",        "lat_min": 43.7, "lat_max": 44.8, "lng_min": 2.0,  "lng_max": 3.3},
    # Auvergne / Massif Central
    {"name": "Puy-de-Dôme",    "lat_min": 45.1, "lat_max": 46.0, "lng_min": 2.4,  "lng_max": 3.7},
    {"name": "Cantal",         "lat_min": 44.6, "lat_max": 45.5, "lng_min": 2.0,  "lng_max": 3.2},
    {"name": "Corrèze",        "lat_min": 44.9, "lat_max": 45.7, "lng_min": 1.4,  "lng_max": 2.5},
    {"name": "Creuse",         "lat_min": 45.7, "lat_max": 46.4, "lng_min": 1.5,  "lng_max": 2.7},
    {"name": "Allier",         "lat_min": 46.0, "lat_max": 46.9, "lng_min": 2.4,  "lng_max": 3.8},
    {"name": "Haute-Loire",    "lat_min": 44.8, "lat_max": 45.6, "lng_min": 3.1,  "lng_max": 4.3},
    {"name": "Lozère",         "lat_min": 44.2, "lat_max": 45.0, "lng_min": 3.0,  "lng_max": 4.2},
    # Rhône / Lyon
    {"name": "Rhône",          "lat_min": 45.4, "lat_max": 46.3, "lng_min": 4.1,  "lng_max": 5.2},
    {"name": "Loire",          "lat_min": 45.2, "lat_max": 46.2, "lng_min": 3.7,  "lng_max": 4.7},
    {"name": "Ain",            "lat_min": 45.7, "lat_max": 46.5, "lng_min": 4.8,  "lng_max": 6.0},
    # Provence / Rhône delta
    {"name": "Bouches-du-Rhône","lat_min": 43.1,"lat_max": 43.9,"lng_min": 4.5,  "lng_max": 5.7},
    {"name": "Var",            "lat_min": 43.0, "lat_max": 43.8, "lng_min": 5.6,  "lng_max": 7.0},
    {"name": "Alpes-Maritimes","lat_min": 43.4, "lat_max": 44.4, "lng_min": 6.8,  "lng_max": 7.8},
    {"name": "Vaucluse",       "lat_min": 43.7, "lat_max": 44.4, "lng_min": 4.6,  "lng_max": 5.7},
    # Dauphiné / Savoie / Alps
    {"name": "Isère",          "lat_min": 44.7, "lat_max": 45.5, "lng_min": 5.0,  "lng_max": 6.3},
    {"name": "Drôme",          "lat_min": 44.1, "lat_max": 45.2, "lng_min": 4.6,  "lng_max": 5.8},
    {"name": "Hautes-Alpes",   "lat_min": 44.0, "lat_max": 45.0, "lng_min": 5.8,  "lng_max": 7.2},
    {"name": "Savoie",         "lat_min": 45.2, "lat_max": 46.0, "lng_min": 6.0,  "lng_max": 7.3},
    {"name": "Haute-Savoie",   "lat_min": 45.7, "lat_max": 46.5, "lng_min": 5.8,  "lng_max": 7.0},
    # Catch-all
    {"name": "France",         "lat_min": 41.0, "lat_max": 51.5, "lng_min": -5.5, "lng_max": 9.6},
]

# ── Config ────────────────────────────────────────────────────────────────────

FRANCE_CONFIG = {
    "id_prefix":          "france",
    "continent":          "europe",
    "region":             "france",
    "sub_regions":        SUB_REGIONS,
    "county_map":         COUNTY_MAP,
    "default_tier":       "village",
    "default_population": 700,
    "default_wealth":     70,
    # Bounding box covers mainland France + Corsica
    "bbox": {
        "lat_min": 41.0,
        "lat_max": 51.2,
        "lng_min": -5.5,
        "lng_max": 9.6,
    },
}

# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    repo_root = os.path.dirname(os.path.abspath(__file__))

    generate_provinces(
        boundary_geojson=os.path.join(repo_root, "data", "boundaries", "france.geojson"),
        provinces_json=os.path.join(repo_root, "src", "data", "provinces.json"),
        country_config=FRANCE_CONFIG,
        remove_ids=REMOVE_IDS,
    )
