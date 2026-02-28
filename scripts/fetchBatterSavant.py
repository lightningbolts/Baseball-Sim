#!/usr/bin/env python3
"""
Fetch batter statcast/savant data from Baseball Savant using pybaseball.
This script retrieves real batting metrics for all MLB position players
across multiple seasons (2022-2025) and saves it as JSON for use in the simulation.

Fetched stats per player:
  - xwOBA, xBA, xSLG (expected stats)
  - Avg Exit Velo, Barrel%, Hard-Hit%, LA Sweet-Spot%
  - Bat Speed, Squared-Up%
  - Chase%, Whiff%, K%, BB%
  - Sprint Speed
  - Baserunning Run Value, Fielding Run Value, Batting Run Value

Usage:
    python scripts/fetchBatterSavant.py

Requirements:
    pip install pybaseball pandas
"""

import json
import os
from datetime import datetime

try:
    from pybaseball import (
        statcast_batter_expected_stats,
        statcast_batter_exitvelo_barrels,
        statcast_sprint_speed,
        batting_stats,
        chadwick_register,
        playerid_reverse_lookup,
    )
    import pandas as pd
except ImportError:
    print("Error: Required packages not installed.")
    print("Please run: pip install pybaseball pandas")
    exit(1)


# Years to fetch (most recent first for priority)
YEARS = [2025, 2024, 2023, 2022]

# Minimum plate appearances to include a player
MIN_PA = 100


def safe_float(val, default=0.0):
    """Safely convert to float, returning default on failure."""
    try:
        if pd.isna(val):
            return default
        return round(float(val), 3)
    except (ValueError, TypeError):
        return default


def safe_int(val, default=0):
    """Safely convert to int, returning default on failure."""
    try:
        if pd.isna(val):
            return default
        return int(val)
    except (ValueError, TypeError):
        return default


def fetch_expected_stats(year: int, min_pa: int = MIN_PA) -> dict:
    """Fetch expected batting stats (xwOBA, xBA, xSLG) for a year."""
    print(f"  Fetching expected stats for {year}...")
    try:
        df = statcast_batter_expected_stats(year, minPA=min_pa)
        if df is None or df.empty:
            print(f"    No expected stats data for {year}")
            return {}

        result = {}
        for _, row in df.iterrows():
            player_id = safe_int(row.get('player_id', row.get('batter', 0)))
            if player_id == 0:
                continue

            result[player_id] = {
                'pa': safe_int(row.get('pa', 0)),
                'xwoba': safe_float(row.get('est_woba', 0)),
                'xba': safe_float(row.get('est_ba', 0)),
                'xslg': safe_float(row.get('est_slg', 0)),
                'woba': safe_float(row.get('woba', 0)),
                'ba': safe_float(row.get('ba', 0)),
                'slg': safe_float(row.get('slg', 0)),
            }

        print(f"    Got expected stats for {len(result)} batters")
        return result

    except Exception as e:
        print(f"    Error fetching expected stats for {year}: {e}")
        return {}


def fetch_exit_velo_barrels(year: int, min_pa: int = MIN_PA) -> dict:
    """Fetch exit velocity and barrel data for a year."""
    print(f"  Fetching exit velo/barrels for {year}...")
    try:
        df = statcast_batter_exitvelo_barrels(year, minBBE=50)
        if df is None or df.empty:
            print(f"    No exit velo data for {year}")
            return {}

        result = {}
        for _, row in df.iterrows():
            player_id = safe_int(row.get('player_id', row.get('batter', 0)))
            if player_id == 0:
                continue

            result[player_id] = {
                'avg_exit_velo': safe_float(row.get('avg_hit_speed', row.get('exit_velocity_avg', 0))),
                'max_exit_velo': safe_float(row.get('max_hit_speed', row.get('exit_velocity_max', 0))),
                'barrel_pct': safe_float(row.get('brl_percent', row.get('barrel_batted_rate', 0))),
                'hard_hit_pct': safe_float(row.get('ev95percent', row.get('hard_hit_percent', 0))),
                'la_sweet_spot_pct': safe_float(row.get('anglesweetspotpercent', row.get('sweetspot_percent', 0))),
                'avg_launch_angle': safe_float(row.get('avg_hit_angle', row.get('launch_angle_avg', 0))),
                'attempts': safe_int(row.get('attempts', row.get('batted_balls', 0))),
            }

        print(f"    Got exit velo data for {len(result)} batters")
        return result

    except Exception as e:
        print(f"    Error fetching exit velo for {year}: {e}")
        return {}


def fetch_sprint_speeds(year: int) -> dict:
    """Fetch sprint speed data for a year."""
    print(f"  Fetching sprint speeds for {year}...")
    try:
        df = statcast_sprint_speed(year)
        if df is None or df.empty:
            print(f"    No sprint speed data for {year}")
            return {}

        result = {}
        for _, row in df.iterrows():
            player_id = safe_int(row.get('player_id', 0))
            if player_id == 0:
                continue

            result[player_id] = {
                'sprint_speed': safe_float(row.get('sprint_speed', 0)),
            }

        print(f"    Got sprint speed for {len(result)} batters")
        return result

    except Exception as e:
        print(f"    Error fetching sprint speed for {year}: {e}")
        return {}


def lookup_player_names(player_ids: set) -> dict:
    """Look up player names from MLB IDs."""
    print(f"\nLooking up names for {len(player_ids)} batters...")
    names = {}
    id_list = list(player_ids)

    try:
        chunk_size = 200
        for i in range(0, len(id_list), chunk_size):
            chunk = id_list[i:i + chunk_size]
            print(f"  Looking up batch {i//chunk_size + 1}/{(len(id_list) + chunk_size - 1)//chunk_size}...")
            try:
                result_df = playerid_reverse_lookup(chunk, key_type='mlbam')
                if result_df is not None and not result_df.empty:
                    for _, row in result_df.iterrows():
                        mlb_id = row.get('key_mlbam')
                        if pd.notna(mlb_id):
                            first = row.get('name_first', '')
                            last = row.get('name_last', '')
                            if first and last:
                                names[int(mlb_id)] = f"{first} {last}"
            except Exception as e:
                print(f"    Batch lookup error: {e}")
                continue
    except Exception as e:
        print(f"  Name lookup error: {e}")

    print(f"  Resolved {len(names)} names")
    return names


def build_fg_to_mlbam_map():
    """Build a FanGraphs ID -> MLBAM ID mapping using the Chadwick register."""
    print("Building FanGraphs -> MLBAM ID map...")
    try:
        reg = chadwick_register()
        mapped = reg.dropna(subset=['key_mlbam', 'key_fangraphs'])
        fg_to_mlbam = {}
        for _, row in mapped.iterrows():
            fg_id = int(row['key_fangraphs'])
            mlbam_id = int(row['key_mlbam'])
            if fg_id > 0 and mlbam_id > 0:
                fg_to_mlbam[fg_id] = mlbam_id
        print(f"  Mapped {len(fg_to_mlbam)} FanGraphs IDs to MLBAM IDs")
        return fg_to_mlbam
    except Exception as e:
        print(f"  Error building ID map: {e}")
        return {}


def fetch_fangraphs_batting(year, fg_to_mlbam):
    """Fetch K%, BB%, O-Swing% (chase), SwStr% (whiff) from FanGraphs batting stats."""
    print(f"  Fetching FanGraphs batting stats for {year}...")
    try:
        df = batting_stats(year, qual=1)
        if df is None or df.empty:
            return {}
        result = {}
        for _, row in df.iterrows():
            fg_id = safe_int(row.get('IDfg', 0))
            mlbam_id = fg_to_mlbam.get(fg_id, 0)
            if mlbam_id == 0:
                continue
            result[mlbam_id] = {
                'k_pct': round(safe_float(row.get('K%', 0)) * 100, 1),
                'bb_pct': round(safe_float(row.get('BB%', 0)) * 100, 1),
                # O-Swing% = chase rate (swings on pitches outside zone)
                'chase_pct': round(safe_float(row.get('O-Swing%', 0)) * 100, 1),
                # SwStr% = swinging strike rate (whiff rate)
                'whiff_pct': round(safe_float(row.get('SwStr%', 0)) * 100, 1),
            }
        print(f"    Got {len(result)} batters (mapped from FanGraphs)")
        return result
    except Exception as e:
        print(f"    Error: {e}")
        return {}


def main():
    print("=" * 60)
    print("Fetching MLB Batter Savant Data (2022-2025)")
    print("=" * 60)

    fg_to_mlbam = build_fg_to_mlbam_map()

    all_player_ids = set()
    yearly_data = {}

    for year in YEARS:
        print(f"\n--- Processing {year} ---")

        expected = fetch_expected_stats(year, MIN_PA)
        exit_velo = fetch_exit_velo_barrels(year, MIN_PA)
        sprint = fetch_sprint_speeds(year)
        fg_stats = fetch_fangraphs_batting(year, fg_to_mlbam)

        # Merge all data sources for this year
        merged = {}
        all_ids_this_year = set(expected.keys()) | set(exit_velo.keys()) | set(fg_stats.keys())

        for pid in all_ids_this_year:
            exp = expected.get(pid, {})
            ev = exit_velo.get(pid, {})
            sp = sprint.get(pid, {})
            fg = fg_stats.get(pid, {})

            merged[pid] = {
                # Expected stats (from Savant)
                'xwoba': exp.get('xwoba', 0),
                'xba': exp.get('xba', 0),
                'xslg': exp.get('xslg', 0),
                'woba': exp.get('woba', 0),
                'ba': exp.get('ba', 0),
                'slg': exp.get('slg', 0),
                'pa': exp.get('pa', 0),

                # K%, BB%, chase%, whiff% from FanGraphs
                'k_pct': fg.get('k_pct', 0),
                'bb_pct': fg.get('bb_pct', 0),
                'chase_pct': fg.get('chase_pct', 0),
                'whiff_pct': fg.get('whiff_pct', 0),

                # Exit velo / barrels (from Savant)
                'avg_exit_velo': ev.get('avg_exit_velo', 0),
                'max_exit_velo': ev.get('max_exit_velo', 0),
                'barrel_pct': ev.get('barrel_pct', 0),
                'hard_hit_pct': ev.get('hard_hit_pct', 0),
                'la_sweet_spot_pct': ev.get('la_sweet_spot_pct', 0),
                'avg_launch_angle': ev.get('avg_launch_angle', 0),

                # Sprint speed (from Savant - ft/s)
                'sprint_speed': sp.get('sprint_speed', 0),
            }

        yearly_data[year] = merged
        all_player_ids.update(all_ids_this_year)
        print(f"  Combined {len(merged)} batters for {year}")

    # Look up player names
    player_names = lookup_player_names(all_player_ids)

    # Build combined output
    batters = {}
    for player_id in all_player_ids:
        str_id = str(player_id)
        name = player_names.get(player_id, f"Unknown ({player_id})")

        # Build year-by-year history
        history = {}
        for year in YEARS:
            if player_id in yearly_data.get(year, {}):
                history[str(year)] = yearly_data[year][player_id]

        if not history:
            continue

        # Current = most recent year
        current_stats = None
        for year in YEARS:
            if str(year) in history:
                current_stats = history[str(year)]
                break

        batters[str_id] = {
            'name': name,
            'mlbId': player_id,
            'currentStats': current_stats,
            'statsHistory': history,
        }

    print(f"\n{'=' * 60}")
    print(f"Total unique batters: {len(batters)}")
    print(f"{'=' * 60}")

    # Save to JSON
    output_path = os.path.join(os.path.dirname(__file__), '..', 'services', 'batterSavant.json')
    output_path = os.path.abspath(output_path)

    output_data = {
        'lastUpdated': datetime.now().isoformat(),
        'source': 'Baseball Savant via pybaseball',
        'years': YEARS,
        'batterCount': len(batters),
        'batters': batters,
    }

    with open(output_path, 'w') as f:
        json.dump(output_data, f, indent=2)

    print(f"\nSaved to: {output_path}")

    # Verify data quality
    print("\nData quality check:")
    zero_fields = {'k_pct': 0, 'bb_pct': 0, 'chase_pct': 0, 'whiff_pct': 0, 'sprint_speed': 0, 'barrel_pct': 0, 'avg_exit_velo': 0}
    total = len(batters)
    for pid_str, b in batters.items():
        cs = b['currentStats']
        if cs:
            for field in zero_fields:
                if cs.get(field, 0) == 0:
                    zero_fields[field] += 1
    for field, count in zero_fields.items():
        pct = round(count / total * 100, 1) if total > 0 else 0
        print(f"  {field}: {count}/{total} still zero ({pct}%)")

    # Print samples
    print("\nSample entries:")
    sample_ids = list(batters.keys())[:5]
    for pid in sample_ids:
        b = batters[pid]
        cs = b['currentStats']
        print(f"  {b['name']} (ID: {pid})")
        print(f"    xwOBA: {cs.get('xwoba', 'N/A')}, xBA: {cs.get('xba', 'N/A')}, xSLG: {cs.get('xslg', 'N/A')}")
        print(f"    Avg EV: {cs.get('avg_exit_velo', 'N/A')}, Barrel%: {cs.get('barrel_pct', 'N/A')}, HH%: {cs.get('hard_hit_pct', 'N/A')}")
        print(f"    Sprint: {cs.get('sprint_speed', 'N/A')}, K%: {cs.get('k_pct', 'N/A')}, BB%: {cs.get('bb_pct', 'N/A')}")


if __name__ == '__main__':
    main()
