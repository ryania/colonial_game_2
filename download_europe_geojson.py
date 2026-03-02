"""
download_europe_geojson.py

Downloads country boundary GeoJSON files for Western Europe from the Natural
Earth-derived geo-countries dataset and saves them to data/boundaries/.

Run from the repo root:
    python download_europe_geojson.py

Requires: Python 3.8+, internet connection.
Output: data/boundaries/<country>.geojson for each target country.
"""

import json
import os
import urllib.request

# Source: Natural Earth data via the datasets/geo-countries GitHub repo
SOURCE_URL = (
    "https://raw.githubusercontent.com/datasets/geo-countries/"
    "master/data/countries.geojson"
)

# Mapping: output filename stem → list of ADMIN names to try (in order)
TARGETS: dict[str, list[str]] = {
    "france":       ["France"],
    "spain":        ["Spain"],
    "portugal":     ["Portugal"],
    "germany":      ["Germany"],
    "netherlands":  ["Netherlands", "The Netherlands"],
    "belgium":      ["Belgium"],
    "luxembourg":   ["Luxembourg"],
    "switzerland":  ["Switzerland"],
    "austria":      ["Austria"],
    "denmark":      ["Denmark"],
    "sweden":       ["Sweden"],
    "norway":       ["Norway"],
    "finland":      ["Finland"],
}

BOUNDARIES_DIR = os.path.join(os.path.dirname(__file__), "data", "boundaries")


def download_all() -> None:
    os.makedirs(BOUNDARIES_DIR, exist_ok=True)

    # Skip countries whose file already exists
    remaining = {
        stem: names
        for stem, names in TARGETS.items()
        if not os.path.exists(os.path.join(BOUNDARIES_DIR, f"{stem}.geojson"))
    }

    if not remaining:
        print("All boundary files already present — nothing to download.")
        return

    print(f"Downloading world countries GeoJSON ({SOURCE_URL}) …")
    print("(~23 MB — this may take a moment)")

    req = urllib.request.Request(SOURCE_URL, headers={"User-Agent": "colonial-game-geojson-downloader/1.0"})
    with urllib.request.urlopen(req, timeout=120) as resp:
        raw = resp.read()

    print(f"Downloaded {len(raw) / 1_048_576:.1f} MB. Parsing …")
    world = json.loads(raw)

    # Build lookup: name (lower) → feature
    by_name: dict[str, dict] = {}
    for feature in world["features"]:
        name = feature.get("properties", {}).get("name", "")
        by_name[name.lower()] = feature

    # Also index by ISO3166-1-Alpha-3 as fallback
    by_iso: dict[str, dict] = {}
    for feature in world["features"]:
        iso = feature.get("properties", {}).get("ISO3166-1-Alpha-3", "")
        if iso and iso != "-99":
            by_iso[iso.upper()] = feature

    ISO_FALLBACK: dict[str, str] = {
        "netherlands": "NLD",
        "norway":      "NOR",
        "denmark":     "DNK",
        "sweden":      "SWE",
        "finland":     "FIN",
        "austria":     "AUT",
        "switzerland": "CHE",
        "luxembourg":  "LUX",
        "belgium":     "BEL",
        "germany":     "DEU",
        "france":      "FRA",
        "spain":       "ESP",
        "portugal":    "PRT",
    }

    by_admin = by_name  # alias for compatibility

    saved = []
    missing = []

    for stem, admin_names in remaining.items():
        feature = None

        # Try each ADMIN variant
        for name in admin_names:
            feature = by_admin.get(name.lower())
            if feature:
                break

        # Fallback: ISO3 code
        if feature is None and stem in ISO_FALLBACK:
            feature = by_iso.get(ISO_FALLBACK[stem])

        if feature is None:
            print(f"  WARNING: could not find '{stem}' (tried: {admin_names})")
            missing.append(stem)
            continue

        # Wrap as a standalone Feature GeoJSON file
        out = {
            "type": "Feature",
            "properties": feature.get("properties", {}),
            "geometry": feature["geometry"],
        }

        out_path = os.path.join(BOUNDARIES_DIR, f"{stem}.geojson")
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(out, f)
        print(f"  Saved {stem}.geojson  ({feature['geometry']['type']})")
        saved.append(stem)

    print(f"\nDone. Saved {len(saved)} file(s). Missing: {missing or 'none'}")


if __name__ == "__main__":
    download_all()
