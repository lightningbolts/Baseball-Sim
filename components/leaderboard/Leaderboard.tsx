
import React, { useState } from 'react';
import { Player, Team, Position } from '../../types';
import { LeaderboardControls } from './LeaderboardControls';
import { LeaderboardTable } from './LeaderboardTable';
import { StatCategory, SortKey, getValue } from './utils';
import { TeamLeaderboard } from '../TeamLeaderboard';

interface LeaderboardProps {
  teams: Team[];
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ teams }) => {
  const [mode, setMode] = useState<'players' | 'teams'>('players');
  const [category, setCategory] = useState<StatCategory>('batting');
  const [sortKey, setSortKey] = useState<SortKey>('war');
  const [sortAscending, setSortAscending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showQualifiedOnly, setShowQualifiedOnly] = useState(false); // Default to false to show early sim results
  const [leagueFilter, setLeagueFilter] = useState<'All' | 'AL' | 'NL'>('All');

  // Flatten players with team info
  const allPlayers = teams.flatMap(t => t.roster.map(p => ({ ...p, teamAbbr: t.abbreviation, teamLeague: t.league })));

  // Calculate qualification thresholds dynamically based on games played
  const maxGames = Math.max(...teams.map(t => t.wins + t.losses)) || 1;
  const minPA = Math.max(10, maxGames * 3.1); // Minimum 10 PA or MLB Standard
  const minIP = Math.max(3, maxGames * 1.0); // Minimum 3 IP or MLB Standard

  const getSortedPlayers = () => {
    return allPlayers
      .filter(p => {
        // League filter
        if (leagueFilter !== 'All' && p.teamLeague !== leagueFilter) return false;
        
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
        if (!matchesSearch) return false;

        const pa = (p.statsCounters.ab + p.statsCounters.bb + p.statsCounters.hbp + p.statsCounters.sf + p.statsCounters.sac);
        const ip = p.pitching?.ip || 0;
        const pitches = p.statsCounters.pitchesThrown || 0;

        if (category === 'pitching') {
             if (p.position !== Position.P) return false;
             // If Qualified Only is ON, require strict limits. If OFF, just require that they have thrown a pitch.
             return showQualifiedOnly ? ip >= minIP : pitches > 0;
        } else {
             if (p.position === Position.P) return false;
             return showQualifiedOnly ? pa >= minPA : pa > 0;
        }
      })
      .sort((a, b) => {
        const valA = getValue(a, sortKey);
        const valB = getValue(b, sortKey);
        
        // Lower is better logic for certain stats
        const lowerIsBetter = ['era', 'whip', 'gidp', 'wp', 'k_pct', 'whiff'].includes(sortKey);
        
        if (lowerIsBetter) {
            // Handle edge case where 0.00 ERA is good, but infinite ERA (0 IP) is bad
            if (valA >= 99 && valB < 99) return 1;
            if (valB >= 99 && valA < 99) return -1;
            
            // Apply sort direction
            return sortAscending ? valA - valB : valB - valA;
        }
        
        // Higher is better (default)
        return sortAscending ? valA - valB : valB - valA;
      });
      // Removed .slice(0, 100) to show all players 
  };

  return (
    <div className="bg-slate-900 rounded-xl shadow-xl border border-slate-800 p-6">
        <div className="mb-4 flex flex-wrap gap-2 items-center justify-between">
          <div className="flex gap-2">
            <button 
              onClick={() => setMode('players')} 
              className={`px-4 py-2 rounded-lg font-semibold transition ${mode === 'players' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
            >
              Player Leaders
            </button>
            <button 
              onClick={() => setMode('teams')} 
              className={`px-4 py-2 rounded-lg font-semibold transition ${mode === 'teams' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
            >
              Team Leaders
            </button>
          </div>
          {mode === 'players' && (
            <div className="flex gap-2">
              <button 
                onClick={() => setLeagueFilter('All')} 
                className={`px-4 py-2 rounded-lg font-semibold transition ${leagueFilter === 'All' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
              >
                All
              </button>
              <button 
                onClick={() => setLeagueFilter('AL')} 
                className={`px-4 py-2 rounded-lg font-semibold transition ${leagueFilter === 'AL' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
              >
                AL Only
              </button>
              <button 
                onClick={() => setLeagueFilter('NL')} 
                className={`px-4 py-2 rounded-lg font-semibold transition ${leagueFilter === 'NL' ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
              >
                NL Only
              </button>
            </div>
          )}
        </div>
        {mode === 'players' ? (
          <>
            <LeaderboardControls 
                category={category} 
                setCategory={setCategory} 
                searchTerm={searchTerm} 
                setSearchTerm={setSearchTerm}
                showAll={!showQualifiedOnly}
                setShowAll={(val) => setShowQualifiedOnly(!val)}
            />
            <LeaderboardTable 
                players={getSortedPlayers()} 
                category={category} 
                sortKey={sortKey} 
                sortAscending={sortAscending}
                setSortKey={(key) => {
                    if (key === sortKey) {
                        setSortAscending(!sortAscending);
                    } else {
                        setSortKey(key);
                        setSortAscending(['era', 'whip', 'gidp', 'wp', 'k_pct', 'whiff'].includes(key));
                    }
                }} 
            />
          </>
        ) : (
          <TeamLeaderboard teams={teams} />
        )}
    </div>
  );
};
