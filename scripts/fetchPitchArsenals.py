#!/usr/bin/env python3
"""
Fetch pitch arsenal data from Baseball Savant using pybaseball.
This script retrieves real pitch repertoire data for all MLB pitchers
across multiple seasons (2022-2024) and saves it as JSON for use in the simulation.

Usage:
    python scripts/fetchPitchArsenals.py

Requirements:
    pip install pybaseball pandas
"""

import json
import os
from datetime import datetime

try:
    from pybaseball import statcast_pitcher_pitch_arsenal, playerid_reverse_lookup
    import pandas as pd
except ImportError:
    print("Error: Required packages not installed.")
    print("Please run: pip install pybaseball pandas")
    exit(1)


# Pitch type code to name mapping
PITCH_NAMES = {
    'ff': 'Four-Seam Fastball',
    'si': 'Sinker',
    'fc': 'Cutter',
    'sl': 'Slider',
    'ch': 'Changeup',
    'cu': 'Curveball',
    'fs': 'Splitter',
    'kn': 'Knuckleball',
    'st': 'Sweeper',
    'sv': 'Slurve',
    'kc': 'Knuckle Curve',
    'cs': 'Slow Curve',
    'sc': 'Screwball',
    'ep': 'Eephus',
    'fo': 'Forkball',
    'fa': 'Fastball',
}

PITCH_CODES = ['ff', 'si', 'fc', 'sl', 'ch', 'cu', 'fs', 'kn', 'st', 'sv', 'kc', 'cs', 'sc', 'ep', 'fo', 'fa']

# Years to fetch (most recent first for priority)
YEARS = [2025, 2024, 2023, 2022]  # 2025 season is now complete


def fetch_year_arsenals(year: int, min_pitches: int = 100) -> tuple[dict, set]:
    """
    Fetch pitch arsenal data for a single year.
    
    Returns:
        Tuple of (arsenals dict, set of pitcher IDs)
    """
    print(f"  Fetching {year} data...")
    
    try:
        speed_df = statcast_pitcher_pitch_arsenal(year, minP=min_pitches, arsenal_type='avg_speed')
        usage_df = statcast_pitcher_pitch_arsenal(year, minP=min_pitches, arsenal_type='n_')
        
        if speed_df is None or speed_df.empty or usage_df is None or usage_df.empty:
            print(f"    Warning: No data for {year}")
            return {}, set()
        
        print(f"    Retrieved {len(speed_df)} pitchers for {year}")
        
        arsenals = {}
        pitcher_ids = set()
        
        for idx, speed_row in speed_df.iterrows():
            pitcher_id = int(speed_row['pitcher'])
            pitcher_ids.add(pitcher_id)
            
            usage_row = usage_df[usage_df['pitcher'] == pitcher_id]
            if usage_row.empty:
                continue
            usage_row = usage_row.iloc[0]
            
            pitcher_arsenal = []
            
            for code in PITCH_CODES:
                speed_col = f'{code}_avg_speed'
                usage_col = f'n_{code}'
                
                speed = speed_row.get(speed_col, float('nan')) if speed_col in speed_row.index else float('nan')
                usage = usage_row.get(usage_col, float('nan')) if usage_col in usage_row.index else float('nan')
                
                if pd.isna(speed) or pd.isna(usage) or usage < 3.0:
                    continue
                
                pitch_name = PITCH_NAMES.get(code, code.upper())
                pitcher_arsenal.append({
                    'type': pitch_name,
                    'speed': round(float(speed), 1),
                    'usage': round(float(usage), 1)
                })
            
            # Sort by usage and limit to top 6
            pitcher_arsenal.sort(key=lambda x: x['usage'], reverse=True)
            pitcher_arsenal = pitcher_arsenal[:6]
            
            # Normalize to 100%
            total_usage = sum(p['usage'] for p in pitcher_arsenal)
            if total_usage > 0 and len(pitcher_arsenal) > 0:
                for p in pitcher_arsenal:
                    p['usage'] = round((p['usage'] / total_usage) * 100, 1)
                
                diff = 100 - sum(p['usage'] for p in pitcher_arsenal)
                if abs(diff) > 0.1:
                    pitcher_arsenal[0]['usage'] = round(pitcher_arsenal[0]['usage'] + diff, 1)
            
            if len(pitcher_arsenal) > 0:
                arsenals[pitcher_id] = pitcher_arsenal
        
        return arsenals, pitcher_ids
        
    except Exception as e:
        print(f"    Error fetching {year}: {e}")
        return {}, set()


def lookup_player_names(pitcher_ids: set) -> dict:
    """
    Look up player names from MLB IDs using pybaseball's reverse lookup.
    """
    print(f"\nLooking up names for {len(pitcher_ids)} pitchers...")
    names = {}
    
    # Convert to list for lookup
    id_list = list(pitcher_ids)
    
    try:
        # pybaseball's reverse lookup works in batches
        # We'll do it in chunks to avoid timeouts
        chunk_size = 200
        
        for i in range(0, len(id_list), chunk_size):
            chunk = id_list[i:i + chunk_size]
            print(f"  Looking up batch {i//chunk_size + 1}/{(len(id_list) + chunk_size - 1)//chunk_size}...")
            
            try:
                result = playerid_reverse_lookup(chunk, key_type='mlbam')
                
                if result is not None and not result.empty:
                    for _, row in result.iterrows():
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


def main():
    print("=" * 60)
    print("Fetching MLB Pitch Arsenal Data (2022-2024)")
    print("=" * 60)
    
    # Collect data for each year
    all_pitcher_ids = set()
    yearly_arsenals = {}
    
    for year in YEARS:
        arsenals, pitcher_ids = fetch_year_arsenals(year, min_pitches=100)
        yearly_arsenals[year] = arsenals
        all_pitcher_ids.update(pitcher_ids)
        print(f"    Processed {len(arsenals)} pitchers for {year}")
    
    # Look up player names
    player_names = lookup_player_names(all_pitcher_ids)
    
    # Build combined output with historical data per pitcher
    pitchers = {}
    
    for pitcher_id in all_pitcher_ids:
        str_id = str(pitcher_id)
        
        # Get name (fallback to "Unknown" if not found)
        name = player_names.get(pitcher_id, f"Unknown ({pitcher_id})")
        
        # Build history by year
        history = {}
        for year in YEARS:
            if pitcher_id in yearly_arsenals.get(year, {}):
                history[str(year)] = yearly_arsenals[year][pitcher_id]
        
        if not history:
            continue
        
        # Current arsenal = most recent year available
        current_year = None
        current_arsenal = None
        for year in YEARS:  # Already sorted most recent first
            if str(year) in history:
                current_year = year
                current_arsenal = history[str(year)]
                break
        
        pitchers[str_id] = {
            'name': name,
            'mlbId': pitcher_id,
            'currentArsenal': current_arsenal,
            'arsenalHistory': history
        }
    
    print(f"\n{'=' * 60}")
    print(f"Total unique pitchers: {len(pitchers)}")
    print(f"{'=' * 60}")
    
    # Save to JSON
    output_path = os.path.join(os.path.dirname(__file__), '..', 'services', 'pitchArsenals.json')
    output_path = os.path.abspath(output_path)
    
    output_data = {
        'lastUpdated': datetime.now().isoformat(),
        'source': 'Baseball Savant via pybaseball',
        'years': YEARS,
        'pitcherCount': len(pitchers),
        'pitchers': pitchers
    }
    
    with open(output_path, 'w') as f:
        json.dump(output_data, f, indent=2)
    
    print(f"\nSaved to: {output_path}")
    
    # Print samples
    print("\nSample entries:")
    sample_ids = list(pitchers.keys())[:5]
    for pid in sample_ids:
        p = pitchers[pid]
        years_with_data = list(p['arsenalHistory'].keys())
        print(f"  {p['name']} (ID: {pid})")
        print(f"    Years: {years_with_data}")
        print(f"    Current ({years_with_data[0] if years_with_data else 'N/A'}): {p['currentArsenal'][:2] if p['currentArsenal'] else 'N/A'}...")


if __name__ == '__main__':
    main()
