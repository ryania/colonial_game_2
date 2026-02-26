#!/usr/bin/env python3
"""
generate_unsettled.py
Generates unsettled province entries for all major land areas not currently
covered by named provinces in provinces.json. Each province has a small native
population (500-2000) to represent indigenous peoples, settlement_tier='unsettled',
and no colonial entity or state owner.

Run from the project root: python3 generate_unsettled.py
"""

import json
import math
import os

DATA_FILE = os.path.join(os.path.dirname(__file__), 'src', 'data', 'provinces.json')

# Starting axial coord offset. Named provinces use 0-500 range; ocean tiles use 10000+.
# We use 2000+ to avoid all collisions.
START_X = 2000
START_Y = 2000

def make_province(idx, id_suffix, name, lat, lng, continent, region,
                  population, wealth, trade_goods, culture, religion,
                  terrain_type='land'):
    """Create a single unsettled province dict."""
    return {
        "id": f"unsettled_{id_suffix}",
        "name": name,
        "x": START_X + idx,
        "y": START_Y,
        "continent": continent,
        "region": region,
        "population": population,
        "wealth": wealth,
        "trade_goods": trade_goods,
        "owner_culture": culture,
        "owner_religion": religion,
        "settlement_tier": "unsettled",
        "development_progress": 0,
        "months_at_tier": 0,
        "development_invested": 0,
        "lat": lat,
        "lng": lng,
        "terrain_type": terrain_type,
    }


# ---------------------------------------------------------------------------
# Province definitions grouped by world region
# Each tuple: (id_suffix, name, lat, lng, continent, geo_region,
#              pop, wealth, trade_goods, culture, religion, terrain?)
# ---------------------------------------------------------------------------
UNSETTLED_PROVINCES = [

    # ── British Isles interior (excluding the 5 Irish ones added manually) ──
    ("scotland_highlands",   "Scottish Highlands",    57.5, -4.5,  "europe", "british_isles",   700,  55, ["wool","timber"],       "English",  "Protestant"),
    ("scotland_interior",    "Scottish Interior",     56.5, -4.0,  "europe", "british_isles",   900,  65, ["wool","grain"],         "English",  "Protestant"),
    ("wales_interior",       "Welsh Interior",        52.3, -3.6,  "europe", "british_isles",   800,  60, ["wool","coal"],          "English",  "Protestant"),
    ("northern_england",     "Northern England",      54.5, -2.5,  "europe", "british_isles",  1200,  80, ["wool","iron"],          "English",  "Protestant"),
    ("england_midlands",     "English Midlands",      52.6, -1.5,  "europe", "british_isles",  1500,  90, ["wool","grain"],         "English",  "Protestant"),

    # ── Scandinavia interior ──
    ("sweden_interior",      "Swedish Interior",      62.0, 15.0,  "europe", "scandinavia",     600,  50, ["timber","iron"],        "Swedish",  "Protestant"),
    ("norway_interior",      "Norwegian Interior",    62.5,  8.0,  "europe", "scandinavia",     400,  40, ["timber","fish"],        "Danish",   "Protestant"),
    ("finland_interior",     "Finnish Interior",      63.0, 26.0,  "europe", "eastern_europe",  500,  45, ["timber","furs"],        "Swedish",  "Protestant"),
    ("lapland",              "Lapland",               69.0, 25.0,  "europe", "scandinavia",     200,  25, ["furs","timber"],        "Swedish",  "Protestant"),

    # ── Eastern Europe interior ──
    ("poland_interior",      "Polish Interior",       52.0, 20.0,  "europe", "poland",         1200,  75, ["grain","timber"],       "Polish",   "Catholic"),
    ("ukraine_steppe",       "Ukrainian Steppe",      49.0, 32.0,  "europe", "eastern_europe", 1000,  65, ["grain","salt"],         "Russian",  "Orthodox"),
    ("belorussia",           "Belorussia",            53.5, 27.5,  "europe", "eastern_europe",  900,  60, ["timber","grain"],       "Russian",  "Orthodox"),
    ("lithuania_interior",   "Lithuanian Interior",   55.5, 24.0,  "europe", "eastern_europe",  800,  60, ["timber","grain"],       "Polish",   "Catholic"),
    ("transylvania",         "Transylvania",          46.5, 24.5,  "europe", "balkans",         900,  65, ["silver","grain"],       "Romanian", "Orthodox"),
    ("moldavia",             "Moldavia",              47.0, 28.5,  "europe", "eastern_europe",  800,  55, ["grain","wool"],         "Romanian", "Orthodox"),

    # ── Iberia interior ──
    ("castile_interior",     "Castilian Plateau",     40.5, -3.5,  "europe", "iberia",         1500,  85, ["wool","grain"],         "Spanish",  "Catholic"),
    ("aragon_interior",      "Aragonese Interior",    41.5, -0.5,  "europe", "iberia",         1200,  75, ["wool","silk"],          "Spanish",  "Catholic"),

    # ── North Africa interior ──
    ("sahara_west",          "Western Sahara",        24.0, -10.0, "africa", "north_africa",    300,  20, ["salt"],                 "Moroccan", "Muslim"),
    ("sahara_central",       "Central Sahara",        25.0,  10.0, "africa", "north_africa",    200,  15, ["salt"],                 "Arab",     "Muslim"),
    ("sahara_east",          "Eastern Sahara",        24.0,  25.0, "africa", "north_africa",    250,  15, ["salt"],                 "Arab",     "Muslim"),
    ("sahel_west",           "Western Sahel",         15.0,  -5.0, "africa", "west_africa",     800,  55, ["grain","ivory"],        "Hausa",    "Muslim"),
    ("sahel_central",        "Central Sahel",         15.0,  15.0, "africa", "north_africa",    700,  50, ["grain","ivory"],        "Hausa",    "Muslim"),
    ("sahel_east",           "Eastern Sahel",         14.0,  25.0, "africa", "northeast_africa",600,  45, ["grain"],                "Nubian",   "Muslim"),

    # ── West Africa interior ──
    ("guinea_interior",      "Guinea Interior",        9.0,  -10.0,"africa", "west_africa",    1000,  65, ["ivory","gold"],         "Akan",     "Animist"),
    ("nigeria_north",        "Northern Nigeria",      12.0,   8.0, "africa", "west_africa",    1200,  70, ["ivory","slaves"],       "Hausa",    "Muslim"),
    ("nigeria_south",        "Southern Nigeria",       7.0,   5.0, "africa", "west_africa",    1100,  65, ["ivory","timber"],       "Ewe",      "Animist"),
    ("cameroon_interior",    "Cameroon Interior",      5.5,  12.0, "africa", "central_africa",  900,  60, ["ivory","timber"],       "Bamileke", "Animist"),
    ("ghana_interior",       "Ghana Interior",         8.0,  -1.5, "africa", "west_africa",    1000,  65, ["gold","ivory"],         "Akan",     "Animist"),

    # ── Central Africa ──
    ("congo_basin_north",    "Northern Congo Basin",   2.0,  20.0, "africa", "central_africa",  900,  55, ["ivory","timber"],       "Kongo",    "Animist"),
    ("congo_basin_central",  "Central Congo Basin",   -2.0,  23.0, "africa", "central_africa",  800,  50, ["ivory","timber"],       "Kongo",    "Animist"),
    ("congo_basin_south",    "Southern Congo Basin",  -5.5,  22.0, "africa", "central_africa",  750,  50, ["ivory","copper"],       "Kongo",    "Animist"),
    ("angola_interior",      "Angolan Interior",      -10.0, 18.0, "africa", "central_africa",  700,  50, ["ivory","slaves"],       "Mbundu",   "Animist"),
    ("central_africa_east",  "East Central Africa",   -3.0,  29.0, "africa", "central_africa",  800,  55, ["ivory"],                "African",  "Animist"),

    # ── East Africa interior ──
    ("great_lakes_africa",   "African Great Lakes",   -1.0,  31.0, "africa", "east_africa",     900,  60, ["ivory","grain"],        "Kikuyu",   "Animist"),
    ("kenya_interior",       "Kenyan Interior",        0.5,  37.5, "africa", "east_africa",     750,  55, ["ivory","grain"],        "Kikuyu",   "Animist"),
    ("tanzania_interior",    "Tanzanian Interior",    -6.5,  35.0, "africa", "east_africa",     700,  50, ["ivory"],                "African",  "Animist"),
    ("ethiopia_interior",    "Ethiopian Interior",     9.0,  40.0, "africa", "northeast_africa",900,  60, ["coffee","grain"],       "Ethiopian","Orthodox"),
    ("sudan_interior",       "Sudanese Interior",     13.0,  30.0, "africa", "northeast_africa",700,  50, ["ivory","grain"],        "Nubian",   "Muslim"),

    # ── Southern Africa ──
    ("zambia_interior",      "Zambian Interior",      -14.0, 27.0, "africa", "southern_africa", 700,  50, ["ivory","copper"],       "Shona",    "Animist"),
    ("zimbabwe_interior",    "Zimbabwean Interior",   -19.0, 30.0, "africa", "southern_africa", 750,  55, ["ivory","gold"],         "Shona",    "Animist"),
    ("south_africa_interior","South African Interior",-27.0, 25.0, "africa", "southern_africa", 600,  45, ["ivory","grain"],        "African",  "Animist"),
    ("mozambique_interior",  "Mozambique Interior",  -17.0,  35.0, "africa", "east_africa",     650,  48, ["ivory"],                "Shona",    "Animist"),
    ("kalahari",             "Kalahari",             -23.0,  22.0, "africa", "southern_africa", 300,  20, ["ivory"],                "African",  "Animist"),
    ("madagascar_interior",  "Madagascar Interior",  -19.0,  46.5, "africa", "madagascar",      700,  50, ["spices","timber"],      "Malagasy", "Animist", "island"),

    # ── North America interior ──
    ("appalachians",         "Appalachian Interior",  37.5, -82.0, "americas","north_america",  800,  55, ["furs","timber"],        "Native",   "Animist"),
    ("great_lakes_north",    "Great Lakes North",     46.0, -84.0, "americas","great_lakes",    700,  50, ["furs","fish"],          "Native",   "Animist"),
    ("great_lakes_west",     "Great Lakes West",      43.5, -87.0, "americas","great_lakes",    750,  55, ["furs","fish"],          "Native",   "Animist"),
    ("ohio_valley",          "Ohio Valley",           39.5, -82.5, "americas","north_america",  900,  60, ["furs","timber"],        "Native",   "Animist"),
    ("mississippi_upper",    "Upper Mississippi",     43.0, -90.0, "americas","north_america",  800,  55, ["furs","grain"],         "Native",   "Animist"),
    ("mississippi_lower",    "Lower Mississippi",     33.0, -91.0, "americas","north_america",  900,  60, ["furs","grain"],         "Native",   "Animist"),
    ("great_plains_north",   "Northern Great Plains", 47.0,-103.0, "americas","north_america",  700,  50, ["furs","bison"],         "Native",   "Animist"),
    ("great_plains_central", "Central Great Plains",  41.0,-100.0, "americas","north_america",  750,  50, ["furs","bison"],         "Native",   "Animist"),
    ("great_plains_south",   "Southern Great Plains", 35.0, -99.0, "americas","north_america",  800,  55, ["furs","bison"],         "Native",   "Animist"),
    ("texas_interior",       "Texas Interior",        30.5, -98.0, "americas","north_america",  700,  50, ["furs","bison"],         "Native",   "Animist"),
    ("rocky_mountains",      "Rocky Mountains",       44.0,-111.0, "americas","north_america",  500,  40, ["furs","silver"],        "Native",   "Animist"),
    ("pacific_northwest",    "Pacific Northwest",     47.5,-122.5, "americas","north_america",  700,  55, ["furs","fish","timber"], "Native",   "Animist"),
    ("california_interior",  "California Interior",   37.5,-120.0, "americas","north_america",  800,  55, ["furs","grain"],         "Native",   "Animist"),
    ("southwest_desert",     "Southwest Desert",      34.0,-112.0, "americas","north_america",  500,  35, ["silver","copper"],      "Native",   "Animist"),
    ("canada_interior",      "Canadian Interior",     53.0, -95.0, "americas","north_america",  500,  40, ["furs","timber"],        "Native",   "Animist"),
    ("canada_northwest",     "Northwest Canada",      58.0,-115.0, "americas","north_america",  400,  30, ["furs","timber"],        "Native",   "Animist"),
    ("canada_northeast",     "Northeast Canada",      52.0, -68.0, "americas","north_america",  500,  40, ["furs","fish"],          "Native",   "Animist"),
    ("hudson_bay_south",     "Hudson Bay South",      51.0, -82.0, "americas","north_america",  400,  30, ["furs","fish"],          "Native",   "Animist"),
    ("labrador",             "Labrador",              54.0, -60.0, "americas","north_america",  350,  25, ["furs","fish"],          "Native",   "Animist"),
    ("alaska_south",         "Southern Alaska",       60.0,-151.0, "americas","north_america",  400,  30, ["furs","fish"],          "Native",   "Animist"),
    ("alaska_interior",      "Alaskan Interior",      64.0,-153.0, "americas","north_america",  300,  20, ["furs"],                 "Native",   "Animist"),

    # ── Central America interior ──
    ("guatemala_interior",   "Guatemalan Interior",   15.5, -90.5, "americas","central_america",1100,  70, ["cacao","indigo"],       "Native",   "Animist"),
    ("honduras_interior",    "Honduran Interior",     14.5, -87.0, "americas","central_america", 900,  60, ["cacao","timber"],       "Native",   "Animist"),
    ("nicaragua_interior",   "Nicaraguan Interior",   13.0, -85.0, "americas","central_america", 800,  55, ["cacao","timber"],       "Native",   "Animist"),
    ("costa_rica_interior",  "Costa Rican Interior",  10.0, -84.0, "americas","central_america", 700,  50, ["cacao","timber"],       "Native",   "Animist"),

    # ── South America interior ──
    ("amazon_west",          "Western Amazon",        -4.0, -70.0, "americas","south_america",   900,  55, ["timber","dye"],         "Native",   "Animist"),
    ("amazon_central",       "Central Amazon",        -3.5, -60.0, "americas","south_america",   850,  50, ["timber","dye"],         "Native",   "Animist"),
    ("amazon_east",          "Eastern Amazon",        -3.0, -52.0, "americas","south_america",   800,  50, ["timber","brazilwood"],  "Native",   "Animist"),
    ("mato_grosso",          "Mato Grosso",          -14.0, -57.0, "americas","south_america",   700,  50, ["gold","timber"],        "Native",   "Animist"),
    ("gran_chaco",           "Gran Chaco",           -22.0, -61.0, "americas","south_america",   600,  40, ["timber","grain"],       "Native",   "Animist"),
    ("paraguay_interior",    "Paraguayan Interior",  -23.0, -58.0, "americas","south_america",   700,  50, ["grain","timber"],       "Native",   "Animist"),
    ("patagonia_north",      "Northern Patagonia",   -39.0, -68.0, "americas","south_america",   350,  25, ["wool","furs"],          "Native",   "Animist"),
    ("patagonia_south",      "Southern Patagonia",   -50.0, -69.0, "americas","south_america",   250,  20, ["furs"],                 "Native",   "Animist"),
    ("andes_interior",       "Andean Interior",      -18.0, -66.0, "americas","south_america",   800,  55, ["silver","wool"],        "Native",   "Animist"),
    ("venezuela_interior",   "Venezuelan Interior",    7.5, -66.0, "americas","south_america",   750,  50, ["cacao","timber"],       "Native",   "Animist"),
    ("colombia_interior",    "Colombian Interior",     4.5, -74.0, "americas","south_america",   900,  60, ["gold","timber"],        "Native",   "Animist"),
    ("ecuador_interior",     "Ecuadorian Interior",   -1.5, -78.5, "americas","south_america",   850,  55, ["gold","cacao"],         "Native",   "Animist"),
    ("bolivia_interior",     "Bolivian Interior",    -17.0, -65.0, "americas","south_america",   750,  55, ["silver","tin"],         "Native",   "Animist"),
    ("uruguay_interior",     "Uruguayan Interior",   -32.5, -56.0, "americas","south_america",   600,  45, ["grain","wool"],         "Native",   "Animist"),
    ("argentina_interior",   "Argentine Interior",   -35.0, -64.0, "americas","south_america",   550,  40, ["grain","wool"],         "Native",   "Animist"),
    ("tierra_del_fuego",     "Tierra del Fuego",     -54.0, -68.0, "americas","south_america",   200,  15, ["furs"],                 "Native",   "Animist"),
    ("guiana_interior",      "Guiana Interior",        4.0, -58.0, "americas","south_america",   700,  50, ["timber","dye"],         "Native",   "Animist"),
    ("suriname_interior",    "Suriname Interior",      4.0, -55.5, "americas","south_america",   650,  45, ["timber","dye"],         "Native",   "Animist"),

    # ── Russia / Siberia ──
    ("russia_interior",      "Russian Interior",      58.0,  50.0, "europe", "russia",           700,  50, ["furs","timber"],        "Russian",  "Orthodox"),
    ("russia_south",         "Southern Russia",       52.0,  55.0, "europe", "russia",           800,  55, ["grain","furs"],         "Russian",  "Orthodox"),
    ("siberia_west",         "Western Siberia",       58.0,  68.0, "asia",   "russia",           400,  30, ["furs","timber"],        "Russian",  "Orthodox"),
    ("siberia_central",      "Central Siberia",       62.0,  97.0, "asia",   "russia",           300,  25, ["furs","timber"],        "Russian",  "Orthodox"),
    ("siberia_east",         "Eastern Siberia",       62.0, 130.0, "asia",   "russia",           250,  20, ["furs"],                 "Manchu",   "Animist"),
    ("siberia_far_east",     "Far Eastern Siberia",   58.0, 155.0, "asia",   "east_asia",        250,  20, ["furs","fish"],          "Manchu",   "Animist"),
    ("kamchatka",            "Kamchatka",             54.0, 159.0, "asia",   "east_asia",        200,  15, ["furs","fish"],          "Manchu",   "Animist"),
    ("yakutia",              "Yakutia",               66.0, 130.0, "asia",   "russia",           200,  15, ["furs","ivory"],         "Manchu",   "Animist"),

    # ── Central Asia ──
    ("kazakh_steppe",        "Kazakh Steppe",         47.0,  67.0, "asia",   "central_asia",     700,  50, ["furs","wool"],          "Tatar",    "Muslim"),
    ("kazakh_steppe_north",  "Northern Kazakh Steppe",51.0,  64.0, "asia",   "central_asia",     600,  45, ["wool","grain"],         "Tatar",    "Muslim"),
    ("mongolia_interior",    "Mongolian Interior",    46.0, 104.0, "asia",   "east_asia",        600,  45, ["wool","horses"],        "Mongol",   "Animist"),
    ("mongolia_north",       "Northern Mongolia",     49.0,  97.0, "asia",   "east_asia",        500,  40, ["wool","furs"],          "Mongol",   "Animist"),
    ("afghanistan_interior", "Afghan Interior",       34.0,  66.0, "asia",   "central_asia",     800,  55, ["wool","grain"],         "Persian",  "Muslim"),
    ("tibetan_plateau",      "Tibetan Plateau",       31.0,  87.0, "asia",   "south_asia",       600,  45, ["wool","salt"],          "Tibetan",  "Buddhist"),
    ("tibet_east",           "Eastern Tibet",         30.0,  96.0, "asia",   "south_asia",       550,  40, ["wool","timber"],        "Tibetan",  "Buddhist"),

    # ── China interior ──
    ("china_northwest",      "Northwest China",       40.0, 105.0, "asia",   "china",            800,  55, ["silk","grain"],         "Chinese",  "Buddhist"),
    ("china_southwest",      "Southwest China",       27.0, 105.0, "asia",   "china",           1200,  75, ["silk","tea"],           "Chinese",  "Buddhist"),
    ("china_interior_north", "North China Interior",  38.0, 113.0, "asia",   "china",           1400,  85, ["grain","silk"],         "Chinese",  "Buddhist"),
    ("china_interior_south", "South China Interior",  26.0, 113.0, "asia",   "china",           1300,  80, ["tea","porcelain"],      "Chinese",  "Buddhist"),
    ("manchuria_interior",   "Manchurian Interior",   45.0, 127.0, "asia",   "east_asia",        700,  50, ["furs","grain"],         "Manchu",   "Animist"),

    # ── Southeast Asia interior ──
    ("burma_interior",       "Burmese Interior",      21.0,  96.5, "asia",   "burma",            900,  60, ["teak","rice"],          "Burman",   "Buddhist"),
    ("thailand_interior",    "Thai Interior",         16.0, 101.0, "asia",   "siam",            1000,  65, ["teak","rice"],          "Siamese",  "Buddhist"),
    ("cambodia_interior",    "Cambodian Interior",    12.5, 104.5, "asia",   "indochina",         900,  60, ["rice","timber"],        "Khmer",    "Buddhist"),
    ("vietnam_interior",     "Vietnamese Interior",   16.0, 107.5, "asia",   "indochina",         950,  65, ["rice","silk"],          "Vietnamese","Buddhist"),
    ("laos_interior",        "Laotian Interior",      18.0, 103.0, "asia",   "indochina",         700,  50, ["rice","timber"],        "Siamese",  "Buddhist"),
    ("borneo_interior",      "Borneo Interior",        0.5, 113.5, "asia",   "borneo",            700,  50, ["spices","timber"],      "Dayak",    "Animist", "island"),
    ("sumatra_interior",     "Sumatra Interior",       0.0, 102.0, "asia",   "sumatra",           800,  55, ["spices","pepper"],      "Malay",    "Muslim",  "island"),
    ("java_interior",        "Javanese Interior",     -7.5, 110.0, "asia",   "java",              900,  60, ["spices","rice"],        "Malay",    "Muslim",  "island"),
    ("sulawesi_interior",    "Sulawesi Interior",     -2.0, 121.0, "asia",   "celebes",           700,  50, ["spices","timber"],      "Bugis",    "Muslim",  "island"),
    ("new_guinea_interior",  "New Guinea Interior",   -5.0, 142.0, "asia",   "new_guinea",        600,  40, ["spices","timber"],      "Animist",  "Animist", "island"),

    # ── India interior ──
    ("deccan_interior",      "Deccan Interior",       17.0,  78.0, "asia",   "india_interior",  1200,  75, ["cotton","grain"],       "Indian",   "Hindu"),
    ("central_india",        "Central India",         22.0,  79.0, "asia",   "india_interior",  1100,  70, ["cotton","grain"],       "Mughal",   "Muslim"),
    ("rajputana",            "Rajputana",             26.0,  74.0, "asia",   "india_west",      1000,  65, ["cotton","grain"],       "Indian",   "Hindu"),
    ("bihar_interior",       "Bihar Interior",        25.0,  86.0, "asia",   "india_east",      1200,  75, ["grain","cotton"],       "Mughal",   "Muslim"),
    ("bengal_interior",      "Bengal Interior",       24.0,  89.5, "asia",   "india_east",      1300,  80, ["grain","cotton"],       "Mughal",   "Muslim"),
    ("nepal_interior",       "Nepali Hills",          28.0,  84.0, "asia",   "south_asia",        600,  45, ["grain","timber"],       "Nepali",   "Hindu"),

    # ── Pacific Islands ──
    ("hawaii_islands",       "Hawaiian Islands",      20.5,-157.0, "oceania","pacific_islands",   700,  50, ["fish","timber"],        "Animist",  "Animist", "island"),
    ("polynesia_central",    "Central Polynesia",    -15.0,-140.0, "oceania","pacific_islands",   400,  30, ["fish","spices"],        "Animist",  "Animist", "island"),
    ("polynesia_west",       "Western Polynesia",    -18.0,-174.0, "oceania","pacific_islands",   450,  30, ["fish","timber"],        "Animist",  "Animist", "island"),
    ("samoa_tonga",          "Samoa & Tonga",        -15.5,-172.0, "oceania","pacific_islands",   500,  35, ["fish","timber"],        "Animist",  "Animist", "island"),
    ("fiji_islands",         "Fiji Islands",         -17.5, 178.0, "oceania","pacific_islands",   500,  35, ["spices","timber"],      "Animist",  "Animist", "island"),
    ("vanuatu",              "Vanuatu",              -16.0, 167.5, "oceania","pacific_islands",   450,  30, ["spices","timber"],      "Animist",  "Animist", "island"),
    ("solomon_islands",      "Solomon Islands",       -9.0, 160.0, "oceania","pacific_islands",   400,  28, ["timber","spices"],      "Animist",  "Animist", "island"),
    ("micronesia",           "Micronesia",             8.0, 150.0, "oceania","pacific_islands",   350,  25, ["fish"],                 "Animist",  "Animist", "island"),
    ("marianas",             "Mariana Islands",       15.5, 145.5, "oceania","pacific_islands",   350,  25, ["fish","spices"],        "Animist",  "Animist", "island"),
    ("palau",                "Palau",                  7.5, 134.5, "oceania","pacific_islands",   300,  22, ["fish"],                 "Animist",  "Animist", "island"),
    ("marquesas",            "Marquesas Islands",    -10.0,-139.0, "oceania","pacific_islands",   300,  22, ["fish","timber"],        "Animist",  "Animist", "island"),
    ("new_caledonia",        "New Caledonia",        -21.5, 165.5, "oceania","pacific_islands",   450,  30, ["timber","copper"],      "Animist",  "Animist", "island"),
    ("tahiti",               "Tahiti",               -17.5,-149.5, "oceania","pacific_islands",   350,  25, ["fish","spices"],        "Animist",  "Animist", "island"),
    ("easter_island",        "Easter Island",        -27.0,-109.5, "oceania","pacific_islands",   200,  15, ["fish"],                 "Animist",  "Animist", "island"),

    # ── Australia ──
    ("australia_north",      "Northern Australia",   -17.0, 133.0, "oceania","australia",         500,  35, ["timber"],               "Animist",  "Animist"),
    ("australia_west",       "Western Australia",    -26.0, 121.0, "oceania","australia",         400,  28, ["timber"],               "Animist",  "Animist"),
    ("australia_central",    "Central Australia",    -25.0, 134.0, "oceania","australia",         300,  20, ["salt"],                 "Animist",  "Animist"),
    ("australia_east",       "Eastern Australia",    -32.0, 148.0, "oceania","australia",         550,  40, ["timber","grain"],       "Animist",  "Animist"),
    ("australia_southeast",  "Southeast Australia",  -37.0, 144.0, "oceania","australia",         500,  35, ["timber","wool"],        "Animist",  "Animist"),
    ("australia_northeast",  "Northeast Australia",  -20.0, 145.0, "oceania","australia",         500,  35, ["timber","spices"],      "Animist",  "Animist"),
    ("tasmania",             "Tasmania",             -42.0, 146.5, "oceania","australia",         300,  22, ["timber","fish"],        "Animist",  "Animist", "island"),

    # ── New Zealand ──
    ("new_zealand_north",    "North Island NZ",      -38.5, 176.5, "oceania","new_zealand",       500,  35, ["timber","fish"],        "Animist",  "Animist", "island"),
    ("new_zealand_south",    "South Island NZ",      -43.5, 170.5, "oceania","new_zealand",       400,  28, ["timber","fish"],        "Animist",  "Animist", "island"),

    # ── Arabia / Middle East interior ──
    ("arabia_interior",      "Arabian Interior",     24.0,  46.0, "asia",   "arabia",             500,  35, ["salt","dates"],         "Arab",     "Muslim"),
    ("arabia_south",         "Southern Arabia",      17.0,  49.0, "asia",   "arabia",             600,  40, ["frankincense","dates"], "Arab",     "Muslim"),
    ("iraq_interior",        "Iraqi Interior",       33.0,  44.0, "asia",   "mesopotamia",        800,  55, ["grain","dates"],        "Arab",     "Muslim"),
    ("iran_interior",        "Iranian Interior",     33.0,  55.0, "asia",   "persia",             800,  55, ["silk","grain"],         "Persian",  "Muslim"),
    ("iran_east",            "Eastern Iran",         31.0,  61.0, "asia",   "persia",             600,  45, ["wool","grain"],         "Persian",  "Muslim"),

]


def build_provinces():
    new_provinces = []
    for idx, entry in enumerate(UNSETTLED_PROVINCES):
        if len(entry) == 11:
            id_suffix, name, lat, lng, continent, region, pop, wealth, goods, culture, religion = entry
            terrain = 'land'
        else:
            id_suffix, name, lat, lng, continent, region, pop, wealth, goods, culture, religion, terrain = entry

        new_provinces.append(make_province(
            idx, id_suffix, name, lat, lng, continent, region,
            pop, wealth, goods, culture, religion, terrain
        ))
    return new_provinces


def main():
    with open(DATA_FILE, 'r') as f:
        provinces = json.load(f)

    existing_ids = {p['id'] for p in provinces}
    existing_coords = {(p['x'], p['y']) for p in provinces}

    new_provinces = build_provinces()

    # Deduplicate: skip any whose id or coords already exist
    added = []
    skipped = []
    for p in new_provinces:
        if p['id'] in existing_ids:
            skipped.append(p['id'])
            continue
        if (p['x'], p['y']) in existing_coords:
            skipped.append(f"{p['id']} (coord collision)")
            continue
        provinces.append(p)
        existing_ids.add(p['id'])
        existing_coords.add((p['x'], p['y']))
        added.append(p['id'])

    with open(DATA_FILE, 'w') as f:
        json.dump(provinces, f, indent=2)

    print(f"Added {len(added)} unsettled provinces.")
    if skipped:
        print(f"Skipped {len(skipped)} (already exist): {', '.join(skipped)}")
    print(f"Total provinces now: {len(provinces)}")


if __name__ == '__main__':
    main()
