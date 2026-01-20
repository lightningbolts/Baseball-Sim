

import { Player, Position, StaffMember, PlayerRatings, PlayerHistoryEntry, StatsCounters, DefensiveStats, PitchRepertoireEntry } from "../types";

const BASE_URL = "https://statsapi.mlb.com/api/v1";

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
        // Fetch MULTIPLE roster types to get complete team depth
        // fullRoster gets 40-man, depthChart gets active, allTime gets additional players
        const [rosterRes, depthRes, fullRosterRes] = await Promise.all([
            fetch(`${BASE_URL}/teams/${teamMlbId}/roster?rosterType=active`),
            fetch(`${BASE_URL}/teams/${teamMlbId}/roster/depthChart`),
            fetch(`${BASE_URL}/teams/${teamMlbId}/roster?rosterType=fullRoster`)
        ]);
        
        if (!rosterRes.ok && !depthRes.ok && !fullRosterRes.ok) throw new Error("Failed to fetch roster");
        
        const [rosterData, depthData, fullRosterData] = await Promise.all([
            rosterRes.ok ? rosterRes.json() : { roster: [] },
            depthRes.ok ? depthRes.json() : { roster: [] },
            fullRosterRes.ok ? fullRosterRes.json() : { roster: [] }
        ]);
        
        // Combine all roster sources
        const combinedRoster = [
            ...(fullRosterData.roster || []),
            ...(rosterData.roster || []),
            ...(depthData.roster || [])
        ];
        
        const seenIds = new Set<number>();
        const uniquePlayersList = combinedRoster.filter((p: any) => {
            const id = p.person?.id;
            if (!id || seenIds.has(id)) return false;
            seenIds.add(id);
            return true;
        });

        console.log(`Processing ${uniquePlayersList.length} unique players from combined roster sources...`);

        const playerPromises = uniquePlayersList.map(async (p: any) => {
            const personId = p.person.id;
            const assumedRole: 'starter' | 'reliever' = (p.position?.abbreviation === 'SP') ? 'starter' : 'reliever';
            
            // Fetch hitting, pitching, AND fielding - specify Regular Season only to avoid inflated stats
            const statsUrl = `${BASE_URL}/people/${personId}/stats?stats=yearByYear&group=hitting,pitching,fielding&gameType=R`;
            const careerFieldingUrl = `${BASE_URL}/people/${personId}/stats?stats=career&group=fielding&gameType=R`;
            const personUrl = `${BASE_URL}/people/${personId}`;

            try {
                const [statsRes, personRes, arsenalRaw, careerFieldingRes] = await Promise.all([
                    fetch(statsUrl),
                    fetch(personUrl),
                    fetchPitchArsenal(personId),
                    fetch(careerFieldingUrl)
                ]);

                const statsData = await statsRes.json();
                const personData = await personRes.json();
                const careerFieldingData = await careerFieldingRes.json();
                const person = personData.people[0];
                
                if (!person) return null;

                // --- PITCH REPERTOIRE FALLBACK: build a diverse arsenal ---
                let arsenal = arsenalRaw;
                if (arsenal.length === 0) {
                    const role = (p.position?.abbreviation === 'SP') ? 'starter' : 'reliever';
                    const fallback = buildFallbackArsenal(50, 50, role);
                    arsenal = fallback;
                }

                const allStats = statsData.stats || [];
                const historyMap = new Map<string, PlayerHistoryEntry>();

                const upsertHistory = (entry: PlayerHistoryEntry, groupName: string, weight: number) => {
                    const key = `${entry.year}`;
                    const existing = historyMap.get(key);
                    if (!existing) {
                        historyMap.set(key, entry);
                        return;
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
                
                // Parse career fielding from separate request
                let careerFielding: any = { po: 0, a: 0, e: 0, dp: 0, rf9: 0, chances: 0, fpct: 0 };
                const careerFieldingStats = careerFieldingData.stats || [];
                if (careerFieldingStats.length > 0 && careerFieldingStats[0].splits && careerFieldingStats[0].splits.length > 0) {
                    const stat = careerFieldingStats[0].splits[0].stat;
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
                
                let s25: any = null;
                let s24: any = null;
                let isTwoWay = false;
                
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

                        let pOverall = calcRating(5.00 - era, 2.80, 5.20); 
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
                    // Logic for Batting attributes (Even for pitchers if two way)
                    // We need to find hitting stats specifically
                    // Search history for a hitting entry in 2025/2026
                    const hStats = history.find(h => (h.year === '2025' || h.year === '2024') && h.stats.avg !== undefined)?.stats;

                    if (hStats) {
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
                        // If Two-Way, usually take the higher or average? Let's favor position rating if primarily hitter
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

                // Rebase pitch speeds to emphasize velocity spread and power arms
                const finalRole: 'starter' | 'reliever' = isStarter ? 'starter' : 'reliever';
                arsenal = rebaseArsenalSpeeds(arsenal.length ? arsenal : buildFallbackArsenal(attributes.velocity, attributes.stuff, finalRole), attributes.velocity, finalRole);
                const avgVelo = arsenal.reduce((sum, p) => sum + (p.speed * (p.usage || 0)), 0) / (arsenal.reduce((sum, p) => sum + (p.usage || 0), 1));

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
                    // Init empty stats
                    batting: { 
                        avg:0, obp:0, slg:0, ops:0, hr:0, rbi:0, sb:0, wrc_plus:100, war:0, 
                        woba: 0, iso: 0, babip: 0, bb_pct: 0, k_pct: 0,
                        exitVelocity: 0, launchAngle: 0, barrel_pct: 0, hardHit_pct: 0, whiff_pct: 0, sprintSpeed: 25 + (attributes.speed/5) 
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
