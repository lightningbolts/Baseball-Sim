
import React, { useState } from 'react';
import { Player, Team, Position } from '../../types';
import { LeaderboardControls } from './LeaderboardControls';
import { LeaderboardTable } from './LeaderboardTable';
import { StatCategory, SortKey, getValue } from './utils';

interface LeaderboardProps {
  teams: Team[];
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ teams }) => {
  const [category, setCategory] = useState<StatCategory>('batting');
  const [sortKey, setSortKey] = useState<SortKey>('war');
  const [searchTerm, setSearchTerm] = useState('');
  const [showQualifiedOnly, setShowQualifiedOnly] = useState(false); // Default to false to show early sim results

  // Flatten players
  const allPlayers = teams.flatMap(t => t.roster.map(p => ({ ...p, teamAbbr: t.abbreviation })));

  // Calculate qualification thresholds dynamically based on games played
  const maxGames = Math.max(...teams.map(t => t.wins + t.losses)) || 1;
  const minPA = Math.max(10, maxGames * 3.1); // Minimum 10 PA or MLB Standard
  const minIP = Math.max(3, maxGames * 1.0); // Minimum 3 IP or MLB Standard

  const getSortedPlayers = () => {
    return allPlayers
      .filter(p => {
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
        
        // Lower is better logic
        if (['era', 'whip', 'gidp', 'wp', 'k_pct', 'whiff'].includes(sortKey)) {
            // Handle edge case where 0.00 ERA is good, but infinite ERA (0 IP) is bad.
            // In getValue, infinite is 99.99. 0 is 0.
            // If sortKey is ERA, 0 should come before 2.00. 99.99 should be last.
            // Ascending sort works: 0, 1, 2... 99.
            // However, we want to push 99.99 to the bottom even if we have valid 0.00s.
            if (valA >= 99 && valB < 99) return 1;
            if (valB >= 99 && valA < 99) return -1;
            return valA - valB;
        }
        return valB - valA;
      })
      .slice(0, 100); 
  };

  return (
    <div className="bg-slate-900 rounded-xl shadow-xl border border-slate-800 p-6">
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
            setSortKey={setSortKey} 
        />
    </div>
  );
};
