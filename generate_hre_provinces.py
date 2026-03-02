"""
generate_hre_provinces.py
Generates hex-accurate provinces for the Holy Roman Empire / German lands.

Covers modern Germany. Existing named city provinces are preserved:
  hamburg, frankfurt, nuremberg, munich, cologne, augsburg, dresden,
  magdeburg, kiel, stettin

Austria is handled by generate_central_europe_provinces.py.

Run from the repo root:
    python generate_hre_provinces.py

Requires: Python 3.10+, (optional but recommended) shapely.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from generate_country_provinces import generate_provinces

REMOVE_IDS: list[str] = []

# ── Sub-region definitions ────────────────────────────────────────────────────
# Historical context c.1600–1750 (Holy Roman Empire):
#   - Brandenburg-Prussia (northeast): grain, amber; Protestant
#   - Saxony: silver mining, cloth; Protestant, later mining boom
#   - Bavaria (southeast): grain, cattle, salt; Catholic
#   - Rhineland / Westphalia (west): cloth, iron, wine (Rhine valley); mixed religion
#   - Swabia (southwest): cloth, iron; mixed
#   - Hanover / Brunswick (north): grain, cattle; Protestant
#   - Thuringia: timber, glass, potash; Protestant
#   - Holstein / Schleswig (far north): cattle, fish; Protestant

SUB_REGIONS = [
    # Holstein / Schleswig (far north, Danish border)
    {
        "name": "Holstein",
        "lat_min": 53.5, "lat_max": 55.1,
        "lng_min": 8.5,  "lng_max": 10.9,
        "culture": "German",
        "religion": "Protestant",
        "trade_goods": ["cattle", "grain", "fish"],
    },
    # Mecklenburg / Pomerania (north coast)
    {
        "name": "Pomerania",
        "lat_min": 53.3, "lat_max": 54.5,
        "lng_min": 10.8, "lng_max": 15.0,
        "culture": "German",
        "religion": "Protestant",
        "trade_goods": ["grain", "timber", "fish"],
    },
    # Brandenburg / Prussia (northeast, Berlin region)
    {
        "name": "Brandenburg",
        "lat_min": 51.8, "lat_max": 53.5,
        "lng_min": 11.0, "lng_max": 15.0,
        "culture": "German",
        "religion": "Protestant",
        "trade_goods": ["grain", "wool", "timber"],
    },
    # Saxony (east-central)
    {
        "name": "Saxony",
        "lat_min": 50.3, "lat_max": 52.0,
        "lng_min": 11.5, "lng_max": 15.1,
        "culture": "German",
        "religion": "Protestant",
        "trade_goods": ["silver", "cloth", "grain"],
    },
    # Silesia (far southeast border — partly German)
    {
        "name": "Silesia",
        "lat_min": 49.8, "lat_max": 51.3,
        "lng_min": 14.9, "lng_max": 17.0,
        "culture": "German",
        "religion": "Protestant",
        "trade_goods": ["silver", "linen", "grain"],
    },
    # Thuringia (central)
    {
        "name": "Thuringia",
        "lat_min": 50.3, "lat_max": 51.7,
        "lng_min": 9.8,  "lng_max": 12.0,
        "culture": "German",
        "religion": "Protestant",
        "trade_goods": ["timber", "glass", "grain"],
    },
    # Hanover / Brunswick (north-central)
    {
        "name": "Hanover",
        "lat_min": 51.8, "lat_max": 53.4,
        "lng_min": 8.4,  "lng_max": 11.0,
        "culture": "German",
        "religion": "Protestant",
        "trade_goods": ["grain", "cattle", "linen"],
    },
    # Westphalia (west-central)
    {
        "name": "Westphalia",
        "lat_min": 51.0, "lat_max": 52.5,
        "lng_min": 6.0,  "lng_max": 9.0,
        "culture": "German",
        "religion": "Protestant",
        "trade_goods": ["linen", "iron", "grain"],
    },
    # Rhineland (lower Rhine, northwest)
    {
        "name": "Rhineland",
        "lat_min": 49.8, "lat_max": 51.8,
        "lng_min": 5.8,  "lng_max": 8.5,
        "culture": "German",
        "religion": "Catholic",
        "trade_goods": ["wine", "cloth", "iron"],
    },
    # Hesse (central)
    {
        "name": "Hesse",
        "lat_min": 50.0, "lat_max": 51.5,
        "lng_min": 8.0,  "lng_max": 10.0,
        "culture": "German",
        "religion": "Protestant",
        "trade_goods": ["grain", "timber", "iron"],
    },
    # Franconia / Nuremberg area (north Bavaria)
    {
        "name": "Franconia",
        "lat_min": 49.0, "lat_max": 50.5,
        "lng_min": 9.5,  "lng_max": 12.0,
        "culture": "German",
        "religion": "Protestant",
        "trade_goods": ["grain", "iron", "wool"],
    },
    # Swabia / Baden-Württemberg (southwest)
    {
        "name": "Swabia",
        "lat_min": 47.5, "lat_max": 49.5,
        "lng_min": 7.5,  "lng_max": 10.5,
        "culture": "German",
        "religion": "Catholic",
        "trade_goods": ["cloth", "iron", "grain"],
    },
    # Bavaria (southeast)
    {
        "name": "Bavaria",
        "lat_min": 47.2, "lat_max": 49.1,
        "lng_min": 10.3, "lng_max": 13.9,
        "culture": "German",
        "religion": "Catholic",
        "trade_goods": ["grain", "cattle", "salt"],
    },
    # Catch-all
    {
        "name": "Germany",
        "lat_min": 47.0, "lat_max": 55.2,
        "lng_min": 5.8,  "lng_max": 15.2,
        "culture": "German",
        "religion": "Protestant",
        "trade_goods": ["grain", "timber", "iron"],
    },
]

# ── County map ────────────────────────────────────────────────────────────────
COUNTY_MAP = [
    # North coast / Holstein / Mecklenburg
    {"name": "Schleswig",      "lat_min": 54.5, "lat_max": 55.1, "lng_min": 8.5,  "lng_max": 10.0},
    {"name": "Holstein",       "lat_min": 53.5, "lat_max": 54.6, "lng_min": 8.5,  "lng_max": 10.4},
    {"name": "Hamburg",        "lat_min": 53.3, "lat_max": 53.8, "lng_min": 9.6,  "lng_max": 10.4},
    {"name": "Mecklenburg",    "lat_min": 53.3, "lat_max": 54.2, "lng_min": 10.4, "lng_max": 13.0},
    {"name": "Pomerania",      "lat_min": 53.3, "lat_max": 54.5, "lng_min": 12.8, "lng_max": 15.0},
    # Brandenburg / Prussia
    {"name": "Prignitz",       "lat_min": 52.5, "lat_max": 53.4, "lng_min": 11.5, "lng_max": 12.6},
    {"name": "Brandenburg",    "lat_min": 51.8, "lat_max": 52.9, "lng_min": 11.5, "lng_max": 14.8},
    {"name": "Neumark",        "lat_min": 52.0, "lat_max": 53.0, "lng_min": 14.5, "lng_max": 15.1},
    {"name": "Lausitz",        "lat_min": 51.2, "lat_max": 52.0, "lng_min": 13.5, "lng_max": 15.1},
    # Saxony
    {"name": "Meissen",        "lat_min": 51.0, "lat_max": 51.8, "lng_min": 12.5, "lng_max": 13.8},
    {"name": "Saxony",         "lat_min": 50.3, "lat_max": 51.2, "lng_min": 12.0, "lng_max": 15.0},
    # Hanover / Brunswick
    {"name": "Hanover",        "lat_min": 52.0, "lat_max": 53.0, "lng_min": 9.0,  "lng_max": 11.0},
    {"name": "Lüneburg",       "lat_min": 52.7, "lat_max": 53.5, "lng_min": 9.5,  "lng_max": 11.3},
    {"name": "Brunswick",      "lat_min": 51.8, "lat_max": 52.5, "lng_min": 10.0, "lng_max": 11.5},
    # Westphalia
    {"name": "Westphalia",     "lat_min": 51.2, "lat_max": 52.5, "lng_min": 6.5,  "lng_max": 9.0},
    {"name": "Münster",        "lat_min": 51.5, "lat_max": 52.3, "lng_min": 6.5,  "lng_max": 8.0},
    # Rhineland
    {"name": "Cleves",         "lat_min": 51.4, "lat_max": 51.9, "lng_min": 5.8,  "lng_max": 6.8},
    {"name": "Cologne",        "lat_min": 50.5, "lat_max": 51.4, "lng_min": 6.0,  "lng_max": 7.5},
    {"name": "Koblenz",        "lat_min": 50.0, "lat_max": 50.9, "lng_min": 6.8,  "lng_max": 8.0},
    {"name": "Trier",          "lat_min": 49.6, "lat_max": 50.3, "lng_min": 6.2,  "lng_max": 7.2},
    {"name": "Palatinate",     "lat_min": 49.1, "lat_max": 50.0, "lng_min": 7.0,  "lng_max": 8.5},
    # Alsace (returned to France 1648, but culturally German)
    {"name": "Alsace",         "lat_min": 47.5, "lat_max": 48.5, "lng_min": 7.3,  "lng_max": 8.3},
    # Hesse
    {"name": "Hesse-Kassel",   "lat_min": 50.6, "lat_max": 51.6, "lng_min": 8.5,  "lng_max": 10.0},
    {"name": "Hesse-Darmstadt","lat_min": 49.5, "lat_max": 50.6, "lng_min": 8.0,  "lng_max": 9.5},
    # Thuringia
    {"name": "Thuringia",      "lat_min": 50.5, "lat_max": 51.5, "lng_min": 9.8,  "lng_max": 12.0},
    {"name": "Erfurt",         "lat_min": 50.8, "lat_max": 51.2, "lng_min": 10.5, "lng_max": 11.2},
    # Franconia
    {"name": "Ansbach",        "lat_min": 49.0, "lat_max": 50.0, "lng_min": 9.8,  "lng_max": 11.0},
    {"name": "Bamberg",        "lat_min": 49.6, "lat_max": 50.2, "lng_min": 10.5, "lng_max": 11.5},
    {"name": "Nuremberg",      "lat_min": 49.3, "lat_max": 50.0, "lng_min": 10.8, "lng_max": 11.8},
    # Swabia / Baden
    {"name": "Baden",          "lat_min": 47.5, "lat_max": 49.5, "lng_min": 7.5,  "lng_max": 8.8},
    {"name": "Württemberg",    "lat_min": 47.8, "lat_max": 49.5, "lng_min": 8.7,  "lng_max": 10.3},
    {"name": "Augsburg",       "lat_min": 48.0, "lat_max": 48.8, "lng_min": 10.3, "lng_max": 11.0},
    # Bavaria
    {"name": "Upper Bavaria",  "lat_min": 47.5, "lat_max": 48.6, "lng_min": 10.8, "lng_max": 13.0},
    {"name": "Lower Bavaria",  "lat_min": 48.0, "lat_max": 49.2, "lng_min": 12.0, "lng_max": 13.9},
    {"name": "Upper Palatinate","lat_min": 49.0,"lat_max": 50.0, "lng_min": 11.5, "lng_max": 13.0},
    # Catch-all
    {"name": "Germany",        "lat_min": 47.0, "lat_max": 55.2, "lng_min": 5.8,  "lng_max": 15.2},
]

GERMANY_CONFIG = {
    "id_prefix":          "germany",
    "continent":          "europe",
    "region":             "holy_roman_empire",
    "sub_regions":        SUB_REGIONS,
    "county_map":         COUNTY_MAP,
    "default_tier":       "village",
    "default_population": 700,
    "default_wealth":     70,
    "bbox": {
        "lat_min": 47.2,
        "lat_max": 55.1,
        "lng_min": 5.8,
        "lng_max": 15.2,
    },
}

# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    repo_root = os.path.dirname(os.path.abspath(__file__))

    generate_provinces(
        boundary_geojson=os.path.join(repo_root, "data", "boundaries", "germany.geojson"),
        provinces_json=os.path.join(repo_root, "src", "data", "provinces.json"),
        country_config=GERMANY_CONFIG,
        remove_ids=REMOVE_IDS,
    )
