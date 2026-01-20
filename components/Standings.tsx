import React, { useMemo } from 'react';
import { Team } from '../types';

interface StandingsProps {
  teams: Team[];
  league: 'AL' | 'NL';
}

// Helper to determine playoff status for each team
const getPlayoffStatus = (teams: Team[], league: 'AL' | 'NL') => {
  const leagueTeams = teams.filter(t => t.league === league);
  const divisions = ['East', 'Central', 'West'];
  
  // Get division winners
  const divisionWinners = new Set<string>();
  divisions.forEach(div => {
    const divTeams = leagueTeams.filter(t => t.division === div).sort((a, b) => b.wins - a.wins);
    if (divTeams.length > 0) divisionWinners.add(divTeams[0].id);
  });
  
  // Get wildcard teams (top 3 non-division winners)
  const nonWinners = leagueTeams
    .filter(t => !divisionWinners.has(t.id))
    .sort((a, b) => b.wins - a.wins);
  const wildcardTeams = new Set(nonWinners.slice(0, 3).map(t => t.id));
  
  // Top 2 division winners get bye (by wins)
  const sortedWinners = leagueTeams
    .filter(t => divisionWinners.has(t.id))
    .sort((a, b) => b.wins - a.wins);
  const byeTeams = new Set(sortedWinners.slice(0, 2).map(t => t.id));
  
  return { divisionWinners, wildcardTeams, byeTeams };
};

// Helper to get wildcard rank (WC1, WC2, WC3)
const nonWinnerRank = (team: Team, allTeams: Team[], league: 'AL' | 'NL', divisionWinners: Set<string>): number => {
  const nonWinners = allTeams
    .filter(t => t.league === league && !divisionWinners.has(t.id))
    .sort((a, b) => b.wins - a.wins);
  return nonWinners.findIndex(t => t.id === team.id) + 1;
};

export const Standings: React.FC<StandingsProps> = ({ teams, league }) => {
  const divisions = ['East', 'Central', 'West'];
  
  // Calculate playoff status for the league
  const { divisionWinners, wildcardTeams, byeTeams } = useMemo(
    () => getPlayoffStatus(teams, league),
    [teams, league]
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      <h2 className="text-xl sm:text-2xl font-bold text-white border-b border-slate-700 pb-2 mb-4">{league} Standings</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-6">
        {divisions.map(division => {
          const divTeams = teams
            .filter(t => t.league === league && t.division === division)
            .sort((a, b) => b.wins - a.wins); // Sort by wins

          return (
            <div key={division} className="bg-slate-800 rounded-lg p-3 sm:p-4 shadow-lg border border-slate-700">
              <h3 className="text-base sm:text-lg font-semibold text-emerald-400 mb-2 sm:mb-3 uppercase tracking-wider">{division}</h3>
              <div className="overflow-x-auto -mx-3 sm:mx-0">
                <table className="w-full text-xs sm:text-sm text-left text-slate-300 min-w-max sm:min-w-0">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-900/50">
                    <tr>
                      <th className="px-2 py-2">Team</th>
                      <th className="px-1 sm:px-2 py-2 text-center">W</th>
                      <th className="px-1 sm:px-2 py-2 text-center">L</th>
                      <th className="px-1 sm:px-2 py-2 text-center">Pct</th>
                      <th className="px-1 sm:px-2 py-2 text-center">Diff</th>
                    </tr>
                  </thead>
                  <tbody>
                    {divTeams.map((team, idx) => {
                       const pct = (team.wins + team.losses) > 0 
                          ? (team.wins / (team.wins + team.losses)).toFixed(3) 
                          : '.000';
                       const diff = team.runsScored - team.runsAllowed;
                       
                       // Determine playoff status
                       const isDivisionWinner = divisionWinners.has(team.id);
                       const hasBye = byeTeams.has(team.id);
                       const isWildcard = wildcardTeams.has(team.id);
                       const inPlayoffs = isDivisionWinner || isWildcard;
                       
                       // Row styling based on playoff status
                       let rowClass = 'border-b border-slate-700/50 hover:bg-slate-700/30';
                       if (hasBye) rowClass += ' bg-emerald-900/20';
                       else if (isDivisionWinner) rowClass += ' bg-blue-900/20';
                       else if (isWildcard) rowClass += ' bg-amber-900/20';
                       
                       return (
                        <tr key={team.id} className={rowClass}>
                          <td className="px-2 py-2 font-medium text-white">
                            <div className="flex items-center gap-1.5 sm:gap-2">
                              {team.logoUrl && <img src={team.logoUrl} alt={team.abbreviation} className="w-5 h-5 sm:w-6 sm:h-6 object-contain flex-shrink-0" />}
                              <span className="truncate">{team.name}</span>
                              {/* Playoff status badges */}
                              {hasBye && (
                                <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-emerald-600 text-white rounded" title="Division Winner + First Round Bye">BYE</span>
                              )}
                              {isDivisionWinner && !hasBye && (
                                <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-blue-600 text-white rounded" title="Division Winner">DIV</span>
                              )}
                              {isWildcard && (
                                <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-amber-600 text-white rounded" title="Wild Card">WC{nonWinnerRank(team, teams, league, divisionWinners)}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-1 sm:px-2 py-2 text-center">{team.wins}</td>
                          <td className="px-1 sm:px-2 py-2 text-center">{team.losses}</td>
                          <td className="px-1 sm:px-2 py-2 text-center">{pct.replace('0.', '.')}</td>
                          <td className={`px-1 sm:px-2 py-2 text-center ${diff > 0 ? 'text-green-400' : diff < 0 ? 'text-red-400' : ''}`}>
                              {diff > 0 ? '+' : ''}{diff}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-slate-400 mt-4 pt-4 border-t border-slate-700">
        <div className="flex items-center gap-2">
          <span className="px-1.5 py-0.5 font-bold bg-emerald-600 text-white rounded">BYE</span>
          <span>Division Winner + First Round Bye</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-1.5 py-0.5 font-bold bg-blue-600 text-white rounded">DIV</span>
          <span>Division Winner</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-1.5 py-0.5 font-bold bg-amber-600 text-white rounded">WC</span>
          <span>Wild Card</span>
        </div>
      </div>
    </div>
  );
};