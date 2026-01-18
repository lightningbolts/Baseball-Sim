
export enum Position {
  P = 'P',
  C = 'C',
  TB = '1B',
  SB = '2B',
  TB_3 = '3B',
  SS = 'SS',
  LF = 'LF',
  CF = 'CF',
  RF = 'RF',
  DH = 'DH'
}

export interface AdvancedBattingStats {
  woba: number;
  wrc_plus: number;
  iso: number;
  babip: number;
  bb_pct: number;
  k_pct: number;
}

export interface StatcastBattingStats {
  exitVelocity: number;
  launchAngle: number;
  barrel_pct: number;
  hardHit_pct: number;
  whiff_pct: number;
  sprintSpeed: number;
}

export interface AdvancedPitchingStats {
  fip: number;
  xfip: number;
  k9: number;
  bb9: number;
  hr9: number;
  csw_pct: number;
  siera: number;
  babip: number;
}

export interface StatcastPitchingStats {
  avgVelocity: number;
  spinRate: number;
  extension: number;
}

export interface DefensiveStats {
  fpct: number;
  drs: number;
  uzr: number;
  oaa: number;
  po: number;
  a: number;
  e: number;
  dp: number;
  rf9: number;
  chances: number;
  popTime?: number;
  framing?: number;
}

export interface BattingStats extends AdvancedBattingStats, StatcastBattingStats {
  avg: number;
  obp: number;
  slg: number;
  ops: number;
  hr: number;
  rbi: number;
  sb: number;
  war: number;
}

export interface PitchingStats extends AdvancedPitchingStats, StatcastPitchingStats {
  era: number;
  whip: number;
  so: number;
  bb: number;
  ip: number;
  saves: number;
  holds: number;
  blownSaves: number;
  war: number;
  pitchesThrown: number;
}

export interface PlayerHistoryEntry {
  year: string;
  team: string;
  stats: {
    games: number;
    starts?: number;
    wins?: number;
    losses?: number;
    saves?: number;
    era?: number;
    ip?: number;
    so?: number;
    bb?: number;
    whip?: number;
    k9?: number;
    bb9?: number;
    fip?: number;
    
    avg?: number;
    hr?: number;
    rbi?: number;
    ops?: number;
    obp?: number;
    slg?: number;
    sb?: number;
    woba?: number;
    iso?: number;
    
    d?: number; 
    t?: number; 
    sf?: number; 
    sac?: number; 
    hbp?: number; 
    gidp?: number; 
  }
}

export interface Injury {
  isInjured: boolean;
  type: string;
  daysRemaining: number;
  severity: 'Day-to-Day' | '10-Day IL' | '60-Day IL' | 'Season Ending';
}

export interface StatsCounters {
  // Offense
  ab: number;
  h: number;
  d: number; // 2B
  t: number; // 3B
  hr: number;
  gsh: number; // Grand Slam
  bb: number;
  ibb: number; // Intentional Walk
  hbp: number; 
  so: number;
  rbi: number;
  sb: number;
  cs: number; 
  gidp: number; 
  sf: number; 
  sac: number; // SH
  r: number;
  lob: number; // Left On Base
  xbh: number; // Extra Base Hits (derived usually, but tracked for cache)
  tb: number; // Total Bases
  roe: number; // Reached on Error
  wo: number; // Walk-off hits
  pa: number;

  // Statcast / Advanced Offense
  totalExitVelo: number;
  battedBallEvents: number;
  hardHits: number;
  barrels: number;
  swings: number;
  whiffs: number;
  groundouts: number;
  flyouts: number; // For GO/AO
  
  // Pitching
  outsPitched: number; // IP = outs / 3
  er: number;
  p_r: number; // Runs allowed (total)
  p_h: number;
  p_bb: number;
  p_ibb: number;
  p_hbp: number;
  p_hr: number;
  p_so: number;
  wp: number; 
  bk: number; // Balk
  pk: number; // Pickoff
  bf: number; // Batters Faced
  wins: number;
  losses: number;
  saves: number;
  holds: number;
  blownSaves: number;
  pitchesThrown: number;
  strikes: number;
  qs: number; // Quality Start
  cg: number; // Complete Game
  sho: number; // Shutout
  gf: number; // Games Finished
  svo: number; // Save Opportunity
  ir: number; // Inherited Runners
  irs: number; // Inherited Runners Scored
  rw: number; // Relief Win (optional, usually just W)
  gs: number; // Games Started
  
  // Defense
  po: number;
  a: number;
  e: number;
  dp: number;
  tp: number; // Triple Play
  pb: number; // Passed Ball
  ofa: number; // Outfield Assist
  chances: number;
  inn: number; // Innings Played at Position
}

export interface PlayerRatings {
  contact: number;
  power: number;
  eye: number; 
  speed: number;
  defense: number;
  reaction: number;
  arm: number;
  
  stuff: number; 
  control: number; 
  stamina: number; 
  velocity: number;
  spin: number;
}

export interface PitchRepertoireEntry {
    type: string;
    speed: number;
    usage: number;
}

export interface Player {
  id: string;
  name: string;
  position: Position;
  isTwoWay: boolean; // NEW: Track Ohtani-like players
  number: number;
  age: number;
  daysRest: number; 
  rotationSlot: number; 
  rating: number; 
  potential: number;
  attributes: PlayerRatings;
  pitchRepertoire?: PitchRepertoireEntry[];
  batting?: BattingStats;
  pitching?: PitchingStats;
  defense?: DefensiveStats;
  statsCounters: StatsCounters;
  trait?: string;
  injury: Injury;
  history: PlayerHistoryEntry[];
  seasonStats: {
    games: number;
    hr: number;
    avg: number;
    wins: number;
    losses: number;
    era: number;
  };
}

export interface StaffMember {
  name: string;
  role: 'Manager' | 'Hitting Coach' | 'Pitching Coach';
  philosophy: string; 
  bonus: number; 
}

export interface FrontOffice {
  gmName: string;
  strategy: 'Analytics' | 'Traditional' | 'Small Market' | 'Big Spender' | 'Moneyball';
  budget: number; 
}

export interface Team {
  id: string;
  mlbId: number; 
  city: string;
  name: string;
  abbreviation: string;
  stadium: string;
  league: 'AL' | 'NL';
  division: 'East' | 'Central' | 'West';
  roster: Player[];
  staff: StaffMember[];
  frontOffice: FrontOffice;
  wins: number;
  losses: number;
  runsScored: number;
  runsAllowed: number;
  primaryColor: string;
  secondaryColor: string;
  isRosterGenerated: boolean;
  dataSources?: string[];
}

export interface PitchDetails {
  number: number;
  result: string;
  description: string;
  count: string;
}

export interface GameEvent {
  description: string;
  type: 'hit' | 'out' | 'walk' | 'run' | 'info' | 'injury' | 'steal' | 'error';
  inning: number;
  isTop: boolean;
  pitches?: PitchDetails[];
  injured?: {
    player: Player;
    type: string;
    daysRemaining: number;
    severity: string;
  };
}

export interface BoxScorePlayer {
    id: string;
    name: string;
    pos: Position;
    stats: StatsCounters;
}

export interface LineScore {
    innings: { inning: number; away: number; home: number }[];
    awayTotal: number;
    homeTotal: number;
    awayHits: number;
    homeHits: number;
    awayErrors: number;
    homeErrors: number;
}

export interface BoxScore {
    homeLineup: BoxScorePlayer[];
    awayLineup: BoxScorePlayer[];
    homePitchers: BoxScorePlayer[];
    awayPitchers: BoxScorePlayer[];
    lineScore: LineScore;
}

export interface GameResult {
  id: string;
  date: string; 
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  innings: number;
  winnerId: string;
  played: boolean;
  isPostseason?: boolean;
  seriesId?: string; 
  log: GameEvent[];
  boxScore?: BoxScore;
  stadium?: string;
}

export interface PostseasonSeries {
  id: string;
  round: 'Wild Card' | 'DS' | 'CS' | 'World Series';
  team1Id: string;
  team2Id: string;
  wins1: number;
  wins2: number;
  gamesNeeded: number; 
  winnerId?: string;
}

export interface SeasonState {
  teams: Team[];
  schedule: GameResult[];
  date: Date;
  phase: 'Regular Season' | 'Postseason' | 'Offseason';
  isPlaying: boolean;
  postseason: {
    bracket: PostseasonSeries[];
    round: 'Wild Card' | 'DS' | 'CS' | 'World Series' | 'Finished';
  } | null;
}
