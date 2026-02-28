
import { Player, Position, StaffMember, PlayerRatings, PlayerHistoryEntry, StatsCounters, DefensiveStats, PitchRepertoireEntry, SavantBatterStats, SavantPitchingStats } from "../types";

// Import real pitch arsenal data fetched from Baseball Savant via pybaseball
import pitchArsenalData from './pitchArsenals.json';

// Import real batter savant data fetched from Baseball Savant via pybaseball
import batterSavantData from './batterSavant.json';

// Import real pitcher savant data fetched from Baseball Savant via pybaseball
import pitcherSavantData from './pitcherSavant.json';

const BASE_URL = "https://statsapi.mlb.com/api/v1";

// Type the imported arsenal data (new structure with names and history)
interface PitcherArsenalData {
    name: string;
    mlbId: number;
    currentArsenal: PitchRepertoireEntry[];
    arsenalHistory: Record<string, PitchRepertoireEntry[]>;  // year -> arsenal
}

interface PitchArsenalCache {
    lastUpdated: string;
    source: string;
    years: number[];
    pitcherCount: number;
    pitchers: Record<string, PitcherArsenalData>;
}

const realArsenals: PitchArsenalCache = pitchArsenalData as PitchArsenalCache;

// Type the imported batter savant data
interface BatterSavantEntry {
    name: string;
    mlbId: number;
    currentStats: SavantBatterStats | null;
    statsHistory: Record<string, SavantBatterStats>;
}

interface BatterSavantCache {
    lastUpdated: string;
    source: string;
    years: number[];
    batterCount: number;
    batters: Record<string, BatterSavantEntry>;
}

const realBatterSavant: BatterSavantCache = batterSavantData as unknown as BatterSavantCache;

// Type the imported pitcher savant data
interface PitcherSavantEntry {
    name: string;
    mlbId: number;
    currentStats: SavantPitchingStats | null;
    statsHistory: Record<string, SavantPitchingStats>;
}

interface PitcherSavantCache {
    lastUpdated: string;
    source: string;
    years: number[];
    pitcherCount: number;
    pitchers: Record<string, PitcherSavantEntry>;
}

const realPitcherSavant: PitcherSavantCache = pitcherSavantData as unknown as PitcherSavantCache;

const mapPosition = (posData: any): Position => {
    if (
        posData.type === "Pitcher" || 
        ['P', 'SP', 'RP', 'CL', 'RHP', 'LHP'].includes(posData.abbreviation) ||
        posData.code === '1'
    ) {
        return Position.P;
    }
    switch (posData.code) {
        case '2': return Position.C;
        case '3': return Position.TB;
        case '4': return Position.SB;
        case '5': return Position.TB_3;
        case '6': return Position.SS;
        case '7': return Position.LF;
        case '8': return Position.CF;
        case '9': return Position.RF;
        case '10': return Position.DH;
        case 'Y': return Position.DH; 
    }
    switch(posData.abbreviation) {
        case '1B': return Position.TB;
        case '2B': return Position.SB;
        case '3B': return Position.TB_3;
        case 'SS': return Position.SS;
        case 'LF': return Position.LF;
        case 'CF': return Position.CF;
        case 'RF': return Position.RF;
        case 'C': return Position.C;
        case 'DH': return Position.DH;
        case 'OF': return Position.CF;
    }
    return Position.DH;
};

const calcRating = (val: number, min: number, max: number) => {
    if (val === undefined || val === null || isNaN(val)) return 50;
    if (val < min) return 20;
    if (val > max) return 99;
    return 20 + ((val - min) / (max - min)) * 79;
};

const computeHistoricalOverall = (history: PlayerHistoryEntry[], mode: 'hitting' | 'pitching'): number => {
    const filtered = history.filter(h => {
        const yr = parseInt(h.year, 10) || 0;
        return yr >= 2022 && yr <= 2025;
    });
    const sortedAll = [...history].sort((a, b) => (parseInt(b.year, 10) || 0) - (parseInt(a.year, 10) || 0));
    const recent = (filtered.length > 0 ? filtered : sortedAll).slice(0, 4);
    if (recent.length === 0) return 60;

    const weights = recent.map((h, idx) => {
        const year = parseInt(h.year, 10) || 0;
        const recency = year >= 2025 ? 1.4 : year >= 2024 ? 1.25 : year >= 2023 ? 1.1 : 1.0;
        const decay = Math.max(0.15, 0.85 - idx * 0.12);
        return recency * decay;
    });

    const weighted = recent.map((h, idx) => ({ h, w: weights[idx] }));
    const sumW = weights.reduce((a, b) => a + b, 0) || 1;

    if (mode === 'hitting') {
        const avg = weighted.reduce((sum, x) => sum + (x.h.stats.avg || 0.250) * x.w, 0) / sumW;
        const ops = weighted.reduce((sum, x) => sum + (x.h.stats.ops || 0.700) * x.w, 0) / sumW;
        const woba = weighted.reduce((sum, x) => sum + (x.h.stats.woba || 0.310) * x.w, 0) / sumW;

        const avgScore = calcRating(avg, 0.210, 0.310);
        const opsScore = calcRating(ops, 0.640, 0.920);
        const wobaScore = calcRating(woba, 0.280, 0.400);
        return Math.round((avgScore * 0.35) + (opsScore * 0.45) + (wobaScore * 0.20));
    }

    const era = weighted.reduce((sum, x) => sum + (x.h.stats.era || 4.50) * x.w, 0) / sumW;
    const fip = weighted.reduce((sum, x) => sum + (x.h.stats.fip || 4.30) * x.w, 0) / sumW;
    const k9 = weighted.reduce((sum, x) => sum + (x.h.stats.k9 || 8.0) * x.w, 0) / sumW;

    const eraScore = calcRating(5.00 - era, 2.70, 5.10);
    const fipScore = calcRating(5.00 - fip, 2.70, 5.10);
    const kScore = calcRating(k9, 5.0, 12.0);
    return Math.round((eraScore * 0.45) + (fipScore * 0.35) + (kScore * 0.20));
};

// Helper to estimate FIP from basic stats if not provided
const estimateFIP = (hr: number, bb: number, hbp: number, k: number, ip: number) => {
    if (ip <= 0) return 4.50;
    const fipConstant = 3.10;
    return ((13 * hr) + (3 * (bb + hbp)) - (2 * k)) / ip + fipConstant;
};

// Helper to estimate wOBA weights
const calculateWOBA = (bb: number, hbp: number, h: number, d: number, t: number, hr: number, sf: number, ab: number) => {
    const s = h - d - t - hr; // singles
    const denom = ab + bb + sf + hbp;
    if (denom === 0) return 0;
    return ((0.69 * bb) + (0.72 * hbp) + (0.89 * s) + (1.27 * d) + (1.62 * t) + (2.10 * hr)) / denom;
};

export const fetchCoachingStaff = async (teamMlbId: number): Promise<StaffMember[]> => {
    try {
        const res = await fetch(`${BASE_URL}/teams/${teamMlbId}/coaches`);
        if (!res.ok) return [];
        const data = await res.json();
        const coaches = data.roster || [];
        
        return coaches.map((c: any) => {
             let role: any = c.job;
             if (role === 'Manager') role = 'Manager';
             else if (role.includes('Hitting')) role = 'Hitting Coach';
             else if (role.includes('Pitching')) role = 'Pitching Coach';
             else role = 'Assistant Coach';

             return {
                name: c.person.fullName,
                role: role, 
                philosophy: ['Old School', 'Analytics', 'Aggressive', 'Patient'][Math.floor(Math.random() * 4)], 
                bonus: Math.floor(Math.random() * 5) + 1
             };
        }).filter((c: StaffMember) => 
            ['Manager', 'Pitching Coach', 'Hitting Coach'].includes(c.role)
        ).slice(0, 5);
    } catch (e) {
        console.warn("Failed to fetch coaches", e);
        return [];
    }
};

const fetchPitchArsenal = async (personId: number): Promise<PitchRepertoireEntry[]> => {
    try {
        // Try multiple endpoints for pitch data
        // 1. Primary: pitchArsenal stats endpoint
        // 2. Fallback: statSplits with pitch type breakdown
        const [arsenalRes, splitsRes] = await Promise.all([
            fetch(`${BASE_URL}/people/${personId}/stats?stats=pitchArsenal&group=pitching`),
            fetch(`${BASE_URL}/people/${personId}/stats?stats=statSplits&sitCodes=pitch&group=pitching&season=2025`)
        ]);
        
        let arsenal: PitchRepertoireEntry[] = [];
        
        // Try primary pitchArsenal endpoint
        if (arsenalRes.ok) {
            const data = await arsenalRes.json();
            const splits = data.stats?.[0]?.splits || [];
            
            if (splits.length > 0) {
                arsenal = splits.map((s: any) => ({
                    type: s.type?.displayName || s.pitchType?.description || 'Unknown',
                    speed: s.averageSpeed || s.stat?.avgSpeed || 0,
                    usage: (s.percentage || s.stat?.pitchPct || 0) * 100
                })).filter((p: PitchRepertoireEntry) => p.usage >= 5); // Only include pitches used 5%+ regularly
            }
        }
        
        // If no data from primary, try splits endpoint
        if (arsenal.length === 0 && splitsRes.ok) {
            const splitsData = await splitsRes.json();
            const pitchSplits = splitsData.stats?.[0]?.splits || [];
            
            arsenal = pitchSplits.map((s: any) => {
                const pitchName = s.split?.description || s.pitchType?.description || 'Fastball';
                return {
                    type: pitchName,
                    speed: s.stat?.avgSpeed || s.stat?.pitchSpeed || 0,
                    usage: (s.stat?.pitchPercent || s.stat?.pitchPct || 0) * 100
                };
            }).filter((p: PitchRepertoireEntry) => p.usage >= 5); // Only include pitches used 5%+ regularly
        }
        
        // Normalize usage percentages if we have data
        // Also cap at 6 pitches max (very few pitchers have more than 5 regularly used pitches)
        if (arsenal.length > 0) {
            // Sort by usage and take top 6 maximum
            arsenal = arsenal.sort((a, b) => b.usage - a.usage).slice(0, 6);
            
            const totalUsage = arsenal.reduce((sum, p) => sum + p.usage, 0);
            if (totalUsage > 0 && Math.abs(totalUsage - 100) > 5) {
                arsenal = arsenal.map(p => ({ ...p, usage: Math.round((p.usage / totalUsage) * 100) }));
            }
            console.log(`[${personId}] Fetched ${arsenal.length} pitch types from MLB API`);
        }
        
        return arsenal.sort((a: PitchRepertoireEntry, b: PitchRepertoireEntry) => b.usage - a.usage);

    } catch (e) {
        console.warn(`Failed to fetch pitch arsenal for ${personId}:`, e);
        return [];
    }
};

const buildFallbackArsenal = (velocityRating: number, stuff: number, role: 'starter' | 'reliever'): PitchRepertoireEntry[] => {
    // Build a REALISTIC pitch mix - most pitchers have 3-5 pitches, NOT 7-9
    // MLB average: Starters ~4 pitches, Relievers ~2-3 pitches
    const isPower = velocityRating >= 70 || stuff >= 60;
    
    // Randomly select a realistic number of pitches based on role
    // Starters: 3-5 pitches, Relievers: 2-3 pitches
    const numPitches = role === 'starter' 
        ? Math.floor(Math.random() * 3) + 3  // 3-5 pitches
        : Math.floor(Math.random() * 2) + 2; // 2-3 pitches
    
    // Primary pitch selection (every pitcher has a fastball)
    const primaryFastball = Math.random() < 0.65 
        ? { type: 'Four-Seam Fastball', speed: 95, usage: role === 'reliever' ? 55 : 45 }
        : { type: 'Sinker', speed: 93, usage: role === 'reliever' ? 50 : 40 };
    
    // Available secondary pitch pool
    const secondaryPool: PitchRepertoireEntry[] = [
        { type: 'Slider', speed: 88, usage: 25 },
        { type: 'Changeup', speed: 86, usage: 18 },
        { type: 'Curveball', speed: 82, usage: 15 },
        { type: 'Cutter', speed: 92, usage: 20 },
        { type: 'Sweeper', speed: 84, usage: 18 },
        { type: 'Splitter', speed: 85, usage: 12 }
    ];
    
    // Shuffle and pick random secondaries
    const shuffled = secondaryPool.sort(() => Math.random() - 0.5);
    const selectedSecondaries = shuffled.slice(0, numPitches - 1);
    
    // Build final arsenal
    const arsenal: PitchRepertoireEntry[] = [primaryFastball, ...selectedSecondaries];
    
    // Normalize usage to 100%
    const total = arsenal.reduce((sum, p) => sum + p.usage, 0);
    const normalized = arsenal.map(p => ({ ...p, usage: Math.round((p.usage / total) * 100) }));
    
    // Ensure total is exactly 100%
    const adjustedTotal = normalized.reduce((sum, p) => sum + p.usage, 0);
    if (adjustedTotal !== 100) {
        normalized[0].usage += (100 - adjustedTotal);
    }
    
    return normalized.sort((a, b) => b.usage - a.usage);
};

const rebaseArsenalSpeeds = (arsenal: PitchRepertoireEntry[], velocityRating: number, role: 'starter' | 'reliever'): PitchRepertoireEntry[] => {
    // Map rating -> fastball velocity; relievers often sit a tick higher
    const baseFastball = Math.min(103, Math.max(88, 87 + (velocityRating * 0.16) + (role === 'reliever' ? 1.5 : 0)));
    const offset = (type: string) => {
        const t = type.toLowerCase();
        if (t.includes('four-seam') || t.includes('fastball')) return 0;
        if (t.includes('sinker')) return -2;
        if (t.includes('cutter')) return -3;
        if (t.includes('two-seam')) return -2;
        if (t.includes('slider')) return -6;
        if (t.includes('sweeper')) return -8;
        if (t.includes('change')) return -8;
        if (t.includes('split')) return -7;
        if (t.includes('curve')) return -10;
        if (t.includes('knuckle')) return -11;
        return -6;
    };

    return arsenal.map(p => {
        const base = baseFastball + offset(p.type);
        const jitter = (Math.random() * 1.8) - 0.9; // add small variation
        let speed = Math.max(72, base + jitter);

        // Rare triple-digit bursts for big arms
        if (p.type.toLowerCase().includes('fast') && velocityRating >= 85 && Math.random() < 0.12) {
            speed += Math.random() * 2.5;
        }

        return { ...p, speed: Math.round(speed * 10) / 10 };
    });
};

const determineStarterRole = (
    history: PlayerHistoryEntry[],
    s25: any,
    s24: any,
    assumedRole: 'starter' | 'reliever'
): { isStarter: boolean; recentStarts: number; recentIp: number } => {
    const pitchingHistory = history.filter(h => h.stats.ip !== undefined || h.stats.starts !== undefined);
    const recentPitching = pitchingHistory.slice(0, 3);

    const recentStarts = recentPitching.reduce((sum, h) => sum + (h.stats.starts || 0), 0) || (s25?.gamesStarted || s24?.gamesStarted || 0);
    const recentIp = recentPitching.reduce((sum, h) => sum + (h.stats.ip || 0), 0) || parseFloat(s25?.inningsPitched || s24?.inningsPitched || '0');
    const recentGames = recentPitching.reduce((sum, h) => sum + (h.stats.games || 0), 0) || (s25?.gamesPlayed || s24?.gamesPlayed || 0);
    const recentSaves = s25?.saves || s24?.saves || 0;
    const ipPerGame = recentGames > 0 ? recentIp / recentGames : 0;

    const careerStarts = pitchingHistory.reduce((sum, h) => sum + (h.stats.starts || 0), 0);
    const maxStartsInSeason = pitchingHistory.length > 0 ? Math.max(...pitchingHistory.map(h => h.stats.starts || 0)) : 0;

    if (assumedRole === 'starter') return { isStarter: true, recentStarts, recentIp };
    if (recentStarts >= 10) return { isStarter: true, recentStarts, recentIp };
    if (recentIp >= 80) return { isStarter: true, recentStarts, recentIp };
    if (ipPerGame >= 3.2 && recentStarts >= 5) return { isStarter: true, recentStarts, recentIp };
    if (careerStarts >= 25 || maxStartsInSeason >= 12) return { isStarter: true, recentStarts, recentIp };
    if (recentSaves >= 10) return { isStarter: false, recentStarts, recentIp };
    if (ipPerGame < 2.0 && recentStarts <= 3) return { isStarter: false, recentStarts, recentIp };

    return { isStarter: false, recentStarts, recentIp };
};

export const fetchRealRoster = async (teamMlbId: number): Promise<Player[]> => {
    console.group(`[MLB Scraper] Fetching Real-Time Roster for Team ID: ${teamMlbId}`);
    try {
        // OPTIMIZED: Single hydrated API call replaces N+1 per-player requests
        // This fetches roster + person details + all hitting/pitching/fielding stats in ONE call
        const hydrateUrl = `${BASE_URL}/teams/${teamMlbId}/roster?rosterType=fullRoster&hydrate=person(stats(type=[yearByYear,career],group=[hitting,pitching,fielding],gameType=R))`;
        const activeRosterUrl = `${BASE_URL}/teams/${teamMlbId}/roster?rosterType=active`;
        
        const [hydrateRes, activeRes] = await Promise.all([
            fetch(hydrateUrl),
            fetch(activeRosterUrl)
        ]);
        
        if (!hydrateRes.ok && !activeRes.ok) throw new Error("Failed to fetch roster");
        
        const [hydrateData, activeData] = await Promise.all([
            hydrateRes.ok ? hydrateRes.json() : { roster: [] },
            activeRes.ok ? activeRes.json() : { roster: [] }
        ]);
        
        // Combine rosters, dedup by person ID
        const combinedRoster = [
            ...(hydrateData.roster || []),
            ...(activeData.roster || [])
        ];
        
        const seenIds = new Set<number>();
        const uniquePlayersList = combinedRoster.filter((p: any) => {
            const id = p.person?.id;
            if (!id || seenIds.has(id)) return false;
            seenIds.add(id);
            return true;
        });

        console.log(`Processing ${uniquePlayersList.length} unique players (hydrated, minimal API calls)...`);

        // Process players - NO additional per-player API calls needed for players 
        // with hydrated data. Only fetch pitch arsenal for pitchersWithout static data.
        const playerPromises = uniquePlayersList.map(async (p: any) => {
            const personId = p.person.id;
            const assumedRole: 'starter' | 'reliever' = (p.position?.abbreviation === 'SP') ? 'starter' : 'reliever';
            
            const person = p.person;
            if (!person) return null;

            try {
                // Extract stats from hydrated person data (already included in the response)
                const allStats = person.stats || [];
                
                // Only fetch pitch arsenal if NOT in static Baseball Savant data AND is a pitcher
                const isPitcher = p.position?.type === 'Pitcher' || 
                    ['P', 'SP', 'RP', 'CL', 'RHP', 'LHP'].includes(p.position?.abbreviation || '');
                const hasStaticArsenal = realArsenals.pitchers[String(personId)]?.currentArsenal?.length > 0;
                
                let arsenalRaw: PitchRepertoireEntry[] = [];
                if (isPitcher && !hasStaticArsenal) {
                    arsenalRaw = await fetchPitchArsenal(personId);
                }
                
                // Extract career fielding from hydrated career stats
                let careerFielding: any = { po: 0, a: 0, e: 0, dp: 0, rf9: 0, chances: 0, fpct: 0 };
                const careerFieldingGroup = allStats.find((g: any) => g.type?.displayName === 'career' && g.group?.displayName === 'fielding');
                if (careerFieldingGroup?.splits?.length > 0) {
                    const stat = careerFieldingGroup.splits[0].stat;
                    const chances = stat.chances || (stat.putOuts || 0) + (stat.assists || 0) + (stat.errors || 0) || 1;
                    careerFielding = {
                        po: stat.putOuts || 0,
                        a: stat.assists || 0,
                        e: stat.errors || 0,
                        dp: stat.doublePlays || 0,
                        rf9: parseFloat(stat.rangeFactorPer9Inn || stat.rangeFactorPer9 || 0),
                        chances: chances,
                        fpct: parseFloat(stat.fielding) || (((stat.putOuts || 0) + (stat.assists || 0)) / chances)
                    };
                }

                // --- PITCH REPERTOIRE: Use real Baseball Savant data first, then MLB API, then fallback ---
                let arsenal: PitchRepertoireEntry[] = [];
                let arsenalHistory: Record<string, PitchRepertoireEntry[]> = {};
                
                // Priority 1: Check real Baseball Savant data (most accurate, includes historical data)
                const realPitcherData = realArsenals.pitchers[String(personId)];
                if (realPitcherData && realPitcherData.currentArsenal && realPitcherData.currentArsenal.length > 0) {
                    arsenal = realPitcherData.currentArsenal;
                    arsenalHistory = realPitcherData.arsenalHistory || {};
                    console.log(`[${personId}] ${realPitcherData.name}: Using real Baseball Savant arsenal (${arsenal.length} pitches, ${Object.keys(arsenalHistory).length} years history)`);
                }
                // Priority 2: Use MLB API data if available
                else if (arsenalRaw && arsenalRaw.length > 0) {
                    arsenal = arsenalRaw;
                    console.log(`[${personId}] Using MLB API arsenal: ${arsenal.length} pitches`);
                }
                // Priority 3: Build fallback arsenal (rare - only for new/minor league pitchers)
                else {
                    const role = (p.position?.abbreviation === 'SP') ? 'starter' : 'reliever';
                    arsenal = buildFallbackArsenal(50, 50, role);
                    console.log(`[${personId}] Using fallback arsenal: ${arsenal.length} pitches`);
                }

                const historyMap = new Map<string, PlayerHistoryEntry>();
                
                // Pre-populate history with arsenal data from Baseball Savant
                for (const year of Object.keys(arsenalHistory)) {
                    historyMap.set(year, {
                        year,
                        team: 'MLB',
                        stats: { games: 0 },
                        pitchArsenal: arsenalHistory[year]
                    });
                }
                
                let s25: any = null;
                let s24: any = null;
                let isTwoWay = false;
                
                // Detection for Ohtani or similar two-way usage

                const upsertHistory = (entry: PlayerHistoryEntry, groupName: string, weight: number) => {
                    const key = `${entry.year}`;
                    const existing = historyMap.get(key);
                    if (!existing) {
                        // Add arsenal data if we have it from Baseball Savant
                        if (arsenalHistory[key]) {
                            entry.pitchArsenal = arsenalHistory[key];
                        }
                        historyMap.set(key, entry);
                        return;
                    }
                    
                    // Preserve pitch arsenal when merging
                    if (arsenalHistory[key] && !existing.pitchArsenal) {
                        existing.pitchArsenal = arsenalHistory[key];
                    }

                    const existingStats = existing.stats as PlayerHistoryEntry['stats'];
                    const entryStats = entry.stats as PlayerHistoryEntry['stats'];

                    if (groupName === 'hitting') {
                        const existingWeight = (existingStats.pa || existingStats.games || 0);
                        if (weight >= existingWeight) {
                            existing.stats = { games: existingStats.games || entryStats.games || 0, ...existingStats, ...entryStats };
                        }
                    } else if (groupName === 'pitching') {
                        const existingWeight = (existingStats.ip || existingStats.games || 0);
                        if (weight >= existingWeight) {
                            existing.stats = { games: existingStats.games || entryStats.games || 0, ...existingStats, ...entryStats };
                        }
                    } else if (groupName === 'fielding') {
                        const existingWeight = (existingStats.chances || existingStats.games || 0);
                        if (weight >= existingWeight) {
                            existing.stats = { games: existingStats.games || entryStats.games || 0, ...existingStats, ...entryStats };
                        }
                    } else {
                        existing.stats = { games: existingStats.games || entryStats.games || 0, ...existingStats, ...entryStats };
                    }
                };
                
                // Detection for Ohtani or similar two-way usage
                // Check if they have stats for BOTH hitting and pitching in the same recent year
                const recentYears = ['2024', '2025'];
                let hasPitchingRecent = false;
                let hasHittingRecent = false;

                allStats.forEach((group: any) => {
                    const isYearByYear = group.type.displayName === 'yearByYear';
                    const groupName = group.group.displayName;

                    if (isYearByYear) {
                         const sortedSplits = [...(group.splits || [])].sort((a: any, b: any) => (parseInt(b.season, 10) || 0) - (parseInt(a.season, 10) || 0));

                        sortedSplits.forEach((split: any) => {

                              const season = split.season;
                              if (recentYears.includes(season)) {
                                  if (groupName === 'pitching' && split.stat.inningsPitched > 5) hasPitchingRecent = true;
                                  if (groupName === 'hitting' && split.stat.atBats > 50) hasHittingRecent = true;
                              }

                              const stat = split.stat;
                              let yearLabel = season;
                              if (season === '2025' && (stat.atBats > 0 || stat.inningsPitched > 0)) {
                                  s25 = stat;
                              } else if (season === '2024' && (stat.atBats > 0 || stat.inningsPitched > 0)) {
                                  s24 = stat;
                              }

                              const entry: PlayerHistoryEntry = {
                                  year: yearLabel,
                                  team: split.team ? split.team.name : 'MLB',
                                  stats: { games: stat.gamesPlayed }
                              };

                              if (groupName === 'pitching') {
                                  const ip = parseFloat(stat.inningsPitched) || 0.1;
                                  const k = stat.strikeOuts || 0;
                                  const bb = stat.baseOnBalls || 0;
                                  const hits = stat.hits || 0;
                                  const hr = stat.homeRuns || 0;
                                  const games = stat.gamesPlayed || stat.gamesStarted || 0;
                                  if (ip <= 0.2 || games <= 0) return;
                                  
                                  // Log to help debug inflated stats
                                  if (season === '2025' && ip > 250) {
                                      console.warn(`[${person.fullName}] High 2025 IP: ${ip} in ${games} games (GS: ${stat.gamesStarted || 0})`);
                                  }

                                  entry.stats = {
                                      ...entry.stats,
                                      starts: stat.gamesStarted || 0,
                                      wins: stat.wins || 0,
                                      losses: stat.losses || 0,
                                      saves: stat.saves || 0,
                                      era: parseFloat(stat.era) || 0,
                                      ip: ip,
                                      so: k,
                                      bb: bb,
                                      ibb: stat.intentionalWalks || 0,
                                      whip: parseFloat(stat.whip) || ((bb + hits) / ip),
                                      k9: (k / ip) * 9,
                                      bb9: (bb / ip) * 9,
                                      fip: estimateFIP(hr, bb, stat.hitByPitch || 0, k, ip),
                                      hr9: (hr / ip) * 9
                                  };
                                  upsertHistory(entry, 'pitching', ip);
                              } else if (groupName === 'hitting') {
                                  // Advanced Stats Calc
                                  const bb = stat.baseOnBalls || 0;
                                  const ibb = stat.intentionalWalks || 0;
                                  const hbp = stat.hitByPitch || 0;
                                  const h = stat.hits || 0;
                                  const d = stat.doubles || 0;
                                  const t = stat.triples || 0;
                                  const hr = stat.homeRuns || 0;
                                  const sf = stat.sacFlies || 0;
                                  const ab = stat.atBats || 1;
                                  const so = stat.strikeOuts || 0;
                                  const slg = parseFloat(stat.slg) || 0;
                                  const avg = parseFloat(stat.avg) || 0;
                                  const sac = stat.sacBunts || 0;
                                  const pa = ab + bb + hbp + sf + sac;
                                  if (pa <= 5 || ab <= 0) return;
                                  
                                  entry.stats = {
                                      ...entry.stats,
                                      avg: avg,
                                      hr: hr,
                                      rbi: stat.rbi || 0,
                                      ops: parseFloat(stat.ops) || 0,
                                      obp: parseFloat(stat.obp) || 0,
                                      slg: slg,
                                      sb: stat.stolenBases || 0,
                                      
                                      // Granular stats
                                      d: d,
                                      t: t,
                                      sac: sac,
                                      sf: sf,
                                      hbp: hbp,
                                      gidp: stat.groundIntoDoublePlay || 0,
                                      bb: bb,
                                      ibb: ibb,
                                      so: so,
                                      pa: pa,
                                      
                                      // Advanced
                                      iso: slg - avg,
                                      woba: calculateWOBA(bb - ibb, hbp, h, d, t, hr, sf, ab),
                                      bb_pct: pa > 0 ? (bb - ibb) / pa : 0,
                                      k_pct: pa > 0 ? so / pa : 0
                                  };
                                  upsertHistory(entry, 'hitting', pa);
                              } else if (groupName === 'fielding') {
                                  const chances = stat.chances || (stat.putOuts || 0) + (stat.assists || 0) + (stat.errors || 0);
                                  if (chances <= 0) return;
                                  entry.stats = {
                                      ...entry.stats,
                                      po: stat.putOuts || 0,
                                      a: stat.assists || 0,
                                      e: stat.errors || 0,
                                      dp: stat.doublePlays || 0,
                                      chances: chances,
                                      fpct: parseFloat(stat.fielding) || (chances > 0 ? ((stat.putOuts || 0) + (stat.assists || 0)) / chances : 0),
                                      rf9: parseFloat(stat.rangeFactorPer9Inn || stat.rangeFactorPer9 || 0)
                                  };
                                  upsertHistory(entry, 'fielding', chances);
                              }
                         });
                    }
                });
                
                if (hasPitchingRecent && hasHittingRecent) isTwoWay = true;

                const history = Array.from(historyMap.values());
                history.sort((a,b) => (parseInt(b.year, 10) || 0) - (parseInt(a.year, 10) || 0));
                const primaryStats = s25 || history.find(h => h.year === '2024')?.stats || s24 || history[0]?.stats;
                const position = mapPosition(p.position);
                const age = person.currentAge || 25;
                
                const attributes: PlayerRatings = {
                    contact: 50, power: 50, eye: 50, speed: 50, defense: 50, reaction: 50, arm: 50,
                    stuff: 50, control: 50, stamina: 50, velocity: 50, spin: 50
                };
                let overall = 60;
                let trait = "";
                let isStarter = false;
                let recentStarts = 0;
                let recentIp = 0;

                // Init ALL stats counters to 0
                const statsCounters: StatsCounters = { 
                    ab:0, h:0, d:0, t:0, hr:0, gsh:0, bb:0, ibb:0, hbp:0, so:0, rbi:0, sb:0, cs:0, gidp:0, sf:0, sac:0, r:0, lob:0, xbh:0, tb:0, roe:0, wo:0, pa:0,
                    totalExitVelo: 0, battedBallEvents: 0, hardHits: 0, barrels: 0, swings: 0, whiffs: 0, groundouts:0, flyouts:0,
                    outsPitched:0, er:0, p_r:0, p_h:0, p_bb:0, p_ibb:0, p_hbp: 0, p_hr: 0, p_so:0, wp:0, bk:0, pk:0, bf:0, 
                    wins:0, losses:0, saves:0, holds:0, blownSaves: 0, pitchesThrown: 0, strikes: 0, qs:0, cg:0, sho:0, gf:0, svo:0, ir:0, irs:0, rw:0,
                    gs: 0, gp: 0, g: 0,
                    po: 0, a: 0, e: 0, dp: 0, tp:0, pb:0, ofa:0, chances: 0, inn: 0
                };

                const defensiveStats: DefensiveStats = {
                    fpct: careerFielding.fpct || (careerFielding.chances > 0 ? (careerFielding.po + careerFielding.a) / careerFielding.chances : 0.980),
                    drs: 0,
                    uzr: 0,
                    oaa: 0,
                    po: careerFielding.po || 0,
                    a: careerFielding.a || 0,
                    e: careerFielding.e || 0,
                    dp: careerFielding.dp || 0,
                    rf9: careerFielding.rf9 || 0,
                    chances: careerFielding.chances || 0
                };

                if (position === Position.P || isTwoWay) {
                    // Logic for Pitching attributes
                    const pStats = position === Position.P ? primaryStats : (s25 || s24); 
                    if (pStats && pStats.inningsPitched) {
                        const ip = parseFloat(pStats.inningsPitched || pStats.ip || '0');
                        const safeIp = ip > 0 ? ip : 1;
                        
                        // Log pitcher stats for debugging inflated data
                        if (ip > 250) {
                            console.warn(`High IP for ${person.fullName}: ${ip} IP, GS: ${pStats.gamesStarted || 0}`);
                        }
                        
                        const k = pStats.strikeOuts || pStats.so || 0;
                        const bb = pStats.baseOnBalls || pStats.bb || 0;
                        const era = parseFloat(pStats.era) || 4.50;

                        const k9 = (k / safeIp) * 9;
                        const bb9 = (bb / safeIp) * 9;

                        attributes.stuff = calcRating(k9, 5.0, 12.0);
                        attributes.control = calcRating(5.0 - bb9, 1.0, 4.0);
                        
                        // Enhance pitcher ratings with Savant data if available
                        // Use WEIGHTED BLEND across years (not just current) for injury resilience
                        const pitcherSavantEntry = realPitcherSavant.pitchers[String(personId)];
                        let pitcherSavant: SavantPitchingStats | null = null;
                        
                        if (pitcherSavantEntry) {
                            const hist = pitcherSavantEntry.statsHistory || {};
                            const current = pitcherSavantEntry.currentStats;
                            const years = Object.keys(hist).sort((a, b) => parseInt(b) - parseInt(a));
                            
                            if (years.length >= 2) {
                                // Weighted blend: most recent year 50%, prior year 35%, 2 years ago 15%
                                // This prevents injured/bad years from tanking a player's projection
                                const weights = [0.50, 0.35, 0.15];
                                const blended: any = {};
                                const numericFields: (keyof SavantPitchingStats)[] = [
                                    'xera', 'xba', 'whiff_pct', 'chase_pct', 'k_pct', 'bb_pct',
                                    'barrel_pct', 'hard_hit_pct', 'gb_pct', 'avg_exit_velo_against',
                                    'pitching_run_value', 'fastball_run_value', 'breaking_run_value', 'offspeed_run_value'
                                ];
                                
                                for (const field of numericFields) {
                                    let weightedSum = 0;
                                    let weightSum = 0;
                                    for (let i = 0; i < Math.min(years.length, 3); i++) {
                                        const val = hist[years[i]]?.[field] || 0;
                                        if (val !== 0) { // Only count non-zero values
                                            weightedSum += val * weights[i];
                                            weightSum += weights[i];
                                        }
                                    }
                                    blended[field] = weightSum > 0 ? weightedSum / weightSum : 0;
                                }
                                // Keep non-blended fields from current
                                blended.fastball_velo = current?.fastball_velo || 0;
                                blended.extension = current?.extension || 0;
                                pitcherSavant = blended as SavantPitchingStats;
                            } else {
                                pitcherSavant = current || null;
                            }
                        }
                        
                        if (pitcherSavant) {
                            // Whiff% strongly correlates with stuff quality (MLB avg ~25%)
                            if (pitcherSavant.whiff_pct > 0) {
                                const whiffBonus = Math.round((pitcherSavant.whiff_pct - 25) * 0.5);
                                attributes.stuff = Math.max(30, Math.min(99, attributes.stuff + whiffBonus));
                            }
                            // Chase% indicates pitch deception (MLB avg ~28%)
                            if (pitcherSavant.chase_pct > 0) {
                                const chaseBonus = Math.round((pitcherSavant.chase_pct - 28) * 0.4);
                                attributes.stuff = Math.max(30, Math.min(99, attributes.stuff + chaseBonus));
                            }
                            // Low barrel% = tough to square up (MLB avg ~7%)
                            if (pitcherSavant.barrel_pct > 0) {
                                const barrelBonus = Math.round((7 - pitcherSavant.barrel_pct) * 1.5);
                                attributes.control = Math.max(30, Math.min(99, attributes.control + barrelBonus));
                            }
                        }
                        
                        // Get ACTUAL velocity from pitch arsenal if available
                        const arsenalHasFastball = arsenal && arsenal.length > 0;
                        const fastballVelo = arsenalHasFastball ? arsenal.find((p: PitchRepertoireEntry) => 
                            p.type.toLowerCase().includes('four-seam') || 
                            p.type.toLowerCase().includes('fastball') ||
                            p.type.toLowerCase().includes('sinker')
                        )?.speed || 0 : 0;
                        
                        if (fastballVelo > 85) {
                            // Use REAL velocity data from MLB API
                            attributes.velocity = calcRating(fastballVelo, 89, 98);
                            console.log(`${person.fullName}: Using real fastball velocity ${fastballVelo} mph`);
                        } else {
                            // Fallback to K/9 estimation only if no arsenal data
                            attributes.velocity = calcRating(k9, 6.0, 13.0);
                        }
                        
                        attributes.spin = calcRating(k9 + (10-bb9), 12, 20);

                        // Overall: blend MLB ERA with Savant xERA for better injury-year handling
                        // If xERA is available, average them; xERA is more stable / predictive
                        let effectiveEra = era;
                        if (pitcherSavant && pitcherSavant.xera > 0) {
                            effectiveEra = era * 0.40 + pitcherSavant.xera * 0.60;
                        }
                        let pOverall = calcRating(5.00 - effectiveEra, 2.80, 5.20); 
                        if (pOverall < 40) pOverall = 40;
                        if (position === Position.P) overall = pOverall;

                        // Logic to check if real-life starter - USE CAREER HISTORY
                        const roleDecision = determineStarterRole(history, s25, s24, assumedRole);
                        isStarter = roleDecision.isStarter;
                        recentStarts = roleDecision.recentStarts;
                        recentIp = roleDecision.recentIp;

                        if (isStarter) {
                            attributes.stamina = calcRating(ip, 80, 180);
                            if (attributes.stamina < 65) attributes.stamina = 70; 
                        } else {
                            attributes.stamina = calcRating(ip, 20, 70);
                            if ((s25?.saves || s24?.saves || 0) > 5) {
                                trait = "Closer";
                                attributes.stuff += 5; 
                                if(position === Position.P) overall += 3;
                            }
                        }
                    } else if (position === Position.P) {
                        overall = 66; 
                        attributes.stuff = 55;
                        attributes.control = 45;
                        attributes.stamina = 40;
                    }
                } 
                
                if (position !== Position.P || isTwoWay) {
                    // Logic for Batting attributes using Baseball Savant data first, then MLB API fallback
                    const hStats = history.find(h => (h.year === '2025' || h.year === '2024') && h.stats.avg !== undefined)?.stats;

                    // Try to get real Baseball Savant batter data
                    const realBatterData = realBatterSavant.batters[String(personId)];
                    let savantCurrent: SavantBatterStats | null = null;
                    let savantHistory: Record<string, SavantBatterStats> = {};
                    
                    if (realBatterData) {
                        savantHistory = realBatterData.statsHistory || {};
                        const years = Object.keys(savantHistory).sort((a, b) => parseInt(b) - parseInt(a));
                        
                        if (years.length >= 2) {
                            // Weighted blend across years for stability & bounceback detection
                            // Most recent 50%, prior 35%, 2 years ago 15%
                            const weights = [0.50, 0.35, 0.15];
                            const blended: any = {};
                            const numericFields: (keyof SavantBatterStats)[] = [
                                'xwoba', 'xba', 'xslg', 'woba', 'ba', 'slg',
                                'k_pct', 'bb_pct', 'chase_pct', 'whiff_pct',
                                'avg_exit_velo', 'max_exit_velo', 'barrel_pct',
                                'hard_hit_pct', 'la_sweet_spot_pct', 'avg_launch_angle', 'sprint_speed'
                            ];
                            
                            for (const field of numericFields) {
                                let weightedSum = 0;
                                let weightSum = 0;
                                for (let i = 0; i < Math.min(years.length, 3); i++) {
                                    const val = savantHistory[years[i]]?.[field] || 0;
                                    if (val !== 0) {
                                        weightedSum += val * weights[i];
                                        weightSum += weights[i];
                                    }
                                }
                                blended[field] = weightSum > 0 ? weightedSum / weightSum : 0;
                            }
                            blended.pa = realBatterData.currentStats?.pa || 0;
                            savantCurrent = blended as SavantBatterStats;
                        } else {
                            savantCurrent = realBatterData.currentStats || null;
                        }
                        console.log(`[${personId}] ${realBatterData.name}: Using Savant batter data (xwOBA: ${savantCurrent?.xwoba}, xBA: ${savantCurrent?.xba})`);
                    }

                    if (savantCurrent && savantCurrent.xwoba > 0) {
                        // USE BASEBALL SAVANT DATA - more accurate than raw MLB API stats
                        // xwOBA is the gold standard for measuring offensive quality
                        const xwoba = savantCurrent.xwoba;
                        const xba = savantCurrent.xba;
                        const xslg = savantCurrent.xslg;
                        const barrelPct = savantCurrent.barrel_pct || 0;
                        const hardHitPct = savantCurrent.hard_hit_pct || 0;
                        const avgExitVelo = savantCurrent.avg_exit_velo || 0;
                        const bbPct = savantCurrent.bb_pct || 0;
                        const kPct = savantCurrent.k_pct || 0;
                        const sprintSpeed = savantCurrent.sprint_speed || 0;
                        const laSweetSpot = savantCurrent.la_sweet_spot_pct || 0;
                        
                        // Contact: Based on xBA — wider scale so low-xBA power hitters aren't punished too harshly
                        // xBA range: elite .300+, avg .250, poor .180 (was .200, raised floor)
                        attributes.contact = calcRating(xba, 0.180, 0.300);
                        
                        // Power: Weighted combo of barrel%, exit velo, xSLG
                        // Barrel% range: elite 15%+, avg 6-7%, poor <3%
                        const barrelScore = calcRating(barrelPct, 3, 18);
                        const evScore = calcRating(avgExitVelo, 86, 94);
                        const xslgScore = calcRating(xslg, 0.350, 0.580);
                        attributes.power = Math.round(barrelScore * 0.40 + evScore * 0.25 + xslgScore * 0.35);
                        
                        // Eye: Based on BB% and Chase% (inverse of K%)
                        // BB% range: elite 12%+, avg 8%, poor <5%
                        // K% range: elite <15%, avg 22%, poor >30%
                        const bbScore = calcRating(bbPct, 4, 15);
                        const kScore = calcRating(35 - kPct, 5, 25); // Invert K%
                        attributes.eye = Math.round(bbScore * 0.55 + kScore * 0.45);
                        
                        // Speed: Sprint speed (ft/s), range 23-31
                        if (sprintSpeed > 0) {
                            attributes.speed = calcRating(sprintSpeed, 25, 31);
                        } else {
                            // Fallback to SB rate from MLB stats
                            const sb = hStats?.sb || 0;
                            const games = hStats?.games || 1;
                            attributes.speed = calcRating(sb / games, 0.0, 0.20);
                        }
                        
                        attributes.defense = calcRating(defensiveStats.fpct, 0.950, 0.995);
                        attributes.reaction = attributes.defense;
                        attributes.arm = attributes.defense;
                        
                        // Overall: xwOBA-based (the single best measure of offensive production)
                        // xwOBA range: elite .400+, great .360, avg .315, poor .280
                        const bOverall = calcRating(xwoba, 0.280, 0.400);
                        if (position !== Position.P) overall = bOverall;
                        if (isTwoWay && bOverall > overall) overall = Math.round((overall + bOverall) / 2);
                        
                        if (barrelPct >= 12 && avgExitVelo >= 91) trait = "Slugger";
                        else if (xba >= 0.290) trait = "Contact Hitter";
                        else if (sprintSpeed >= 29.5) trait = "Speedster";
                        else if (bbPct >= 12 && kPct <= 18) trait = "Patient Hitter";
                        else if (hardHitPct >= 48) trait = "Hard-Hitter";
                        
                    } else if (hStats) {
                        // FALLBACK: Use MLB API stats if no savant data available
                        const avg = parseFloat(hStats.avg as any) || .250;
                        const ops = parseFloat(hStats.ops as any) || .720;
                        const hr = hStats.hr || 0;
                        const sb = hStats.sb || 0;
                        const games = hStats.games || 1;
                        
                        const sbRate = sb / games;

                        attributes.contact = calcRating(avg, 0.220, 0.310);
                        attributes.power = calcRating(hr, 8, 38); 
                        attributes.eye = 50; 
                        attributes.speed = calcRating(sbRate, 0.0, 0.20);
                        
                        attributes.defense = calcRating(defensiveStats.fpct, 0.950, 0.995);
                        attributes.reaction = attributes.defense;
                        attributes.arm = attributes.defense;

                        const bOverall = calcRating(ops, 0.650, 0.950);
                        if (position !== Position.P) overall = bOverall;
                        if (isTwoWay && bOverall > overall) overall = Math.round((overall + bOverall) / 2);

                        if (hr > 30) trait = "Slugger";
                        if (avg > 0.300) trait = "Contact Hitter";
                        if (sbRate > 0.20) trait = "Speedster";
                    } else if (position !== Position.P) {
                        overall = 66; 
                    }
                }

                const historicalOverall = computeHistoricalOverall(history, (position === Position.P && !isTwoWay) ? 'pitching' : 'hitting');
                overall = Math.max(55, Math.min(99, historicalOverall));
                if (isTwoWay) {
                    trait = "Two-Way Star"; // Override
                    overall = Math.min(99, overall + 5); // Bonus for flexibility
                }
                
                let potential = overall;

                const meta = { isStarter, rating: overall, saves: (s25?.saves || 0), recentStarts, recentIp };

                // Rebase pitch speeds ONLY for fallback/synthetic arsenals
                // Real Baseball Savant data should remain untouched
                const finalRole: 'starter' | 'reliever' = isStarter ? 'starter' : 'reliever';
                
                // If we have real Baseball Savant data, use it as-is
                const hasRealData = realPitcherData && realPitcherData.currentArsenal && realPitcherData.currentArsenal.length > 0;
                
                if (!hasRealData && arsenal.length === 0) {
                    // Only use fallback if no real data exists
                    arsenal = buildFallbackArsenal(attributes.velocity, attributes.stuff, finalRole);
                }
                
                // Only rebase synthetic/fallback arsenals, not real data
                if (!hasRealData) {
                    arsenal = rebaseArsenalSpeeds(arsenal, attributes.velocity, finalRole);
                }
                
                const avgVelo = arsenal.reduce((sum, p) => sum + (p.speed * (p.usage || 0)), 0) / (arsenal.reduce((sum, p) => sum + (p.usage || 0), 1));

                // Prepare Savant batter data for the player object
                const realBatterEntry = realBatterSavant.batters[String(personId)];
                const playerSavantBatting = realBatterEntry?.currentStats || undefined;
                const playerSavantBattingHistory = realBatterEntry?.statsHistory || undefined;

                // Prepare Savant pitcher data for the player object
                const realPitcherEntry = realPitcherSavant.pitchers[String(personId)];
                const playerSavantPitching = realPitcherEntry?.currentStats || undefined;
                const playerSavantPitchingHistory = realPitcherEntry?.statsHistory || undefined;

                const player: Player = {
                    id: `mlb_${personId}`,
                    name: person.fullName,
                    position: position,
                    isTwoWay: isTwoWay,
                    number: parseInt(person.primaryNumber) || 0,
                    age: age,
                    daysRest: 5, 
                    rotationSlot: 0, 
                    rating: Math.round(overall), 
                    potential: Math.round(potential),
                    attributes: attributes,
                    pitchRepertoire: arsenal,
                    trait: trait,
                    injury: { isInjured: false, type: '', daysRemaining: 0, severity: 'Day-to-Day' },
                    seasonStats: { games: 0, hr: 0, avg: 0, wins: 0, losses: 0, era: 0 },
                    statsCounters: statsCounters,
                    savantBatting: playerSavantBatting,
                    savantBattingHistory: playerSavantBattingHistory,
                    savantPitching: playerSavantPitching,
                    savantPitchingHistory: playerSavantPitchingHistory,
                    // Init empty stats
                    batting: { 
                        avg:0, obp:0, slg:0, ops:0, hr:0, rbi:0, sb:0, wrc_plus:100, war:0, 
                        woba: 0, iso: 0, babip: 0, bb_pct: 0, k_pct: 0,
                        exitVelocity: playerSavantBatting?.avg_exit_velo || 0, 
                        launchAngle: playerSavantBatting?.avg_launch_angle || 0, 
                        barrel_pct: playerSavantBatting?.barrel_pct || 0, 
                        hardHit_pct: playerSavantBatting?.hard_hit_pct || 0, 
                        whiff_pct: 0, 
                        sprintSpeed: playerSavantBatting?.sprint_speed || (25 + (attributes.speed/5)) 
                    },
                    pitching: { 
                        era:0, whip:0, so:0, bb:0, ip:0, saves:0, holds:0, blownSaves:0, fip:0, war:0, pitchesThrown: 0,
                        xfip: 0, k9: 0, bb9: 0, hr9: 0, csw_pct: 0, siera: 0, babip: 0,
                        avgVelocity: Math.round(avgVelo * 10) / 10, spinRate: 0, extension: 0
                    },
                    defense: defensiveStats,
                    history: history
                };
                
                (player as any)._meta = meta;
                return player;

            } catch (innerError) {
                console.warn(`Failed to process player ${personId}`, innerError);
                return null;
            }
        });

        const resolvedPlayers = await Promise.all(playerPromises);
        let validPlayers = resolvedPlayers.filter(p => p !== null) as Player[];

        // --- ASSIGN DYNAMIC ROTATION SLOTS ---
        const pitchers = validPlayers.filter(p => p.position === Position.P || (p.isTwoWay && (p as any)._meta.isStarter));
        
        let starters = pitchers.filter(p => (p as any)._meta.isStarter);
        
        // Sort rotation by: 1) Recent starts (desc), 2) Recent IP (desc), 3) Historical ERA (asc), 4) Rating (desc)
        starters.sort((a, b) => {
            const aStarts = (a as any)._meta.recentStarts || 0;
            const bStarts = (b as any)._meta.recentStarts || 0;
            const aIp = (a as any)._meta.recentIp || 0;
            const bIp = (b as any)._meta.recentIp || 0;
            
            // Get historical ERA for tiebreaking
            const getHistoricalERA = (p: Player) => {
                const pitchingHistory = p.history.filter(h => h.stats.era !== undefined && h.stats.ip && h.stats.ip > 20);
                if (pitchingHistory.length === 0) return 4.50;
                const recent = pitchingHistory.slice(0, 3);
                const totalIP = recent.reduce((sum, h) => sum + (h.stats.ip || 0), 0);
                const weightedERA = recent.reduce((sum, h) => sum + (h.stats.era || 4.50) * (h.stats.ip || 0), 0);
                return totalIP > 0 ? weightedERA / totalIP : 4.50;
            };
            
            const aEra = getHistoricalERA(a);
            const bEra = getHistoricalERA(b);
            
            // Primary: Recent starts (more starts = higher in rotation)
            if (Math.abs(aStarts - bStarts) >= 5) return bStarts - aStarts;
            
            // Secondary: Recent IP (more IP = higher in rotation)
            if (Math.abs(aIp - bIp) >= 20) return bIp - aIp;
            
            // Tertiary: Historical ERA (lower ERA = higher in rotation)
            if (Math.abs(aEra - bEra) >= 0.50) return aEra - bEra;
            
            // Final: Overall rating
            return b.rating - a.rating;
        });

        // Ensure we have at least 5 starters (for gameplay)
        if (starters.length < 5) {
             const relievers = pitchers.filter(p => !(p as any)._meta.isStarter).sort((a,b) => b.rating - a.rating);
             const needed = 5 - starters.length;
             for(let i=0; i<needed; i++) {
                 if (relievers[i]) {
                     (relievers[i] as any)._meta.isStarter = true;
                     relievers[i].attributes.stamina = 75;
                     starters.push(relievers[i]);
                 }
             }
        }
        // Note: No cap on starters - teams can have their natural rotation size based on historical usage

        starters.forEach((p, i) => {
            p.rotationSlot = i + 1; 
        });

        const bullpen = pitchers.filter(p => p.rotationSlot === 0); 
        
        bullpen.sort((a,b) => {
             const saveA = (a as any)._meta.saves || 0;
             const saveB = (b as any)._meta.saves || 0;
             if (saveA !== saveB) return saveB - saveA;
             return b.rating - a.rating;
        });

        const closer = bullpen[0];
        if (closer) {
            closer.rotationSlot = 9; // 9 = Closer
            closer.trait = "Closer";
        }

        let slot = 10; // 10+ = Relievers
        bullpen.filter(p => p.rotationSlot === 0).forEach(p => {
             p.rotationSlot = slot;
             slot++;
        });

        return validPlayers;

    } catch (e) {
        console.error("MLB Scraper Error", e);
        return [];
    }
};
