

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
        // Fetch extended pitching data to get pitch arsenal
        // Note: The public API endpoint for pitch arsenal specifically often resides in `hydrations` or specific stats calls.
        // We will try a targeted stat call for `pitchArsenal`.
        const res = await fetch(`${BASE_URL}/people/${personId}/stats?stats=pitchArsenal&group=pitching`);
        if (!res.ok) return [];
        const data = await res.json();
        const splits = data.stats?.[0]?.splits || [];
        
        if (splits.length === 0) return [];

        return splits.map((s: any) => ({
             type: s.type.displayName, // e.g. "Four-Seam Fastball"
             speed: s.averageSpeed || 0,
             usage: (s.percentage || 0) * 100
        })).sort((a: PitchRepertoireEntry, b: PitchRepertoireEntry) => b.usage - a.usage);

    } catch (e) {
        return [];
    }
};

export const fetchRealRoster = async (teamMlbId: number): Promise<Player[]> => {
    console.group(`[MLB Scraper] Fetching Real-Time Roster for Team ID: ${teamMlbId}`);
    try {
        const rosterRes = await fetch(`${BASE_URL}/teams/${teamMlbId}/roster/depthChart`);
        if (!rosterRes.ok) throw new Error("Failed to fetch roster");
        const rosterData = await rosterRes.json();
        const rawList = rosterData.roster || [];
        
        const seenIds = new Set<number>();
        const uniquePlayersList = rawList.filter((p: any) => {
            const id = p.person.id;
            if (seenIds.has(id)) return false;
            seenIds.add(id);
            return true;
        });

        console.log(`Processing ${uniquePlayersList.length} unique players...`);

        const playerPromises = uniquePlayersList.map(async (p: any) => {
            const personId = p.person.id;
            
            // Fetch hitting, pitching, AND fielding
            const statsUrl = `${BASE_URL}/people/${personId}/stats?stats=yearByYear,projected,career&group=hitting,pitching,fielding`;
            const personUrl = `${BASE_URL}/people/${personId}`;

            try {
                const [statsRes, personRes, arsenalRaw] = await Promise.all([
                    fetch(statsUrl),
                    fetch(personUrl),
                    fetchPitchArsenal(personId)
                ]);

                const statsData = await statsRes.json();
                const personData = await personRes.json();
                const person = personData.people[0];
                
                if (!person) return null;

                // --- PITCH REPERTOIRE FALLBACK ---
                let arsenal = arsenalRaw;
                if (arsenal.length === 0) {
                    // Fallback for players where API returns nothing (common for rookies/relievers in some endpoints)
                    const baseVelo = 90 + Math.random() * 8;
                    arsenal = [
                        { type: 'Four-Seam Fastball', speed: baseVelo, usage: 50 },
                        { type: 'Slider', speed: baseVelo - 8, usage: 30 },
                        { type: 'Changeup', speed: baseVelo - 9, usage: 20 }
                    ];
                }

                const allStats = statsData.stats || [];
                const history: PlayerHistoryEntry[] = [];
                let careerFielding: any = { po: 0, a: 0, e: 0, chances: 0 };
                
                let s26: any = null;
                let s25: any = null;
                let isTwoWay = false;
                
                // Detection for Ohtani or similar two-way usage
                // Check if they have stats for BOTH hitting and pitching in the same recent year
                const recentYears = ['2024', '2025'];
                let hasPitchingRecent = false;
                let hasHittingRecent = false;

                allStats.forEach((group: any) => {
                    const isProjected = group.type.displayName.toLowerCase().includes('projected');
                    const isYearByYear = group.type.displayName === 'yearByYear';
                    const isCareer = group.type.displayName === 'career';
                    const groupName = group.group.displayName;

                    if (isCareer && groupName === 'fielding') {
                        if (group.splits && group.splits.length > 0) {
                             const stat = group.splits[0].stat;
                             careerFielding = {
                                 po: stat.putOuts || 0,
                                 a: stat.assists || 0,
                                 e: stat.errors || 0,
                                 chances: stat.chances || 1
                             };
                        }
                    }

                    if (isYearByYear || isProjected) {
                         group.splits.forEach((split: any) => {
                              if (groupName === 'fielding') return; 
                              
                              if (recentYears.includes(split.season) || isProjected) {
                                  if (groupName === 'pitching' && split.stat.inningsPitched > 5) hasPitchingRecent = true;
                                  if (groupName === 'hitting' && split.stat.atBats > 50) hasHittingRecent = true;
                              }

                              const stat = split.stat;
                              let yearLabel = split.season;
                              if (isProjected || split.season === '2026') {
                                  yearLabel = '2026 Proj';
                                  s26 = stat; 
                              } else if (split.season === '2025') {
                                  s25 = stat;
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
                                      whip: parseFloat(stat.whip) || ((bb + hits) / ip),
                                      k9: (k / ip) * 9,
                                      bb9: (bb / ip) * 9,
                                      fip: estimateFIP(hr, bb, stat.hitByPitch || 0, k, ip)
                                  };
                              } else if (groupName === 'hitting') {
                                  // Advanced Stats Calc
                                  const bb = stat.baseOnBalls || 0;
                                  const hbp = stat.hitByPitch || 0;
                                  const h = stat.hits || 0;
                                  const d = stat.doubles || 0;
                                  const t = stat.triples || 0;
                                  const hr = stat.homeRuns || 0;
                                  const sf = stat.sacFlies || 0;
                                  const ab = stat.atBats || 1;
                                  const slg = parseFloat(stat.slg) || 0;
                                  const avg = parseFloat(stat.avg) || 0;
                                  
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
                                      sac: stat.sacBunts || 0,
                                      sf: sf,
                                      hbp: hbp,
                                      gidp: stat.groundIntoDoublePlay || 0,
                                      
                                      // Advanced
                                      iso: slg - avg,
                                      woba: calculateWOBA(bb, hbp, h, d, t, hr, sf, ab)
                                  };
                              }
                              history.push(entry);
                         });
                    }
                });
                
                if (hasPitchingRecent && hasHittingRecent) isTwoWay = true;

                history.sort((a,b) => b.year.localeCompare(a.year));
                const primaryStats = s25 || s26 || history.find(h => h.year === '2024')?.stats;
                const position = mapPosition(p.position);
                const age = person.currentAge || 25;
                
                const attributes: PlayerRatings = {
                    contact: 50, power: 50, eye: 50, speed: 50, defense: 50, reaction: 50, arm: 50,
                    stuff: 50, control: 50, stamina: 50, velocity: 50, spin: 50
                };
                let overall = 60;
                let trait = "";
                let isStarter = false;

                // Init ALL stats counters to 0
                const statsCounters: StatsCounters = { 
                    ab:0, h:0, d:0, t:0, hr:0, gsh:0, bb:0, ibb:0, hbp:0, so:0, rbi:0, sb:0, cs:0, gidp:0, sf:0, sac:0, r:0, lob:0, xbh:0, tb:0, roe:0, wo:0, pa:0,
                    totalExitVelo: 0, battedBallEvents: 0, hardHits: 0, barrels: 0, swings: 0, whiffs: 0, groundouts:0, flyouts:0,
                    outsPitched:0, er:0, p_r:0, p_h:0, p_bb:0, p_ibb:0, p_hbp: 0, p_hr: 0, p_so:0, wp:0, bk:0, pk:0, bf:0, 
                    wins:0, losses:0, saves:0, holds:0, blownSaves: 0, pitchesThrown: 0, strikes: 0, qs:0, cg:0, sho:0, gf:0, svo:0, ir:0, irs:0, rw:0,
                    gs: 0,
                    po: 0, a: 0, e: 0, dp: 0, tp:0, pb:0, ofa:0, chances: 0, inn: 0
                };

                const defensiveStats: DefensiveStats = {
                    fpct: careerFielding.chances > 0 ? (careerFielding.po + careerFielding.a) / careerFielding.chances : 0.980,
                    drs: (Math.random() * 10) - 5, // Simulated baseline
                    uzr: (Math.random() * 8) - 4,
                    oaa: (Math.random() * 6) - 3,
                    po: 0, a: 0, e: 0, dp: 0, rf9: 0,
                    chances: careerFielding.chances || 0
                };

                if (position === Position.P || isTwoWay) {
                    // Logic for Pitching attributes
                    const pStats = position === Position.P ? primaryStats : (s26 || s25); 
                    if (pStats && pStats.inningsPitched) {
                        const ip = parseFloat(pStats.inningsPitched || pStats.ip || '0');
                        const safeIp = ip > 0 ? ip : 1;
                        
                        const k = pStats.strikeOuts || pStats.so || 0;
                        const bb = pStats.baseOnBalls || pStats.bb || 0;
                        const era = parseFloat(pStats.era) || 4.50;

                        const k9 = (k / safeIp) * 9;
                        const bb9 = (bb / safeIp) * 9;

                        attributes.stuff = calcRating(k9, 5.0, 12.0);
                        attributes.control = calcRating(5.0 - bb9, 1.0, 4.0);
                        attributes.velocity = calcRating(k9, 6.0, 13.0); 
                        attributes.spin = calcRating(k9 + (10-bb9), 12, 20);

                        let pOverall = calcRating(5.00 - era, 2.80, 5.20); 
                        if (pOverall < 40) pOverall = 40;
                        if (position === Position.P) overall = pOverall;

                        // Logic to check if real-life starter
                        const maxStartsInSeason = Math.max(...history.map(h => h.stats.starts || 0));
                        const recentStarts = s25?.gamesStarted || s26?.gamesStarted || 0;
                        const recentSaves = s25?.saves || s26?.saves || 0;
                        const isExplicitSP = p.position.abbreviation === 'SP';

                        if (isExplicitSP || (maxStartsInSeason > 5 || recentStarts > 3) && recentSaves < 5) {
                            isStarter = true;
                            attributes.stamina = calcRating(ip, 90, 190);
                            if (attributes.stamina < 70) attributes.stamina = 75; 
                        } else {
                            attributes.stamina = calcRating(ip, 20, 70);
                            if (recentSaves > 5) {
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
                    const hStats = history.find(h => (h.year === '2025' || h.year === '2026' || h.year === '2026 Proj') && h.stats.avg !== undefined)?.stats;

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

                overall = Math.max(55, Math.min(99, overall));
                if (isTwoWay) {
                    trait = "Two-Way Star"; // Override
                    overall = Math.min(99, overall + 5); // Bonus for flexibility
                }
                
                let potential = overall;
                if (age < 24) potential += (Math.random() * 10) + 5;
                else if (age < 28) potential += (Math.random() * 5);
                else if (age > 33) potential -= (Math.random() * 5);
                potential = Math.min(99, Math.max(45, potential));

                const meta = { isStarter, rating: overall, saves: (s25?.saves || 0) };

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
                        avgVelocity: 0, spinRate: 0, extension: 0
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
        starters.sort((a,b) => b.rating - a.rating);

        // Ensure we have at least 5 starters
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
        
        // Cap starters at 6 to ensure bullpen population
        if (starters.length > 6) {
             const excess = starters.slice(6);
             starters = starters.slice(0, 6);
             excess.forEach(p => (p as any)._meta.isStarter = false);
        }

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
