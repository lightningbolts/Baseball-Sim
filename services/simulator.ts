
import { Team, GameResult, GameEvent, Player, Position, PlayerHistoryEntry, PitchDetails, StatsCounters, BoxScore, BoxScorePlayer, LineScore } from "../types";

// --- Historical Bias Logic ---
// This weights recent seasons heavily to project player performance
// Fixes issues with players like Cal Raleigh underperforming their historical stats
const getHistoricalPerformance = (player: Player) => {
    if (!player.history || player.history.length === 0) return { powerFactor: 1.0, contactFactor: 1.0, pitchingFactor: 1.0 };

    // Weight the most recent seasons heavily, older seasons lightly
    const ordered = [...player.history].sort((a,b) => (parseInt(b.year as string, 10) || 0) - (parseInt(a.year as string, 10) || 0));
    const latestYear = parseInt(ordered[0]?.year as string, 10) || 0;
    const recent = ordered.slice(0, 5); // Use up to 5 recent seasons for stability

    let batWeightSum = 0;
    let totalG = 0;
    let totalHR = 0;
    let totalAvgWeighted = 0;
    let totalOPSWeighted = 0;
    let totalPA = 0;

    let pitchWeightSum = 0;
    let totalIP = 0;
    let totalERASum = 0;
    let totalK9Weighted = 0;

    recent.forEach((h, idx) => {
        const yearNum = parseInt(h.year as string, 10) || latestYear;
        // Stronger recency weighting - 2025 data matters most
        const recencyBoost = yearNum >= 2025 ? 1.50 : yearNum >= 2024 ? 1.30 : yearNum >= 2023 ? 1.10 : yearNum >= 2022 ? 0.95 : 0.75;
        const decayWeight = Math.max(0.15, 0.80 - (idx * 0.15));
        const weight = recencyBoost * decayWeight;

        if (player.position !== Position.P || player.isTwoWay) {
            const pa = h.stats.pa || h.stats.games * 4 || 0;
            if (h.stats.games > 0 && pa > 50) { // Minimum PA threshold
                batWeightSum += weight;
                totalG += (h.stats.games || 0) * weight;
                totalHR += (h.stats.hr || 0) * weight;
                totalAvgWeighted += (h.stats.avg || 0) * weight;
                totalOPSWeighted += (h.stats.ops || 0) * weight;
                totalPA += pa * weight;
            }
        }
        if (player.position === Position.P || player.isTwoWay) {
            if (h.stats.ip && h.stats.ip > 10) { // Minimum IP threshold
                pitchWeightSum += weight;
                totalIP += h.stats.ip * weight;
                totalERASum += (h.stats.era || 4.5) * h.stats.ip * weight;
                totalK9Weighted += (h.stats.k9 || 8.0) * weight;
            }
        }
    });

    let powerFactor = 1.0;
    let contactFactor = 1.0;
    let pitchingFactor = 1.0;

    if (batWeightSum > 0 && totalG > 20) {
        const hrPerGame = totalHR / totalG;
        const avgRecent = totalAvgWeighted / batWeightSum;
        const opsRecent = totalOPSWeighted / batWeightSum;
        
        // Power factor based on HR rate
        if (hrPerGame > 0.22) powerFactor = 1.40; 
        else if (hrPerGame > 0.16) powerFactor = 1.22;
        else if (hrPerGame > 0.10) powerFactor = 1.08;
        else if (hrPerGame < 0.04) powerFactor = 0.82;
        
        // Contact factor based on AVG AND OPS (fixes Cal Raleigh issue)
        // Raleigh has .220-.230 AVG but .750+ OPS due to power
        if (opsRecent > 0.850) contactFactor = Math.max(contactFactor, 1.20);
        else if (opsRecent > 0.780) contactFactor = Math.max(contactFactor, 1.12);
        else if (opsRecent > 0.720) contactFactor = Math.max(contactFactor, 1.05);
        
        if (avgRecent > 0.295) contactFactor = Math.max(contactFactor, 1.25);
        else if (avgRecent > 0.270) contactFactor = Math.max(contactFactor, 1.12);
        else if (avgRecent > 0.250) contactFactor = Math.max(contactFactor, 1.05);
        else if (avgRecent < 0.220 && opsRecent < 0.680) contactFactor = 0.88;
        
        // Age-based regression (significant decline after 32)
        if (player.age >= 36) {
            powerFactor *= 0.82;
            contactFactor *= 0.84;
        } else if (player.age >= 34) {
            powerFactor *= 0.88;
            contactFactor *= 0.90;
        } else if (player.age >= 32) {
            powerFactor *= 0.93;
            contactFactor *= 0.94;
        } else if (player.age >= 30) {
            powerFactor *= 0.97;
            contactFactor *= 0.98;
        }
    }

    if (pitchWeightSum > 0 && totalIP > 30) {
        const eraRecent = totalERASum / (totalIP || 1);
        const k9Recent = totalK9Weighted / pitchWeightSum;
        
        // More granular pitching factor
        if (eraRecent < 2.50) pitchingFactor = 1.35; 
        else if (eraRecent < 3.20) pitchingFactor = 1.22;
        else if (eraRecent < 3.80) pitchingFactor = 1.10;
        else if (eraRecent < 4.50) pitchingFactor = 1.00;
        else if (eraRecent > 5.50) pitchingFactor = 0.82;
        else if (eraRecent > 5.00) pitchingFactor = 0.88;
        
        // K/9 bonus
        if (k9Recent > 11.0) pitchingFactor += 0.08;
        else if (k9Recent > 9.5) pitchingFactor += 0.04;
    }

    return { powerFactor, contactFactor, pitchingFactor };
};

// --- Stats Update Helpers ---
const updateBatterStats = (player: Player, result: string, rbi: number, statcast?: { ev: number, la: number, whiff: boolean }) => {
    const s = player.statsCounters;

    if (result === 'BB') s.bb++;
    else if (result === 'IBB') s.ibb++;
    else if (result === 'HBP') s.hbp++;
    else if (result === 'SAC') s.sac++;
    else if (result === 'SF') s.sf++;
    else if (result !== 'E' && result !== 'RECALC' && result !== 'ROE') s.ab++; 

    if (result === 'K') s.so++;
    if (result === 'GIDP') s.gidp++;
    
    if (['1B', '2B', '3B', 'HR'].includes(result)) {
        s.h++;
        if (result === '2B') { s.d++; s.xbh++; }
        if (result === '3B') { s.t++; s.xbh++; }
        if (result === 'HR') { s.hr++; s.xbh++; }
    }
    s.rbi += rbi;
    
    // Total Bases
    if (result === '1B') s.tb += 1;
    if (result === '2B') s.tb += 2;
    if (result === '3B') s.tb += 3;
    if (result === 'HR') s.tb += 4;

    // Statcast Updates
    if (statcast) {
        if (!statcast.whiff) {
            s.battedBallEvents++;
            s.totalExitVelo += statcast.ev;
            if (statcast.ev >= 95) s.hardHits++;
            if (statcast.ev >= 98 && statcast.la >= 26 && statcast.la <= 30) s.barrels++;
        } else {
            s.whiffs++;
        }
        s.swings++;
    }

    // Derived Advanced Metrics
    if (!player.batting) player.batting = { 
        avg:0, obp:0, slg:0, ops:0, hr:0, rbi:0, sb:0, wrc_plus:100, war:0, 
        woba: 0, iso: 0, babip: 0, bb_pct: 0, k_pct: 0,
        exitVelocity: 0, launchAngle: 0, barrel_pct: 0, hardHit_pct: 0, whiff_pct: 0, sprintSpeed: 27,
        gamesPlayed: 0, ibb: 0
    };
    const b = player.batting;
    b.gamesPlayed = s.g; // Update games played from counter
    b.ibb = s.ibb;        // Update IBB from counter
    
    if (s.ab > 0) {
        b.avg = s.h / s.ab;
        b.slg = s.tb / s.ab;
        b.iso = b.slg - b.avg;
        
        const ballsInPlay = s.ab - s.so - s.hr + s.sf;
        b.babip = ballsInPlay > 0 ? (s.h - s.hr) / ballsInPlay : 0;
    } else {
        b.avg = 0; b.slg = 0; b.iso = 0; b.babip = 0;
    }
    
    s.pa = s.ab + s.bb + s.hbp + s.sf + s.sac; 
    b.obp = s.pa > 0 ? (s.h + s.bb + s.hbp + s.ibb) / s.pa : 0;
    b.ops = b.obp + b.slg;
    b.hr = s.hr;
    b.rbi = s.rbi;
    b.sb = s.sb;
    
    // wOBA & wRC+
    if (s.pa > 0) {
        const ubb = Math.max(0, s.bb - s.ibb);
        b.woba = ((0.69 * ubb) + (0.72 * s.hbp) + (0.88 * (s.h - s.d - s.t - s.hr)) + (1.27 * s.d) + (1.61 * s.t) + (2.10 * s.hr)) / s.pa;
        b.bb_pct = ubb / s.pa;
        b.k_pct = s.so / s.pa;
        
        // wRC+ calculation - calibrated to have fewer 150+ wRC+ players
        // MLB typically has ~10-15 players with 150+ wRC+ in a season
        const lgwOBA = 0.318; // Slightly higher league average (was 0.315)
        const wOBAScale = 1.20; // Slightly lower scale = lower wRC+ output (was 1.25)
        const lgRperPA = 0.118; // Slightly higher league runs per PA (was 0.115)
        
        // Calculate wRC using proper formula
        const wRC = (((b.woba - lgwOBA) / wOBAScale) + lgRperPA) * s.pa;
        const lgwRC = lgRperPA * s.pa;
        
        // Raw wRC+ calculation
        let rawWrcPlus = lgwRC > 0 ? (wRC / lgwRC) * 100 : 100;
        
        // Apply slight regression to extreme values
        // This prevents too many players from having 150+ wRC+
        if (rawWrcPlus > 140) {
            rawWrcPlus = 140 + (rawWrcPlus - 140) * 0.70; // Compress values above 140
        } else if (rawWrcPlus < 60) {
            rawWrcPlus = 60 + (rawWrcPlus - 60) * 0.70; // Compress values below 60
        }
        
        b.wrc_plus = rawWrcPlus;
        
        // Hitter WAR calculation using exact formula from user:
        // WAR = (Batting Runs + Baserunning Runs + Fielding Runs + Positional Adj + Replacement Runs) / Runs Per Win
        
        // Step A: Batting Runs (wRAA - Weighted Runs Above Average)
        const wRAA = ((b.woba - lgwOBA) / wOBAScale) * s.pa;
        
        // Step B: Baserunning Runs (wSB)
        const baserunningRuns = (0.2 * s.sb) - (0.4 * s.cs);
        
        // Step C: Fielding Runs (use DRS directly)
        const fieldingRuns = player.defense?.drs || 0;
        
        // Step D: Positional Adjustment (scaled by innings played / 1458)
        // Using PA as proxy: full season = 600 PA ≈ 1458 innings
        const positionAdjustments: { [key: string]: number } = {
            'C': 12.5, 'SS': 7.5, '2B': 2.5, '3B': 2.5, 'CF': 2.5, 
            'LF': -7.5, 'RF': -7.5, '1B': -12.5, 'DH': -17.5
        };
        const posAdj = (positionAdjustments[player.position] || 0) * (s.pa / 600);
        
        // Step E: Replacement Level Runs = 20 * (PA / 600)
        const replacementRuns = 20 * (s.pa / 600);
        
        // Step F: Final Calculation
        const runsPerWin = 10.0;
        b.war = (wRAA + baserunningRuns + fieldingRuns + posAdj + replacementRuns) / runsPerWin;
    }

    if (s.battedBallEvents > 0) {
        b.exitVelocity = s.totalExitVelo / s.battedBallEvents;
        b.hardHit_pct = s.hardHits / s.battedBallEvents;
        b.barrel_pct = s.barrels / s.battedBallEvents;
    }
    if (s.swings > 0) {
        b.whiff_pct = s.whiffs / s.swings;
    }
    
    player.seasonStats.games = s.ab + s.bb + s.hbp + s.sac + s.sf; // Approx
    player.seasonStats.avg = b.avg;
    player.seasonStats.hr = b.hr;
};

const updatePitcherStats = (player: Player, outcome: string, outsChange: number, runsAllowed: number, pitches: number, save: boolean = false, hold: boolean = false, blownSave: boolean = false) => {
    const s = player.statsCounters;

    s.outsPitched += outsChange;
    s.er += runsAllowed; // Simplified: Assume all runs earned for now
    s.p_r += runsAllowed;
    
    // NOTE: Pitch count is passed in from simulator, accumulating here is correct.
    // However, ensure simulateGame doesn't double count.
    // We will ONLY increment pitches here.
    
    if (outcome === 'K') s.p_so++;
    if (outcome === 'BB') s.p_bb++;
    if (outcome === 'HBP') s.p_hbp++;
    if (outcome === 'WP') s.wp++;
    
    if (['1B', '2B', '3B', 'HR'].includes(outcome)) s.p_h++;
    if (outcome === 'HR') s.p_hr++;

    s.bf++; // Batters Faced increment

    if (save) s.saves++;
    if (hold) s.holds++;
    if (blownSave) s.blownSaves++;

    // Derived
    if (!player.pitching) player.pitching = { 
        era:0, whip:0, so:0, bb:0, ip:0, saves:0, holds:0, blownSaves:0, fip:0, war:0, pitchesThrown: 0,
        xfip: 0, k9: 0, bb9: 0, hr9: 0, csw_pct: 0, siera: 0, babip: 0,
        avgVelocity: 93, spinRate: 2300, extension: 6.5,
        gamesPlayed: 0, gamesStarted: 0, wins: 0, losses: 0, strikeouts: 0, inningsPitched: 0, ibb: 0
    };
    const p = player.pitching;

    p.ip = s.outsPitched / 3;
    p.inningsPitched = p.ip; // Alias for clarity
    p.so = s.p_so;
    p.strikeouts = s.p_so; // Alias for clarity
    p.bb = s.p_bb;
    p.ibb = s.p_ibb; // Intentional walks allowed
    p.saves = s.saves;
    p.holds = s.holds;
    p.blownSaves = s.blownSaves;
    p.pitchesThrown = s.pitchesThrown;
    p.gamesPlayed = s.gp;
    p.gamesStarted = s.gs;
    p.wins = s.wins;
    p.losses = s.losses;

    if (p.ip > 0) {
        p.era = (s.er * 9) / p.ip;
        p.whip = (s.p_bb + s.p_h) / p.ip;
        p.k9 = (s.p_so / p.ip) * 9;
        p.bb9 = (s.p_bb / p.ip) * 9;
        p.hr9 = (s.p_hr / p.ip) * 9;

        // Step A: Calculate FIP
        const cFIP = 3.10; // FIP constant
        p.fip = ((13 * s.p_hr) + (3 * (s.p_bb + s.p_hbp)) - (2 * s.p_so)) / p.ip + cFIP;
        
        // Pitcher WAR calculation using exact formula from user:
        // WAR = Runs Above Replacement / Runs Per Win
        
        // Step B: Park adjustment (simplified - assume neutral park factor of 1.0)
        const parkFactor = 1.0;
        const fipMinus = p.fip * parkFactor;
        
        // Step C: Convert FIP to RA9 scale
        const lgERA = 4.20; // League average ERA
        const lgFIP = 4.20; // League average FIP
        const ra9fip = (lgERA / lgFIP) * fipMinus;
        
        // Step D: Runs Above Replacement
        // Replacement Level RA9 = League Average RA9 + 1.00
        const lgRA9 = lgERA; // Simplified: use ERA as proxy for RA9
        const replacementRA9 = lgRA9 + 1.00; // Typically league avg + 1.00 = 5.20
        
        const runsAboveReplacement = (replacementRA9 - ra9fip) * (p.ip / 9);
        
        // Step E: Final Calculation
        const runsPerWin = 10.0;
        p.war = runsAboveReplacement / runsPerWin;
        
        const totalStrikes = s.strikes || (s.p_so * 3); 
        p.csw_pct = s.pitchesThrown > 0 ? totalStrikes / s.pitchesThrown : 0;
    } else {
        p.era = 0; 
        p.war = 0;
    }
    
    player.seasonStats.era = p.era;
};

const updateDefense = (team: Team, position: Position, type: 'PO' | 'A' | 'E') => {
    // Find the actual fielder currently playing at this position (rotationSlot 0 means actively playing in simulation context)
    // For simulation simplicity, we assume best rated fielder at position is playing
    const fielder = team.roster.filter(p => p.position === position).sort((a,b) => b.rating - a.rating)[0];

    if (fielder) {
        if (!fielder.defense) fielder.defense = { fpct:0, drs:0, uzr:0, oaa:0, po:0, a:0, e:0, dp:0, rf9:0, chances: 0 };
        const d = fielder.defense;
        const s = fielder.statsCounters;
        
        d.chances = (d.chances || 0) + 1;
        s.chances = d.chances;

        if (type === 'PO') { d.po++; s.po++; }
        if (type === 'A') { d.a++; s.a++; }
        if (type === 'E') { d.e++; s.e++; }

        if (d.chances > 0) d.fpct = (d.po + d.a) / d.chances;

        // Realistic OAA/UZR/DRS calculation based on play difficulty and fielder skill
        // MLB OAA ranges: elite +15 to +20, avg 0, poor -10 to -15 over full season
        const defRating = fielder.attributes.defense || 50;
        const reactionRating = fielder.attributes.reaction || 50;
        const combinedDef = (defRating * 0.6 + reactionRating * 0.4);
        
        // Each play has a baseline difficulty, adjusted by fielder skill
        const playDifficulty = 0.5 + (Math.random() * 0.4); // 0.5-0.9 difficulty
        const expectedOutPct = Math.max(0.40, Math.min(0.95, 0.65 + (combinedDef - 50) * 0.006));
        
        // OAA: Outs Above Average - measures plays made vs expected
        let oaaInc = 0;
        if (type === 'E') {
            // Error = negative OAA (failed on makeable play)
            oaaInc = -(playDifficulty * 0.12);
        } else {
            // Successful out - bonus if difficult play, penalty if easy play
            const playAboveExpected = (1 - playDifficulty) - (1 - expectedOutPct);
            oaaInc = playAboveExpected * 0.06;
        }
        
        // DRS/UZR derived from OAA with position-specific multipliers
        const runValue = 0.8; // runs per out above average
        const drsInc = oaaInc * runValue * 1.1;
        const uzrInc = oaaInc * runValue * 0.95;

        d.oaa += oaaInc;
        d.uzr += uzrInc;
        d.drs += drsInc;

        // Clamp to realistic seasonal ranges (full season: -15 to +20)
        d.oaa = Math.max(-18, Math.min(22, d.oaa));
        d.uzr = Math.max(-15, Math.min(18, d.uzr));
        d.drs = Math.max(-15, Math.min(20, d.drs));
    }
};

type PitchResult = 'Ball' | 'StrikeLooking' | 'StrikeSwinging' | 'Foul' | 'InPlay' | 'HBP' | 'WP';

const getFatiguePenalty = (pitcher: Player, currentPitches: number): number => {
    const stamina = pitcher.attributes.stamina || 50;
    const isStarter = pitcher.rotationSlot >= 1 && pitcher.rotationSlot <= 8;
    
    // Starters tire around 75-90 pitches, relievers around 20-30
    const threshold = isStarter 
        ? Math.max(60, (stamina * 0.65) + 25)  // 60-90 pitch threshold for starters
        : Math.max(15, (stamina * 0.25) + 10); // 15-25 pitch threshold for relievers
    
    if (currentPitches <= threshold) return 0;
    
    // Steeper fatigue curve - pitchers lose effectiveness faster
    // This helps raise ERA by making tired pitchers give up more hits
    const pitchesOver = currentPitches - threshold;
    const fatigueRate = isStarter ? 0.8 : 1.2; // Relievers tire faster past their limit
    
    return Math.pow(pitchesOver, 1.6) * fatigueRate;
};

const getEffectiveAttr = (base: number, fatigue: number): number => {
    const form = (Math.random() * 10) - 5;
    return Math.max(5, Math.min(99, base + form - fatigue));
};

const simulatePitch = (pitcher: Player, batter: Player, currentPitches: number): PitchResult => {
    const fatiguePenalty = getFatiguePenalty(pitcher, currentPitches);
    const hist = getHistoricalPerformance(pitcher);
    
    const effectiveControl = getEffectiveAttr(pitcher.attributes.control || 50, fatiguePenalty);
    const effectiveEye = getEffectiveAttr(batter.attributes.eye || 50, 0);
    
    // Rare events - slightly increased for realism
    if (Math.random() < 0.005) return 'HBP'; 
    if (Math.random() < 0.004) return 'WP';

    // Strike Zone Probability - calibrated for 4.20-4.50 league ERA
    // MLB average BB/9 is ~3.3, which means ~8.5% of PA are walks
    // Lower strike zone prob = more balls = higher BB rate = higher ERA
    const strikeZoneProb = 0.44 + (effectiveControl * 0.0010);
    
    if (Math.random() > strikeZoneProb) {
        // Outside Zone
        const chaseProb = 0.30 - (effectiveEye * 0.003);
        if (Math.random() < chaseProb) {
             // Chased pitch - usually strike swinging
             return 'StrikeSwinging';
        }
        return 'Ball';
    }

    // Inside Zone
    const swingProb = 0.78; 
    if (Math.random() > swingProb) {
        return 'StrikeLooking';
    }

    // Swing Result
    let effectiveStuff = getEffectiveAttr(pitcher.attributes.stuff || 50, fatiguePenalty * 0.8);
    if (hist.pitchingFactor > 1.15) effectiveStuff += 4; // Reduced bonus

    const effectiveContact = getEffectiveAttr(batter.attributes.contact || 50, 0);
    
    // League Contact% is around 76-78%
    // Increase contact rate slightly to create more balls in play -> more runs -> higher ERA
    let contactProb = 0.82 + ((effectiveContact - effectiveStuff) * 0.0022);
    contactProb = Math.max(0.55, Math.min(0.94, contactProb));

    if (Math.random() > contactProb) {
        return 'StrikeSwinging';
    }

    // Foul vs InPlay - reduce foul rate to increase balls in play
    // More balls in play = more opportunities for hits = higher ERA
    
    if (Math.random() < 0.22) return 'Foul'; // Lower foul rate = more balls in play
    return 'InPlay';
};

const resolveBallInPlay = (pitcher: Player, batter: Player, defenseTeam: Team, runners: number[], currentPitches: number, parkFactors?: { run: number; hr: number; babip: number }): { result: string, type: string, desc: string, outs: number, runs: number, rbi: number, ev: number, la: number } => {
    const fatiguePenalty = getFatiguePenalty(pitcher, currentPitches);
    
    const batterHist = getHistoricalPerformance(batter);
    const pitcherHist = getHistoricalPerformance(pitcher);

    const effectivePower = getEffectiveAttr(batter.attributes.power || 50, 0);
    const effectiveContact = getEffectiveAttr(batter.attributes.contact || 50, 0);
    const effectiveSpeed = getEffectiveAttr(batter.attributes.speed || 50, 0);
    const effectiveStuff = getEffectiveAttr(pitcher.attributes.stuff || 50, fatiguePenalty);
    
    const baseEV = 85 + (effectivePower / 4);
    const ev = Math.min(120, Math.max(60, baseEV + (Math.random() * 25 - 10)));
    
    // Check for Sac Bunt
    if (runners[0] === 1 && (runners[1] === 0 && runners[2] === 0) && effectivePower < 45) {
        if (Math.random() < 0.05) {
            updateDefense(defenseTeam, Position.C, 'A'); 
            updateDefense(defenseTeam, Position.TB, 'PO');
            return { result: 'SAC', type: 'Out', desc: 'lays down a sacrifice bunt', outs: 1, runs: 0, rbi: 0, ev: 45, la: -15 };
        }
    }

    // HIT PROBABILITY TUNING - Calibrated for realistic ERA (4.20-4.50 league avg)
    // Target: .240-.250 league AVG, .310-.315 OBP
    // KEY FIX: Previous values were too low, causing unrealistically low ERA
    // MLB league BABIP is ~.300, so hit prob on ball in play should be ~30%
    let hitProb = 0.288 + ((effectiveContact - effectiveStuff) * 0.0024) + (fatiguePenalty * 0.008);
    
    // Apply historical factors with caps to prevent extremes
    const cappedContactFactor = Math.min(batterHist.contactFactor, 1.20);
    if (cappedContactFactor > 1.1) hitProb += 0.014;
    if (cappedContactFactor > 1.15) hitProb += 0.010;
    
    // Pitcher penalties - elite pitchers still suppress hits but more modestly
    if (pitcherHist.pitchingFactor > 1.1) hitProb -= 0.020;
    if (pitcherHist.pitchingFactor > 1.2) hitProb -= 0.015;
    if (pitcherHist.pitchingFactor > 1.3) hitProb -= 0.010;
    
    const park = parkFactors || { run: 100, hr: 100, babip: 100 };
    const runAdj = park.run / 100;
    const babipAdj = park.babip / 100;
    hitProb *= (0.7 * runAdj + 0.3 * babipAdj);
    hitProb = Math.min(0.405, Math.max(0.165, hitProb));

    // OUT
    if (Math.random() > hitProb) {
        let targetPos = Position.SS;
        const isFly = Math.random() > 0.45; // GO/AO Ratio ~ 1.2
        const la = isFly ? 30 : -10;
        
        if (isFly) targetPos = [Position.LF, Position.CF, Position.RF][Math.floor(Math.random()*3)];
        else targetPos = [Position.SS, Position.SB, Position.TB_3][Math.floor(Math.random()*3)];

        const fielder = defenseTeam.roster.find(p => p.position === targetPos) || defenseTeam.roster[0];
        const defRating = fielder.attributes.defense || 50;
        
        // Errors
        const errorProb = 0.015 - ((defRating - 50) * 0.0003);
        if (Math.random() < Math.max(0.001, errorProb)) {
             updateDefense(defenseTeam, targetPos, 'E');
             return { result: 'E', type: 'error', desc: 'reaches on a fielding error', outs: 0, runs: 0, rbi: 0, ev, la };
        }

        if (isFly) {
            updateDefense(defenseTeam, targetPos, 'PO');
        } else {
            updateDefense(defenseTeam, targetPos, 'A');
            updateDefense(defenseTeam, Position.TB, 'PO');
        }

        // GIDP
        if (runners[0] === 1 && !isFly && runners[1] === 0 && runners[2] === 0) { 
            // GIDP rate higher for slow runners
            if (Math.random() < 0.15 - (effectiveSpeed * 0.001)) {
                 return { result: 'GIDP', type: 'Out', desc: 'grounds into a double play', outs: 2, runs: 0, rbi: 0, ev, la };
            }
        }
        
        // Sac Fly
        if (runners[2] === 1 && isFly && (runners.filter(r => r===1).length < 3 || Math.random() < 0.7)) {
            if (Math.random() < 0.30 + (effectiveContact * 0.001)) {
                return { result: 'SF', type: 'Out', desc: 'hits a sacrifice fly', outs: 1, runs: 1, rbi: 1, ev, la };
            }
        }
        
        return { result: 'OUT', type: 'Out', desc: isFly ? 'flies out' : 'grounds out', outs: 1, runs: 0, rbi: 0, ev, la };
    }

    // HIT
    // HR Rates: Calibrated for realistic ~30-35 HR leader (reduced from 70+)
    // MLB avg is ~1.1 HR/game per team, leaders hit 45-55 HRs max
    let hrProb = 0.058 + ((effectivePower - effectiveStuff) * 0.0025);
    
    // Cap power factor bonus to prevent Ohtani-type 70+ HR seasons
    const cappedPowerFactor = Math.min(batterHist.powerFactor, 1.35);
    if (cappedPowerFactor > 1.2) hrProb += 0.025; 
    if (cappedPowerFactor > 1.3) hrProb += 0.015;
    hrProb *= (park.hr / 100);
    
    // Tighter cap: max ~18% HR rate on contact (was 28%)
    hrProb = Math.max(0.025, Math.min(0.18, hrProb));

    if (Math.random() < hrProb) {
        return { result: 'HR', type: 'Home Run', desc: 'crushes a home run!', outs: 0, runs: 1, rbi: 1, ev: 105, la: 28 };
    }

    // XBH rates - doubles ~6-7% of PA for good hitters
    let gapProb = 0.16 + (effectivePower * 0.0022) + (effectiveSpeed * 0.0012);
    gapProb *= (0.8 + (park.babip / 100) * 0.2);
    if (Math.random() < gapProb) {
        if (Math.random() < 0.045 + (effectiveSpeed * 0.005)) {
             return { result: '3B', type: 'Triple', desc: 'races for a triple', outs: 0, runs: 0, rbi: 0, ev: 98, la: 18 };
        }
        return { result: '2B', type: 'Double', desc: 'doubles into the gap', outs: 0, runs: 0, rbi: 0, ev: 100, la: 15 };
    }

    return { result: '1B', type: 'Single', desc: 'singles', outs: 0, runs: 0, rbi: 0, ev: 90, la: 10 };
};

const getBestLineup = (team: Team): Player[] => {
    const candidates = team.roster.filter(p => !p.injury.isInjured && (p.position !== Position.P || p.isTwoWay));
    
    // Calculate a "starter score" based on historical games played AND rating
    // This ensures regular players like Cal Raleigh get selected over depth players
    const getStarterScore = (p: Player): number => {
        let historicalGames = 0;
        let recentSeasons = 0;
        
        // Weight recent seasons' games played heavily
        if (p.history && p.history.length > 0) {
            const sorted = [...p.history].sort((a, b) => (parseInt(b.year, 10) || 0) - (parseInt(a.year, 10) || 0));
            for (let i = 0; i < Math.min(3, sorted.length); i++) {
                const h = sorted[i];
                const yearNum = parseInt(h.year, 10) || 0;
                const games = h.stats.games || 0;
                const pa = h.stats.pa || 0;
                
                // Recent years matter more
                const recencyWeight = yearNum >= 2025 ? 1.5 : yearNum >= 2024 ? 1.2 : 1.0;
                
                // Players with 100+ games are starters, 50-100 are platoon, <50 are depth
                if (games >= 100 || pa >= 400) {
                    historicalGames += games * recencyWeight * 1.5; // Strong starter bonus
                } else if (games >= 50 || pa >= 200) {
                    historicalGames += games * recencyWeight;
                } else {
                    historicalGames += games * recencyWeight * 0.5; // Penalty for low games
                }
                recentSeasons++;
            }
        }
        
        // Normalize games to a 0-100 scale (150 games = 100 score)
        const gamesScore = Math.min(100, (historicalGames / recentSeasons || 0) / 1.5);
        
        // Combined score: 60% historical usage, 40% rating
        // This heavily favors players who actually played regularly
        return (gamesScore * 0.60) + (p.rating * 0.40);
    };
    
    // Group by position and select best starter for each
    const positions = [Position.C, Position.TB, Position.SB, Position.TB_3, Position.SS, Position.LF, Position.CF, Position.RF, Position.DH];
    const lineup: Player[] = [];
    const usedIds = new Set<string>();
    
    // First pass: fill each position with best historical starter
    for (const pos of positions) {
        const positionCandidates = candidates.filter(p => p.position === pos && !usedIds.has(p.id));
        if (positionCandidates.length > 0) {
            positionCandidates.sort((a, b) => getStarterScore(b) - getStarterScore(a));
            const starter = positionCandidates[0];
            lineup.push(starter);
            usedIds.add(starter.id);
        }
    }
    
    // Second pass: if we don't have 9, fill with best remaining by starter score
    if (lineup.length < 9) {
        const remaining = candidates.filter(p => !usedIds.has(p.id));
        remaining.sort((a, b) => getStarterScore(b) - getStarterScore(a));
        for (const p of remaining) {
            if (lineup.length >= 9) break;
            lineup.push(p);
            usedIds.add(p.id);
        }
    }
    
    // Sort lineup by batting order (best hitters in 2-4 spots)
    lineup.sort((a, b) => getStarterScore(b) - getStarterScore(a));
    
    return lineup.slice(0, 9);
};

const getReliever = (team: Team, usedIds: Set<string>, role: 'Closer' | 'Setup' | 'Long' | 'Any', inning: number = 9, scoreDiff: number = 0): Player | null => {
    // Filter available relievers: not injured, is pitcher, not yet used this game, rested, and is a reliever (slot >= 9)
    // CRITICAL: Also check they haven't exceeded their season workload limits
    const pitchers = team.roster.filter(p => {
        if (p.injury.isInjured) return false;
        if (p.position !== Position.P && !p.isTwoWay) return false;
        if (usedIds.has(p.id)) return false;
        if (p.daysRest < 0) return false;
        if (p.rotationSlot < 9) return false; // Not a reliever
        
        // WORKLOAD LIMIT: Relievers max out at ~80 IP/season, typical is 50-70 IP
        // This prevents relievers from accumulating 200+ IP
        const currentIP = p.pitching?.ip || 0;
        const maxSeasonIP = p.rotationSlot === 9 ? 75 : 80; // Closers get fewer innings (high leverage only)
        if (currentIP >= maxSeasonIP) return false;
        
        // Rest requirements: Closers need 1 day, others need 0 but prefer rested arms
        if (p.rotationSlot === 9 && p.daysRest < 1) return false;
        
        return true;
    });
    
    // CLOSER LOGIC: Use closer in save situations (9th inning, lead of 1-3 runs)
    if (role === 'Closer' || (inning >= 9 && scoreDiff > 0 && scoreDiff <= 3)) {
        const closer = pitchers.find(p => p.rotationSlot === 9 && p.daysRest >= 1);
        if (closer) return closer;
        // If closer unavailable, use best available setup man
        const setupMan = pitchers.filter(p => p.rotationSlot >= 10).sort((a, b) => b.rating - a.rating)[0];
        if (setupMan) return setupMan;
    }
    
    // SETUP MAN LOGIC: 7th-8th inning in close games
    if (role === 'Setup' || (inning >= 7 && inning < 9 && Math.abs(scoreDiff) <= 3)) {
        // Get high-leverage relievers (best rated, not the closer)
        const setupPitchers = pitchers.filter(p => p.rotationSlot >= 10).sort((a, b) => b.rating - a.rating);
        if (setupPitchers.length > 0) return setupPitchers[0];
    }
    
    if (pitchers.length === 0) {
        // Emergency: use any available pitcher
        return team.roster.filter(p => !p.injury.isInjured && (p.position === Position.P || p.isTwoWay) && !usedIds.has(p.id)).sort((a,b) => b.daysRest - a.daysRest)[0] || null;
    }

    // Calculate reliever score based on HISTORICAL usage + rating + rest + workload
    // This ensures established relievers get more work than unknown guys
    const getRelieverScore = (p: Player): number => {
        let historicalScore = 0;
        
        // Penalize overworked pitchers (IP-based fatigue)
        const currentIP = p.pitching?.ip || 0;
        const workloadPenalty = currentIP > 50 ? (currentIP - 50) * 2 : 0;
        
        if (p.history && p.history.length > 0) {
            const recentPitching = p.history.filter(h => 
                h.stats.ip !== undefined && h.stats.ip > 0 && 
                parseInt(h.year, 10) >= 2022
            ).slice(0, 3);
            
            for (const h of recentPitching) {
                const yearNum = parseInt(h.year, 10) || 0;
                const recencyWeight = yearNum >= 2025 ? 1.5 : yearNum >= 2024 ? 1.2 : 1.0;
                
                // High-leverage relievers: saves + holds + low ERA + high K/9
                const ip = h.stats.ip || 0;
                const saves = h.stats.saves || 0;
                const era = h.stats.era ?? 4.50;
                const games = h.stats.games || 0;
                
                // Score based on high-leverage history
                const leverageScore = (saves * 3) + games;
                const qualityScore = Math.max(0, 5.00 - (era || 4.50)) * 10;
                const volumeScore = Math.min(ip, 70); // Cap at 70 IP (typical reliever max)
                
                historicalScore += (leverageScore + qualityScore + volumeScore) * recencyWeight;
            }
        }
        
        // Combine: 40% historical, 25% rating, 20% rest, 15% workload management
        const restScore = Math.min(p.daysRest, 3) * 15; // Cap rest bonus at 3 days
        const workloadBonus = Math.max(0, 50 - (p.pitching?.ip || 0)); // Fresh arms get bonus
        return (historicalScore * 0.40) + (p.rating * 0.25) + (restScore * 0.20) + (workloadBonus * 0.15) - workloadPenalty;
    };

    return pitchers.sort((a, b) => getRelieverScore(b) - getRelieverScore(a))[0];
};

const getStarter = (team: Team): Player => {
    const rotation = team.roster.filter(p => !p.injury.isInjured && (p.position === Position.P || p.isTwoWay) && p.rotationSlot >= 1 && p.rotationSlot <= 6);
    const sortedRotation = rotation.sort((a, b) => {
        if (a.daysRest !== b.daysRest) return b.daysRest - a.daysRest;
        return a.rotationSlot - b.rotationSlot;
    });
    const fullyRested = sortedRotation.filter(p => p.daysRest >= 4);
    if (fullyRested.length > 0) {
        return fullyRested[0];
    }
    // Bullpen game if no starter
    const bullpen = team.roster.filter(p => !p.injury.isInjured && (p.position === Position.P || p.isTwoWay) && p.rotationSlot > 8 && p.daysRest >= 3);
    if (bullpen.length > 0) return bullpen.sort((a,b) => b.rating - a.rating)[0];
    return team.roster.filter(p => !p.injury.isInjured && (p.position === Position.P || p.isTwoWay)).sort((a,b) => b.daysRest - a.daysRest)[0];
}

const generatePitchMeta = (pitcher: Player, result: string): { type: string, speed: number, desc: string } => {
    let type = 'Fastball';
    let speed = 93;
    const powerArm = (pitcher.attributes.velocity || 50) >= 85;

    if (pitcher.pitchRepertoire && pitcher.pitchRepertoire.length > 0) {
        const rand = Math.random() * 100;
        let cumulative = 0;
        let selected = pitcher.pitchRepertoire[0];
        
        for (const pitch of pitcher.pitchRepertoire) {
            cumulative += pitch.usage;
            if (rand <= cumulative) {
                selected = pitch;
                break;
            }
        }
        type = selected.type;
        speed = selected.speed;
        speed += (Math.random() * 2.5 - 1.25);
        if (powerArm && type.toLowerCase().includes('fast') && Math.random() < 0.1) {
            speed += Math.random() * 2.5; // occasional triple-digit heater
        }
    } else {
        const baseVel = pitcher.attributes.velocity ? 87 + (pitcher.attributes.velocity * 0.16) : 92;
        const stuff = pitcher.attributes.stuff;
        const rand = Math.random();
        
        if (rand < 0.50) { type = 'Fastball'; speed = baseVel; }
        else if (rand < 0.70) { type = 'Changeup'; speed = baseVel - 8; }
        else if (rand < 0.85) { type = 'Slider'; speed = baseVel - 5; }
        else { type = stuff > 60 ? 'Curveball' : 'Sinker'; speed = baseVel - 10; }
        
        if (result.includes('Strike') && Math.random() > 0.6) { type = 'Slider'; speed = baseVel - 5; }
        speed += (Math.random() * 3 - 1.5);
        if (powerArm && type.toLowerCase().includes('fast') && Math.random() < 0.12) speed += 2 + Math.random();
    }
    
    return { type, speed: Math.round(speed), desc: `${Math.round(speed)}mph ${type}` };
};

export const simulateGame = (home: Team, away: Team, date: Date, isPostseason = false): GameResult => {
  const log: GameEvent[] = [];
  let homeScore = 0;
  let awayScore = 0;
  let currentInning = 1;
  let gameOver = false;

  const usedPitchers = new Set<string>();
  // Store pitchers in order of appearance
  const homePitcherOrder: string[] = [];
  const awayPitcherOrder: string[] = [];

  const gamePitcherStats = new Map<string, { pitches: number, runs: number, startInning: number, enterScoreDiff: number, inheritedRunners: number, inheritedScored: number }>();
  
  const gameStats = new Map<string, StatsCounters>();
  const getGameStats = (p: Player) => {
      if (!gameStats.has(p.id)) {
          gameStats.set(p.id, { 
            ab:0, h:0, d:0, t:0, hr:0, gsh:0, bb:0, ibb:0, hbp:0, so:0, rbi:0, sb:0, cs:0, gidp:0, sf:0, sac:0, r:0, lob:0, xbh:0, tb:0, roe:0, wo:0, pa:0,
            totalExitVelo: 0, battedBallEvents: 0, hardHits: 0, barrels: 0, swings: 0, whiffs: 0, groundouts:0, flyouts:0,
            outsPitched:0, er:0, p_r:0, p_h:0, p_bb:0, p_ibb:0, p_hbp: 0, p_hr: 0, p_so:0, wp:0, bk:0, pk:0, bf:0, 
            wins:0, losses:0, saves:0, holds:0, blownSaves: 0, pitchesThrown: 0, strikes: 0, qs:0, cg:0, sho:0, gf:0, svo:0, ir:0, irs:0, rw:0,
            gs: 0, gp: 0, g: 0,
            po: 0, a: 0, e: 0, dp: 0, tp:0, pb:0, ofa:0, chances: 0, inn: 0
          });
      }
      return gameStats.get(p.id)!;
  };

  const recordStat = (player: Player, updater: (s: StatsCounters) => void) => {
      updater(player.statsCounters);
      updater(getGameStats(player));
      
      // Injury chance: ~1% per game for position players, ~2% for pitchers
      if (!player.injury.isInjured) {
          const isPitcher = player.position === Position.P;
          const injuryChance = isPitcher ? 0.0002 : 0.0001; // Per stat update
          
          if (Math.random() < injuryChance) {
              const severities: Array<'Day-to-Day' | '10-Day IL' | '60-Day IL'> = ['Day-to-Day', '10-Day IL', '60-Day IL'];
              const severityProbs = [0.70, 0.25, 0.05]; // Most injuries are minor
              const rand = Math.random();
              let severity: typeof severities[number] = 'Day-to-Day';
              let cumProb = 0;
              for (let i = 0; i < severityProbs.length; i++) {
                  cumProb += severityProbs[i];
                  if (rand < cumProb) {
                      severity = severities[i];
                      break;
                  }
              }
              
              const injuryTypes = ['Hamstring Strain', 'Shoulder Soreness', 'Lower Back Tightness', 'Elbow Inflammation', 'Knee Sprain', 'Quad Strain', 'Oblique Strain'];
              const injuryType = injuryTypes[Math.floor(Math.random() * injuryTypes.length)];
              
              const days = severity === 'Day-to-Day' ? Math.floor(Math.random() * 5) + 1 :
                          severity === '10-Day IL' ? Math.floor(Math.random() * 10) + 10 :
                          Math.floor(Math.random() * 40) + 60;
              
              player.injury = {
                  isInjured: true,
                  type: injuryType,
                  daysRemaining: days,
                  severity: severity
              };
          }
      }
  };

  let homePitcher = getStarter(home);
  let awayPitcher = getStarter(away);

  usedPitchers.add(homePitcher.id);
  usedPitchers.add(awayPitcher.id);
  homePitcherOrder.push(homePitcher.id);
  awayPitcherOrder.push(awayPitcher.id);
  
  gamePitcherStats.set(homePitcher.id, { pitches: 0, runs: 0, startInning: 1, enterScoreDiff: 0, inheritedRunners: 0, inheritedScored: 0 });
  gamePitcherStats.set(awayPitcher.id, { pitches: 0, runs: 0, startInning: 1, enterScoreDiff: 0, inheritedRunners: 0, inheritedScored: 0 });

  recordStat(homePitcher, s => { s.gs++; s.gp++; });
  recordStat(awayPitcher, s => { s.gs++; s.gp++; });

  log.push({ description: `Starters: ${awayPitcher.name} (Away) vs ${homePitcher.name} (Home)`, type: 'info', inning: 0, isTop: true });

  const lineups = { home: getBestLineup(home), away: getBestLineup(away) };
  const batIdx = { home: 0, away: 0 };
  
  // Track games played for all hitters in the lineup
  const playersInGame = new Set<string>();
  lineups.home.forEach(p => {
    if (!playersInGame.has(p.id)) {
      recordStat(p, s => s.g++);
      playersInGame.add(p.id);
    }
  });
  lineups.away.forEach(p => {
    if (!playersInGame.has(p.id)) {
      recordStat(p, s => s.g++);
      playersInGame.add(p.id);
    }
  });
  
  const lineScore: LineScore = {
      innings: [],
      awayTotal: 0,
      homeTotal: 0,
      awayHits: 0,
      homeHits: 0,
      awayErrors: 0,
      homeErrors: 0
  };

  while (!gameOver) {
      if (currentInning > 25) break; 
      
      const inningScore = { inning: currentInning, away: 0, home: 0 };

      // --- TOP INNING (AWAY BATTING) ---
      const hpStats = gamePitcherStats.get(homePitcher.id)!;
    // Modern MLB pitch management: Starters avg 5.0-5.5 IP (~85 pitches), elite get 6-7 IP (~100 pitches)
    // Relievers: 15-25 pitches max per appearance (average ~17 pitches)
    const isRelieving = homePitcher.rotationSlot >= 9;
    let staminaLimit: number;
    if (isRelieving) {
        // Reliever pitch limits: 15-25 pitches, closers typically get 15-20
        const isCloser = homePitcher.rotationSlot === 9;
        staminaLimit = isCloser 
            ? Math.max(12, Math.min(20, 15 + Math.random() * 5))
            : Math.max(15, Math.min(28, 18 + Math.random() * 10));
    } else {
        // Starter pitch limits: 75-100 based on stamina
        staminaLimit = Math.max(70, Math.min(100, (homePitcher.attributes.stamina || 50) * 0.90 + 45 + (Math.random() * 10 - 5)));
    }

      let needReliever = false;
      let role: 'Closer' | 'Setup' | 'Any' = 'Any';
      const hLead = homeScore - awayScore;

    // Pitch count triggers
    if (hpStats.pitches >= staminaLimit) needReliever = true;
    
    // Late-game management: bring in setup/closer in high-leverage situations
    if (currentInning >= 8 && !isRelieving && hpStats.pitches > staminaLimit * 0.85) needReliever = true;
    if (currentInning >= 7 && Math.abs(hLead) <= 2 && !isRelieving) {
        needReliever = true;
        role = 'Setup';
    }
    
    // Performance-based hooks
    if (hpStats.runs >= 4 && currentInning <= 5) needReliever = true; // Pull struggling starters early
    if (hpStats.runs >= 5) needReliever = true; // Always pull after 5 runs
    if (currentInning >= 6 && hpStats.runs >= 3 && hpStats.pitches > 75) needReliever = true;
    
    // Save situation: 9th inning, leading by 1-3 runs
    if (currentInning >= 9 && hLead > 0 && hLead <= 3 && homePitcher.trait !== 'Closer') {
        needReliever = true;
        role = 'Closer';
    }
    
    // Setup situation: 8th inning, close game
    if (currentInning === 8 && hLead > 0 && hLead <= 3 && homePitcher.trait !== 'Closer' && !isRelieving) {
        needReliever = true;
        role = 'Setup';
    }

      if (needReliever) {
          const newP = getReliever(home, usedPitchers, role, currentInning, hLead);
          if (newP) {
              log.push({ description: `Pitching Change: ${newP.name} replaces ${homePitcher.name}`, type: 'info', inning: currentInning, isTop: true });
              homePitcher = newP;
              usedPitchers.add(homePitcher.id);
              homePitcherOrder.push(homePitcher.id);
              recordStat(homePitcher, s => { s.ir += 0; s.gp++; }); // Track games pitched for reliever
              gamePitcherStats.set(homePitcher.id, { pitches: 0, runs: 0, startInning: currentInning, enterScoreDiff: hLead, inheritedRunners: 0, inheritedScored: 0 });
          }
      }

      let outs = 0;
      let bases = [null, null, null] as (Player | null)[];
      
      while (outs < 3) {
          const batter = lineups.away[batIdx.away % lineups.away.length];
          batIdx.away++;

          // Steal Logic
          if (bases[0] && !bases[1]) {
             const runner = bases[0];
             const catcher = lineups.home.find(p => p.position === Position.C);
             const stealRating = runner.attributes.speed;
             const armRating = catcher ? catcher.attributes.arm : 50;
             
             const attemptProb = (stealRating - 45) * 0.008; 
             if (Math.random() < attemptProb) {
                 const successProb = 0.75 + ((stealRating - armRating) * 0.005);
                 if (Math.random() < successProb) {
                     bases[1] = runner;
                     bases[0] = null;
                     recordStat(runner, s => s.sb++);
                     log.push({ description: `${runner.name} steals 2nd base!`, type: 'steal', inning: currentInning, isTop: true });
                 } else {
                     bases[0] = null;
                     outs++;
                     recordStat(runner, s => s.cs++);
                     updateDefense(home, Position.C, 'A');
                     updateDefense(home, Position.SB, 'PO');
                     log.push({ description: `${runner.name} caught stealing 2nd!`, type: 'out', inning: currentInning, isTop: true });
                     if (outs >= 3) break;
                 }
             }
          }

          let balls=0, strikes=0, abResult:any=null, pitchCount=0;
          const hpS = gamePitcherStats.get(homePitcher.id)!;
          const pitchSequence: PitchDetails[] = [];

          // Intentional Walk Check
          if (bases[1] && !bases[0] && outs < 2 && batter.rating > 85 && Math.random() < 0.05) {
              abResult={result:'IBB', desc:'is intentionally walked', ev: 0, la: 0, outs: 0};
          } else {
              while (!abResult) {
                  pitchCount++;
                  const currentTotalPitches = hpS.pitches + pitchCount;
                  const pitch = simulatePitch(homePitcher, batter, currentTotalPitches);
                  const meta = generatePitchMeta(homePitcher, pitch);
                  
                  let pitchDesc = "";
                  if (pitch === 'Ball') {
                      balls++; pitchDesc = "Ball";
                      if (balls===4) abResult={result:'BB', desc:'walks', ev: 0, la: 0, outs: 0};
                  } else if (pitch.includes('Strike')) {
                      strikes++; pitchDesc = pitch === 'StrikeLooking' ? "Called Strike" : "Swinging Strike";
                      homePitcher.statsCounters.strikes++; getGameStats(homePitcher).strikes++;
                      if (strikes===3) abResult={result:'K', desc:'strikes out', ev: 0, la: 0, outs: 1};
                  } else if (pitch === 'Foul') {
                      pitchDesc = "Foul"; if (strikes<2) strikes++;
                  } else if (pitch === 'HBP') {
                      pitchDesc = "Hit By Pitch"; abResult={result:'HBP', desc:'is hit by pitch', ev: 0, la: 0, outs: 0};
                  } else if (pitch === 'WP') {
                      pitchDesc = "Wild Pitch";
                      // Only advance runners
                      balls++; 
                      if (balls===4) abResult={result:'BB', desc:'walks', ev: 0, la: 0, outs: 0};
                  } else if (pitch === 'InPlay') {
                      pitchDesc = "In Play";
                      const runnersState = [bases[0]?1:0, bases[1]?1:0, bases[2]?1:0];
                      abResult = resolveBallInPlay(homePitcher, batter, home, runnersState, currentTotalPitches, home.parkFactors);
                  }

                  pitchSequence.push({
                      number: pitchCount,
                      result: pitchDesc,
                      description: meta.desc,
                      count: `${balls}-${strikes >= 3 ? 2 : strikes}` 
                  });
              }
          }
          
          hpS.pitches += pitchCount;
          gamePitcherStats.set(homePitcher.id, hpS);

          // Update Pitcher Stats only once per AB
          recordStat(homePitcher, s => {
              s.pitchesThrown += pitchCount;
              if (abResult.result === 'K') s.p_so++;
              else if (abResult.result === 'BB') s.p_bb++;
              else if (abResult.result === 'IBB') { s.p_bb++; s.p_ibb++; }
              else if (abResult.result === 'HBP') s.p_hbp++;
              else if (['1B','2B','3B','HR'].includes(abResult.result)) s.p_h++;
              if (abResult.result === 'HR') s.p_hr++;
          });

          // Batter statcast tracking (away hitters)
          recordStat(batter, s => {
              const swingEvents = pitchSequence.filter(p => p.result === 'Swinging Strike' || p.result === 'Foul' || p.result === 'In Play').length;
              s.swings += swingEvents;
              const whiffEvents = pitchSequence.filter(p => p.result === 'Swinging Strike').length;
              s.whiffs += whiffEvents;
              if (abResult.result === 'OUT' || ['1B','2B','3B','HR','SF'].includes(abResult.result)) {
                  const ev = abResult.ev ?? 0;
                  const la = abResult.la ?? 0;
                  s.battedBallEvents++;
                  s.totalExitVelo += ev;
                  if (ev >= 95) s.hardHits++;
                  if (ev >= 98 && la >= 26 && la <= 30) s.barrels++;
              }
          });

          // Process Result
          let runsThisPlay = 0;
          if (abResult.result === 'K' || (abResult.result === 'OUT') || abResult.result === 'SF' || abResult.result === 'GIDP' || abResult.result === 'SAC') {
              outs += abResult.outs;
              recordStat(homePitcher, s => s.outsPitched += abResult.outs);
              
              if (abResult.result === 'GIDP') {
                  bases[0] = null; 
                  recordStat(batter, s => s.gidp++);
              }
              if (abResult.result === 'SF') {
                  if (bases[2]) { runsThisPlay++; recordStat(bases[2], s=>s.r++); bases[2] = null; }
                  recordStat(batter, s => s.sf++);
              }
              if (abResult.result === 'SAC') {
                  // Sac Bunt advance
                  if (bases[2]) { runsThisPlay++; recordStat(bases[2], s=>s.r++); bases[2] = null; }
                  if (bases[1]) { bases[2] = bases[1]; bases[1] = null; }
                  if (bases[0]) { bases[1] = bases[0]; bases[0] = null; }
                  recordStat(batter, s => s.sac++);
              }
              if (abResult.result === 'OUT') {
                  if (abResult.desc.includes('fly')) recordStat(batter, s => s.flyouts++);
                  else recordStat(batter, s => s.groundouts++);
              }
              
              recordStat(batter, s => { s.ab++; s.rbi += runsThisPlay; });
              recordStat(homePitcher, s => { s.er += runsThisPlay; s.p_r += runsThisPlay; });
              
              let desc = `${batter.name} ${abResult.desc}`;
              if (runsThisPlay > 0) desc += ` (${runsThisPlay} run)`;
              log.push({ description: `Top ${currentInning}: ${desc}`, type: 'out', inning: currentInning, isTop: true, pitches: pitchSequence });
              
              // LOB Logic at end of inning
              if (outs >= 3) {
                  const leftOn = bases.filter(b => b !== null).length;
                  recordStat(homePitcher, s => s.lob += leftOn); 
              }
          } 
          else if (['BB', 'HBP', 'IBB', 'E'].includes(abResult.result)) {
              if (abResult.result === 'BB') recordStat(batter, s => s.bb++);
              if (abResult.result === 'IBB') recordStat(batter, s => { s.bb++; s.ibb++; });
              if (abResult.result === 'HBP') recordStat(batter, s => s.hbp++);
              if (abResult.result === 'E') recordStat(batter, s => s.roe++);

              if (bases[0]&&bases[1]&&bases[2]) { runsThisPlay++; recordStat(bases[2], s=>s.r++); bases[2]=bases[1]; bases[1]=bases[0]; bases[0]=batter; }
              else if (bases[0]&&bases[1]) { bases[2]=bases[1]; bases[1]=bases[0]; bases[0]=batter; }
              else if (bases[0]) { bases[1]=bases[0]; bases[0]=batter; }
              else bases[0]=batter;
              
              recordStat(batter, s => s.rbi += runsThisPlay);
              recordStat(homePitcher, s => { s.er += (abResult.result === 'E' ? 0 : runsThisPlay); s.p_r += runsThisPlay; });
              log.push({ description: `Top ${currentInning}: ${batter.name} ${abResult.desc}`, type: abResult.result === 'E' ? 'error' : 'walk', inning: currentInning, isTop: true, pitches: pitchSequence });
          } else {
              // Hits
              let newRuns = 0;
              const hitType = abResult.result;
              
              // Basic hit recording
              recordStat(batter, s => {
                  s.ab++; s.h++;
                  if(hitType==='2B') { s.d++; s.xbh++; s.tb+=2; }
                  if(hitType==='3B') { s.t++; s.xbh++; s.tb+=3; }
                  if(hitType==='HR') { s.hr++; s.xbh++; s.tb+=4; }
                  if(hitType==='1B') { s.tb+=1; }
              });

              lineScore.awayHits++;

              if (hitType === 'HR') { 
                  if (bases[0] && bases[1] && bases[2]) recordStat(batter, s => s.gsh++); // Grand Slam
                  newRuns = 1 + (bases[0]?1:0) + (bases[1]?1:0) + (bases[2]?1:0); 
                  if(bases[0]) recordStat(bases[0], s=>s.r++); if(bases[1]) recordStat(bases[1], s=>s.r++); if(bases[2]) recordStat(bases[2], s=>s.r++); 
                  recordStat(batter, s=>s.r++); 
                  bases=[null,null,null]; 
              }
              else if (hitType === '3B') { 
                  newRuns = (bases[0]?1:0) + (bases[1]?1:0) + (bases[2]?1:0); 
                  if(bases[0]) recordStat(bases[0], s=>s.r++); if(bases[1]) recordStat(bases[1], s=>s.r++); if(bases[2]) recordStat(bases[2], s=>s.r++); 
                  bases=[null,null,batter]; 
              }
              else if (hitType === '2B') { 
                  newRuns = (bases[1]?1:0) + (bases[2]?1:0) + (bases[0]?0.5:0); // Simple runner advancement logic
                  if(newRuns%1!==0) newRuns=Math.ceil(newRuns); 
                  if(bases[1]) recordStat(bases[1], s=>s.r++); if(bases[2]) recordStat(bases[2], s=>s.r++); 
                  
                  const runnerFromFirst = bases[0];
                  bases[0] = null;
                  bases[2] = runnerFromFirst ? runnerFromFirst : null;
                  bases[1] = batter;
              }
              else if (hitType === '1B') { 
                  newRuns = (bases[2]?1:0); 
                  if(bases[2]) recordStat(bases[2], s=>s.r++); 
                  if(bases[1]) bases[2]=bases[1]; 
                  if(bases[0]) bases[1]=bases[0]; 
                  bases[0]=batter; 
              }
              
              runsThisPlay += newRuns;
              hpS.runs += newRuns;
              
              recordStat(batter, s => s.rbi += newRuns);
              recordStat(homePitcher, s => { s.er += newRuns; s.p_r += newRuns; });
              
              let desc = `Top ${currentInning}: ${batter.name} ${abResult.desc}`;
              if (newRuns > 0) desc += ` (${newRuns} runs score)`;
              log.push({ description: desc, type: 'hit', inning: currentInning, isTop: true, pitches: pitchSequence });
          }
          awayScore += runsThisPlay;
          inningScore.away += runsThisPlay;
      }

      if (currentInning >= 9 && homeScore > awayScore) { gameOver = true; break; }

      // --- BOTTOM INNING (HOME BATTING) ---
      const apStats = gamePitcherStats.get(awayPitcher.id)!;
    // Away team pitch management - same logic as home
    const isRelievingAway = awayPitcher.rotationSlot >= 9;
    let staminaLimitAway: number;
    if (isRelievingAway) {
        const isCloserAway = awayPitcher.rotationSlot === 9;
        staminaLimitAway = isCloserAway 
            ? Math.max(12, Math.min(20, 15 + Math.random() * 5))
            : Math.max(15, Math.min(28, 18 + Math.random() * 10));
    } else {
        staminaLimitAway = Math.max(70, Math.min(100, (awayPitcher.attributes.stamina || 50) * 0.90 + 45 + (Math.random() * 10 - 5)));
    }

      let needRelieverAway = false;
      let roleAway: 'Closer' | 'Setup' | 'Any' = 'Any';
      const aLead = awayScore - homeScore;

    // Pitch count triggers
    if (apStats.pitches >= staminaLimitAway) needRelieverAway = true;
    
    // Late-game management
    if (currentInning >= 8 && !isRelievingAway && apStats.pitches > staminaLimitAway * 0.85) needRelieverAway = true;
    if (currentInning >= 7 && Math.abs(aLead) <= 2 && !isRelievingAway) {
        needRelieverAway = true;
        roleAway = 'Setup';
    }
    
    // Performance-based hooks
    if (apStats.runs >= 4 && currentInning <= 5) needRelieverAway = true;
    if (apStats.runs >= 5) needRelieverAway = true;
    if (currentInning >= 6 && apStats.runs >= 3 && apStats.pitches > 75) needRelieverAway = true;
    
    // Save situation
    if (currentInning >= 9 && aLead > 0 && aLead <= 3 && awayPitcher.trait !== 'Closer') {
        needRelieverAway = true;
        roleAway = 'Closer';
    }
    
    // Setup situation
    if (currentInning === 8 && aLead > 0 && aLead <= 3 && awayPitcher.trait !== 'Closer' && !isRelievingAway) {
        needRelieverAway = true;
        roleAway = 'Setup';
    }

      if (needRelieverAway) {
          const newP = getReliever(away, usedPitchers, roleAway, currentInning, aLead);
          if (newP) {
              log.push({ description: `Pitching Change: ${newP.name} replaces ${awayPitcher.name}`, type: 'info', inning: currentInning, isTop: false });
              awayPitcher = newP;
              usedPitchers.add(awayPitcher.id);
              awayPitcherOrder.push(awayPitcher.id);
              recordStat(awayPitcher, s => { s.ir += 0; s.gp++; }); // Track games pitched for reliever
              gamePitcherStats.set(awayPitcher.id, { pitches: 0, runs: 0, startInning: currentInning, enterScoreDiff: aLead, inheritedRunners: 0, inheritedScored: 0 });
          }
      }

      outs = 0;
      bases = [null, null, null];
      
      while (outs < 3) {
           // Walk-off check
           if (currentInning >= 9 && homeScore > awayScore) { 
               gameOver = true; 
               // Identify who got the hit
               // The loop breaks immediately after run scores, so the last batter credited gets WO
               break; 
           }

           const batter = lineups.home[batIdx.home % lineups.home.length];
           batIdx.home++;
           
           if (bases[0] && !bases[1]) {
             const runner = bases[0];
             const catcher = lineups.away.find(p => p.position === Position.C);
             const stealRating = runner.attributes.speed;
             const armRating = catcher ? catcher.attributes.arm : 50;
             
             const attemptProb = (stealRating - 45) * 0.008; 
             if (Math.random() < attemptProb) {
                 const successProb = 0.75 + ((stealRating - armRating) * 0.005);
                 if (Math.random() < successProb) {
                     bases[1] = runner; bases[0] = null;
                     recordStat(runner, s => s.sb++);
                     log.push({ description: `${runner.name} steals 2nd base!`, type: 'steal', inning: currentInning, isTop: false });
                 } else {
                     bases[0] = null; outs++;
                     recordStat(runner, s => s.cs++);
                     updateDefense(away, Position.C, 'A');
                     updateDefense(away, Position.SB, 'PO');
                     log.push({ description: `${runner.name} caught stealing 2nd!`, type: 'out', inning: currentInning, isTop: false });
                     if (outs >= 3) break;
                 }
             }
           }

           let balls=0, strikes=0, abResult:any=null, pitchCount=0;
           const apS = gamePitcherStats.get(awayPitcher.id)!;
           const pitchSequence: PitchDetails[] = [];

           if (bases[1] && !bases[0] && outs < 2 && batter.rating > 85 && Math.random() < 0.05) {
                abResult={result:'IBB', desc:'is intentionally walked', ev: 0, la: 0, outs: 0};
           } else {
               while (!abResult) {
                  pitchCount++;
                  const currentTotalPitches = apS.pitches + pitchCount;
                  const pitch = simulatePitch(awayPitcher, batter, currentTotalPitches);
                  const meta = generatePitchMeta(awayPitcher, pitch);
                  
                  let pitchDesc = "";
                  if (pitch === 'Ball') { 
                      balls++; pitchDesc = "Ball";
                      if (balls===4) abResult={result:'BB', desc:'walks', ev: 0, la: 0, outs: 0}; 
                  } else if (pitch.includes('Strike')) { 
                      strikes++; pitchDesc = pitch === 'StrikeLooking' ? "Called Strike" : "Swinging Strike";
                      awayPitcher.statsCounters.strikes++; getGameStats(awayPitcher).strikes++;
                      if (strikes===3) abResult={result:'K', desc:'strikes out', ev: 0, la: 0, outs: 1}; 
                  } else if (pitch === 'Foul') { 
                      pitchDesc = "Foul"; if (strikes<2) strikes++; 
                  } else if (pitch === 'HBP') {
                      pitchDesc = "Hit By Pitch"; abResult={result:'HBP', desc:'is hit by pitch', ev: 0, la: 0, outs: 0};
                  } else if (pitch === 'WP') {
                      pitchDesc = "Wild Pitch"; balls++;
                      if (balls===4) abResult={result:'BB', desc:'walks', ev: 0, la: 0, outs: 0};
                  } else if (pitch === 'InPlay') { 
                      pitchDesc = "In Play";
                      const runnersState = [bases[0]?1:0, bases[1]?1:0, bases[2]?1:0];
                      abResult = resolveBallInPlay(awayPitcher, batter, away, runnersState, currentTotalPitches, home.parkFactors); 
                  }

                  pitchSequence.push({
                      number: pitchCount,
                      result: pitchDesc,
                      description: meta.desc,
                      count: `${balls}-${strikes >= 3 ? 2 : strikes}`
                  });
               }
           }
           
           apS.pitches += pitchCount;
           gamePitcherStats.set(awayPitcher.id, apS);

           recordStat(awayPitcher, s => {
              s.pitchesThrown += pitchCount;
              if (abResult.result === 'K') s.p_so++;
              else if (abResult.result === 'BB') s.p_bb++;
              else if (abResult.result === 'IBB') { s.p_bb++; s.p_ibb++; }
              else if (abResult.result === 'HBP') s.p_hbp++;
              else if (['1B','2B','3B','HR'].includes(abResult.result)) s.p_h++;
              if (abResult.result === 'HR') s.p_hr++;
           });

              // Batter statcast tracking (home hitters)
              recordStat(batter, s => {
                  const swingEvents = pitchSequence.filter(p => p.result === 'Swinging Strike' || p.result === 'Foul' || p.result === 'In Play').length;
                  s.swings += swingEvents;
                  const whiffEvents = pitchSequence.filter(p => p.result === 'Swinging Strike').length;
                  s.whiffs += whiffEvents;
                  if (abResult.result === 'OUT' || ['1B','2B','3B','HR','SF'].includes(abResult.result)) {
                        const ev = abResult.ev ?? 0;
                        const la = abResult.la ?? 0;
                        s.battedBallEvents++;
                        s.totalExitVelo += ev;
                        if (ev >= 95) s.hardHits++;
                        if (ev >= 98 && la >= 26 && la <= 30) s.barrels++;
                  }
              });

           let runsThisPlay = 0;
           if (abResult.result === 'K' || (abResult.result === 'OUT') || abResult.result === 'SF' || abResult.result === 'GIDP' || abResult.result === 'SAC') {
               outs += abResult.outs;
               recordStat(awayPitcher, s => s.outsPitched += abResult.outs);

               if (abResult.result === 'GIDP') {
                   bases[0] = null;
                   recordStat(batter, s => s.gidp++);
               }
               if (abResult.result === 'SF') {
                   if (bases[2]) { runsThisPlay++; recordStat(bases[2], s=>s.r++); bases[2] = null; }
                   recordStat(batter, s => s.sf++);
               }
               if (abResult.result === 'SAC') {
                  if (bases[2]) { runsThisPlay++; recordStat(bases[2], s=>s.r++); bases[2] = null; }
                  if (bases[1]) { bases[2] = bases[1]; bases[1] = null; }
                  if (bases[0]) { bases[1] = bases[0]; bases[0] = null; }
                  recordStat(batter, s => s.sac++);
               }
               if (abResult.result === 'OUT') {
                  if (abResult.desc.includes('fly')) recordStat(batter, s => s.flyouts++);
                  else recordStat(batter, s => s.groundouts++);
               }
               
               recordStat(batter, s => { s.ab++; s.rbi += runsThisPlay; });
               recordStat(awayPitcher, s => { s.er += runsThisPlay; s.p_r += runsThisPlay; });

               let desc = `${batter.name} ${abResult.desc}`;
               if (runsThisPlay > 0) desc += ` (${runsThisPlay} run)`;
               log.push({ description: `Bot ${currentInning}: ${desc}`, type: 'out', inning: currentInning, isTop: false, pitches: pitchSequence });
               if (outs >= 3) break;
           } 
           else if (['BB', 'HBP', 'IBB', 'E'].includes(abResult.result)) {
              if (abResult.result === 'BB') recordStat(batter, s => s.bb++);
              if (abResult.result === 'IBB') recordStat(batter, s => { s.bb++; s.ibb++; });
              if (abResult.result === 'HBP') recordStat(batter, s => s.hbp++);
              if (abResult.result === 'E') recordStat(batter, s => s.roe++);

              if (bases[0]&&bases[1]&&bases[2]) { runsThisPlay++; recordStat(bases[2], s=>s.r++); bases[2]=bases[1]; bases[1]=bases[0]; bases[0]=batter; }
              else if (bases[0]&&bases[1]) { bases[2]=bases[1]; bases[1]=bases[0]; bases[0]=batter; }
              else if (bases[0]) { bases[1]=bases[0]; bases[0]=batter; }
              else bases[0]=batter;
              
              recordStat(batter, s => s.rbi += runsThisPlay);
              recordStat(awayPitcher, s => { s.er += (abResult.result === 'E' ? 0 : runsThisPlay); s.p_r += runsThisPlay; });
              log.push({ description: `Bot ${currentInning}: ${batter.name} ${abResult.desc}`, type: abResult.result === 'E' ? 'error' : 'walk', inning: currentInning, isTop: false, pitches: pitchSequence });
           } else {
              let newRuns = 0;
              const hitType = abResult.result;
              recordStat(batter, s => {
                  s.ab++; s.h++;
                  if(hitType==='2B') { s.d++; s.xbh++; s.tb+=2; }
                  if(hitType==='3B') { s.t++; s.xbh++; s.tb+=3; }
                  if(hitType==='HR') { s.hr++; s.xbh++; s.tb+=4; }
                  if(hitType==='1B') { s.tb+=1; }
              });
              
              lineScore.homeHits++;

              if (hitType === 'HR') { 
                  if (bases[0] && bases[1] && bases[2]) recordStat(batter, s => s.gsh++);
                  newRuns = 1 + (bases[0]?1:0) + (bases[1]?1:0) + (bases[2]?1:0); 
                  if(bases[0]) recordStat(bases[0], s=>s.r++); if(bases[1]) recordStat(bases[1], s=>s.r++); if(bases[2]) recordStat(bases[2], s=>s.r++); 
                  recordStat(batter, s=>s.r++); 
                  bases=[null,null,null]; 
              }
              else if (hitType === '3B') { newRuns = (bases[0]?1:0) + (bases[1]?1:0) + (bases[2]?1:0); if(bases[0]) recordStat(bases[0], s=>s.r++); if(bases[1]) recordStat(bases[1], s=>s.r++); if(bases[2]) recordStat(bases[2], s=>s.r++); bases=[null,null,batter]; }
              else if (hitType === '2B') { 
                  newRuns = (bases[1]?1:0) + (bases[2]?1:0) + (bases[0]?0.5:0); if(newRuns%1!==0) newRuns=Math.ceil(newRuns); 
                  if(bases[1]) recordStat(bases[1], s=>s.r++); if(bases[2]) recordStat(bases[2], s=>s.r++); 
                  const runnerFromFirst = bases[0];
                  bases[0] = null;
                  bases[2] = runnerFromFirst ? runnerFromFirst : null;
                  bases[1]=batter;
              }
              else if (hitType === '1B') { newRuns = (bases[2]?1:0); if(bases[2]) recordStat(bases[2], s=>s.r++); if(bases[1]) bases[2]=bases[1]; if(bases[0]) bases[1]=bases[0]; bases[0]=batter; }
              
              runsThisPlay += newRuns;
              homeScore += newRuns;
              apS.runs += newRuns;
              
              recordStat(batter, s => s.rbi += newRuns);
              recordStat(awayPitcher, s => { s.er += newRuns; s.p_r += newRuns; });
              log.push({ description: `Bot ${currentInning}: ${batter.name} ${abResult.desc} (${newRuns} runs)`, type: 'hit', inning: currentInning, isTop: false, pitches: pitchSequence });
              
              // Walk-off
              if (currentInning >= 9 && homeScore > awayScore) {
                  recordStat(batter, s => s.wo++);
              }
           }
           inningScore.home += runsThisPlay;
      }

      lineScore.innings.push(inningScore);
      if (currentInning >= 9 && homeScore !== awayScore) gameOver = true;
      currentInning++;
  }

  // Update Line Score Totals
  lineScore.awayTotal = awayScore;
  lineScore.homeTotal = homeScore;

  // Final Updates
  const homeStarter = home.roster.find(p => usedPitchers.has(p.id) && gamePitcherStats.get(p.id)!.startInning === 1)!;
  const awayStarter = away.roster.find(p => usedPitchers.has(p.id) && gamePitcherStats.get(p.id)!.startInning === 1)!;

  let winningPitcher: Player;
  let losingPitcher: Player;
  let savePitcher: Player | null = null;

  if (homeScore > awayScore) {
      winningPitcher = homeStarter.statsCounters.outsPitched >= 15 ? homeStarter : homePitcher;
      losingPitcher = awayPitcher; 

      if (homeScore - awayScore <= 3 && homePitcher.id !== homeStarter.id && homePitcher.trait === 'Closer') {
          savePitcher = homePitcher;
      }
  } else {
      winningPitcher = awayStarter.statsCounters.outsPitched >= 15 ? awayStarter : awayPitcher;
      losingPitcher = homePitcher; 
      if (awayScore - homeScore <= 3 && awayPitcher.id !== awayStarter.id && awayPitcher.trait === 'Closer') {
          savePitcher = awayPitcher;
      }
  }

  recordStat(winningPitcher, s => s.wins++);
  recordStat(losingPitcher, s => s.losses++);
  if (savePitcher) {
      recordStat(savePitcher, s => s.saves++);
      recordStat(savePitcher, s => s.gf++);
  }

  // QS / CG / SHO Logic
  const checkStartStats = (p: Player) => {
      const gs = getGameStats(p);
      if (gs.outsPitched >= 18 && gs.er <= 3) recordStat(p, s => s.qs++);
      if (gs.outsPitched >= 27) recordStat(p, s => s.cg++);
      if (gs.outsPitched >= 27 && gs.p_r === 0) recordStat(p, s => s.sho++);
  };
  checkStartStats(homeStarter);
  checkStartStats(awayStarter);

  // Construct Box Score
  const buildBoxPlayer = (p: Player): BoxScorePlayer => ({
      id: p.id,
      name: p.name,
      pos: p.position,
      stats: getGameStats(p)
  });

  const boxScore: BoxScore = {
      homeLineup: lineups.home.map(buildBoxPlayer),
      awayLineup: lineups.away.map(buildBoxPlayer),
      // Sort pitchers by appearance order
      homePitchers: homePitcherOrder.map(id => home.roster.find(p => p.id === id)!).map(buildBoxPlayer),
      awayPitchers: awayPitcherOrder.map(id => away.roster.find(p => p.id === id)!).map(buildBoxPlayer),
      lineScore: lineScore
  };

  // Recalc season stats derivations
  [home, away].forEach(t => t.roster.forEach(p => {
      // Re-run derivation update to sync advanced stats with new counters
      updateBatterStats(p, 'RECALC', 0);
      updatePitcherStats(p, 'RECALC', 0, 0, 0);
  }));

  return {
    id: `game_${Date.now()}_${Math.random()}`,
    date: date.toISOString(),
    homeTeamId: home.id,
    awayTeamId: away.id,
    homeScore,
    awayScore,
    innings: (homeScore > awayScore && currentInning > 9) ? currentInning - 1 : (currentInning - 1),
    winnerId: homeScore > awayScore ? home.id : away.id,
    played: true,
    isPostseason,
    log,
    boxScore,
    stadium: home.stadium
  };
};

export const generateSchedule = (teams: Team[], startDate: Date): GameResult[] => {
    const schedule: GameResult[] = [];
    // Generate proper MLB 162-game schedule
    // Division opponents (4 teams): 19 games each = 76 games
    // Same league, other divisions (10 teams): 6-7 games = 66 games  
    // Interleague (15 teams): 20 games total = 20 games
    // Total: 162 games per team
    
    const matchUps: {home: string, away: string}[] = [];
    
    for (let i = 0; i < teams.length; i++) {
        for (let j = i + 1; j < teams.length; j++) {
            const t1 = teams[i];
            const t2 = teams[j];
            let games = 0;
            
            // Division opponents: 19 games (4 teams × 19 = 76 games)
            if (t1.division === t2.division && t1.league === t2.league) {
                games = 19;
            }
            // Same league, different division: 6-7 games (10 teams, average 6.6 = 66 games)
            else if (t1.league === t2.league) {
                // Alternate between 6 and 7 to get average of 6.6
                games = (i + j) % 3 === 0 ? 7 : 6;
            }
            // Interleague: varies (need total of 20 games spread across 15 teams)
            else {
                // Most get 1 game, some get 2, average ~1.33 per team = 20 total
                games = (i + j) % 5 === 0 ? 2 : 1;
            }
            
            // Distribute home/away evenly
            for (let g = 0; g < games; g++) {
                if (g % 2 === 0) matchUps.push({ home: t1.id, away: t2.id });
                else matchUps.push({ home: t2.id, away: t1.id });
            }
        }
    }
    
    // Shuffle
    for (let i = matchUps.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [matchUps[i], matchUps[j]] = [matchUps[j], matchUps[i]];
    }
    
    const gamesPerDay = 15;
    let currentDate = new Date(startDate);
    let gameCount = 0;
    
    for (let i = 0; i < matchUps.length; i++) {
        const m = matchUps[i];
        schedule.push({
            id: `game_${i}_${m.home}_${m.away}`,
            date: currentDate.toISOString(),
            homeTeamId: m.home,
            awayTeamId: m.away,
            homeScore: 0,
            awayScore: 0,
            innings: 9,
            winnerId: '',
            played: false,
            log: [],
            stadium: teams.find(t => t.id === m.home)?.stadium
        });
        
        gameCount++;
        if (gameCount >= gamesPerDay) {
            gameCount = 0;
            currentDate.setDate(currentDate.getDate() + 1);
        }
    }
    
    return schedule;
};

export const progressionSystem = (teams: Team[]) => {
    teams.forEach(t => {
        t.wins = 0;
        t.losses = 0;
        t.runsScored = 0;
        t.runsAllowed = 0;
        
        t.roster.forEach(p => {
             // 1. Age
             p.age++;
             
             // 2. Progression/Regression (no POT system)
             // Simple model: Peak 26-29.
             let change = 0;
             if (p.age < 26) {
                 change = Math.round(Math.random() * 2);
             } else if (p.age > 29) {
                 change = -Math.round(Math.random() * 3);
                 if (p.age > 33) change -= 1;
             } else {
                 change = Math.round(Math.random() * 2) - 1;
             }
             
             p.rating = Math.max(40, Math.min(99, p.rating + change));
             p.potential = p.rating;
             
             // Adjust attributes slightly to match
             if (change !== 0) {
                 const keys = Object.keys(p.attributes) as (keyof typeof p.attributes)[];
                 keys.forEach(k => {
                     p.attributes[k] = Math.max(20, Math.min(99, p.attributes[k] + change));
                 });
             }
             
             // 3. Reset Stats
             p.seasonStats = { games: 0, hr: 0, avg: 0, wins: 0, losses: 0, era: 0 };
             p.statsCounters = {
                ab:0, h:0, d:0, t:0, hr:0, gsh:0, bb:0, ibb:0, hbp:0, so:0, rbi:0, sb:0, cs:0, gidp:0, sf:0, sac:0, r:0, lob:0, xbh:0, tb:0, roe:0, wo:0, pa:0,
                totalExitVelo: 0, battedBallEvents: 0, hardHits: 0, barrels: 0, swings: 0, whiffs: 0, groundouts:0, flyouts:0,
                outsPitched:0, er:0, p_r:0, p_h:0, p_bb:0, p_ibb:0, p_hbp: 0, p_hr: 0, p_so:0, wp:0, bk:0, pk:0, bf:0, 
                wins:0, losses:0, saves:0, holds:0, blownSaves: 0, pitchesThrown: 0, strikes: 0, qs:0, cg:0, sho:0, gf:0, svo:0, ir:0, irs:0, rw:0,
                gs: 0, gp: 0, g: 0,
                po: 0, a: 0, e: 0, dp: 0, tp:0, pb:0, ofa:0, chances: 0, inn: 0
             };
             p.batting = undefined;
             p.pitching = undefined;
             p.history.push({
                 year: (new Date().getFullYear()).toString(), 
                 team: t.name,
                 stats: { games: 0 } 
             });
        });
    });
};
