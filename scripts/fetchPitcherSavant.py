#!/usr/bin/env python3
"""
Fetch pitcher statcast/savant data from Baseball Savant and FanGraphs using pybaseball.
Retrieves real pitching metrics for all MLB pitchers across multiple seasons (2022-2025).

Data sources:
  - statcast_pitcher_expected_stats: xERA, xBA, xwOBA
  - statcast_pitcher_exitvelo_barrels: avg EV against, barrel%, hard-hit%
  - statcast_pitcher_arsenal_stats: per-pitch run values, whiff%, K%
  - pitching_stats (FanGraphs): K%, BB%, GB% (raw values)
  - pitchArsenals.json: fastball velo, extension

Usage:
    python scripts/fetchPitcherSavant.py
"""

import json
import os
from datetime import datetime

try:
    from pybaseball import (
        statcast_pitcher_expected_stats,
        statcast_pitcher_exitvelo_barrels,
        statcast_pitcher_arsenal_stats,
        pitching_stats,
        chadwick_register,
        playerid_reverse_lookup,
    )
    import pandas as pd
except ImportError:
    print("Error: Required packages not installed.")
    print("Please run: pip install pybaseball pandas")
    exit(1)


YEARS = [2025, 2024, 2023, 2022]
MIN_PA = 50


def safe_float(val, default=0.0):
    try:
        if pd.isna(val):
            return default
        return round(float(val), 3)
    except (ValueError, TypeError):
        return default


def safe_int(val, default=0):
    try:
        if pd.isna(val):
            return default
        return int(val)
    except (ValueError, TypeError):
        return default


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


def fetch_expected_stats(year):
    """Fetch xERA, xBA, xwOBA from Savant expected stats."""
    print(f"  Fetching Savant expected stats for {year}...")
    try:
        df = statcast_pitcher_expected_stats(year, minPA=MIN_PA)
        if df is None or df.empty:
            return {}
        result = {}
        for _, row in df.iterrows():
            pid = safe_int(row.get('player_id', 0))
            if pid == 0:
                continue
            result[pid] = {
                'xera': safe_float(row.get('xera', 0)),
                'xba': safe_float(row.get('est_ba', 0)),
                'xwoba': safe_float(row.get('est_woba', 0)),
            }
        print(f"    Got {len(result)} pitchers")
        return result
    except Exception as e:
        print(f"    Error: {e}")
        return {}


def fetch_exit_velo(year):
    """Fetch exit velo against, barrel%, hard-hit% from Savant."""
    print(f"  Fetching Savant exit velo/barrels for {year}...")
    try:
        df = statcast_pitcher_exitvelo_barrels(year, minBBE=30)
        if df is None or df.empty:
            return {}
        result = {}
        for _, row in df.iterrows():
            pid = safe_int(row.get('player_id', 0))
            if pid == 0:
                continue
            result[pid] = {
                'avg_exit_velo_against': safe_float(row.get('avg_hit_speed', 0)),
                'barrel_pct': safe_float(row.get('brl_percent', 0)),
                'hard_hit_pct': safe_float(row.get('ev95percent', 0)),
            }
        print(f"    Got {len(result)} pitchers")
        return result
    except Exception as e:
        print(f"    Error: {e}")
        return {}


def fetch_arsenal_stats(year):
    """Fetch per-pitch-type run values, whiff%, K% from Savant arsenal stats."""
    print(f"  Fetching Savant arsenal stats for {year}...")
    try:
        df = statcast_pitcher_arsenal_stats(year, minPA=20)
        if df is None or df.empty:
            return {}

        # Group by player_id, aggregate across pitch types
        result = {}
        for pid, group in df.groupby('player_id'):
            pid = safe_int(pid)
            if pid == 0:
                continue

            total_pitches = group['pitches'].sum()
            if total_pitches == 0:
                continue

            # Weighted averages by pitch usage
            w_whiff = 0
            total_run_value = 0
            fb_rv = 0
            breaking_rv = 0
            offspeed_rv = 0

            for _, row in group.iterrows():
                pitches = safe_int(row.get('pitches', 0))
                weight = pitches / total_pitches if total_pitches > 0 else 0
                w_whiff += safe_float(row.get('whiff_percent', 0)) * weight
                rv = safe_float(row.get('run_value', 0))
                total_run_value += rv

                # Classify pitch type for category run values
                ptype = str(row.get('pitch_type', '')).upper()
                if ptype in ('FF', 'SI', 'FA', 'FC'):
                    fb_rv += rv
                elif ptype in ('SL', 'CU', 'KC', 'ST', 'SV', 'CS'):
                    breaking_rv += rv
                elif ptype in ('CH', 'FS', 'FO', 'SC', 'KN', 'EP'):
                    offspeed_rv += rv

            result[pid] = {
                'whiff_pct': round(w_whiff, 1),
                'pitching_run_value': round(total_run_value, 1),
                'fastball_run_value': round(fb_rv, 1),
                'breaking_run_value': round(breaking_rv, 1),
                'offspeed_run_value': round(offspeed_rv, 1),
            }

        print(f"    Got {len(result)} pitchers")
        return result
    except Exception as e:
        print(f"    Error: {e}")
        return {}


def fetch_fangraphs_stats(year, fg_to_mlbam):
    """Fetch K%, BB%, GB%, O-Swing% (chase), SwStr% from FanGraphs pitching stats."""
    print(f"  Fetching FanGraphs stats for {year}...")
    try:
        df = pitching_stats(year, qual=1)
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
                'gb_pct': round(safe_float(row.get('GB%', 0)) * 100, 1),
                # O-Swing% = chase rate (swings on pitches outside zone)
                'chase_pct': round(safe_float(row.get('O-Swing%', 0)) * 100, 1),
                # SwStr% = swinging strike rate (similar to whiff%)
                'swstr_pct': round(safe_float(row.get('SwStr%', 0)) * 100, 1),
            }
        print(f"    Got {len(result)} pitchers (mapped from FanGraphs)")
        return result
    except Exception as e:
        print(f"    Error: {e}")
        return {}


def lookup_player_names(player_ids):
    print(f"\nLooking up names for {len(player_ids)} pitchers...")
    names = {}
    id_list = list(player_ids)
    try:
        for i in range(0, len(id_list), 200):
            chunk = id_list[i:i + 200]
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
                print(f"    Batch error: {e}")
    except Exception as e:
        print(f"  Error: {e}")
    print(f"  Resolved {len(names)} names")
    return names


def main():
    print("=" * 60)
    print("Fetching MLB Pitcher Savant Data (2022-2025)")
    print("=" * 60)

    fg_to_mlbam = build_fg_to_mlbam_map()

    all_player_ids = set()
    yearly_data = {}

    for year in YEARS:
        print(f"\n--- Processing {year} ---")

        expected = fetch_expected_stats(year)
        exit_velo = fetch_exit_velo(year)
        arsenal = fetch_arsenal_stats(year)
        fg_stats = fetch_fangraphs_stats(year, fg_to_mlbam)

        all_ids = set(expected.keys()) | set(exit_velo.keys()) | set(arsenal.keys()) | set(fg_stats.keys())

        merged = {}
        for pid in all_ids:
            exp = expected.get(pid, {})
            ev = exit_velo.get(pid, {})
            ars = arsenal.get(pid, {})
            fg = fg_stats.get(pid, {})

            merged[pid] = {
                'xera': exp.get('xera', 0),
                'xba': exp.get('xba', 0),
                'xwoba': exp.get('xwoba', 0),
                'avg_exit_velo_against': ev.get('avg_exit_velo_against', 0),
                'barrel_pct': ev.get('barrel_pct', 0),
                'hard_hit_pct': ev.get('hard_hit_pct', 0),
                'gb_pct': fg.get('gb_pct', 0),
                'k_pct': fg.get('k_pct', 0),
                'bb_pct': fg.get('bb_pct', 0),
                # Use arsenal whiff%, fall back to FanGraphs SwStr% if unavailable
                'whiff_pct': ars.get('whiff_pct', 0) or fg.get('swstr_pct', 0),
                # Use FanGraphs O-Swing% for chase rate (much better coverage)
                'chase_pct': fg.get('chase_pct', 0),
                'pitching_run_value': ars.get('pitching_run_value', 0),
                'fastball_run_value': ars.get('fastball_run_value', 0),
                'breaking_run_value': ars.get('breaking_run_value', 0),
                'offspeed_run_value': ars.get('offspeed_run_value', 0),
                'fastball_velo': 0,
                'extension': 0,
            }

        yearly_data[year] = merged
        all_player_ids.update(all_ids)
        print(f"  Combined {len(merged)} pitchers for {year}")

    # Enrich with fastball velo & extension from pitchArsenals.json
    arsenals_path = os.path.join(os.path.dirname(__file__), '..', 'services', 'pitchArsenals.json')
    arsenals_path = os.path.abspath(arsenals_path)
    try:
        with open(arsenals_path, 'r') as f:
            arsenals_data = json.load(f)
        pitchers_arsenal = arsenals_data.get('pitchers', {})
        print(f"\nEnriching with pitchArsenals.json ({len(pitchers_arsenal)} pitchers)...")

        for pid_str, pitcher_data in pitchers_arsenal.items():
            pid = int(pid_str) if pid_str.isdigit() else None
            if pid is None:
                continue

            current_arsenal = pitcher_data.get('currentArsenal', [])
            fastball_velo = 0
            extension = 0
            for pitch in current_arsenal:
                ptype = (pitch.get('type', '') or '').lower()
                if ptype in ('four-seam fastball', 'sinker', 'fastball'):
                    velo = pitch.get('speed', 0)
                    if velo > fastball_velo:
                        fastball_velo = velo
                    ext = pitch.get('extension', 0)
                    if ext > extension:
                        extension = ext

            for year in YEARS:
                if pid in yearly_data.get(year, {}):
                    if fastball_velo > 0:
                        yearly_data[year][pid]['fastball_velo'] = round(fastball_velo, 1)
                    if extension > 0:
                        yearly_data[year][pid]['extension'] = round(extension, 1)

            arsenal_history = pitcher_data.get('arsenalHistory', {})
            for year_str, pitches in arsenal_history.items():
                year_int = int(year_str) if year_str.isdigit() else None
                if year_int and year_int in YEARS and pid in yearly_data.get(year_int, {}):
                    pid_yearly = yearly_data[year_int][pid]
                    for pitch in pitches:
                        ptype = (pitch.get('type', '') or '').lower()
                        if ptype in ('four-seam fastball', 'sinker', 'fastball'):
                            velo = pitch.get('speed', 0)
                            if velo > pid_yearly['fastball_velo']:
                                pid_yearly['fastball_velo'] = round(velo, 1)
                            ext = pitch.get('extension', 0)
                            if ext > pid_yearly['extension']:
                                pid_yearly['extension'] = round(ext, 1)

            all_player_ids.add(pid)
    except FileNotFoundError:
        print("  pitchArsenals.json not found, skipping")
    except Exception as e:
        print(f"  Error: {e}")

    # Enrich chase% from percentile ranks for players missing FanGraphs data
    print("\nEnriching missing chase% from percentile ranks...")
    try:
        from pybaseball import statcast_pitcher_percentile_ranks
        enriched_count = 0
        for year in YEARS:
            try:
                df = statcast_pitcher_percentile_ranks(year)
                if df is None or df.empty:
                    continue
                for _, row in df.iterrows():
                    pid = safe_int(row.get('player_id', 0))
                    if pid == 0 or pid not in yearly_data.get(year, {}):
                        continue
                    # Only fill in if FanGraphs didn't provide chase%
                    if yearly_data[year][pid].get('chase_pct', 0) == 0:
                        pctile = safe_float(row.get('chase_percent', 0))
                        if pctile > 0:
                            raw_chase = 20 + (pctile / 100) * 18
                            yearly_data[year][pid]['chase_pct'] = round(raw_chase, 1)
                            enriched_count += 1
                print(f"  Checked percentile ranks for {year}")
            except Exception as e:
                print(f"  Error enriching chase% for {year}: {e}")
        print(f"  Enriched {enriched_count} additional chase% entries from percentile ranks")
    except ImportError:
        print("  statcast_pitcher_percentile_ranks not available")

    player_names = lookup_player_names(all_player_ids)

    # Build output
    pitchers = {}
    for pid in all_player_ids:
        str_id = str(pid)
        name = player_names.get(pid, f"Unknown ({pid})")
        history = {}
        for year in YEARS:
            if pid in yearly_data.get(year, {}):
                history[str(year)] = yearly_data[year][pid]
        if not history:
            continue

        current_stats = None
        for year in YEARS:
            if str(year) in history:
                current_stats = history[str(year)]
                break

        pitchers[str_id] = {
            'name': name,
            'mlbId': pid,
            'currentStats': current_stats,
            'statsHistory': history,
        }

    print(f"\n{'=' * 60}")
    print(f"Total unique pitchers: {len(pitchers)}")

    output_path = os.path.join(os.path.dirname(__file__), '..', 'services', 'pitcherSavant.json')
    output_path = os.path.abspath(output_path)
    output_data = {
        'lastUpdated': datetime.now().isoformat(),
        'source': 'Baseball Savant + FanGraphs via pybaseball',
        'years': YEARS,
        'pitcherCount': len(pitchers),
        'pitchers': pitchers,
    }
    with open(output_path, 'w') as f:
        json.dump(output_data, f, indent=2)
    print(f"Saved to: {output_path}")

    # Verify data quality
    print("\nData quality check:")
    zero_fields = {'k_pct': 0, 'bb_pct': 0, 'whiff_pct': 0, 'chase_pct': 0, 'gb_pct': 0, 'pitching_run_value': 0}
    total = len(pitchers)
    for pid_str, p in pitchers.items():
        cs = p['currentStats']
        if cs:
            for field in zero_fields:
                if cs.get(field, 0) == 0:
                    zero_fields[field] += 1
    for field, count in zero_fields.items():
        pct = round(count / total * 100, 1) if total > 0 else 0
        print(f"  {field}: {count}/{total} still zero ({pct}%)")

    print("\nSample entries:")
    for pid in list(pitchers.keys())[:5]:
        p = pitchers[pid]
        cs = p['currentStats']
        print(f"  {p['name']} (ID: {pid})")
        print(f"    xERA: {cs.get('xera')}, xBA: {cs.get('xba')}, K%: {cs.get('k_pct')}, BB%: {cs.get('bb_pct')}")
        print(f"    Whiff%: {cs.get('whiff_pct')}, Chase%: {cs.get('chase_pct')}, GB%: {cs.get('gb_pct')}")
        print(f"    FB Velo: {cs.get('fastball_velo')}, EV Against: {cs.get('avg_exit_velo_against')}")
        print(f"    Run Values: total={cs.get('pitching_run_value')}, FB={cs.get('fastball_run_value')}, BRK={cs.get('breaking_run_value')}, OS={cs.get('offspeed_run_value')}")


if __name__ == '__main__':
    main()
