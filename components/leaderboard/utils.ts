
import { Player, Position } from '../../types';

export type StatCategory = 'batting' | 'pitching' | 'defense' | 'statcast_bat' | 'adv_bat';
export type SortKey = 'g' | 'pa' | 'avg' | 'obp' | 'slg' | 'hr' | 'rbi' | 'bb' | 'ibb' | 'ops' | 'war' | 'd' | 't' | 'gidp' | 'sb' | 'cs' | 'sf' | 'sac' |
               'era' | 'wins' | 'losses' | 'so' | 'whip' | 'ip' | 'hbp' | 'wp' | 'pitches' | 'p_bb' | 'p_ibb' | 'gs' | 'sv' | 'hld' |
               'drs' | 'uzr' | 'oaa' | 'fpct' | 
               'ev' | 'barrel' | 'hardhit' | 'whiff' |
               'woba' | 'wrc_plus' | 'iso' | 'babip' | 'bb_pct' | 'k_pct';

export const getValue = (p: Player, key: SortKey): number => {
    const s = p.statsCounters;
    const pa = s.ab + s.bb + s.hbp + s.sf + s.sac;

    // Games played - use actual tracked values
    if (key === 'g') {
        if (p.position === Position.P) {
            return s.gp ?? 0; // Games pitched (tracked during simulation)
        }
        return s.g ?? 0; // Games played (tracked during simulation)
    }
    
    // Batting Standard
    if (key === 'pa') return pa;
    if (key === 'avg') return p.batting?.avg ?? 0;
    if (key === 'hr') return p.batting?.hr ?? 0;
    if (key === 'rbi') return p.batting?.rbi ?? 0;
    if (key === 'obp') return p.batting?.obp ?? 0;
    if (key === 'slg') return p.batting?.slg ?? 0;
    if (key === 'bb') return s.bb ?? 0;
    if (key === 'ibb') return s.ibb ?? 0;
    if (key === 'ops') return p.batting?.ops ?? 0;
    if (key === 'war') return (p.batting?.war || 0) + (p.pitching?.war || 0);
    if (key === 'sb') return p.batting?.sb ?? 0;
    if (key === 'd') return s.d ?? 0;
    if (key === 't') return s.t ?? 0;
    if (key === 'cs') return s.cs ?? 0;
    if (key === 'sf') return s.sf ?? 0;
    if (key === 'sac') return s.sac ?? 0;
    if (key === 'gidp') return s.gidp ?? 0;
    
    // Pitching Standard
    if (key === 'era') return p.pitching?.era ?? 99.99;
    if (key === 'wins') return s.wins ?? 0;
    if (key === 'losses') return s.losses ?? 0;
    if (key === 'so') return p.pitching?.so ?? 0;
    if (key === 'whip') return p.pitching?.whip ?? 99.99;
    if (key === 'ip') return p.pitching?.ip ?? 0;
    if (key === 'pitches') return s.pitchesThrown ?? 0;
    if (key === 'p_bb') return s.p_bb ?? 0;
    if (key === 'p_ibb') return s.p_ibb ?? 0;
    if (key === 'gs') return s.gs ?? 0;
    if (key === 'sv') return s.saves ?? 0;
    if (key === 'hld') return s.holds ?? 0;
    
    // Advanced Batting
    if (key === 'woba') return p.batting?.woba ?? 0;
    if (key === 'wrc_plus') return p.batting?.wrc_plus ?? 0;
    if (key === 'iso') return p.batting?.iso ?? 0;
    if (key === 'babip') return p.batting?.babip ?? 0;
    if (key === 'bb_pct') return p.batting?.bb_pct ?? 0;
    if (key === 'k_pct') return p.batting?.k_pct ?? 0;
    
    // Statcast
    if (key === 'ev') return p.batting?.exitVelocity ?? 0;
    if (key === 'barrel') return p.batting?.barrel_pct ?? 0;
    if (key === 'hardhit') return p.batting?.hardHit_pct ?? 0;
    if (key === 'whiff') return p.batting?.whiff_pct ?? 0;
    
    // Defense
    if (key === 'drs') return p.defense?.drs ?? 0;
    if (key === 'uzr') return p.defense?.uzr ?? 0;
    if (key === 'oaa') return p.defense?.oaa ?? 0;
    if (key === 'fpct') return p.defense?.fpct ?? 0;

    return 0;
};

export const getHeaders = (category: StatCategory): { key: SortKey; label: string }[] => {
    switch (category) {
        case 'batting':
            return [
                { key: 'g', label: 'G' }, { key: 'pa', label: 'PA' }, { key: 'avg', label: 'AVG' }, { key: 'obp', label: 'OBP' }, { key: 'slg', label: 'SLG' },
                { key: 'hr', label: 'HR' }, { key: 'rbi', label: 'RBI' }, { key: 'bb', label: 'BB' }, { key: 'ibb', label: 'IBB' },
                { key: 'd', label: '2B' }, { key: 't', label: '3B' }, { key: 'sb', label: 'SB' }, { key: 'cs', label: 'CS' },
                { key: 'sf', label: 'SF' }, { key: 'sac', label: 'SAC' }, { key: 'ops', label: 'OPS' }, { key: 'war', label: 'WAR' },
            ];
        case 'adv_bat':
            return [
                { key: 'woba', label: 'wOBA' }, { key: 'wrc_plus', label: 'wRC+' }, { key: 'iso', label: 'ISO' },
                { key: 'babip', label: 'BABIP' }, { key: 'bb_pct', label: 'BB%' }, { key: 'k_pct', label: 'K%' },
            ];
        case 'statcast_bat':
            return [
                { key: 'ev', label: 'Exit Velo' }, { key: 'barrel', label: 'Barrel %' }, 
                { key: 'hardhit', label: 'Hard Hit %' }, { key: 'whiff', label: 'Whiff %' },
            ];
        case 'defense':
            return [
                { key: 'drs', label: 'DRS' }, { key: 'uzr', label: 'UZR' }, { key: 'oaa', label: 'OAA' },
                { key: 'fpct', label: 'FPCT' },
            ];
        case 'pitching':
            return [
                { key: 'g', label: 'G' }, { key: 'gs', label: 'GS' }, { key: 'wins', label: 'W' }, { key: 'losses', label: 'L' },
                { key: 'sv', label: 'SV' }, { key: 'hld', label: 'HLD' }, { key: 'era', label: 'ERA' }, { key: 'so', label: 'SO' }, 
                { key: 'p_bb', label: 'BB' }, { key: 'p_ibb', label: 'IBB' }, { key: 'ip', label: 'IP' },
                { key: 'whip', label: 'WHIP' }, { key: 'pitches', label: 'NP' }, { key: 'war', label: 'WAR' },
            ];
    }
};
