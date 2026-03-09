#!/usr/bin/env python3
"""
assign_france_departments.py
Fix French province naming to use department-based names and populate the county field.

Problems this solves:
  1. No `county` field exists on any French province.
  2. rename_provinces.py was run multiple times, stacking compass directions
     (e.g. "Eastern East Allier 2", "Lower Northwest Finistère").
  3. ~248 provinces fall into the "France" catch-all because department
     bounding boxes have gaps — these are re-assigned to the nearest department
     via centroid distance.

After running this script every French grid province will have:
  county  = French department name (e.g. "Finistère")
  name    = clean, non-stacked directional name (e.g. "North Finistère")

Named city provinces (bordeaux, paris, …) are left untouched.

Run from the repo root:
    python assign_france_departments.py
"""

import json
import math
import os
import sys
from collections import defaultdict

sys.path.insert(0, os.path.dirname(__file__))
from generate_france_provinces import COUNTY_MAP  # type: ignore

# ── Constants ─────────────────────────────────────────────────────────────────

FRANCE_CITIES = frozenset({
    "bordeaux", "nantes", "marseille", "brest", "rouen", "paris", "lyon",
    "toulouse", "orleans", "dijon", "strasbourg", "rennes", "la_rochelle",
    "montpellier", "avignon", "calais",
})

# All entries except the final "France" catch-all
DEPARTMENTS = [c for c in COUNTY_MAP if c["name"] != "France"]


# ── Department lookup ─────────────────────────────────────────────────────────

def _dept_centroid(dept: dict) -> tuple[float, float]:
    return (
        (dept["lat_min"] + dept["lat_max"]) / 2,
        (dept["lng_min"] + dept["lng_max"]) / 2,
    )


def get_department(lat: float, lng: float) -> str:
    """Return the department name for (lat, lng).

    Uses bounding-box lookup first; falls back to nearest centroid so that no
    province is assigned the generic "France" catch-all.
    """
    for dept in DEPARTMENTS:
        if (dept["lat_min"] <= lat <= dept["lat_max"] and
                dept["lng_min"] <= lng <= dept["lng_max"]):
            return dept["name"]
    # Nearest centroid fallback
    best = min(
        DEPARTMENTS,
        key=lambda d: (
            (lat - (d["lat_min"] + d["lat_max"]) / 2) ** 2 +
            (lng - (d["lng_min"] + d["lng_max"]) / 2) ** 2
        ),
    )
    return best["name"]


# ── Compass naming ────────────────────────────────────────────────────────────

def _compass_dir(dlat: float, dlng: float, n: int) -> str | None:
    """Return a simple (never nested) compass direction for a province within
    its department group.

    n  = total number of provinces in this department
    Returns None when the department has only 1 province (no prefix needed).
    """
    if n <= 1:
        return None

    if dlat == 0.0 and dlng == 0.0:
        return "Central"

    # Angle: 0° = North, +90° = East, −90° = West, ±180° = South
    angle = math.degrees(math.atan2(dlng, dlat))

    if n <= 5:
        # Two-way split: North / South
        return "North" if dlat >= 0 else "South"

    if n <= 12:
        # Four-way: N / E / S / W
        if -45 <= angle < 45:
            return "North"
        if 45 <= angle < 135:
            return "East"
        if -135 <= angle < -45:
            return "West"
        return "South"

    # Eight-way compass
    if angle >= 157.5 or angle < -157.5:
        return "South"
    if -157.5 <= angle < -112.5:
        return "Southwest"
    if -112.5 <= angle < -67.5:
        return "West"
    if -67.5 <= angle < -22.5:
        return "Northwest"
    if -22.5 <= angle < 22.5:
        return "North"
    if 22.5 <= angle < 67.5:
        return "Northeast"
    if 67.5 <= angle < 112.5:
        return "East"
    return "Southeast"


def build_name(direction: str | None, dept: str, seq: int) -> str:
    if direction is None:
        return dept
    if seq == 1:
        return f"{direction} {dept}"
    return f"{direction} {dept} {seq}"


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    provinces_path = os.path.join(
        os.path.dirname(__file__), "src", "data", "provinces.json"
    )

    print(f"Loading {provinces_path} …")
    with open(provinces_path, encoding="utf-8") as f:
        provinces: list[dict] = json.load(f)

    # Identify France grid provinces (not named cities)
    france_grid: list[dict] = [
        p for p in provinces
        if p.get("region") == "france"
        and p["id"] not in FRANCE_CITIES
        and "_" in p["id"]
    ]
    print(f"France grid provinces to process: {len(france_grid)}")

    # ── Step 1: assign department (county) to every grid province ────────────
    for p in france_grid:
        p["county"] = get_department(float(p["lat"]), float(p["lng"]))

    by_dept: dict[str, list[dict]] = defaultdict(list)
    for p in france_grid:
        by_dept[p["county"]].append(p)

    catch_all = sum(1 for p in france_grid if p["county"] == "France")
    if catch_all:
        print(f"  WARNING: {catch_all} provinces still mapped to 'France' catch-all "
              "(check COUNTY_MAP coverage).")

    print(f"Departments assigned: {len(by_dept)}")

    # ── Step 2: assign clean names within each department ────────────────────
    total_renamed = 0
    for dept, provs in by_dept.items():
        n = len(provs)

        lats = [p["lat"] for p in provs]
        lngs = [p["lng"] for p in provs]
        c_lat = sum(lats) / n
        c_lng = sum(lngs) / n

        # Group by compass direction
        dir_groups: dict[str | None, list[dict]] = defaultdict(list)
        for p in provs:
            d = _compass_dir(p["lat"] - c_lat, p["lng"] - c_lng, n)
            dir_groups[d].append(p)

        for direction, group in dir_groups.items():
            # Deterministic sort: north-to-south, west-to-east
            group.sort(key=lambda p: (-p["lat"], p["lng"]))
            for seq, p in enumerate(group, start=1):
                new_name = build_name(direction, dept, seq)
                p["name"] = new_name
                total_renamed += 1

    print(f"Provinces renamed: {total_renamed}")

    # ── Step 3: summary ──────────────────────────────────────────────────────
    print("\nDepartment province counts:")
    for dept, provs in sorted(by_dept.items(), key=lambda x: x[0]):
        print(f"  {dept:<35s} {len(provs):>4d} provinces")

    # ── Step 4: write back ───────────────────────────────────────────────────
    print(f"\nSaving to {provinces_path} …")
    with open(provinces_path, "w", encoding="utf-8") as f:
        json.dump(provinces, f, separators=(",", ":"))

    print(f"Done. Total provinces in file: {len(provinces)}")

    # ── Step 5: spot-check ───────────────────────────────────────────────────
    sample = [p for p in france_grid if p["county"] in ("Finistère", "Allier", "Gironde")]
    print("\nSample renamed provinces:")
    for p in sorted(sample, key=lambda p: (p["county"], p["name"]))[:20]:
        print(f"  {p['id']:<25s}  county={p['county']:<25s}  name={p['name']}")


if __name__ == "__main__":
    main()
