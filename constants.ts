
import { Team } from './types';

// Park factors (100 = neutral). Sources: Statcast Park Factors 2023-2025 and FanGraphs PF.
// Values are blended/rounded and used as directional modifiers for run scoring, HR, and BABIP.
const PARK_FACTORS: Record<string, { run: number; hr: number; babip: number }> = {
  nyy: { run: 100, hr: 115, babip: 98 },
  bal: { run: 100, hr: 105, babip: 103 },
  tb: { run: 98, hr: 96, babip: 98 },
  tor: { run: 100, hr: 104, babip: 99 },
  bos: { run: 105, hr: 108, babip: 105 },
  min: { run: 102, hr: 102, babip: 101 },
  det: { run: 99, hr: 98, babip: 102 },
  cle: { run: 98, hr: 94, babip: 99 },
  kc: { run: 101, hr: 95, babip: 103 },
  cws: { run: 99, hr: 98, babip: 99 },
  hou: { run: 100, hr: 103, babip: 99 },
  tex: { run: 97, hr: 104, babip: 98 },
  sea: { run: 92, hr: 90, babip: 95 },
  laa: { run: 101, hr: 102, babip: 100 },
  oak: { run: 96, hr: 92, babip: 97 },
  atl: { run: 101, hr: 102, babip: 101 },
  phi: { run: 102, hr: 110, babip: 100 },
  mia: { run: 95, hr: 90, babip: 96 },
  nym: { run: 97, hr: 95, babip: 98 },
  wsh: { run: 100, hr: 99, babip: 100 },
  mil: { run: 97, hr: 106, babip: 97 },
  chc: { run: 99, hr: 100, babip: 100 },
  cin: { run: 104, hr: 120, babip: 101 },
  pit: { run: 99, hr: 94, babip: 100 },
  stl: { run: 98, hr: 96, babip: 99 },
  lad: { run: 99, hr: 103, babip: 99 },
  ari: { run: 103, hr: 105, babip: 103 },
  sf: { run: 96, hr: 85, babip: 98 },
  sd: { run: 96, hr: 90, babip: 98 },
  col: { run: 112, hr: 125, babip: 115 }
};

export const TEAMS_DATA: Omit<Team, 'roster' | 'wins' | 'losses' | 'runsScored' | 'runsAllowed' | 'isRosterGenerated' | 'staff' | 'frontOffice' | 'dataSources'>[] = [
  { id: 'nyy', mlbId: 147, city: 'New York', name: 'Yankees', abbreviation: 'NYY', logoUrl: './mlb_logos/NYY.svg', stadium: 'Yankee Stadium', league: 'AL', division: 'East', primaryColor: '#003087', secondaryColor: '#E4002C', parkFactors: PARK_FACTORS.nyy },
  { id: 'bal', mlbId: 110, city: 'Baltimore', name: 'Orioles', abbreviation: 'BAL', logoUrl: './mlb_logos/BAL.svg', stadium: 'Camden Yards', league: 'AL', division: 'East', primaryColor: '#DF4601', secondaryColor: '#000000', parkFactors: PARK_FACTORS.bal },
  { id: 'tb', mlbId: 139, city: 'Tampa Bay', name: 'Rays', abbreviation: 'TB', logoUrl: './mlb_logos/TB.svg', stadium: 'Tropicana Field', league: 'AL', division: 'East', primaryColor: '#092C5C', secondaryColor: '#8FBCE6', parkFactors: PARK_FACTORS.tb },
  { id: 'tor', mlbId: 141, city: 'Toronto', name: 'Blue Jays', abbreviation: 'TOR', logoUrl: './mlb_logos/TOR.svg', stadium: 'Rogers Centre', league: 'AL', division: 'East', primaryColor: '#134A8E', secondaryColor: '#1D2D5C', parkFactors: PARK_FACTORS.tor },
  { id: 'bos', mlbId: 111, city: 'Boston', name: 'Red Sox', abbreviation: 'BOS', logoUrl: './mlb_logos/BOS.svg', stadium: 'Fenway Park', league: 'AL', division: 'East', primaryColor: '#BD3039', secondaryColor: '#0C2340', parkFactors: PARK_FACTORS.bos },
  
  { id: 'min', mlbId: 142, city: 'Minnesota', name: 'Twins', abbreviation: 'MIN', logoUrl: './mlb_logos/MIN.svg', stadium: 'Target Field', league: 'AL', division: 'Central', primaryColor: '#002B5C', secondaryColor: '#D31145', parkFactors: PARK_FACTORS.min },
  { id: 'det', mlbId: 116, city: 'Detroit', name: 'Tigers', abbreviation: 'DET', logoUrl: './mlb_logos/DET.svg', stadium: 'Comerica Park', league: 'AL', division: 'Central', primaryColor: '#0C2340', secondaryColor: '#FA4616', parkFactors: PARK_FACTORS.det },
  { id: 'cle', mlbId: 114, city: 'Cleveland', name: 'Guardians', abbreviation: 'CLE', logoUrl: './mlb_logos/CLE.svg', stadium: 'Progressive Field', league: 'AL', division: 'Central', primaryColor: '#00385D', secondaryColor: '#E50022', parkFactors: PARK_FACTORS.cle },
  { id: 'kc', mlbId: 118, city: 'Kansas City', name: 'Royals', abbreviation: 'KC', logoUrl: './mlb_logos/KC.svg', stadium: 'Kauffman Stadium', league: 'AL', division: 'Central', primaryColor: '#004687', secondaryColor: '#BD9B60', parkFactors: PARK_FACTORS.kc },
  { id: 'cws', mlbId: 145, city: 'Chicago', name: 'White Sox', abbreviation: 'CWS', logoUrl: './mlb_logos/CHW.svg', stadium: 'Guaranteed Rate Field', league: 'AL', division: 'Central', primaryColor: '#27251F', secondaryColor: '#C4CED4', parkFactors: PARK_FACTORS.cws },

  { id: 'hou', mlbId: 117, city: 'Houston', name: 'Astros', abbreviation: 'HOU', logoUrl: './mlb_logos/HOU.svg', stadium: 'Minute Maid Park', league: 'AL', division: 'West', primaryColor: '#002D62', secondaryColor: '#EB6E1F', parkFactors: PARK_FACTORS.hou },
  { id: 'tex', mlbId: 140, city: 'Texas', name: 'Rangers', abbreviation: 'TEX', logoUrl: './mlb_logos/TEX.svg', stadium: 'Globe Life Field', league: 'AL', division: 'West', primaryColor: '#003278', secondaryColor: '#C0111F', parkFactors: PARK_FACTORS.tex },
  { id: 'sea', mlbId: 136, city: 'Seattle', name: 'Mariners', abbreviation: 'SEA', logoUrl: './mlb_logos/SEA.svg', stadium: 'T-Mobile Park', league: 'AL', division: 'West', primaryColor: '#0C2C56', secondaryColor: '#005C5C', parkFactors: PARK_FACTORS.sea },
  { id: 'laa', mlbId: 108, city: 'Los Angeles', name: 'Angels', abbreviation: 'LAA', logoUrl: './mlb_logos/LAA.svg', stadium: 'Angel Stadium', league: 'AL', division: 'West', primaryColor: '#BA0021', secondaryColor: '#003263', parkFactors: PARK_FACTORS.laa },
  { id: 'oak', mlbId: 133, city: 'Oakland', name: 'Athletics', abbreviation: 'OAK', logoUrl: './mlb_logos/ATH.svg', stadium: 'Sutter Health Park', league: 'AL', division: 'West', primaryColor: '#003831', secondaryColor: '#EFB21E', parkFactors: PARK_FACTORS.oak },

  { id: 'atl', mlbId: 144, city: 'Atlanta', name: 'Braves', abbreviation: 'ATL', logoUrl: './mlb_logos/ATL.svg', stadium: 'Truist Park', league: 'NL', division: 'East', primaryColor: '#CE1141', secondaryColor: '#13274F', parkFactors: PARK_FACTORS.atl },
  { id: 'phi', mlbId: 143, city: 'Philadelphia', name: 'Phillies', abbreviation: 'PHI', logoUrl: './mlb_logos/PHI.svg', stadium: 'Citizens Bank Park', league: 'NL', division: 'East', primaryColor: '#E81828', secondaryColor: '#002D72', parkFactors: PARK_FACTORS.phi },
  { id: 'mia', mlbId: 146, city: 'Miami', name: 'Marlins', abbreviation: 'MIA', logoUrl: './mlb_logos/MIA.svg', stadium: 'LoanDepot Park', league: 'NL', division: 'East', primaryColor: '#00A3E0', secondaryColor: '#EF3340', parkFactors: PARK_FACTORS.mia },
  { id: 'nym', mlbId: 121, city: 'New York', name: 'Mets', abbreviation: 'NYM', logoUrl: './mlb_logos/NYM.svg', stadium: 'Citi Field', league: 'NL', division: 'East', primaryColor: '#002D72', secondaryColor: '#FF5910', parkFactors: PARK_FACTORS.nym },
  { id: 'wsh', mlbId: 120, city: 'Washington', name: 'Nationals', abbreviation: 'WSH', logoUrl: './mlb_logos/WSH.svg', stadium: 'Nationals Park', league: 'NL', division: 'East', primaryColor: '#AB0003', secondaryColor: '#14225A', parkFactors: PARK_FACTORS.wsh },

  { id: 'mil', mlbId: 158, city: 'Milwaukee', name: 'Brewers', abbreviation: 'MIL', logoUrl: './mlb_logos/MIL.svg', stadium: 'American Family Field', league: 'NL', division: 'Central', primaryColor: '#FFC52F', secondaryColor: '#12284B', parkFactors: PARK_FACTORS.mil },
  { id: 'chc', mlbId: 112, city: 'Chicago', name: 'Cubs', abbreviation: 'CHC', logoUrl: './mlb_logos/CHC.svg', stadium: 'Wrigley Field', league: 'NL', division: 'Central', primaryColor: '#0E3386', secondaryColor: '#CC3433', parkFactors: PARK_FACTORS.chc },
  { id: 'cin', mlbId: 113, city: 'Cincinnati', name: 'Reds', abbreviation: 'CIN', logoUrl: './mlb_logos/CIN.svg', stadium: 'Great American Ball Park', league: 'NL', division: 'Central', primaryColor: '#C6011F', secondaryColor: '#000000', parkFactors: PARK_FACTORS.cin },
  { id: 'pit', mlbId: 134, city: 'Pittsburgh', name: 'Pirates', abbreviation: 'PIT', logoUrl: './mlb_logos/PIT.svg', stadium: 'PNC Park', league: 'NL', division: 'Central', primaryColor: '#FDB827', secondaryColor: '#27251F', parkFactors: PARK_FACTORS.pit },
  { id: 'stl', mlbId: 138, city: 'St. Louis', name: 'Cardinals', abbreviation: 'STL', logoUrl: './mlb_logos/STL.svg', stadium: 'Busch Stadium', league: 'NL', division: 'Central', primaryColor: '#C41E3A', secondaryColor: '#0C2340', parkFactors: PARK_FACTORS.stl },

  { id: 'lad', mlbId: 119, city: 'Los Angeles', name: 'Dodgers', abbreviation: 'LAD', logoUrl: './mlb_logos/LA.svg', stadium: 'Dodger Stadium', league: 'NL', division: 'West', primaryColor: '#005A9C', secondaryColor: '#EF3E42', parkFactors: PARK_FACTORS.lad },
  { id: 'ari', mlbId: 109, city: 'Arizona', name: 'Diamondbacks', abbreviation: 'ARI', logoUrl: './mlb_logos/ARI.svg', stadium: 'Chase Field', league: 'NL', division: 'West', primaryColor: '#A71930', secondaryColor: '#E3D4AD', parkFactors: PARK_FACTORS.ari },
  { id: 'sf', mlbId: 137, city: 'San Francisco', name: 'Giants', abbreviation: 'SF', logoUrl: './mlb_logos/SF.svg', stadium: 'Oracle Park', league: 'NL', division: 'West', primaryColor: '#FD5A1E', secondaryColor: '#27251F', parkFactors: PARK_FACTORS.sf },
  { id: 'sd', mlbId: 135, city: 'San Diego', name: 'Padres', abbreviation: 'SD', logoUrl: './mlb_logos/SD.svg', stadium: 'Petco Park', league: 'NL', division: 'West', primaryColor: '#2F241D', secondaryColor: '#FFC425', parkFactors: PARK_FACTORS.sd },
  { id: 'col', mlbId: 115, city: 'Colorado', name: 'Rockies', abbreviation: 'COL', logoUrl: './mlb_logos/COL.svg', stadium: 'Coors Field', league: 'NL', division: 'West', primaryColor: '#333366', secondaryColor: '#C0C0C0', parkFactors: PARK_FACTORS.col },
];
