import json
import sys

# Read existing provinces
with open('/home/user/colonial_game_2/src/data/provinces.json', 'r') as f:
    provinces = json.load(f)

existing_ids = set(p['id'] for p in provinces)
print(f"Starting count: {len(provinces)}")
print(f"Existing IDs: {sorted(existing_ids)}")

# Helper to make a province
def prov(pid, name, x, y, continent, region, population, wealth, trade_goods,
         culture, religion, tier, lat, lng, terrain="land"):
    assert pid not in existing_ids, f"Duplicate ID: {pid}"
    existing_ids.add(pid)
    return {
        "id": pid,
        "name": name,
        "x": x,
        "y": y,
        "continent": continent,
        "region": region,
        "population": population,
        "wealth": wealth,
        "trade_goods": trade_goods,
        "owner_culture": culture,
        "owner_religion": religion,
        "settlement_tier": tier,
        "development_progress": 0,
        "months_at_tier": 0,
        "development_invested": 0,
        "lat": lat,
        "lng": lng,
        "terrain_type": terrain
    }

new_provinces = []

# ===========================================================
# EUROPE ~100
# NOTE: Already existing: lisbon, porto, cadiz, seville, london, bristol, dublin,
#       amsterdam, antwerp, bordeaux, nantes, marseille, hamburg, lubeck, gdansk,
#       brest, rouen, genoa, venice, livorno
# ===========================================================

# --- Iberia (not lisbon, porto, cadiz, seville - already exist) ---
new_provinces += [
    prov("madrid","Madrid",200,200,"europe","iberia",12000,1800,["wool","grain"],"Spanish","Catholic","city",40.4,-3.7),
    prov("barcelona","Barcelona",210,195,"europe","iberia",10000,1600,["cloth","wine"],"Spanish","Catholic","city",41.4,2.2),
    prov("valencia","Valencia",205,198,"europe","iberia",7000,1200,["silk","citrus"],"Spanish","Catholic","town",39.5,-0.4),
    prov("toledo","Toledo",198,202,"europe","iberia",5000,900,["wool","swords"],"Spanish","Catholic","town",39.9,-4.0),
    prov("zaragoza","Zaragoza",207,196,"europe","iberia",6000,1000,["grain","wool"],"Spanish","Catholic","town",41.7,-0.9),
    prov("granada","Granada",200,205,"europe","iberia",6500,1100,["silk","leather"],"Spanish","Catholic","town",37.2,-3.6),
    prov("murcia","Murcia",204,204,"europe","iberia",4000,700,["grain","citrus"],"Spanish","Catholic","town",38.0,-1.1),
    prov("navarre","Navarre",208,193,"europe","iberia",3000,600,["wool","iron"],"Spanish","Catholic","town",42.7,-1.6),
    prov("aragon","Aragon",209,197,"europe","iberia",4000,750,["grain","wool"],"Spanish","Catholic","town",41.5,-0.5),
    prov("coimbra","Coimbra",194,200,"europe","iberia",3500,700,["wine","cork"],"Portuguese","Catholic","town",40.2,-8.4),
    prov("evora","Evora",194,203,"europe","iberia",2500,500,["grain","cork"],"Portuguese","Catholic","village",38.6,-7.9),
    prov("faro","Faro",193,206,"europe","iberia",2000,450,["fish","cork"],"Portuguese","Catholic","village",37.0,-7.9),
]

# --- France (not bordeaux, nantes, marseille, brest, rouen - already exist) ---
new_provinces += [
    prov("paris","Paris",215,185,"europe","france",18000,2000,["cloth","wine"],"French","Catholic","city",48.9,2.3),
    prov("lyon","Lyon",218,190,"europe","france",9000,1400,["silk","cloth"],"French","Catholic","city",45.8,4.8),
    prov("toulouse","Toulouse",215,193,"europe","france",6000,1000,["grain","cloth"],"French","Catholic","town",43.6,1.4),
    prov("orleans","Orleans",214,186,"europe","france",5000,900,["wine","grain"],"French","Catholic","town",47.9,1.9),
    prov("dijon","Dijon",219,187,"europe","france",4500,850,["wine","grain"],"French","Catholic","town",47.3,5.0),
    prov("strasbourg","Strasbourg",221,185,"europe","france",5500,950,["cloth","grain"],"French","Catholic","town",48.6,7.8),
    prov("rennes","Rennes",212,184,"europe","france",4000,750,["fish","grain"],"French","Catholic","town",48.1,-1.7),
    prov("la_rochelle","La Rochelle",212,188,"europe","france",4500,800,["fish","salt"],"French","Catholic","town",46.2,-1.2),
    prov("montpellier","Montpellier",218,194,"europe","france",5000,850,["wine","cloth"],"French","Catholic","town",43.6,3.9),
    prov("avignon","Avignon",218,192,"europe","france",5500,900,["wine","wool"],"French","Catholic","town",43.9,4.8),
    prov("calais","Calais",215,182,"europe","france",3500,700,["fish","cloth"],"French","Catholic","town",51.0,1.9),
]

# --- British Isles (not london, bristol, dublin - already exist) ---
new_provinces += [
    prov("york","York",212,177,"europe","british_isles",7000,1100,["wool","leather"],"English","Protestant","city",54.0,-1.1),
    prov("exeter","Exeter",210,181,"europe","british_isles",4000,750,["cloth","wool"],"English","Protestant","town",50.7,-3.5),
    prov("plymouth","Plymouth",210,182,"europe","british_isles",4500,800,["fish","cloth"],"English","Protestant","town",50.4,-4.1),
    prov("norwich","Norwich",214,179,"europe","british_isles",5000,850,["wool","cloth"],"English","Protestant","town",52.6,1.3),
    prov("edinburgh","Edinburgh",212,175,"europe","british_isles",8000,1200,["wool","coal"],"English","Protestant","city",55.9,-3.2),
    prov("glasgow","Glasgow",211,174,"europe","british_isles",5000,900,["coal","cloth"],"English","Protestant","town",55.9,-4.3),
    prov("cork","Cork",209,178,"europe","british_isles",4000,700,["cattle","wool"],"English","Catholic","town",51.9,-8.5),
    prov("galway","Galway",208,177,"europe","british_isles",2500,500,["cattle","fish"],"English","Catholic","village",53.3,-9.1),
    prov("belfast","Belfast",210,176,"europe","british_isles",3000,600,["linen","cattle"],"English","Protestant","town",54.6,-5.9),
    prov("cardiff","Cardiff",211,179,"europe","british_isles",3500,650,["coal","wool"],"English","Protestant","town",51.5,-3.2),
    prov("liverpool","Liverpool",211,178,"europe","british_isles",6000,1000,["cloth","slaves"],"English","Protestant","town",53.4,-3.0),
]

# --- Low Countries (not amsterdam, antwerp - already exist) ---
new_provinces += [
    prov("rotterdam","Rotterdam",218,181,"europe","low_countries",8000,1500,["cloth","spices"],"Dutch","Protestant","city",51.9,4.5),
    prov("leiden","Leiden",217,181,"europe","low_countries",6000,1200,["cloth","grain"],"Dutch","Protestant","town",52.2,4.5),
    prov("utrecht","Utrecht",218,181,"europe","low_countries",5500,1100,["cloth","cattle"],"Dutch","Protestant","town",52.1,5.1),
    prov("bruges","Bruges",217,182,"europe","low_countries",6000,1100,["cloth","lace"],"Dutch","Catholic","town",51.2,3.2),
    prov("ghent","Ghent",218,182,"europe","low_countries",7000,1200,["cloth","grain"],"Dutch","Catholic","town",51.1,3.7),
    prov("brussels","Brussels",218,182,"europe","low_countries",8000,1400,["cloth","lace"],"Dutch","Catholic","city",50.9,4.4),
    prov("liege","Liege",220,183,"europe","low_countries",4500,850,["iron","coal"],"German","Catholic","town",50.6,5.6),
]

# --- Scandinavia ---
new_provinces += [
    prov("stockholm","Stockholm",228,170,"europe","scandinavia",9000,1300,["iron","timber"],"Swedish","Protestant","city",59.3,18.1),
    prov("gothenburg","Gothenburg",224,171,"europe","scandinavia",5000,950,["fish","timber"],"Swedish","Protestant","town",57.7,12.0),
    prov("malmo","Malmo",226,172,"europe","scandinavia",4000,800,["fish","grain"],"Danish","Protestant","town",55.6,13.0),
    prov("copenhagen","Copenhagen",226,171,"europe","scandinavia",9000,1400,["fish","cloth"],"Danish","Protestant","city",55.7,12.6),
    prov("oslo","Oslo",225,169,"europe","scandinavia",5000,900,["timber","fish"],"Danish","Protestant","town",59.9,10.7),
    prov("bergen","Bergen",223,169,"europe","scandinavia",4500,850,["fish","timber"],"Danish","Protestant","town",60.4,5.3),
    prov("trondheim","Trondheim",224,167,"europe","scandinavia",3000,600,["fish","timber"],"Danish","Protestant","town",63.4,10.4),
    prov("abo","Abo",229,168,"europe","scandinavia",3500,700,["timber","iron"],"Swedish","Protestant","town",60.5,22.3),
    prov("viborg_finland","Viborg Finland",230,167,"europe","scandinavia",2500,500,["timber","fish"],"Swedish","Protestant","village",60.7,28.7),
    prov("reykjavik","Reykjavik",205,162,"europe","scandinavia",800,200,["fish","wool"],"Danish","Protestant","village",64.1,-21.9,"island"),
]

# --- HRE/Germany (not hamburg, lubeck - already exist) ---
new_provinces += [
    prov("frankfurt","Frankfurt",221,183,"europe","hre",9000,1500,["cloth","banking"],"German","Protestant","city",50.1,8.7),
    prov("nuremberg","Nuremberg",222,184,"europe","hre",7000,1300,["metalwork","cloth"],"German","Protestant","city",49.5,11.1),
    prov("munich","Munich",223,186,"europe","hre",6000,1200,["grain","cattle"],"German","Catholic","city",48.1,11.6),
    prov("vienna","Vienna",226,185,"europe","hre",15000,1900,["cloth","grain"],"German","Catholic","city",48.2,16.4),
    prov("prague","Prague",224,183,"europe","hre",10000,1600,["silver","cloth"],"German","Catholic","city",50.1,14.4),
    prov("cologne","Cologne",220,182,"europe","hre",8000,1400,["cloth","wine"],"German","Catholic","city",50.9,6.9),
    prov("augsburg","Augsburg",222,185,"europe","hre",7000,1300,["cloth","banking"],"German","Catholic","city",48.4,10.9),
    prov("dresden","Dresden",224,182,"europe","hre",6000,1200,["silver","porcelain"],"German","Protestant","city",51.1,13.7),
    prov("magdeburg","Magdeburg",223,181,"europe","hre",5000,950,["grain","cloth"],"German","Protestant","town",52.1,11.6),
    prov("kiel","Kiel",222,179,"europe","hre",3500,700,["fish","timber"],"German","Protestant","town",54.3,10.1),
    prov("stettin","Stettin",225,180,"europe","hre",4500,800,["grain","timber"],"German","Protestant","town",53.4,14.6),
    prov("innsbruck","Innsbruck",222,186,"europe","hre",3500,700,["silver","cattle"],"German","Catholic","town",47.3,11.4),
]

# --- Italy (not genoa, venice, livorno - already exist) ---
new_provinces += [
    prov("milan","Milan",220,188,"europe","italy",12000,1800,["cloth","silk"],"Italian","Catholic","city",45.5,9.2),
    prov("florence","Florence",221,191,"europe","italy",10000,1700,["cloth","banking"],"Italian","Catholic","city",43.8,11.2),
    prov("rome","Rome",222,194,"europe","italy",15000,2000,["grain","marble"],"Italian","Catholic","city",41.9,12.5),
    prov("naples","Naples",224,195,"europe","italy",14000,1800,["grain","wine"],"Spanish","Catholic","city",40.9,14.3),
    prov("palermo","Palermo",223,198,"europe","italy",9000,1400,["grain","wine"],"Spanish","Catholic","city",38.1,13.4,"island"),
    prov("bologna","Bologna",221,190,"europe","italy",7000,1300,["silk","grain"],"Italian","Catholic","city",44.5,11.3),
    prov("turin","Turin",219,189,"europe","italy",8000,1400,["cloth","iron"],"Italian","Catholic","city",45.1,7.7),
    prov("bari","Bari",225,195,"europe","italy",5000,900,["grain","olive_oil"],"Spanish","Catholic","town",41.1,16.9),
    prov("cagliari","Cagliari",219,196,"europe","italy",4000,750,["grain","silver"],"Spanish","Catholic","town",39.2,9.1,"island"),
    prov("messina","Messina",224,198,"europe","italy",5000,950,["grain","silk"],"Spanish","Catholic","town",38.2,15.6,"island"),
]

# --- Baltic/Poland/Russia ---
new_provinces += [
    prov("riga","Riga",230,175,"europe","baltic",6000,1100,["timber","grain"],"German","Protestant","city",56.9,24.1),
    prov("tallinn","Tallinn",230,173,"europe","baltic",4500,850,["timber","grain"],"German","Protestant","town",59.4,24.7),
    prov("vilnius","Vilnius",231,176,"europe","baltic",5000,900,["grain","timber"],"Polish","Catholic","town",54.7,25.3),
    prov("warsaw","Warsaw",228,178,"europe","poland",8000,1300,["grain","cattle"],"Polish","Catholic","city",52.2,21.0),
    prov("krakow","Krakow",228,180,"europe","poland",7000,1200,["silver","cloth"],"Polish","Catholic","city",50.1,20.0),
    prov("poznan","Poznan",225,179,"europe","poland",5000,950,["grain","cattle"],"Polish","Catholic","town",52.4,17.0),
    prov("lwow","Lwow",231,180,"europe","poland",6000,1000,["grain","cattle"],"Polish","Catholic","town",49.8,24.0),
    prov("moscow","Moscow",240,173,"europe","russia",20000,1800,["fur","grain"],"Russian","Orthodox","city",55.8,37.6),
    prov("novgorod","Novgorod",237,170,"europe","russia",7000,1200,["fur","timber"],"Russian","Orthodox","city",58.5,31.3),
    prov("smolensk","Smolensk",236,174,"europe","russia",4000,750,["grain","timber"],"Russian","Orthodox","town",54.8,32.1),
    prov("archangel","Archangel",242,163,"europe","russia",3000,600,["fur","timber"],"Russian","Orthodox","town",64.5,40.5),
    prov("pskov","Pskov",234,171,"europe","russia",3500,700,["grain","flax"],"Russian","Orthodox","town",57.8,28.3),
]

# --- Mediterranean islands ---
new_provinces += [
    prov("malta","Malta",223,199,"europe","mediterranean",3000,600,["grain","fish"],"Italian","Catholic","town",35.9,14.5,"island"),
    prov("corfu","Corfu",226,197,"europe","mediterranean",2500,500,["olive_oil","wine"],"Italian","Catholic","village",39.6,19.9,"island"),
    prov("crete","Crete",228,201,"europe","mediterranean",4000,750,["wine","olive_oil"],"Italian","Catholic","town",35.3,25.1,"island"),
    prov("rhodes","Rhodes",231,201,"europe","mediterranean",3500,700,["wine","marble"],"Ottoman","Muslim","town",36.4,28.2,"island"),
]

# ===========================================================
# AFRICA ~50
# ===========================================================

# --- North Africa ---
new_provinces += [
    prov("tripoli","Tripoli",224,205,"africa","north_africa",5000,900,["dates","olive_oil"],"Ottoman","Muslim","town",32.9,13.2),
    prov("tunis","Tunis",222,203,"africa","north_africa",8000,1200,["grain","olive_oil"],"Ottoman","Muslim","city",36.8,10.2),
    prov("algiers","Algiers",220,203,"africa","north_africa",9000,1300,["grain","olive_oil"],"Ottoman","Muslim","city",36.7,3.1),
    prov("morocco_fez","Fez",216,204,"africa","north_africa",10000,1400,["leather","grain"],"Moroccan","Muslim","city",34.0,-5.0),
    prov("morocco_marrakesh","Marrakesh",215,207,"africa","north_africa",8000,1200,["leather","dates"],"Moroccan","Muslim","city",31.6,-8.0),
    prov("morocco_tangier","Tangier",215,204,"africa","north_africa",4000,800,["fish","grain"],"Moroccan","Muslim","town",35.8,-5.8),
    prov("benghazi","Benghazi",228,205,"africa","north_africa",4000,750,["dates","grain"],"Ottoman","Muslim","town",32.1,20.1),
    prov("egypt_cairo","Cairo",234,208,"africa","north_africa",20000,2000,["grain","cotton"],"Ottoman","Muslim","city",30.1,31.2),
    prov("egypt_alexandria","Alexandria",232,207,"africa","north_africa",10000,1500,["grain","cotton"],"Ottoman","Muslim","city",31.2,29.9),
]

# --- West Africa (more) ---
new_provinces += [
    prov("mali_timbuktu","Timbuktu",216,220,"africa","west_africa",5000,1000,["gold","salt"],"Animist","Muslim","town",16.8,-3.0),
    prov("ghana_kumasi","Kumasi",213,228,"africa","west_africa",6000,1100,["gold","kola"],"Animist","Animist","town",6.7,-1.6),
    prov("dakar","Dakar",208,222,"africa","west_africa",3000,600,["fish","groundnuts"],"Animist","Animist","town",14.7,-17.4),
    prov("guinea_bissau","Guinea-Bissau",209,226,"africa","west_africa",2500,500,["palm_oil","ivory"],"Animist","Animist","village",11.9,-15.6),
    prov("ivory_coast","Ivory Coast",213,229,"africa","west_africa",4000,750,["ivory","gold"],"Animist","Animist","village",5.3,-4.0),
    prov("niger_delta","Niger Delta",220,230,"africa","west_africa",5000,900,["palm_oil","slaves"],"Animist","Animist","village",4.9,6.2),
    prov("fula_highlands","Fula Highlands",211,224,"africa","west_africa",3500,650,["cattle","gold"],"Animist","Muslim","village",11.0,-12.0),
    prov("sahara_oasis","Sahara Oasis",220,213,"africa","north_africa",1500,300,["salt","dates"],"Animist","Muslim","wilderness",20.0,5.0),
]

# --- East Africa (more) ---
new_provinces += [
    prov("ethiopia_gondar","Gondar",245,225,"africa","east_africa",8000,1200,["ivory","coffee"],"Ethiopian","Orthodox","city",12.6,37.5),
    prov("somalia_mogadishu","Mogadishu",252,228,"africa","east_africa",4000,750,["ivory","incense"],"Somali","Muslim","town",2.0,45.3),
    prov("djibouti_coast","Djibouti Coast",250,224,"africa","east_africa",2500,500,["fish","salt"],"Somali","Muslim","village",11.6,43.1),
    prov("malindi","Malindi",252,235,"africa","east_africa",3500,700,["ivory","spices"],"Swahili","Muslim","town",-3.2,40.1),
    prov("kilwa","Kilwa",250,242,"africa","east_africa",4000,800,["gold","ivory"],"Swahili","Muslim","town",-8.9,39.5),
    prov("sofala","Sofala",249,248,"africa","east_africa",3000,650,["gold","ivory"],"Swahili","Muslim","village",-20.2,34.9),
]

# --- Madagascar ---
new_provinces += [
    prov("madagascar_north","Madagascar North",256,241,"africa","madagascar",2500,500,["rice","spices"],"Malagasy","Animist","village",-12.3,49.3,"island"),
    prov("madagascar_south","Madagascar South",255,250,"africa","madagascar",2000,400,["cattle","rice"],"Malagasy","Animist","village",-23.4,43.7,"island"),
    prov("madagascar_east","Madagascar East",257,246,"africa","madagascar",1800,350,["rice","spices"],"Malagasy","Animist","wilderness",-18.9,47.5,"island"),
]

# --- Southern Africa ---
new_provinces += [
    prov("zimbabwe_interior","Zimbabwe Interior",247,250,"africa","southern_africa",3000,700,["gold","ivory"],"Animist","Animist","village",-20.0,30.0),
    prov("kalahari","Kalahari",244,253,"africa","southern_africa",1000,200,["ivory","cattle"],"Animist","Animist","wilderness",-23.0,22.0),
    prov("natal","Natal",248,257,"africa","southern_africa",2500,500,["cattle","ivory"],"Animist","Animist","village",-29.8,30.9),
    prov("cape_interior","Cape Interior",243,258,"africa","southern_africa",1500,300,["cattle","grain"],"Animist","Animist","wilderness",-33.0,22.0),
    prov("zambezi","Zambezi",246,245,"africa","southern_africa",3500,650,["ivory","gold"],"Animist","Animist","village",-15.0,30.0),
    prov("reunion","Reunion",260,248,"africa","east_africa",1500,300,["sugar","spices"],"French","Catholic","village",-21.1,55.5,"island"),
    prov("mauritius","Mauritius",262,248,"africa","east_africa",1200,250,["sugar","ebony"],"Dutch","Protestant","village",-20.3,57.6,"island"),
]

# ===========================================================
# MIDDLE EAST / OTTOMAN ~30
# ===========================================================

new_provinces += [
    prov("istanbul","Istanbul",232,194,"asia","anatolia",50000,2000,["grain","silk"],"Ottoman","Muslim","city",41.0,28.9),
    prov("bursa","Bursa",233,195,"asia","anatolia",8000,1200,["silk","cloth"],"Ottoman","Muslim","city",40.2,29.1),
    prov("izmir","Izmir",232,197,"asia","anatolia",7000,1100,["figs","cloth"],"Ottoman","Muslim","city",38.4,27.1),
    prov("ankara","Ankara",235,196,"asia","anatolia",5000,900,["wool","cattle"],"Ottoman","Muslim","town",39.9,32.9),
    prov("konya","Konya",235,198,"asia","anatolia",4500,800,["grain","wool"],"Ottoman","Muslim","town",37.9,32.5),
    prov("trabzon","Trabzon",239,194,"asia","anatolia",4000,750,["fish","hazelnuts"],"Ottoman","Muslim","town",41.0,39.7),
    prov("erzurum","Erzurum",241,195,"asia","anatolia",3500,700,["cattle","wool"],"Ottoman","Muslim","town",39.9,41.3),
    prov("damascus","Damascus",238,202,"asia","levant",9000,1400,["cloth","spices"],"Ottoman","Muslim","city",33.5,36.3),
    prov("aleppo","Aleppo",238,200,"asia","levant",10000,1500,["cloth","spices"],"Ottoman","Muslim","city",36.2,37.2),
    prov("beirut","Beirut",237,202,"asia","levant",4000,750,["silk","olive_oil"],"Ottoman","Muslim","town",33.9,35.5),
    prov("jerusalem","Jerusalem",237,204,"asia","levant",6000,1000,["olive_oil","grain"],"Ottoman","Muslim","town",31.8,35.2),
    prov("baghdad","Baghdad",241,203,"asia","mesopotamia",10000,1400,["dates","grain"],"Ottoman","Muslim","city",33.3,44.4),
    prov("basra","Basra",242,206,"asia","mesopotamia",5000,900,["dates","pearls"],"Ottoman","Muslim","town",30.5,47.8),
    prov("mosul","Mosul",240,200,"asia","mesopotamia",6000,1000,["grain","oil"],"Ottoman","Muslim","town",36.3,43.1),
    prov("mecca","Mecca",241,210,"asia","arabia",8000,1200,["incense","pilgrimage"],"Arab","Muslim","city",21.4,39.8),
    prov("medina","Medina",240,208,"asia","arabia",5000,900,["dates","pilgrimage"],"Arab","Muslim","town",24.5,39.6),
    prov("aden","Aden",244,213,"asia","arabia",4000,800,["fish","incense"],"Arab","Muslim","town",12.8,45.0),
    prov("muscat","Muscat",247,210,"asia","arabia",5000,950,["fish","pearls"],"Arab","Muslim","town",23.6,58.6),
    prov("hormuz","Hormuz",247,208,"asia","persia",3000,700,["pearls","spices"],"Persian","Muslim","town",27.1,56.5,"island"),
    prov("isfahan","Isfahan",247,202,"asia","persia",12000,1700,["silk","carpets"],"Persian","Muslim","city",32.7,51.7),
    prov("shiraz","Shiraz",246,205,"asia","persia",7000,1200,["wine","carpets"],"Persian","Muslim","city",29.6,52.5),
    prov("tabriz","Tabriz",243,198,"asia","persia",9000,1400,["silk","carpets"],"Persian","Muslim","city",38.1,46.3),
    prov("tehran","Tehran",246,199,"asia","persia",5000,900,["grain","silk"],"Persian","Muslim","town",35.7,51.4),
    prov("kandahar","Kandahar",253,203,"asia","persia",5000,900,["grain","horses"],"Persian","Muslim","town",31.6,65.7),
    prov("herat","Herat",254,200,"asia","persia",6000,1000,["silk","grain"],"Persian","Muslim","city",34.3,62.2),
    prov("samarkand","Samarkand",257,197,"asia","central_asia",7000,1100,["silk","grain"],"Persian","Muslim","city",39.7,66.9),
    prov("kabul","Kabul",256,202,"asia","central_asia",5000,900,["grain","horses"],"Mughal","Muslim","town",34.5,69.2),
    prov("bukhara","Bukhara",256,196,"asia","central_asia",6000,1000,["silk","grain"],"Persian","Muslim","city",39.8,64.4),
    prov("khiva","Khiva",254,194,"asia","central_asia",3000,600,["grain","horses"],"Persian","Muslim","town",41.4,60.4),
    prov("yemen_sanaa","Sanaa",242,211,"asia","arabia",4000,800,["coffee","qat"],"Arab","Muslim","town",15.4,44.2),
]

# ===========================================================
# INDIA ~40
# ===========================================================

new_provinces += [
    # West coast
    prov("goa","Goa",260,218,"asia","india_west",5000,1000,["spices","cloth"],"Portuguese","Catholic","town",15.5,73.8),
    prov("diu","Diu",259,213,"asia","india_west",3000,700,["cotton","cloth"],"Portuguese","Catholic","town",20.7,70.9,"island"),
    prov("surat","Surat",260,213,"asia","india_west",10000,1500,["cotton","cloth"],"Mughal","Muslim","city",21.2,72.8),
    prov("bombay","Bombay",259,216,"asia","india_west",6000,1100,["cotton","cloth"],"Portuguese","Catholic","town",19.1,72.9),
    prov("cochin","Cochin",260,222,"asia","india_west",5000,1000,["pepper","spices"],"Portuguese","Catholic","town",9.9,76.3),
    prov("calicut","Calicut",260,221,"asia","india_west",6000,1100,["pepper","spices"],"Indian","Muslim","town",11.3,75.8),
    prov("quilon","Quilon",260,223,"asia","india_west",4000,800,["pepper","coconut"],"Indian","Hindu","town",8.9,76.6),
    prov("mangalore","Mangalore",259,219,"asia","india_west",4500,850,["spices","rice"],"Indian","Hindu","town",12.9,74.9),
    # East coast
    prov("madras","Madras",263,221,"asia","india_east",7000,1200,["cloth","rice"],"Indian","Hindu","town",13.1,80.3),
    prov("masulipatnam","Masulipatnam",263,219,"asia","india_east",5000,950,["cloth","indigo"],"Indian","Muslim","town",16.2,81.1),
    prov("pondicherry","Pondicherry",262,222,"asia","india_east",4000,800,["cloth","rice"],"Indian","Hindu","town",11.9,79.8),
    prov("nagapattinam","Nagapattinam",262,223,"asia","india_east",3500,700,["rice","cloth"],"Portuguese","Catholic","town",10.8,79.8),
    prov("vizag","Vizag",263,218,"asia","india_east",4500,850,["cloth","rice"],"Indian","Hindu","town",17.7,83.3),
    prov("orissa","Orissa",264,215,"asia","india_east",6000,1000,["rice","cloth"],"Indian","Hindu","town",20.5,85.8),
    prov("bengal","Bengal",265,213,"asia","india_east",15000,1700,["rice","indigo"],"Mughal","Muslim","city",23.7,90.4),
    prov("chittagong","Chittagong",266,213,"asia","india_east",5000,950,["rice","cloth"],"Mughal","Muslim","town",22.3,91.8),
    # Interior Mughal
    prov("delhi","Delhi",261,210,"asia","india_interior",20000,2000,["grain","cloth"],"Mughal","Muslim","city",28.7,77.1),
    prov("agra","Agra",261,211,"asia","india_interior",15000,1800,["grain","marble"],"Mughal","Muslim","city",27.2,78.0),
    prov("lahore","Lahore",260,208,"asia","india_interior",12000,1600,["grain","cloth"],"Mughal","Muslim","city",31.5,74.3),
    prov("jaipur","Jaipur",260,211,"asia","india_interior",8000,1300,["cloth","spices"],"Indian","Hindu","city",26.9,75.8),
    prov("patna","Patna",264,212,"asia","india_interior",9000,1400,["opium","grain"],"Mughal","Muslim","city",25.6,85.1),
    prov("hyderabad","Hyderabad",262,218,"asia","india_interior",10000,1500,["cotton","pearls"],"Indian","Muslim","city",17.4,78.5),
    prov("vijayanagar","Vijayanagar",261,220,"asia","india_interior",8000,1300,["cotton","spices"],"Indian","Hindu","city",15.3,76.5),
    prov("mysore","Mysore",261,221,"asia","india_interior",6000,1100,["cotton","sandalwood"],"Indian","Hindu","town",12.3,76.7),
    prov("punjab","Punjab",258,209,"asia","india_interior",8000,1300,["grain","horses"],"Mughal","Muslim","city",31.0,73.0),
    prov("sind","Sind",257,211,"asia","india_interior",5000,900,["grain","indigo"],"Mughal","Muslim","town",26.0,68.0),
    prov("rajputana","Rajputana",259,212,"asia","india_interior",7000,1200,["grain","horses"],"Indian","Hindu","city",25.0,73.0),
    prov("kashmir","Kashmir",259,207,"asia","india_interior",5000,900,["shawls","saffron"],"Mughal","Muslim","town",34.1,74.8),
    # Ceylon / Maldives
    prov("ceylon","Ceylon",262,224,"asia","india_east",6000,1100,["spices","elephants"],"Portuguese","Catholic","town",7.9,80.8,"island"),
    prov("maldives","Maldives",259,226,"asia","india_west",1500,300,["fish","coconut"],"Indian","Muslim","village",3.2,73.2,"island"),
    prov("gujarat","Gujarat",259,213,"asia","india_interior",9000,1400,["cotton","cloth"],"Mughal","Muslim","city",22.3,70.8),
    prov("deccan","Deccan",261,217,"asia","india_interior",7000,1200,["cotton","grain"],"Indian","Muslim","city",18.0,77.0),
    prov("bihar","Bihar",263,212,"asia","india_interior",7000,1200,["grain","opium"],"Mughal","Muslim","city",25.1,85.5),
    prov("gondwana","Gondwana",263,215,"asia","india_interior",4000,700,["iron","grain"],"Indian","Hindu","village",21.0,80.0),
    prov("malwa","Malwa",261,213,"asia","india_interior",5000,900,["opium","grain"],"Mughal","Muslim","town",22.7,75.9),
    prov("assam","Assam",267,212,"asia","india_east",4000,750,["rice","silk"],"Indian","Hindu","village",26.2,91.7),
    prov("manipur","Manipur",268,212,"asia","india_east",2500,500,["rice","timber"],"Indian","Hindu","village",24.8,93.9),
    prov("malabar","Malabar",260,220,"asia","india_west",5000,950,["pepper","coconut"],"Indian","Hindu","town",11.0,76.0),
    prov("thanjavur","Thanjavur",262,223,"asia","india_east",5000,950,["rice","cloth"],"Indian","Hindu","town",10.8,79.1),
    prov("konkan","Konkan",259,217,"asia","india_west",4000,800,["rice","spices"],"Indian","Hindu","town",16.7,73.7),
]

# ===========================================================
# SOUTHEAST ASIA ~40
# ===========================================================

new_provinces += [
    # Malacca / Malay
    prov("malacca","Malacca",272,228,"asia","malaya",8000,1500,["spices","tin"],"Malay","Muslim","city",2.2,102.2),
    prov("johor","Johor",273,229,"asia","malaya",4000,800,["tin","pepper"],"Malay","Muslim","town",1.5,103.8),
    prov("kedah","Kedah",271,226,"asia","malaya",3000,650,["rice","tin"],"Malay","Muslim","town",6.1,100.4),
    prov("pahang","Pahang",272,228,"asia","malaya",2500,550,["tin","gold"],"Malay","Muslim","village",3.8,103.3),
    prov("brunei","Brunei",275,228,"asia","malaya",4000,800,["camphor","pepper"],"Malay","Muslim","town",4.9,114.9),
    # Sumatra
    prov("aceh","Aceh",269,226,"asia","sumatra",7000,1300,["pepper","gold"],"Malay","Muslim","city",5.5,95.3,"island"),
    prov("palembang","Palembang",272,230,"asia","sumatra",5000,1000,["pepper","tin"],"Malay","Muslim","town",-3.0,104.7,"island"),
    prov("jambi","Jambi",272,229,"asia","sumatra",3500,700,["pepper","gold"],"Malay","Muslim","village",-1.6,103.6,"island"),
    prov("bengkulu","Bengkulu",271,230,"asia","sumatra",2500,500,["pepper","rice"],"Malay","Muslim","village",-3.8,102.3,"island"),
    # Java
    prov("batavia","Batavia",273,232,"asia","java",8000,1400,["spices","coffee"],"Dutch","Protestant","city",-6.2,106.8,"island"),
    prov("banten","Banten",272,232,"asia","java",5000,950,["pepper","rice"],"Malay","Muslim","town",-6.1,106.2,"island"),
    prov("cirebon","Cirebon",273,232,"asia","java",4000,800,["rice","batik"],"Malay","Muslim","town",-6.7,108.6,"island"),
    prov("mataram","Mataram",274,232,"asia","java",6000,1100,["rice","indigo"],"Malay","Muslim","town",-7.8,110.4,"island"),
    prov("surabaya","Surabaya",274,232,"asia","java",7000,1200,["spices","rice"],"Malay","Muslim","city",-7.3,112.7,"island"),
    # Philippines
    prov("manila","Manila",278,224,"asia","philippines",8000,1300,["sugar","rice"],"Spanish","Catholic","city",14.6,121.0,"island"),
    prov("cebu","Cebu",278,226,"asia","philippines",4000,800,["sugar","hemp"],"Spanish","Catholic","town",10.3,123.9,"island"),
    prov("mindanao","Mindanao",278,228,"asia","philippines",4000,750,["rice","hemp"],"Malay","Muslim","town",7.1,125.1,"island"),
    prov("leyte","Leyte",278,226,"asia","philippines",3000,600,["rice","hemp"],"Spanish","Catholic","village",11.0,124.8,"island"),
    prov("luzon_north","Luzon North",278,223,"asia","philippines",3500,650,["rice","tobacco"],"Spanish","Catholic","village",17.6,121.7,"island"),
    # Indochina
    prov("hanoi","Hanoi",274,220,"asia","indochina",9000,1300,["rice","silk"],"Vietnamese","Buddhist","city",21.0,105.8),
    prov("hue","Hue",274,222,"asia","indochina",5000,900,["rice","silk"],"Vietnamese","Buddhist","town",16.5,107.6),
    prov("saigon","Saigon",274,225,"asia","indochina",5000,950,["rice","fish"],"Vietnamese","Buddhist","town",10.8,106.7),
    prov("phnom_penh","Phnom Penh",273,225,"asia","indochina",6000,1000,["rice","fish"],"Khmer","Buddhist","town",11.6,104.9),
    prov("angkor","Angkor",272,224,"asia","indochina",3000,600,["rice","fish"],"Khmer","Buddhist","village",13.4,103.9),
    # Burma / Siam
    prov("pagan","Pagan",270,222,"asia","burma",4000,750,["rice","teak"],"Burman","Buddhist","town",21.2,94.9),
    prov("rangoon","Rangoon",271,224,"asia","burma",5000,950,["rice","teak"],"Burman","Buddhist","town",16.9,96.2),
    prov("mandalay","Mandalay",270,220,"asia","burma",6000,1000,["jade","teak"],"Burman","Buddhist","town",22.0,96.1),
    prov("ayutthaya","Ayutthaya",272,224,"asia","siam",9000,1400,["rice","elephants"],"Siamese","Buddhist","city",14.4,100.6),
    prov("chiang_mai","Chiang Mai",271,221,"asia","siam",5000,900,["rice","teak"],"Siamese","Buddhist","town",18.8,99.0),
    # Spice Islands
    prov("ternate","Ternate",278,228,"asia","spice_islands",3000,700,["cloves","nutmeg"],"Malay","Muslim","town",0.8,127.4,"island"),
    prov("banda","Banda",278,232,"asia","spice_islands",2000,500,["nutmeg","mace"],"Dutch","Protestant","village",-4.5,129.9,"island"),
    prov("ambon","Ambon",278,231,"asia","spice_islands",3000,650,["cloves","fish"],"Malay","Muslim","town",-3.7,128.2,"island"),
    prov("timor","Timor",277,234,"asia","spice_islands",2500,500,["sandalwood","beeswax"],"Portuguese","Catholic","village",-8.8,125.6,"island"),
    prov("borneo_north","Borneo North",275,227,"asia","borneo",2500,500,["camphor","pepper"],"Malay","Muslim","village",5.4,117.0,"island"),
    prov("borneo_south","Borneo South",275,230,"asia","borneo",2000,450,["gold","diamonds"],"Malay","Animist","wilderness",-1.0,113.0,"island"),
    prov("celebes","Celebes",276,229,"asia","celebes",3500,700,["rice","fish"],"Malay","Animist","village",-2.0,120.0,"island"),
    prov("new_guinea_west","New Guinea West",280,232,"asia","new_guinea",1500,300,["spices","birds"],"Animist","Animist","wilderness",-4.0,136.0,"island"),
]

# ===========================================================
# EAST ASIA ~40
# ===========================================================

new_provinces += [
    # China Coast
    prov("guangzhou","Guangzhou",279,216,"asia","china",15000,1800,["silk","porcelain"],"Chinese","Buddhist","city",23.1,113.3),
    prov("fuzhou","Fuzhou",280,214,"asia","china",8000,1300,["tea","silk"],"Chinese","Buddhist","city",26.1,119.3),
    prov("hangzhou","Hangzhou",281,212,"asia","china",12000,1700,["silk","tea"],"Chinese","Buddhist","city",30.3,120.2),
    prov("nanjing","Nanjing",281,211,"asia","china",18000,1900,["silk","porcelain"],"Chinese","Buddhist","city",32.1,118.8),
    prov("beijing","Beijing",281,208,"asia","china",25000,2000,["silk","porcelain"],"Chinese","Buddhist","city",39.9,116.4),
    prov("shanghai","Shanghai",281,211,"asia","china",10000,1600,["silk","cotton"],"Chinese","Buddhist","city",31.2,121.5),
    prov("xiamen","Xiamen",280,215,"asia","china",6000,1100,["tea","porcelain"],"Chinese","Buddhist","town",24.5,118.1),
    prov("macao","Macao",280,216,"asia","china",4000,900,["trade","silk"],"Portuguese","Catholic","town",22.2,113.5),
    # China Interior
    prov("sichuan","Sichuan",277,212,"asia","china",12000,1600,["silk","tea"],"Chinese","Buddhist","city",30.7,104.1),
    prov("yunnan","Yunnan",276,214,"asia","china",8000,1200,["silver","tea"],"Chinese","Buddhist","city",25.0,102.7),
    prov("shanxi","Shanxi",280,208,"asia","china",9000,1300,["coal","iron"],"Chinese","Buddhist","city",37.9,112.6),
    prov("shandong","Shandong",281,209,"asia","china",10000,1400,["grain","salt"],"Chinese","Buddhist","city",36.7,117.0),
    prov("guangxi","Guangxi",278,215,"asia","china",7000,1100,["rice","silver"],"Chinese","Buddhist","town",23.7,108.3),
    prov("hunan","Hunan",279,213,"asia","china",8000,1200,["rice","tea"],"Chinese","Buddhist","city",28.2,112.0),
    prov("hebei","Hebei",281,208,"asia","china",9000,1300,["grain","cotton"],"Chinese","Buddhist","city",38.0,114.5),
    prov("liaodong","Liaodong",283,206,"asia","china",5000,900,["grain","horses"],"Chinese","Buddhist","town",41.7,122.0),
    prov("manchuria","Manchuria",285,204,"asia","china",4000,750,["fur","grain"],"Manchu","Animist","village",43.0,126.0),
    prov("mongolia","Mongolia",278,203,"asia","china",3000,550,["horses","cattle"],"Mongol","Animist","village",47.0,104.0),
    # Japan
    prov("kyoto","Kyoto",284,211,"asia","japan",12000,1700,["silk","lacquer"],"Japanese","Shinto","city",35.0,135.8,"island"),
    prov("edo","Edo",285,211,"asia","japan",10000,1500,["fish","rice"],"Japanese","Shinto","city",35.7,139.7,"island"),
    prov("osaka","Osaka",284,211,"asia","japan",11000,1600,["rice","cloth"],"Japanese","Shinto","city",34.7,135.5,"island"),
    prov("nagasaki","Nagasaki",283,212,"asia","japan",5000,1000,["silver","trade"],"Japanese","Shinto","town",32.7,129.9,"island"),
    prov("hiroshima","Hiroshima",284,211,"asia","japan",5000,950,["fish","rice"],"Japanese","Shinto","town",34.4,132.5,"island"),
    prov("sendai","Sendai",285,209,"asia","japan",5000,900,["rice","fish"],"Japanese","Shinto","town",38.3,141.0,"island"),
    prov("kagoshima","Kagoshima",283,213,"asia","japan",4000,800,["sugar","porcelain"],"Japanese","Shinto","town",31.6,130.6,"island"),
    prov("kanazawa","Kanazawa",284,210,"asia","japan",5000,900,["rice","lacquer"],"Japanese","Shinto","town",36.6,136.6,"island"),
    prov("hokkaido","Hokkaido",286,207,"asia","japan",2000,400,["fish","fur"],"Japanese","Shinto","village",43.8,143.0,"island"),
    # Korea
    prov("hanseong","Hanseong",283,209,"asia","korea",9000,1300,["rice","ginseng"],"Korean","Buddhist","city",37.6,126.9),
    prov("busan","Busan",283,210,"asia","korea",5000,950,["fish","rice"],"Korean","Buddhist","town",35.1,129.0),
    prov("pyongyang","Pyongyang",283,208,"asia","korea",6000,1000,["grain","silver"],"Korean","Buddhist","city",39.0,125.7),
    # Taiwan/Ryukyu
    prov("taiwan","Taiwan",281,215,"asia","china",4000,800,["sugar","camphor"],"Chinese","Buddhist","village",23.7,120.9,"island"),
    prov("ryukyu","Ryukyu",283,214,"asia","japan",2500,500,["sugar","trade"],"Japanese","Shinto","village",26.2,127.7,"island"),
]

# ===========================================================
# PACIFIC / OCEANIA ~20
# ===========================================================

new_provinces += [
    # Australia
    prov("australia_west","Western Australia",278,244,"oceania","australia",800,150,["fish","pearls"],"Animist","Animist","wilderness",-25.0,115.0),
    prov("australia_north","Northern Australia",281,240,"oceania","australia",800,150,["fish","timber"],"Animist","Animist","wilderness",-14.0,132.0),
    prov("australia_east","Eastern Australia",284,246,"oceania","australia",1000,200,["fish","timber"],"Animist","Animist","wilderness",-28.0,153.0),
    prov("australia_south","Southern Australia",282,248,"oceania","australia",800,150,["fish","kangaroo"],"Animist","Animist","wilderness",-35.0,139.0),
    # New Zealand
    prov("new_zealand_north","New Zealand North",287,252,"oceania","new_zealand",1200,250,["fish","timber"],"Animist","Animist","wilderness",-37.0,175.0,"island"),
    prov("new_zealand_south","New Zealand South",286,255,"oceania","new_zealand",1000,200,["fish","greenstone"],"Animist","Animist","wilderness",-44.0,170.0,"island"),
    # Pacific Islands
    prov("hawaii","Hawaii",295,218,"oceania","pacific_islands",2000,400,["fish","taro"],"Animist","Animist","village",20.0,-156.0,"island"),
    prov("tahiti","Tahiti",302,238,"oceania","pacific_islands",1500,300,["pearls","fish"],"Animist","Animist","village",-17.6,-149.4,"island"),
    prov("samoa","Samoa",300,236,"oceania","pacific_islands",2000,400,["taro","fish"],"Animist","Animist","village",-13.8,-172.0,"island"),
    prov("tonga","Tonga",299,238,"oceania","pacific_islands",1800,350,["yams","fish"],"Animist","Animist","village",-21.2,-175.2,"island"),
    prov("fiji","Fiji",299,235,"oceania","pacific_islands",2500,500,["fish","sandalwood"],"Animist","Animist","village",-17.7,178.1,"island"),
    prov("papua_new_guinea","Papua New Guinea",282,234,"oceania","new_guinea",3000,600,["spices","birds"],"Animist","Animist","wilderness",-6.3,143.9,"island"),
    prov("solomon_islands","Solomon Islands",287,233,"oceania","pacific_islands",2000,400,["fish","timber"],"Animist","Animist","wilderness",-8.0,159.0,"island"),
    prov("vanuatu","Vanuatu",291,237,"oceania","pacific_islands",1800,350,["fish","yams"],"Animist","Animist","wilderness",-15.4,166.9,"island"),
    prov("new_caledonia","New Caledonia",291,240,"oceania","pacific_islands",2000,400,["fish","timber"],"Animist","Animist","wilderness",-21.3,165.6,"island"),
    prov("guam","Guam",282,224,"oceania","pacific_islands",2000,400,["fish","coconut"],"Spanish","Catholic","village",13.5,144.8,"island"),
    prov("micronesia","Micronesia",284,224,"oceania","pacific_islands",1500,300,["fish","coconut"],"Animist","Animist","wilderness",7.0,158.0,"island"),
    prov("marshall_islands","Marshall Islands",290,222,"oceania","pacific_islands",1200,250,["fish","coconut"],"Animist","Animist","wilderness",7.1,171.2,"island"),
    prov("wake_island","Wake Island",290,219,"oceania","pacific_islands",500,100,["fish","seabirds"],"Animist","Animist","wilderness",19.3,166.6,"island"),
    prov("borneo_east","Borneo East",276,229,"asia","borneo",2000,400,["timber","rattan"],"Malay","Animist","wilderness",1.0,118.0,"island"),
]

# ===========================================================
# MORE AMERICAS ~100
# ===========================================================

new_provinces += [
    # More Caribbean
    prov("saint_kitts","Saint Kitts",226,230,"americas","caribbean",2000,500,["sugar","tobacco"],"English","Protestant","village",17.3,-62.7,"island"),
    prov("antigua","Antigua",227,230,"americas","caribbean",2500,550,["sugar","tobacco"],"English","Protestant","village",17.1,-61.8,"island"),
    prov("dominica","Dominica",227,232,"americas","caribbean",1800,400,["sugar","coffee"],"French","Catholic","village",15.4,-61.4,"island"),
    prov("saint_lucia","Saint Lucia",227,233,"americas","caribbean",2000,450,["sugar","tobacco"],"French","Catholic","village",14.0,-61.0,"island"),
    prov("grenada","Grenada",226,234,"americas","caribbean",2000,450,["sugar","spices"],"French","Catholic","village",12.1,-61.7,"island"),
    prov("tobago","Tobago",226,235,"americas","caribbean",1500,350,["sugar","cocoa"],"Dutch","Protestant","village",11.2,-60.7,"island"),
    prov("saint_vincent","Saint Vincent",226,233,"americas","caribbean",1800,400,["sugar","arrowroot"],"English","Protestant","village",13.2,-61.2,"island"),
    prov("virgin_islands","Virgin Islands",225,229,"americas","caribbean",1500,350,["sugar","cotton"],"Danish","Protestant","village",18.3,-65.0,"island"),
    prov("haiti","Haiti",224,230,"americas","caribbean",6000,1000,["sugar","coffee"],"French","Catholic","town",19.1,-72.4,"island"),
    prov("bahamas_east","Bahamas East",222,226,"americas","caribbean",1200,250,["salt","fish"],"English","Protestant","village",24.2,-74.6,"island"),
    # Central America
    prov("guatemala","Guatemala",204,228,"americas","central_america",7000,1100,["cacao","indigo"],"Spanish","Catholic","town",14.6,-90.5),
    prov("honduras","Honduras",206,228,"americas","central_america",5000,900,["silver","indigo"],"Spanish","Catholic","town",14.1,-87.2),
    prov("nicaragua","Nicaragua",206,231,"americas","central_america",4000,750,["indigo","cattle"],"Spanish","Catholic","town",12.1,-86.3),
    prov("costa_rica","Costa Rica",207,233,"americas","central_america",3000,600,["cacao","cattle"],"Spanish","Catholic","village",9.7,-83.8),
    prov("panama","Panama",210,234,"americas","central_america",5000,900,["silver","gold"],"Spanish","Catholic","town",8.9,-79.5),
    prov("el_salvador","El Salvador",205,229,"americas","central_america",3500,700,["indigo","cacao"],"Spanish","Catholic","village",13.7,-89.2),
    prov("yucatan","Yucatan",206,225,"americas","central_america",5000,900,["henequen","cacao"],"Spanish","Catholic","town",20.7,-88.9),
    # Mexico Interior
    prov("mexico_city","Mexico City",200,222,"americas","mexico",20000,2000,["silver","grain"],"Spanish","Catholic","city",19.4,-99.1),
    prov("oaxaca","Oaxaca",202,225,"americas","mexico",5000,900,["cochineal","silver"],"Spanish","Catholic","town",17.1,-96.7),
    prov("puebla","Puebla",202,223,"americas","mexico",8000,1300,["grain","cloth"],"Spanish","Catholic","city",19.0,-98.2),
    prov("guadalajara","Guadalajara",197,221,"americas","mexico",7000,1200,["silver","grain"],"Spanish","Catholic","city",20.7,-103.4),
    prov("zacatecas","Zacatecas",197,219,"americas","mexico",6000,1100,["silver","grain"],"Spanish","Catholic","town",22.8,-102.6),
    prov("durango","Durango",196,218,"americas","mexico",4000,750,["silver","cattle"],"Spanish","Catholic","town",24.0,-104.7),
    prov("san_luis_potosi","San Luis Potosi",199,220,"americas","mexico",5000,900,["silver","grain"],"Spanish","Catholic","town",22.2,-101.0),
    prov("chihuahua","Chihuahua",194,215,"americas","mexico",3500,650,["silver","cattle"],"Spanish","Catholic","town",28.6,-106.1),
    prov("sonora","Sonora",192,216,"americas","mexico",3000,600,["silver","cattle"],"Spanish","Catholic","village",29.1,-110.9),
    prov("sinaloa","Sinaloa",194,219,"americas","mexico",3500,700,["silver","fish"],"Spanish","Catholic","village",25.2,-107.4),
    prov("michoacan","Michoacan",199,223,"americas","mexico",5000,900,["silver","avocado"],"Spanish","Catholic","town",19.7,-101.9),
    prov("jalisco","Jalisco",197,222,"americas","mexico",5000,900,["silver","cattle"],"Spanish","Catholic","town",20.7,-103.0),
    prov("vera_cruz_interior","Veracruz Interior",203,222,"americas","mexico",4000,750,["vanilla","tobacco"],"Spanish","Catholic","village",19.2,-96.1),
    # North America Interior
    prov("appalachia","Appalachia",211,218,"americas","north_america",2000,400,["fur","timber"],"English","Protestant","village",37.0,-81.0),
    prov("chesapeake","Chesapeake",212,217,"americas","north_america",4000,750,["tobacco","grain"],"English","Protestant","town",37.5,-76.5),
    prov("great_lakes","Great Lakes",209,213,"americas","north_america",3000,600,["fur","fish"],"French","Catholic","village",44.0,-83.0),
    prov("ohio_valley","Ohio Valley",211,216,"americas","north_america",2500,500,["fur","grain"],"French","Catholic","wilderness",40.0,-83.0),
    prov("illinois_country","Illinois Country",209,216,"americas","north_america",2000,400,["fur","grain"],"French","Catholic","wilderness",40.5,-89.0),
    prov("mississippi_valley","Mississippi Valley",208,219,"americas","north_america",2500,500,["fur","grain"],"French","Catholic","wilderness",35.0,-90.0),
    prov("carolina_interior","Carolina Interior",213,219,"americas","north_america",2000,400,["fur","timber"],"English","Protestant","wilderness",35.0,-80.0),
    prov("new_england_north","New England North",214,212,"americas","north_america",3000,600,["fish","timber"],"English","Protestant","town",44.0,-70.0),
    prov("nova_scotia","Nova Scotia",217,212,"americas","north_america",2500,500,["fish","timber"],"English","Protestant","village",45.0,-63.0),
    prov("newfoundland","Newfoundland",220,210,"americas","north_america",2000,400,["fish","cod"],"English","Protestant","village",49.0,-55.0,"island"),
    prov("great_plains","Great Plains",200,212,"americas","north_america",1500,300,["bison","horses"],"Animist","Animist","wilderness",43.0,-100.0),
    prov("texas","Texas",200,220,"americas","north_america",2000,400,["cattle","horses"],"Spanish","Catholic","wilderness",30.0,-97.0),
    prov("new_mexico","New Mexico",196,217,"americas","north_america",3000,600,["silver","cattle"],"Spanish","Catholic","village",35.0,-106.0),
    prov("california","California",188,217,"americas","north_america",2500,500,["fur","fish"],"Spanish","Catholic","wilderness",37.0,-120.0),
    prov("alaska","Alaska",180,200,"americas","north_america",1500,300,["fur","fish"],"Animist","Animist","wilderness",64.0,-153.0),
    prov("pacific_northwest","Pacific Northwest",186,208,"americas","north_america",1500,300,["fur","fish"],"Animist","Animist","wilderness",47.0,-122.0),
    prov("hudson_interior","Hudson Interior",212,205,"americas","north_america",1000,200,["fur","fish"],"Animist","Animist","wilderness",55.0,-75.0),
    prov("labrador","Labrador",220,205,"americas","north_america",1000,200,["fur","fish"],"English","Protestant","wilderness",53.0,-60.0),
    prov("great_lakes_north","Great Lakes North",208,210,"americas","north_america",1500,300,["fur","fish"],"French","Catholic","wilderness",47.0,-84.0),
    # More South America
    prov("colombia_interior","Colombia Interior",215,236,"americas","south_america",4000,750,["gold","emeralds"],"Spanish","Catholic","village",5.0,-74.0),
    prov("venezuela_interior","Venezuela Interior",218,235,"americas","south_america",3500,700,["cattle","indigo"],"Spanish","Catholic","village",8.0,-66.0),
    prov("guyana","Guyana",221,236,"americas","south_america",2500,500,["sugar","tobacco"],"Dutch","Protestant","village",5.0,-59.0),
    prov("amazon","Amazon",220,242,"americas","south_america",2000,400,["rubber","brazil_nuts"],"Portuguese","Catholic","wilderness",-3.0,-60.0),
    prov("mato_grosso","Mato Grosso",220,246,"americas","south_america",2000,400,["gold","diamonds"],"Portuguese","Catholic","wilderness",-14.0,-55.0),
    prov("peru_interior","Peru Interior",211,244,"americas","south_america",5000,900,["silver","potatoes"],"Spanish","Catholic","town",-10.0,-76.0),
    prov("peru_highlands","Peru Highlands",212,247,"americas","south_america",4000,800,["silver","potatoes"],"Spanish","Catholic","town",-15.0,-70.0),
    prov("bolivia_interior","Bolivia Interior",214,249,"americas","south_america",5000,950,["silver","tin"],"Spanish","Catholic","town",-17.0,-65.0),
    prov("chile_north","Chile North",212,252,"americas","south_america",3000,600,["silver","copper"],"Spanish","Catholic","village",-22.0,-69.0),
    prov("chile_central","Chile Central",212,255,"americas","south_america",4000,750,["wheat","cattle"],"Spanish","Catholic","town",-33.5,-70.7),
    prov("patagonia","Patagonia",212,260,"americas","south_america",1000,200,["cattle","fish"],"Animist","Animist","wilderness",-45.0,-68.0),
    prov("tierra_del_fuego","Tierra del Fuego",212,265,"americas","south_america",500,100,["fish","fur"],"Animist","Animist","wilderness",-54.0,-68.0),
    prov("rio_grande_do_sul","Rio Grande do Sul",222,254,"americas","south_america",3000,600,["cattle","leather"],"Portuguese","Catholic","village",-30.0,-53.0),
    prov("paraguay","Paraguay",218,250,"americas","south_america",4000,750,["cotton","cattle"],"Spanish","Catholic","village",-23.0,-58.0),
    prov("ecuador_interior","Ecuador Interior",211,238,"americas","south_america",4000,750,["quinine","gold"],"Spanish","Catholic","village",-1.8,-78.2),
    prov("colombia_coast","Colombia Coast",213,234,"americas","south_america",3500,700,["gold","pearls"],"Spanish","Catholic","town",6.2,-75.6),
    prov("peru_coast","Peru Coast",210,242,"americas","south_america",4000,800,["fish","silver"],"Spanish","Catholic","town",-8.0,-79.0),
    prov("brazil_interior","Brazil Interior",222,244,"americas","south_america",3000,600,["gold","diamonds"],"Portuguese","Catholic","wilderness",-10.0,-48.0),
    prov("bahia_interior","Bahia Interior",224,244,"americas","south_america",3500,700,["sugar","tobacco"],"Portuguese","Catholic","village",-12.0,-41.0),
    prov("minas_gerais","Minas Gerais",223,248,"americas","south_america",5000,950,["gold","diamonds"],"Portuguese","Catholic","town",-18.0,-44.0),
    prov("sao_paulo_interior","Sao Paulo Interior",222,249,"americas","south_america",4000,750,["sugar","cattle"],"Portuguese","Catholic","village",-21.0,-48.0),
    prov("peru_amazon","Peru Amazon",213,242,"americas","south_america",2500,500,["rubber","fish"],"Spanish","Catholic","wilderness",-6.0,-75.0),
    prov("argentina_interior","Argentina Interior",215,254,"americas","south_america",2500,500,["cattle","horses"],"Spanish","Catholic","wilderness",-31.0,-64.0),
    prov("uruguay_interior","Uruguay Interior",218,255,"americas","south_america",2500,500,["cattle","leather"],"Spanish","Catholic","village",-32.5,-56.3),
    prov("florida_interior","Florida Interior",211,220,"americas","north_america",2000,400,["fur","timber"],"Spanish","Catholic","wilderness",29.0,-82.0),
    prov("new_orleans_interior","New Orleans Interior",208,221,"americas","north_america",2500,500,["fur","tobacco"],"French","Catholic","village",30.0,-91.0),
    prov("michigan","Michigan",210,213,"americas","north_america",2000,400,["fur","fish"],"French","Catholic","wilderness",44.5,-84.5),
    prov("indiana_territory","Indiana Territory",211,215,"americas","north_america",2000,400,["fur","grain"],"English","Protestant","wilderness",40.0,-86.5),
    prov("maine","Maine",215,212,"americas","north_america",2500,500,["fish","timber"],"English","Protestant","village",45.5,-69.3),
]

# ===========================================================
# ADDITIONAL PROVINCES to reach 500 total
# ===========================================================

new_provinces += [
    # --- Additional Asia (20) ---
    prov("tibet","Tibet",330,188,"asia","central_asia",3000,500,["wool","tea"],"Tibetan","Buddhist","wilderness",31.0,88.0),
    prov("nepal","Nepal",335,193,"asia","south_asia",4000,600,["rice","spices"],"Nepali","Hindu","village",28.0,84.0),
    prov("bhutan","Bhutan",338,192,"asia","south_asia",1500,300,["rice","timber"],"Bhutanese","Buddhist","village",27.5,90.5),
    prov("gujarat_coast","Gujarat Coast",320,198,"asia","south_asia",8000,1200,["cotton","indigo"],"Gujarati","Hindu","city",21.5,70.5),
    prov("deccan_south","Deccan South",325,207,"asia","south_asia",6000,900,["cotton","spices"],"Marathi","Hindu","town",15.5,76.5),
    prov("hyderabad_deccan","Hyderabad Deccan",327,206,"asia","south_asia",7000,1100,["cotton","diamonds"],"Telugu","Hindu","city",17.4,78.5),
    prov("andaman_islands","Andaman Islands",345,210,"asia","southeast_asia",500,200,["timber","fish"],"Andamanese","Animist","wilderness",12.0,92.7),
    prov("xinjiang","Xinjiang",330,180,"asia","central_asia",2000,400,["horses","jade"],"Uyghur","Muslim","wilderness",41.0,85.0),
    prov("guangdong","Guangdong",357,200,"asia","china",9000,1400,["silk","porcelain"],"Chinese","Buddhist","city",23.1,113.3),
    prov("fujian","Fujian",360,196,"asia","china",6000,1000,["tea","porcelain"],"Chinese","Buddhist","city",26.0,118.0),
    prov("henan","Henan",358,185,"asia","china",8000,1200,["grain","silk"],"Chinese","Buddhist","city",34.0,114.0),
    prov("hubei","Hubei",357,190,"asia","china",7000,1100,["rice","cotton"],"Chinese","Buddhist","city",30.8,112.0),
    prov("vietnam_north","Vietnam North",352,200,"asia","southeast_asia",5000,800,["rice","silk"],"Vietnamese","Buddhist","town",21.0,105.7),
    prov("vietnam_south","Vietnam South",352,207,"asia","southeast_asia",4000,700,["rice","spices"],"Vietnamese","Buddhist","town",15.0,108.0),
    prov("borneo_central","Borneo Central",358,220,"asia","southeast_asia",1500,300,["timber","camphor"],"Dayak","Animist","wilderness",0.5,114.0),
    prov("sulawesi_north","Sulawesi North",363,220,"asia","southeast_asia",2000,400,["spices","fish"],"Bugis","Muslim","village",1.5,124.8),
    prov("lesser_sunda","Lesser Sunda",358,228,"asia","southeast_asia",2000,400,["spices","sandalwood"],"Malay","Muslim","village",-8.7,122.0),
    prov("lhasa","Lhasa",337,188,"asia","central_asia",2000,400,["wool","salt"],"Tibetan","Buddhist","village",29.7,91.1),
    prov("korea_interior","Korea Interior",367,183,"asia","east_asia",4000,700,["grain","silk"],"Korean","Buddhist","town",36.5,127.0),
    prov("sikkim","Sikkim",337,192,"asia","south_asia",1000,200,["cardamom","timber"],"Sikkimese","Buddhist","village",27.3,88.6),

    # --- Additional Europe (15) ---
    prov("transylvania","Transylvania",238,188,"europe","eastern_europe",4000,700,["silver","grain"],"Romanian","Orthodox","town",46.5,24.5),
    prov("serbia","Serbia",237,192,"europe","balkans",5000,800,["silver","grain"],"Serbian","Orthodox","town",44.0,21.0),
    prov("bulgaria","Bulgaria",240,193,"europe","balkans",4000,700,["grain","wool"],"Bulgarian","Orthodox","town",42.5,25.5),
    prov("moldavia","Moldavia",242,186,"europe","eastern_europe",3000,600,["grain","horses"],"Romanian","Orthodox","village",47.0,28.5),
    prov("thessaloniki","Thessaloniki",239,196,"europe","balkans",6000,900,["grain","cloth"],"Greek","Orthodox","city",40.6,22.9),
    prov("sarajevo","Sarajevo",236,192,"europe","balkans",4000,700,["silver","wool"],"Bosnian","Muslim","town",43.8,18.4),
    prov("belgrade","Belgrade",238,190,"europe","balkans",5000,800,["grain","cattle"],"Serbian","Orthodox","town",44.8,20.5),
    prov("albania","Albania",237,195,"europe","balkans",3000,600,["olive","cattle"],"Albanian","Muslim","village",41.3,20.0),
    prov("wallachia","Wallachia",240,189,"europe","eastern_europe",4000,700,["grain","cattle"],"Romanian","Orthodox","town",44.4,26.1),
    prov("crimea","Crimea",248,186,"europe","eastern_europe",4000,750,["grain","salt"],"Tatar","Muslim","town",45.3,34.0),
    prov("linz","Linz",232,183,"europe","central_europe",5000,900,["grain","iron"],"German","Catholic","city",48.3,14.3),
    prov("graz","Graz",233,185,"europe","central_europe",4000,800,["iron","grain"],"German","Catholic","city",47.1,15.4),
    prov("salzburg","Salzburg",231,184,"europe","central_europe",3000,700,["salt","silver"],"German","Catholic","city",47.8,13.0),
    prov("zurich","Zurich",229,183,"europe","central_europe",5000,900,["cloth","silver"],"German","Protestant","city",47.4,8.5),
    prov("tartu","Tartu",240,174,"europe","baltic",2000,400,["grain","timber"],"Estonian","Protestant","village",58.4,26.7),

    # --- Additional Africa (15) ---
    prov("ethiopia","Ethiopia",270,215,"africa","east_africa",6000,800,["coffee","gold"],"Amhara","Christian","town",9.0,38.7),
    prov("abyssinia_highlands","Abyssinia Highlands",270,212,"africa","east_africa",5000,700,["coffee","cattle"],"Amhara","Christian","village",12.0,39.0),
    prov("mozambique_interior","Mozambique Interior",268,230,"africa","east_africa",3000,500,["ivory","gold"],"Shona","Animist","village",-15.0,35.0),
    prov("angola_interior","Angola Interior",260,228,"africa","central_africa",3000,500,["ivory","slaves"],"Mbundu","Animist","village",-12.0,18.0),
    prov("kenya_interior","Kenya Interior",270,220,"africa","east_africa",3000,500,["ivory","cattle"],"Kikuyu","Animist","village",-1.0,37.0),
    prov("ethiopia_coast","Ethiopia Coast",272,214,"africa","east_africa",4000,600,["coffee","pearls"],"Afar","Muslim","town",12.5,41.8),
    prov("cameroon","Cameroon",258,218,"africa","west_africa",4000,600,["ivory","palm_oil"],"Bamileke","Animist","village",4.0,12.0),
    prov("senegambia","Senegambia",249,212,"africa","west_africa",3500,600,["ivory","gold"],"Wolof","Muslim","village",13.5,-15.0),
    prov("cape_verde","Cape Verde",245,212,"africa","west_africa",500,300,["salt","fish"],"Portuguese","Catholic","village",16.0,-24.0),
    prov("togo","Togo",254,218,"africa","west_africa",3000,500,["gold","cloth"],"Ewe","Animist","village",8.0,1.2),
    prov("nigeria_interior","Nigeria Interior",257,215,"africa","west_africa",5000,750,["gold","slaves"],"Hausa","Muslim","town",9.0,7.0),
    prov("congo_interior","Congo Interior",260,225,"africa","central_africa",3000,500,["ivory","rubber"],"Kongo","Animist","wilderness",-4.0,20.0),
    prov("sudan","Sudan",265,210,"africa","northeast_africa",4000,600,["gold","slaves"],"Nubian","Muslim","village",15.0,30.0),
    prov("eritrea","Eritrea",271,210,"africa","northeast_africa",2000,400,["salt","pearls"],"Tigrinya","Christian","village",15.3,38.9),
    prov("ghana_interior","Ghana Interior",252,216,"africa","west_africa",4000,650,["gold","kola"],"Akan","Animist","village",7.9,-1.0),

    # --- Additional Americas (11) ---
    prov("kentucky","Kentucky",211,217,"americas","north_america",2500,500,["tobacco","horses"],"English","Protestant","village",37.8,-84.3),
    prov("tennessee","Tennessee",210,219,"americas","north_america",2500,500,["tobacco","cattle"],"English","Protestant","village",35.5,-86.7),
    prov("alabama","Alabama",211,221,"americas","north_america",2000,400,["tobacco","timber"],"English","Protestant","village",32.8,-86.8),
    prov("illinois","Illinois",210,215,"americas","north_america",2500,500,["fur","grain"],"French","Catholic","wilderness",40.0,-89.0),
    prov("iowa","Iowa",208,213,"americas","north_america",2000,400,["fur","bison"],"French","Catholic","wilderness",42.0,-93.0),
    prov("wisconsin","Wisconsin",209,213,"americas","north_america",2000,400,["fur","fish"],"French","Catholic","wilderness",44.5,-89.5),
    prov("ontario","Ontario",212,211,"americas","north_america",2000,400,["fur","timber"],"French","Catholic","wilderness",44.0,-79.0),
    prov("prince_edward","Prince Edward Island",215,209,"americas","north_america",1000,200,["fish","grain"],"French","Catholic","village",46.5,-63.0),
    prov("bermuda","Bermuda",216,218,"americas","caribbean",500,300,["fish","salt"],"English","Protestant","village",32.3,-64.8),
    prov("turks_caicos","Turks Caicos",214,227,"americas","caribbean",300,200,["salt","fish"],"English","Protestant","wilderness",21.7,-71.8),
    prov("cayman_islands","Cayman Islands",213,227,"americas","caribbean",300,200,["fish","salt"],"English","Protestant","village",19.3,-81.4),
]

print(f"\nNew provinces generated: {len(new_provinces)}")
total = provinces + new_provinces
print(f"Total before verification: {len(total)}")

# Verify all IDs unique
all_ids = [p['id'] for p in total]
id_set = set(all_ids)
if len(all_ids) != len(id_set):
    dupes = [pid for pid in all_ids if all_ids.count(pid) > 1]
    print(f"DUPLICATE IDS: {set(dupes)}")
    sys.exit(1)

print("All IDs are unique.")

if len(total) != 500:
    print(f"ERROR: Expected 500 provinces, got {len(total)}")
    sys.exit(1)

print(f"VERIFIED: Exactly {len(total)} provinces.")

# Write back
with open('/home/user/colonial_game_2/src/data/provinces.json', 'w') as f:
    json.dump(total, f, indent=2)

print("File written successfully.")

# Final verification read
with open('/home/user/colonial_game_2/src/data/provinces.json', 'r') as f:
    verify = json.load(f)
print(f"\nFinal verification - file contains: {len(verify)} provinces")

# Print breakdown by continent
from collections import Counter
continents = Counter(p['continent'] for p in verify)
print("\nBreakdown by continent:")
for continent, count in sorted(continents.items()):
    print(f"  {continent}: {count}")
