
import { Player, Position } from '../../types';

export type StatCategory = 'batting' | 'pitching' | 'defense' | 'statcast_bat' | 'adv_bat';
export type SortKey = 'pa' | 'avg' | 'hr' | 'rbi' | 'ops' | 'war' | 'd' | 't' | 'gidp' | 'sb' | 'sf' | 'sac' |
               'era' | 'wins' | 'so' | 'whip' | 'ip' | 'hbp' | 'wp' | 'pitches' |
               'drs' | 'uzr' | 'oaa' | 'fpct' | 
               'ev' | 'barrel' | 'hardhit' | 'whiff' |
               'woba' | 'wrc_plus' | 'iso' | 'babip' | 'bb_pct' | 'k_pct';

export const getValue = (p: Player, key: SortKey): number => {
    const s = p.statsCounters;
    const pa = s.ab + s.bb + s.hbp + s.sf + s.sac;

    // Batting Standard
    if (key === 'pa') return pa;
    if (key === 'avg') return p.batting?.avg ?? 0;
    if (key === 'hr') return p.batting?.hr ?? 0;
    if (key === 'rbi') return p.batting?.rbi ?? 0;
    if (key === 'ops') return p.batting?.ops ?? 0;
    if (key === 'war') return p.batting?.war ?? p.pitching?.war ?? 0;
    if (key === 'sb') return p.batting?.sb ?? 0;
    
    // Pitching Standard
    if (key === 'era') return p.pitching?.era ?? 99.99;
    if (key === 'wins') return p.seasonStats.wins ?? 0;
    if (key === 'so') return p.pitching?.so ?? 0;
    if (key === 'whip') return p.pitching?.whip ?? 99.99;
    if (key === 'ip') return p.pitching?.ip ?? 0;
    if (key === 'pitches') return p.statsCounters.pitchesThrown ?? 0;
    
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
                { key: 'pa', label: 'PA' }, { key: 'avg', label: 'AVG' }, { key: 'hr', label: 'HR' }, { key: 'rbi', label: 'RBI' },
                { key: 'ops', label: 'OPS' }, { key: 'sb', label: 'SB' }, { key: 'war', label: 'WAR' },
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
                { key: 'wins', label: 'W' }, { key: 'era', label: 'ERA' }, { key: 'so', label: 'SO' }, { key: 'ip', label: 'IP' },
                { key: 'whip', label: 'WHIP' }, { key: 'pitches', label: 'NP' }, { key: 'war', label: 'WAR' },
            ];
    }
};
