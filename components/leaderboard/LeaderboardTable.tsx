
import React from 'react';
import { Player, Team } from '../../types';
import { SortKey, getValue, getHeaders, StatCategory } from './utils';

interface LeaderboardTableProps {
    players: (Player & { teamAbbr: string })[];
    category: StatCategory;
    sortKey: SortKey;
    sortAscending: boolean;
    setSortKey: (k: SortKey) => void;
}

export const LeaderboardTable: React.FC<LeaderboardTableProps> = ({ players, category, sortKey, sortAscending, setSortKey }) => {
    const headers = getHeaders(category);
  const formatInnings = (outsPitched: number) => {
    const innings = Math.floor(outsPitched / 3);
    const remainder = outsPitched % 3;
    return `${innings}.${remainder}`;
  };

    return (
        <div className="overflow-x-auto custom-scrollbar max-h-[650px] rounded-lg border border-slate-700">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-800 text-slate-400 uppercase font-bold sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="px-4 py-3 bg-slate-800 border-b border-slate-700">Rank</th>
                  <th className="px-4 py-3 bg-slate-800 border-b border-slate-700">Player</th>
                  <th className="px-4 py-3 bg-slate-800 border-b border-slate-700">Team</th>
                  {headers.map(h => (
                    <th 
                      key={h.key} 
                      onClick={() => setSortKey(h.key)}
                      className={`px-4 py-3 text-right cursor-pointer bg-slate-800 border-b border-slate-700 hover:text-white transition group ${sortKey === h.key ? 'text-emerald-400' : ''}`}
                    >
                      <div className="flex items-center justify-end gap-1">
                          {h.label}
                          {sortKey === h.key && <span className="text-[10px]">{sortAscending ? '▲' : '▼'}</span>}
                      </div>
                    </th>
                  ))}  
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-900/50">
                {players.length > 0 ? (
                    players.map((player, idx) => (
                      <tr key={player.id} className="hover:bg-slate-800/50 transition duration-75 group">
                        <td className="px-4 py-3 font-mono text-slate-500 text-xs">{idx + 1}</td>
                        <td className="px-4 py-3 font-bold text-white group-hover:text-emerald-300 transition">
                            {player.name} 
                            <span className="text-xs font-normal text-slate-500 ml-2 bg-slate-800 px-1.5 py-0.5 rounded">
                                {player.position}
                            </span>
                        </td>
                        <td className="px-4 py-3 text-slate-400 font-mono text-xs">{player.teamAbbr}</td>
                        {headers.map(h => {
                            const numVal = getValue(player, h.key);
                            let displayVal: string | number = numVal;
                            
                            // Formatting Logic
                            if (['avg', 'obp', 'slg', 'ops', 'woba', 'iso', 'babip', 'fpct'].includes(h.key)) displayVal = numVal.toFixed(3).replace('0.', '.');
                            else if (['whip'].includes(h.key)) {
                                displayVal = numVal > 50 ? '-.--' : numVal.toFixed(2);
                            }
                            else if (['era'].includes(h.key)) {
                                displayVal = numVal > 50 ? '-.--' : numVal.toFixed(2);
                            }
                            else if (h.key === 'ip') displayVal = formatInnings(player.statsCounters.outsPitched || 0);
                            else if (['ev', 'wrc_plus', 'war', 'drs', 'uzr', 'oaa'].includes(h.key)) displayVal = numVal.toFixed(1);
                            else if (['barrel', 'hardhit', 'whiff', 'bb_pct', 'k_pct'].includes(h.key)) displayVal = (numVal * 100).toFixed(1) + '%';
                            else if (['pitches', 'so', 'wins', 'pa'].includes(h.key)) displayVal = Math.round(numVal);
                            
                            return (
                                <td key={h.key} className={`px-4 py-3 text-right font-mono ${sortKey === h.key ? 'text-emerald-400 font-bold bg-emerald-900/5' : ''}`}>
                                   {displayVal}
                                </td>
                            )
                        })}
                      </tr>
                    ))
                ) : (
                    <tr>
                        <td colSpan={headers.length + 3} className="px-4 py-8 text-center text-slate-500 italic">
                            No players found matching criteria. Try adjusting filters or simulate more games.
                        </td>
                    </tr>
                )}
              </tbody>
            </table>
        </div>
    );
};
