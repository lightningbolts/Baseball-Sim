
import { Team } from './types';

export const TEAMS_DATA: Omit<Team, 'roster' | 'wins' | 'losses' | 'runsScored' | 'runsAllowed' | 'isRosterGenerated' | 'staff' | 'frontOffice' | 'dataSources'>[] = [
  { id: 'nyy', mlbId: 147, city: 'New York', name: 'Yankees', abbreviation: 'NYY', stadium: 'Yankee Stadium', league: 'AL', division: 'East', primaryColor: '#003087', secondaryColor: '#E4002C' },
  { id: 'bal', mlbId: 110, city: 'Baltimore', name: 'Orioles', abbreviation: 'BAL', stadium: 'Camden Yards', league: 'AL', division: 'East', primaryColor: '#DF4601', secondaryColor: '#000000' },
  { id: 'tb', mlbId: 139, city: 'Tampa Bay', name: 'Rays', abbreviation: 'TB', stadium: 'Tropicana Field', league: 'AL', division: 'East', primaryColor: '#092C5C', secondaryColor: '#8FBCE6' },
  { id: 'tor', mlbId: 141, city: 'Toronto', name: 'Blue Jays', abbreviation: 'TOR', stadium: 'Rogers Centre', league: 'AL', division: 'East', primaryColor: '#134A8E', secondaryColor: '#1D2D5C' },
  { id: 'bos', mlbId: 111, city: 'Boston', name: 'Red Sox', abbreviation: 'BOS', stadium: 'Fenway Park', league: 'AL', division: 'East', primaryColor: '#BD3039', secondaryColor: '#0C2340' },
  
  { id: 'min', mlbId: 142, city: 'Minnesota', name: 'Twins', abbreviation: 'MIN', stadium: 'Target Field', league: 'AL', division: 'Central', primaryColor: '#002B5C', secondaryColor: '#D31145' },
  { id: 'det', mlbId: 116, city: 'Detroit', name: 'Tigers', abbreviation: 'DET', stadium: 'Comerica Park', league: 'AL', division: 'Central', primaryColor: '#0C2340', secondaryColor: '#FA4616' },
  { id: 'cle', mlbId: 114, city: 'Cleveland', name: 'Guardians', abbreviation: 'CLE', stadium: 'Progressive Field', league: 'AL', division: 'Central', primaryColor: '#00385D', secondaryColor: '#E50022' },
  { id: 'kc', mlbId: 118, city: 'Kansas City', name: 'Royals', abbreviation: 'KC', stadium: 'Kauffman Stadium', league: 'AL', division: 'Central', primaryColor: '#004687', secondaryColor: '#BD9B60' },
  { id: 'cws', mlbId: 145, city: 'Chicago', name: 'White Sox', abbreviation: 'CWS', stadium: 'Guaranteed Rate Field', league: 'AL', division: 'Central', primaryColor: '#27251F', secondaryColor: '#C4CED4' },

  { id: 'hou', mlbId: 117, city: 'Houston', name: 'Astros', abbreviation: 'HOU', stadium: 'Minute Maid Park', league: 'AL', division: 'West', primaryColor: '#002D62', secondaryColor: '#EB6E1F' },
  { id: 'tex', mlbId: 140, city: 'Texas', name: 'Rangers', abbreviation: 'TEX', stadium: 'Globe Life Field', league: 'AL', division: 'West', primaryColor: '#003278', secondaryColor: '#C0111F' },
  { id: 'sea', mlbId: 136, city: 'Seattle', name: 'Mariners', abbreviation: 'SEA', stadium: 'T-Mobile Park', league: 'AL', division: 'West', primaryColor: '#0C2C56', secondaryColor: '#005C5C' },
  { id: 'laa', mlbId: 108, city: 'Los Angeles', name: 'Angels', abbreviation: 'LAA', stadium: 'Angel Stadium', league: 'AL', division: 'West', primaryColor: '#BA0021', secondaryColor: '#003263' },
  { id: 'oak', mlbId: 133, city: 'Oakland', name: 'Athletics', abbreviation: 'OAK', stadium: 'Sutter Health Park', league: 'AL', division: 'West', primaryColor: '#003831', secondaryColor: '#EFB21E' },

  { id: 'atl', mlbId: 144, city: 'Atlanta', name: 'Braves', abbreviation: 'ATL', stadium: 'Truist Park', league: 'NL', division: 'East', primaryColor: '#CE1141', secondaryColor: '#13274F' },
  { id: 'phi', mlbId: 143, city: 'Philadelphia', name: 'Phillies', abbreviation: 'PHI', stadium: 'Citizens Bank Park', league: 'NL', division: 'East', primaryColor: '#E81828', secondaryColor: '#002D72' },
  { id: 'mia', mlbId: 146, city: 'Miami', name: 'Marlins', abbreviation: 'MIA', stadium: 'LoanDepot Park', league: 'NL', division: 'East', primaryColor: '#00A3E0', secondaryColor: '#EF3340' },
  { id: 'nym', mlbId: 121, city: 'New York', name: 'Mets', abbreviation: 'NYM', stadium: 'Citi Field', league: 'NL', division: 'East', primaryColor: '#002D72', secondaryColor: '#FF5910' },
  { id: 'wsh', mlbId: 120, city: 'Washington', name: 'Nationals', abbreviation: 'WSH', stadium: 'Nationals Park', league: 'NL', division: 'East', primaryColor: '#AB0003', secondaryColor: '#14225A' },

  { id: 'mil', mlbId: 158, city: 'Milwaukee', name: 'Brewers', abbreviation: 'MIL', stadium: 'American Family Field', league: 'NL', division: 'Central', primaryColor: '#FFC52F', secondaryColor: '#12284B' },
  { id: 'chc', mlbId: 112, city: 'Chicago', name: 'Cubs', abbreviation: 'CHC', stadium: 'Wrigley Field', league: 'NL', division: 'Central', primaryColor: '#0E3386', secondaryColor: '#CC3433' },
  { id: 'cin', mlbId: 113, city: 'Cincinnati', name: 'Reds', abbreviation: 'CIN', stadium: 'Great American Ball Park', league: 'NL', division: 'Central', primaryColor: '#C6011F', secondaryColor: '#000000' },
  { id: 'pit', mlbId: 134, city: 'Pittsburgh', name: 'Pirates', abbreviation: 'PIT', stadium: 'PNC Park', league: 'NL', division: 'Central', primaryColor: '#FDB827', secondaryColor: '#27251F' },
  { id: 'stl', mlbId: 138, city: 'St. Louis', name: 'Cardinals', abbreviation: 'STL', stadium: 'Busch Stadium', league: 'NL', division: 'Central', primaryColor: '#C41E3A', secondaryColor: '#0C2340' },

  { id: 'lad', mlbId: 119, city: 'Los Angeles', name: 'Dodgers', abbreviation: 'LAD', stadium: 'Dodger Stadium', league: 'NL', division: 'West', primaryColor: '#005A9C', secondaryColor: '#EF3E42' },
  { id: 'ari', mlbId: 109, city: 'Arizona', name: 'Diamondbacks', abbreviation: 'ARI', stadium: 'Chase Field', league: 'NL', division: 'West', primaryColor: '#A71930', secondaryColor: '#E3D4AD' },
  { id: 'sf', mlbId: 137, city: 'San Francisco', name: 'Giants', abbreviation: 'SF', stadium: 'Oracle Park', league: 'NL', division: 'West', primaryColor: '#FD5A1E', secondaryColor: '#27251F' },
  { id: 'sd', mlbId: 135, city: 'San Diego', name: 'Padres', abbreviation: 'SD', stadium: 'Petco Park', league: 'NL', division: 'West', primaryColor: '#2F241D', secondaryColor: '#FFC425' },
  { id: 'col', mlbId: 115, city: 'Colorado', name: 'Rockies', abbreviation: 'COL', stadium: 'Coors Field', league: 'NL', division: 'West', primaryColor: '#333366', secondaryColor: '#C0C0C0' },
];
