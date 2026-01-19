// Node script to convert the MLB ICS-derived CSV into a JSON schedule
// Output: services/schedule.json containing an array of GameResult-like entries
// Run: npm run convert:schedule

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'csv-parse/sync';

// Map CSV team names to internal team IDs
const TEAM_ID_MAP = {
  'Arizona Diamondbacks': 'ari',
  'Atlanta Braves': 'atl',
  'Baltimore Orioles': 'bal',
  'Boston Red Sox': 'bos',
  'Chicago Cubs': 'chc',
  'Chicago White Sox': 'cws',
  'Cincinnati Reds': 'cin',
  'Cleveland Guardians': 'cle',
  'Colorado Rockies': 'col',
  'Detroit Tigers': 'det',
  'Houston Astros': 'hou',
  'Kansas City Royals': 'kc',
  'Los Angeles Angels': 'laa',
  'Los Angeles Dodgers': 'lad',
  'Miami Marlins': 'mia',
  'Milwaukee Brewers': 'mil',
  'Minnesota Twins': 'min',
  'New York Mets': 'nym',
  'New York Yankees': 'nyy',
  'Oakland Athletics': 'oak',
  'Athletics': 'oak',
  'Philadelphia Phillies': 'phi',
  'Pittsburgh Pirates': 'pit',
  'San Diego Padres': 'sd',
  'San Francisco Giants': 'sf',
  'Seattle Mariners': 'sea',
  'St. Louis Cardinals': 'stl',
  'Tampa Bay Rays': 'tb',
  'Texas Rangers': 'tex',
  'Toronto Blue Jays': 'tor',
  'Washington Nationals': 'wsh'
};

function titleToTeams(title) {
  // Remove emoji and trim
  const clean = String(title || '').replace(/^⚾️\s*/, '').trim();
  const parts = clean.split(' @ ');
  if (parts.length !== 2) return null;
  const awayName = parts[0].trim();
  const homeName = parts[1].trim();
  const awayId = TEAM_ID_MAP[awayName] || '';
  const homeId = TEAM_ID_MAP[homeName] || '';
  if (!awayId || !homeId) return null;
  return { awayId, homeId, awayName, homeName };
}

function main() {
  const root = resolve('.');
  const csvPath = resolve(root, 'ICS to CSV Converter.csv');
  const outPath = resolve(root, 'services', 'schedule.json');

  const csvRaw = readFileSync(csvPath, 'utf8');
  // Handle duplicate column names and multiline descriptions
  const records = parse(csvRaw, {
    columns: (header) => header.map((h, i) => {
      if (h === 'Location' && i === 2) return 'Location1';
      if (h === 'Location' && i === 5) return 'Location2';
      return h;
    }),
    skip_empty_lines: true,
  });

  const schedule = [];
  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    const teams = titleToTeams(row.Title);
    if (!teams) continue;
    const dateStr = String(row.Starts || '').trim();
    if (!dateStr) continue;
    const stadium = String(row.Location1 || row.Location2 || '').trim() || undefined;
    schedule.push({
      id: `g_${i}_${teams.homeId}_${teams.awayId}`,
      date: dateStr,
      homeTeamId: teams.homeId,
      awayTeamId: teams.awayId,
      homeScore: 0,
      awayScore: 0,
      innings: 9,
      winnerId: '',
      played: false,
      log: [],
      stadium,
    });
  }

  // Sort by date to ensure chronological order
  schedule.sort((a, b) => new Date(a.date) - new Date(b.date));

  writeFileSync(outPath, JSON.stringify(schedule, null, 2));
  console.log(`Wrote ${schedule.length} games to ${outPath}`);
}

main();
