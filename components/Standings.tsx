import React from 'react';
import { Team } from '../types';

interface StandingsProps {
  teams: Team[];
  league: 'AL' | 'NL';
}

export const Standings: React.FC<StandingsProps> = ({ teams, league }) => {
  const divisions = ['East', 'Central', 'West'];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white border-b border-slate-700 pb-2 mb-4">{league} Standings</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {divisions.map(division => {
          const divTeams = teams
            .filter(t => t.league === league && t.division === division)
            .sort((a, b) => b.wins - a.wins); // Sort by wins

          return (
            <div key={division} className="bg-slate-800 rounded-lg p-4 shadow-lg border border-slate-700">
              <h3 className="text-lg font-semibold text-emerald-400 mb-3 uppercase tracking-wider">{division}</h3>
              <table className="w-full text-sm text-left text-slate-300">
                <thead className="text-xs text-slate-500 uppercase bg-slate-900/50">
                  <tr>
                    <th className="px-2 py-2">Team</th>
                    <th className="px-2 py-2 text-center">W</th>
                    <th className="px-2 py-2 text-center">L</th>
                    <th className="px-2 py-2 text-center">Pct</th>
                    <th className="px-2 py-2 text-center">Diff</th>
                  </tr>
                </thead>
                <tbody>
                  {divTeams.map(team => {
                     const pct = (team.wins + team.losses) > 0 
                        ? (team.wins / (team.wins + team.losses)).toFixed(3) 
                        : '.000';
                     const diff = team.runsScored - team.runsAllowed;
                     
                     return (
                      <tr key={team.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                        <td className="px-2 py-2 font-medium text-white">
                          <div className="flex items-center gap-2">
                            {team.logoUrl && <img src={team.logoUrl} alt={team.abbreviation} className="w-6 h-6 object-contain" />}
                            {team.name}
                          </div>
                        </td>
                        <td className="px-2 py-2 text-center">{team.wins}</td>
                        <td className="px-2 py-2 text-center">{team.losses}</td>
                        <td className="px-2 py-2 text-center">{pct.replace('0.', '.')}</td>
                        <td className={`px-2 py-2 text-center ${diff > 0 ? 'text-green-400' : diff < 0 ? 'text-red-400' : ''}`}>
                            {diff > 0 ? '+' : ''}{diff}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </div>
  );
};