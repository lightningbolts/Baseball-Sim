import requests
import os
import time

# Configuration
OUTPUT_DIR = "mlb_logos"
TEAMS_API_URL = "https://statsapi.mlb.com/api/v1/teams?sportId=1"

# List of URL patterns to try (in order of preference)
# 1. Primary on Dark (Best for full mascot/circle logos)
# 2. Primary on Light (Alternate full logo)
# 3. Cap on Dark (Fallback to letters if primary is missing)
URL_PATTERNS = [
    "https://www.mlbstatic.com/team-logos/team-primary-on-dark/{}.svg",
    "https://www.mlbstatic.com/team-logos/team-primary-on-light/{}.svg",
    "https://www.mlbstatic.com/team-logos/team-cap-on-dark/{}.svg"
]

# Manual mapping for your spreadsheet (Spreadsheet uses ATH, API uses OAK)
NAME_OVERRIDES = {
    "OAK": "ATH",
    "ANA": "LAA",
    "WAS": "WSH",
    "CWS": "CHW"
}

def download_logos():
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)

    print("Fetching team data...")
    try:
        data = requests.get(TEAMS_API_URL).json()
        teams = data.get('teams', [])
    except Exception as e:
        print(f"Error: {e}")
        return

    success_count = 0

    for team in teams:
        team_id = team['id']
        abbrev = team.get('fileCode', team.get('abbreviation')).upper()
        
        # Apply name overrides to match your JSON schedule
        if abbrev in NAME_OVERRIDES:
            abbrev = NAME_OVERRIDES[abbrev]

        print(f"Processing {abbrev} (ID: {team_id})...", end=" ")

        # Try patterns until one works
        found = False
        for pattern in URL_PATTERNS:
            url = pattern.format(team_id)
            try:
                response = requests.get(url)
                if response.status_code == 200:
                    # Save the file
                    file_path = os.path.join(OUTPUT_DIR, f"{abbrev}.svg")
                    with open(file_path, 'wb') as f:
                        f.write(response.content)
                    print(f"✔ Success ({pattern.split('/')[-2]})")
                    found = True
                    success_count += 1
                    break # Stop trying patterns for this team
            except:
                continue
        
        if not found:
            print("✘ Failed (All patterns 404)")
        
        time.sleep(0.05) # Be nice to the server

    print(f"\nDone! Downloaded {success_count} logos.")

if __name__ == "__main__":
    download_logos()