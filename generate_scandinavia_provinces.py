"""
generate_scandinavia_provinces.py
Generates hex-accurate provinces for Scandinavia:
  Denmark, Sweden, Norway, Finland.

Existing named city provinces are preserved:
  stockholm, gothenburg, malmo, copenhagen, oslo, bergen, trondheim, abo,
  viborg_finland, reykjavik (Iceland — skipped, too remote)

Removed placeholder unsettled tiles:
  unsettled_sweden_interior, unsettled_norway_interior, unsettled_lapland

Run from the repo root:
    python generate_scandinavia_provinces.py

Requires: Python 3.10+, (optional but recommended) shapely.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from generate_country_provinces import generate_provinces

REMOVE_IDS: list[str] = [
    "unsettled_sweden_interior",
    "unsettled_norway_interior",
    "unsettled_lapland",
]

# ── Sub-region definitions ────────────────────────────────────────────────────
# Historical context c.1600–1750:
#   Denmark: grain, cattle, fish; controls Baltic straits (Sound Dues)
#   Sweden: iron, copper, timber, tar; great power 1611–1718
#   Norway: fish (cod), timber, iron; under Danish then Swedish crown
#   Finland: timber, tar, fish, furs; under Swedish crown

# ══════════════════════════════════════════════════════════════════════════════
# DENMARK (mainland Jutland + islands)
# ══════════════════════════════════════════════════════════════════════════════

DK_SUB_REGIONS = [
    # Zealand / Bornholm (islands)
    {
        "name": "Zealand",
        "lat_min": 54.9, "lat_max": 56.3,
        "lng_min": 11.5, "lng_max": 15.3,
        "culture": "Danish",
        "religion": "Protestant",
        "trade_goods": ["grain", "fish", "cattle"],
    },
    # Funen (Fyn)
    {
        "name": "Funen",
        "lat_min": 55.0, "lat_max": 55.7,
        "lng_min": 9.9,  "lng_max": 11.0,
        "culture": "Danish",
        "religion": "Protestant",
        "trade_goods": ["grain", "cattle", "fish"],
    },
    # Jutland (peninsula)
    {
        "name": "Jutland",
        "lat_min": 54.6, "lat_max": 57.8,
        "lng_min": 8.0,  "lng_max": 10.7,
        "culture": "Danish",
        "religion": "Protestant",
        "trade_goods": ["grain", "cattle", "fish"],
    },
    # Catch-all Denmark
    {
        "name": "Denmark",
        "lat_min": 54.5, "lat_max": 57.8,
        "lng_min": 8.0,  "lng_max": 15.3,
        "culture": "Danish",
        "religion": "Protestant",
        "trade_goods": ["grain", "fish", "cattle"],
    },
]

DK_COUNTY_MAP = [
    {"name": "North Jutland",  "lat_min": 56.5, "lat_max": 57.8, "lng_min": 8.5,  "lng_max": 11.0},
    {"name": "Mid Jutland",    "lat_min": 55.8, "lat_max": 56.6, "lng_min": 8.5,  "lng_max": 10.5},
    {"name": "South Jutland",  "lat_min": 54.6, "lat_max": 55.9, "lng_min": 8.5,  "lng_max": 10.0},
    {"name": "Funen",          "lat_min": 55.0, "lat_max": 55.7, "lng_min": 9.9,  "lng_max": 11.0},
    {"name": "Zealand",        "lat_min": 55.0, "lat_max": 56.2, "lng_min": 11.4, "lng_max": 12.7},
    {"name": "Mon",            "lat_min": 54.9, "lat_max": 55.2, "lng_min": 12.0, "lng_max": 12.6},
    {"name": "Bornholm",       "lat_min": 54.9, "lat_max": 55.3, "lng_min": 14.6, "lng_max": 15.3},
    {"name": "Lolland-Falster","lat_min": 54.5, "lat_max": 55.0, "lng_min": 11.2, "lng_max": 12.6},
    # Catch-all
    {"name": "Denmark",        "lat_min": 54.5, "lat_max": 57.8, "lng_min": 8.0,  "lng_max": 15.3},
]

DK_CONFIG = {
    "id_prefix":          "denmark",
    "continent":          "europe",
    "region":             "scandinavia",
    "sub_regions":        DK_SUB_REGIONS,
    "county_map":         DK_COUNTY_MAP,
    "default_tier":       "village",
    "default_population": 600,
    "default_wealth":     70,
    "bbox": {
        "lat_min": 54.5,
        "lat_max": 57.8,
        "lng_min": 8.0,
        "lng_max": 15.4,
    },
}

# ══════════════════════════════════════════════════════════════════════════════
# SWEDEN
# ══════════════════════════════════════════════════════════════════════════════

SE_SUB_REGIONS = [
    # Skåne / Blekinge / Halland (south, taken from Denmark c.1658)
    {
        "name": "Skane",
        "lat_min": 55.3, "lat_max": 56.5,
        "lng_min": 12.5, "lng_max": 14.5,
        "culture": "Swedish",
        "religion": "Protestant",
        "trade_goods": ["grain", "cattle", "fish"],
    },
    # Götaland (southwest)
    {
        "name": "Gotaland",
        "lat_min": 56.5, "lat_max": 59.0,
        "lng_min": 11.0, "lng_max": 15.0,
        "culture": "Swedish",
        "religion": "Protestant",
        "trade_goods": ["iron", "timber", "grain"],
    },
    # Svealand (central — Stockholm, Lake Mälaren)
    {
        "name": "Svealand",
        "lat_min": 58.5, "lat_max": 61.5,
        "lng_min": 12.5, "lng_max": 18.5,
        "culture": "Swedish",
        "religion": "Protestant",
        "trade_goods": ["iron", "copper", "grain"],
    },
    # Norrland (north — vast forests)
    {
        "name": "Norrland",
        "lat_min": 61.5, "lat_max": 69.1,
        "lng_min": 12.0, "lng_max": 24.5,
        "culture": "Swedish",
        "religion": "Protestant",
        "trade_goods": ["timber", "tar", "furs"],
    },
    # Catch-all Sweden
    {
        "name": "Sweden",
        "lat_min": 55.0, "lat_max": 69.2,
        "lng_min": 11.0, "lng_max": 24.5,
        "culture": "Swedish",
        "religion": "Protestant",
        "trade_goods": ["iron", "timber", "grain"],
    },
]

SE_COUNTY_MAP = [
    # South
    {"name": "Skåne",          "lat_min": 55.3, "lat_max": 56.1, "lng_min": 12.6, "lng_max": 14.4},
    {"name": "Blekinge",       "lat_min": 56.0, "lat_max": 56.5, "lng_min": 14.0, "lng_max": 15.3},
    {"name": "Halland",        "lat_min": 56.3, "lat_max": 57.3, "lng_min": 12.0, "lng_max": 13.2},
    {"name": "Kronoberg",      "lat_min": 56.2, "lat_max": 57.2, "lng_min": 13.5, "lng_max": 15.2},
    {"name": "Kalmar",         "lat_min": 56.5, "lat_max": 57.8, "lng_min": 15.2, "lng_max": 16.8},
    {"name": "Gotland",        "lat_min": 57.0, "lat_max": 57.9, "lng_min": 18.0, "lng_max": 19.1},
    {"name": "Öland",          "lat_min": 56.2, "lat_max": 57.2, "lng_min": 16.4, "lng_max": 17.1},
    {"name": "Jönköping",      "lat_min": 57.0, "lat_max": 58.0, "lng_min": 13.5, "lng_max": 15.5},
    {"name": "Östergötland",   "lat_min": 57.7, "lat_max": 58.7, "lng_min": 14.5, "lng_max": 16.8},
    # West
    {"name": "Bohuslän",       "lat_min": 57.7, "lat_max": 59.0, "lng_min": 11.0, "lng_max": 12.5},
    {"name": "Västra Götaland","lat_min": 57.0, "lat_max": 58.0, "lng_min": 11.5, "lng_max": 13.8},
    {"name": "Värmland",       "lat_min": 59.0, "lat_max": 60.5, "lng_min": 12.0, "lng_max": 14.5},
    # Central
    {"name": "Södermanland",   "lat_min": 58.5, "lat_max": 59.3, "lng_min": 16.0, "lng_max": 17.5},
    {"name": "Västmanland",    "lat_min": 59.3, "lat_max": 59.9, "lng_min": 15.5, "lng_max": 17.0},
    {"name": "Uppland",        "lat_min": 59.6, "lat_max": 60.5, "lng_min": 16.8, "lng_max": 18.8},
    {"name": "Stockholm",      "lat_min": 58.9, "lat_max": 59.8, "lng_min": 17.5, "lng_max": 19.0},
    {"name": "Dalarna",        "lat_min": 60.2, "lat_max": 61.5, "lng_min": 13.5, "lng_max": 16.5},
    {"name": "Gästrikland",    "lat_min": 60.4, "lat_max": 61.2, "lng_min": 16.3, "lng_max": 17.5},
    # North
    {"name": "Hälsingland",    "lat_min": 61.0, "lat_max": 62.2, "lng_min": 15.5, "lng_max": 17.8},
    {"name": "Medelpad",       "lat_min": 62.2, "lat_max": 63.0, "lng_min": 15.5, "lng_max": 18.5},
    {"name": "Ångermanland",   "lat_min": 62.8, "lat_max": 64.0, "lng_min": 14.5, "lng_max": 18.8},
    {"name": "Jämtland",       "lat_min": 62.5, "lat_max": 64.5, "lng_min": 12.0, "lng_max": 15.5},
    {"name": "Härjedalen",     "lat_min": 61.8, "lat_max": 62.8, "lng_min": 12.5, "lng_max": 15.0},
    {"name": "Västernorrland", "lat_min": 63.5, "lat_max": 64.5, "lng_min": 16.0, "lng_max": 19.5},
    {"name": "Västerbotten",   "lat_min": 64.0, "lat_max": 66.0, "lng_min": 14.5, "lng_max": 20.5},
    {"name": "Norrbotten",     "lat_min": 65.5, "lat_max": 69.2, "lng_min": 16.0, "lng_max": 24.5},
    {"name": "Lapland",        "lat_min": 66.0, "lat_max": 69.2, "lng_min": 16.5, "lng_max": 22.5},
    # Catch-all
    {"name": "Sweden",         "lat_min": 55.0, "lat_max": 69.2, "lng_min": 11.0, "lng_max": 24.5},
]

SE_CONFIG = {
    "id_prefix":          "sweden",
    "continent":          "europe",
    "region":             "scandinavia",
    "sub_regions":        SE_SUB_REGIONS,
    "county_map":         SE_COUNTY_MAP,
    "default_tier":       "wilderness",
    "default_population": 400,
    "default_wealth":     40,
    "bbox": {
        "lat_min": 55.2,
        "lat_max": 69.2,
        "lng_min": 11.0,
        "lng_max": 24.5,
    },
}

# ══════════════════════════════════════════════════════════════════════════════
# NORWAY
# ══════════════════════════════════════════════════════════════════════════════

NO_SUB_REGIONS = [
    # Østlandet (east, Oslo area)
    {
        "name": "Ostlandet",
        "lat_min": 58.5, "lat_max": 61.5,
        "lng_min": 7.0,  "lng_max": 12.5,
        "culture": "Norwegian",
        "religion": "Protestant",
        "trade_goods": ["timber", "iron", "grain"],
    },
    # Vestlandet (west coast — Bergen, fjords)
    {
        "name": "Vestlandet",
        "lat_min": 58.0, "lat_max": 62.5,
        "lng_min": 4.5,  "lng_max": 7.5,
        "culture": "Norwegian",
        "religion": "Protestant",
        "trade_goods": ["fish", "timber", "iron"],
    },
    # Trøndelag (central)
    {
        "name": "Trondelag",
        "lat_min": 62.5, "lat_max": 64.5,
        "lng_min": 9.0,  "lng_max": 14.5,
        "culture": "Norwegian",
        "religion": "Protestant",
        "trade_goods": ["fish", "cattle", "timber"],
    },
    # Nordland (far north)
    {
        "name": "Nordland",
        "lat_min": 64.5, "lat_max": 68.5,
        "lng_min": 13.0, "lng_max": 18.5,
        "culture": "Norwegian",
        "religion": "Protestant",
        "trade_goods": ["fish", "furs", "timber"],
    },
    # Troms / Finnmark (arctic north)
    {
        "name": "Finnmark",
        "lat_min": 68.5, "lat_max": 71.2,
        "lng_min": 18.0, "lng_max": 31.0,
        "culture": "Norwegian",
        "religion": "Protestant",
        "trade_goods": ["furs", "fish", "whale"],
    },
    # Catch-all Norway
    {
        "name": "Norway",
        "lat_min": 57.5, "lat_max": 71.2,
        "lng_min": 4.5,  "lng_max": 31.0,
        "culture": "Norwegian",
        "religion": "Protestant",
        "trade_goods": ["fish", "timber", "iron"],
    },
]

NO_COUNTY_MAP = [
    # South
    {"name": "Agder",          "lat_min": 57.9, "lat_max": 59.0, "lng_min": 6.5,  "lng_max": 9.5},
    {"name": "Rogaland",       "lat_min": 58.2, "lat_max": 59.3, "lng_min": 5.0,  "lng_max": 7.0},
    {"name": "Telemark",       "lat_min": 59.0, "lat_max": 59.9, "lng_min": 7.5,  "lng_max": 9.8},
    {"name": "Vestfold",       "lat_min": 59.0, "lat_max": 59.7, "lng_min": 10.0, "lng_max": 10.7},
    {"name": "Oslo",           "lat_min": 59.7, "lat_max": 60.2, "lng_min": 10.3, "lng_max": 11.2},
    {"name": "Akershus",       "lat_min": 59.5, "lat_max": 60.5, "lng_min": 10.3, "lng_max": 11.8},
    {"name": "Østfold",        "lat_min": 59.0, "lat_max": 59.8, "lng_min": 10.8, "lng_max": 12.0},
    # West fjords
    {"name": "Hordaland",      "lat_min": 59.5, "lat_max": 61.0, "lng_min": 4.8,  "lng_max": 7.0},
    {"name": "Sogn og Fjordane","lat_min": 61.0,"lat_max": 62.2,"lng_min": 4.7,  "lng_max": 7.5},
    # Interior
    {"name": "Oppland",        "lat_min": 60.5, "lat_max": 62.0, "lng_min": 8.0,  "lng_max": 11.5},
    {"name": "Hedmark",        "lat_min": 60.8, "lat_max": 62.3, "lng_min": 11.0, "lng_max": 13.0},
    {"name": "Buskerud",       "lat_min": 59.3, "lat_max": 61.0, "lng_min": 8.0,  "lng_max": 10.5},
    # Møre og Romsdal
    {"name": "Møre og Romsdal","lat_min": 62.1,"lat_max": 63.2,"lng_min": 5.0,  "lng_max": 9.5},
    # Trøndelag
    {"name": "Sør-Trøndelag",  "lat_min": 62.8, "lat_max": 63.8, "lng_min": 9.0,  "lng_max": 12.5},
    {"name": "Nord-Trøndelag", "lat_min": 63.6, "lat_max": 65.2, "lng_min": 11.0, "lng_max": 14.8},
    # Nordland
    {"name": "Nordland",       "lat_min": 65.0, "lat_max": 68.5, "lng_min": 13.5, "lng_max": 18.5},
    # Far north
    {"name": "Troms",          "lat_min": 68.4, "lat_max": 70.3, "lng_min": 16.0, "lng_max": 22.5},
    {"name": "Finnmark",       "lat_min": 69.8, "lat_max": 71.2, "lng_min": 22.0, "lng_max": 31.0},
    # Catch-all
    {"name": "Norway",         "lat_min": 57.5, "lat_max": 71.2, "lng_min": 4.5,  "lng_max": 31.0},
]

NO_CONFIG = {
    "id_prefix":          "norway",
    "continent":          "europe",
    "region":             "scandinavia",
    "sub_regions":        NO_SUB_REGIONS,
    "county_map":         NO_COUNTY_MAP,
    "default_tier":       "wilderness",
    "default_population": 300,
    "default_wealth":     35,
    "bbox": {
        "lat_min": 57.8,
        "lat_max": 71.2,
        "lng_min": 4.5,
        "lng_max": 31.2,
    },
}

# ══════════════════════════════════════════════════════════════════════════════
# FINLAND
# ══════════════════════════════════════════════════════════════════════════════

FI_SUB_REGIONS = [
    # Southwest / Turku (Abo) coast
    {
        "name": "Southwest Finland",
        "lat_min": 59.8, "lat_max": 61.5,
        "lng_min": 21.0, "lng_max": 24.0,
        "culture": "Finnish",
        "religion": "Protestant",
        "trade_goods": ["fish", "grain", "tar"],
    },
    # Häme (interior, south)
    {
        "name": "Häme",
        "lat_min": 60.5, "lat_max": 62.0,
        "lng_min": 23.5, "lng_max": 26.5,
        "culture": "Finnish",
        "religion": "Protestant",
        "trade_goods": ["timber", "iron", "furs"],
    },
    # Karelia (east)
    {
        "name": "Karelia",
        "lat_min": 60.0, "lat_max": 63.5,
        "lng_min": 26.5, "lng_max": 32.0,
        "culture": "Finnish",
        "religion": "Protestant",
        "trade_goods": ["furs", "timber", "fish"],
    },
    # Savonia (central)
    {
        "name": "Savonia",
        "lat_min": 61.5, "lat_max": 64.0,
        "lng_min": 25.0, "lng_max": 30.0,
        "culture": "Finnish",
        "religion": "Protestant",
        "trade_goods": ["timber", "tar", "furs"],
    },
    # Ostrobothnia (west coast)
    {
        "name": "Ostrobothnia",
        "lat_min": 61.5, "lat_max": 65.5,
        "lng_min": 21.0, "lng_max": 26.0,
        "culture": "Finnish",
        "religion": "Protestant",
        "trade_goods": ["tar", "grain", "fish"],
    },
    # Northern Finland / Lapland
    {
        "name": "Finnish Lapland",
        "lat_min": 65.5, "lat_max": 70.1,
        "lng_min": 21.0, "lng_max": 31.0,
        "culture": "Finnish",
        "religion": "Protestant",
        "trade_goods": ["furs", "fish", "timber"],
    },
    # Catch-all
    {
        "name": "Finland",
        "lat_min": 59.5, "lat_max": 70.2,
        "lng_min": 20.0, "lng_max": 32.0,
        "culture": "Finnish",
        "religion": "Protestant",
        "trade_goods": ["timber", "furs", "tar"],
    },
]

FI_COUNTY_MAP = [
    {"name": "Åland",          "lat_min": 59.8, "lat_max": 60.6, "lng_min": 19.5, "lng_max": 21.4},
    {"name": "Varsinais-Suomi","lat_min": 60.0, "lat_max": 61.0, "lng_min": 21.5, "lng_max": 23.5},
    {"name": "Satakunta",      "lat_min": 61.0, "lat_max": 62.2, "lng_min": 21.0, "lng_max": 23.5},
    {"name": "Häme",           "lat_min": 60.5, "lat_max": 62.0, "lng_min": 23.5, "lng_max": 25.5},
    {"name": "Uusimaa",        "lat_min": 59.8, "lat_max": 60.8, "lng_min": 23.5, "lng_max": 26.5},
    {"name": "Kymenlaakso",    "lat_min": 60.2, "lat_max": 61.0, "lng_min": 26.0, "lng_max": 28.0},
    {"name": "South Karelia",  "lat_min": 60.5, "lat_max": 62.0, "lng_min": 27.5, "lng_max": 30.0},
    {"name": "Pirkanmaa",      "lat_min": 61.2, "lat_max": 62.2, "lng_min": 23.0, "lng_max": 25.5},
    {"name": "Central Finland","lat_min": 61.8, "lat_max": 63.2, "lng_min": 24.5, "lng_max": 27.5},
    {"name": "South Savo",     "lat_min": 61.2, "lat_max": 62.5, "lng_min": 26.5, "lng_max": 29.5},
    {"name": "North Savo",     "lat_min": 62.5, "lat_max": 64.0, "lng_min": 26.0, "lng_max": 29.5},
    {"name": "North Karelia",  "lat_min": 62.0, "lat_max": 64.0, "lng_min": 29.0, "lng_max": 32.0},
    {"name": "South Ostrobothnia","lat_min": 62.0,"lat_max": 63.5,"lng_min": 21.5,"lng_max": 24.5},
    {"name": "Central Ostrobothnia","lat_min": 63.3,"lat_max": 64.3,"lng_min": 22.0,"lng_max": 25.0},
    {"name": "North Ostrobothnia","lat_min": 64.0,"lat_max": 66.0,"lng_min": 22.5,"lng_max": 27.0},
    {"name": "Kainuu",         "lat_min": 63.8, "lat_max": 65.5, "lng_min": 27.5, "lng_max": 31.0},
    {"name": "Lapland",        "lat_min": 66.0, "lat_max": 70.1, "lng_min": 21.5, "lng_max": 31.0},
    # Catch-all
    {"name": "Finland",        "lat_min": 59.5, "lat_max": 70.2, "lng_min": 20.0, "lng_max": 32.0},
]

FI_CONFIG = {
    "id_prefix":          "finland",
    "continent":          "europe",
    "region":             "scandinavia",
    "sub_regions":        FI_SUB_REGIONS,
    "county_map":         FI_COUNTY_MAP,
    "default_tier":       "wilderness",
    "default_population": 300,
    "default_wealth":     30,
    "bbox": {
        "lat_min": 59.5,
        "lat_max": 70.2,
        "lng_min": 19.5,
        "lng_max": 32.1,
    },
}

# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    repo_root = os.path.dirname(os.path.abspath(__file__))
    pjson = os.path.join(repo_root, "src", "data", "provinces.json")
    bdir  = os.path.join(repo_root, "data", "boundaries")

    # Denmark removes the unsettled placeholder tiles (only needs to happen once)
    generate_provinces(
        boundary_geojson=os.path.join(bdir, "denmark.geojson"),
        provinces_json=pjson,
        country_config=DK_CONFIG,
        remove_ids=REMOVE_IDS,
    )

    generate_provinces(
        boundary_geojson=os.path.join(bdir, "sweden.geojson"),
        provinces_json=pjson,
        country_config=SE_CONFIG,
        remove_ids=[],
    )

    generate_provinces(
        boundary_geojson=os.path.join(bdir, "norway.geojson"),
        provinces_json=pjson,
        country_config=NO_CONFIG,
        remove_ids=[],
    )

    generate_provinces(
        boundary_geojson=os.path.join(bdir, "finland.geojson"),
        provinces_json=pjson,
        country_config=FI_CONFIG,
        remove_ids=[],
    )
