
import React, { useState, useMemo } from 'react';
import { Team, Player } from '../types';
import { generateTeamData } from '../services/leagueService';
import { getAdvancedScoutingReport } from '../services/scoutingService';

// === ROSTER REGULARS SECTION ===
type HitterSortKey = 'name' | 'g' | 'avg' | 'hr' | 'rbi' | 'ops' | 'war';
type PitcherSortKey = 'name' | 'g' | 'gs' | 'w' | 'l' | 'era' | 'ip' | 'so' | 'war';

const RegularsSection: React.FC<{ team: Team }> = ({ team }) => {
  const [hitterSort, setHitterSort] = useState<{ key: HitterSortKey; dir: 'asc' | 'desc' }>({ key: 'war', dir: 'desc' });
  const [pitcherSort, setPitcherSort] = useState<{ key: PitcherSortKey; dir: 'asc' | 'desc' }>({ key: 'era', dir: 'asc' });

  // Filter to players with significant playing time (regulars)
  const hitters = useMemo(() => {
    const positionPlayers = team.roster.filter(p => 
      (!['P', 'SP', 'RP', 'CL'].includes(p.position) || p.isTwoWay) &&
      (p.batting?.gamesPlayed || 0) >= 20 // At least 20 games
    );
    return [...positionPlayers].sort((a, b) => {
      const getValue = (p: Player): number | string => {
        switch (hitterSort.key) {
          case 'name': return p.name;
          case 'g': return p.batting?.gamesPlayed || 0;
          case 'avg': return p.batting?.avg || 0;
          case 'hr': return p.batting?.hr || 0;
          case 'rbi': return p.batting?.rbi || 0;
          case 'ops': return p.batting?.ops || 0;
          case 'war': return p.batting?.war || 0;
        }
      };
      const aVal = getValue(a);
      const bVal = getValue(b);
      if (typeof aVal === 'string') {
        return hitterSort.dir === 'asc' ? aVal.localeCompare(bVal as string) : (bVal as string).localeCompare(aVal);
      }
      return hitterSort.dir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
  }, [team.roster, hitterSort]);

  const pitchers = useMemo(() => {
    const pitchingStaff = team.roster.filter(p => 
      (['P', 'SP', 'RP', 'CL'].includes(p.position) || p.isTwoWay) &&
      (p.pitching?.gamesPlayed || 0) >= 10 // At least 10 games
    );
    return [...pitchingStaff].sort((a, b) => {
      const getValue = (p: Player): number | string => {
        switch (pitcherSort.key) {
          case 'name': return p.name;
          case 'g': return p.pitching?.gamesPlayed || 0;
          case 'gs': return p.pitching?.gamesStarted || 0;
          case 'w': return p.pitching?.wins || 0;
          case 'l': return p.pitching?.losses || 0;
          case 'era': return p.pitching?.era || 99;
          case 'ip': return p.pitching?.inningsPitched || 0;
          case 'so': return p.pitching?.strikeouts || 0;
          case 'war': return p.pitching?.war || 0;
        }
      };
      const aVal = getValue(a);
      const bVal = getValue(b);
      if (typeof aVal === 'string') {
        return pitcherSort.dir === 'asc' ? aVal.localeCompare(bVal as string) : (bVal as string).localeCompare(aVal);
      }
      return pitcherSort.dir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
  }, [team.roster, pitcherSort]);

  const handleHitterSort = (key: HitterSortKey) => {
    setHitterSort(prev => ({
      key,
      dir: prev.key === key && prev.dir === 'desc' ? 'asc' : 'desc'
    }));
  };

  const handlePitcherSort = (key: PitcherSortKey) => {
    setPitcherSort(prev => ({
      key,
      dir: prev.key === key && prev.dir === (key === 'era' ? 'asc' : 'desc') ? (key === 'era' ? 'desc' : 'asc') : (key === 'era' ? 'asc' : 'desc')
    }));
  };

  const SortHeader = ({ label, sortKey, currentSort, onClick }: { 
    label: string; 
    sortKey: string; 
    currentSort: { key: string; dir: 'asc' | 'desc' }; 
    onClick: () => void 
  }) => (
    <th 
      className="px-2 py-2 text-right cursor-pointer hover:bg-slate-700/50 transition select-none whitespace-nowrap"
      onClick={onClick}
    >
      <span className="flex items-center justify-end gap-1">
        {label}
        {currentSort.key === sortKey && (
          <span className="text-emerald-400">{currentSort.dir === 'desc' ? '▼' : '▲'}</span>
        )}
      </span>
    </th>
  );

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 h-full">
      {/* Hitters Table */}
      <div className="bg-slate-800/40 rounded-xl border border-slate-700 overflow-hidden shadow-sm flex flex-col">
        <div className="px-4 py-3 border-b border-slate-700 bg-slate-800/80 backdrop-blur-sm">
          <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-400">Position Player Regulars</h3>
          <p className="text-xs text-slate-500 mt-1">Players with 20+ games played • Click headers to sort</p>
        </div>
        <div className="overflow-auto flex-1 custom-scrollbar">
          <table className="w-full text-sm text-left text-slate-300">
            <thead className="bg-slate-900/50 text-slate-400 text-xs uppercase font-semibold sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left w-1/4">Player</th>
                <SortHeader label="G" sortKey="g" currentSort={hitterSort} onClick={() => handleHitterSort('g')} />
                <SortHeader label="AVG" sortKey="avg" currentSort={hitterSort} onClick={() => handleHitterSort('avg')} />
                <SortHeader label="HR" sortKey="hr" currentSort={hitterSort} onClick={() => handleHitterSort('hr')} />
                <SortHeader label="RBI" sortKey="rbi" currentSort={hitterSort} onClick={() => handleHitterSort('rbi')} />
                <SortHeader label="OPS" sortKey="ops" currentSort={hitterSort} onClick={() => handleHitterSort('ops')} />
                <SortHeader label="WAR" sortKey="war" currentSort={hitterSort} onClick={() => handleHitterSort('war')} />
              </tr>
            </thead>
            <tbody>
              {hitters.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">No regulars with 20+ games yet</td></tr>
              ) : hitters.map(player => (
                <tr key={player.id} className="border-b border-slate-800 hover:bg-slate-700/30 transition-colors">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-slate-500 w-6 text-center bg-slate-800/50 rounded">{player.position}</span>
                      <span className="font-medium text-slate-200 truncate">{player.name}</span>
                    </div>
                  </td>
                  <td className="px-2 py-2 text-right font-mono">{player.batting?.gamesPlayed || 0}</td>
                  <td className="px-2 py-2 text-right font-mono">{(player.batting?.avg || 0).toFixed(3)}</td>
                  <td className="px-2 py-2 text-right font-mono">{player.batting?.hr || 0}</td>
                  <td className="px-2 py-2 text-right font-mono">{player.batting?.rbi || 0}</td>
                  <td className="px-2 py-2 text-right font-mono text-emerald-400">{(player.batting?.ops || 0).toFixed(3)}</td>
                  <td className="px-2 py-2 text-right font-mono font-bold text-white">{(player.batting?.war || 0).toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pitchers Table */}
      <div className="bg-slate-800/40 rounded-xl border border-slate-700 overflow-hidden shadow-sm flex flex-col">
        <div className="px-4 py-3 border-b border-slate-700 bg-slate-800/80 backdrop-blur-sm">
          <h3 className="text-sm font-bold uppercase tracking-wider text-orange-400">Pitching Staff Regulars</h3>
          <p className="text-xs text-slate-500 mt-1">Pitchers with 10+ games • Click headers to sort</p>
        </div>
        <div className="overflow-auto flex-1 custom-scrollbar">
          <table className="w-full text-sm text-left text-slate-300">
            <thead className="bg-slate-900/50 text-slate-400 text-xs uppercase font-semibold sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left w-1/5">Player</th>
                <SortHeader label="G" sortKey="g" currentSort={pitcherSort} onClick={() => handlePitcherSort('g')} />
                <SortHeader label="GS" sortKey="gs" currentSort={pitcherSort} onClick={() => handlePitcherSort('gs')} />
                <SortHeader label="W" sortKey="w" currentSort={pitcherSort} onClick={() => handlePitcherSort('w')} />
                <SortHeader label="L" sortKey="l" currentSort={pitcherSort} onClick={() => handlePitcherSort('l')} />
                <SortHeader label="ERA" sortKey="era" currentSort={pitcherSort} onClick={() => handlePitcherSort('era')} />
                <SortHeader label="IP" sortKey="ip" currentSort={pitcherSort} onClick={() => handlePitcherSort('ip')} />
                <SortHeader label="SO" sortKey="so" currentSort={pitcherSort} onClick={() => handlePitcherSort('so')} />
                <SortHeader label="WAR" sortKey="war" currentSort={pitcherSort} onClick={() => handlePitcherSort('war')} />
              </tr>
            </thead>
            <tbody>
              {pitchers.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-500">No regulars with 10+ games yet</td></tr>
              ) : pitchers.map(player => (
                <tr key={player.id} className="border-b border-slate-800 hover:bg-slate-700/30 transition-colors">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className={`font-mono text-xs w-6 text-center rounded ${player.rotationSlot <= 5 ? 'bg-blue-900/50 text-blue-400' : 'bg-orange-900/50 text-orange-400'}`}>
                        {player.rotationSlot <= 5 ? 'SP' : 'RP'}
                      </span>
                      <span className="font-medium text-slate-200 truncate">{player.name}</span>
                    </div>
                  </td>
                  <td className="px-2 py-2 text-right font-mono">{player.pitching?.gamesPlayed || 0}</td>
                  <td className="px-2 py-2 text-right font-mono">{player.pitching?.gamesStarted || 0}</td>
                  <td className="px-2 py-2 text-right font-mono text-emerald-400">{player.pitching?.wins || 0}</td>
                  <td className="px-2 py-2 text-right font-mono text-red-400">{player.pitching?.losses || 0}</td>
                  <td className="px-2 py-2 text-right font-mono font-bold text-white">{(player.pitching?.era || 0).toFixed(2)}</td>
                  <td className="px-2 py-2 text-right font-mono">{(player.pitching?.inningsPitched || 0).toFixed(1)}</td>
                  <td className="px-2 py-2 text-right font-mono">{player.pitching?.strikeouts || 0}</td>
                  <td className="px-2 py-2 text-right font-mono font-bold text-amber-400">{(player.pitching?.war || 0).toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

interface TeamDetailProps {
  team: Team;
  onUpdateTeam: (updatedTeam: Team) => void;
  onClose: () => void;
}

export const TeamDetail: React.FC<TeamDetailProps> = ({ team, onUpdateTeam, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'roster' | 'regulars' | 'advanced' | 'history' | 'staff' | 'injuries'>('roster');
  const [scoutingReport, setScoutingReport] = useState<{playerId: string, player: Player, report: string} | null>(null);
    const [historyPlayerId, setHistoryPlayerId] = useState<string | null>(null);

  const handleGenerateData = async () => {
    setLoading(true);
    const data = await generateTeamData(`${team.city} ${team.name}`);
    if (data.roster.length > 0) {
      onUpdateTeam({
        ...team,
        roster: data.roster,
        staff: data.staff,
        frontOffice: data.frontOffice,
        dataSources: data.sources,
        isRosterGenerated: true
      });
    }
    setLoading(false);
  };

  const handleScoutPlayer = async (player: Player) => {
      setScoutingReport({ playerId: player.id, player, report: "Analyzing Statcast Data..." });
      const report = await getAdvancedScoutingReport(player);
      setScoutingReport({ playerId: player.id, player, report });
  };

  // --- UI Components ---
  
  const SectionHeader = ({ title, colorClass = "text-white" }: { title: string, colorClass?: string }) => (
    <div className="px-4 py-3 border-b border-slate-700 bg-slate-800/80 backdrop-blur-sm sticky top-0 z-10">
        <h3 className={`text-sm font-bold uppercase tracking-wider ${colorClass}`}>{title}</h3>
    </div>
  );

  const TableHeader = ({ cols }: { cols: { label: string, align?: string, width?: string }[] }) => (
    <thead className="bg-slate-900/50 text-slate-400 text-xs uppercase font-semibold">
        <tr>
            {cols.map((col, idx) => (
                <th key={idx} className={`px-3 py-2 ${col.align || 'text-left'} ${col.width || ''}`}>{col.label}</th>
            ))}
        </tr>
    </thead>
  );

  const StatCell = ({ value, type = 'neutral' }: { value: string | number, type?: 'neutral' | 'good' | 'bad' | 'highlight' }) => {
      let color = 'text-slate-300';
      if (type === 'good') color = 'text-emerald-400 font-medium';
      if (type === 'bad') color = 'text-red-400';
      if (type === 'highlight') color = 'text-white font-bold';
      
      return <td className={`px-3 py-2 text-right ${color}`}>{value}</td>;
  };

  const PlayerRow = ({ player, children, onClick }: { player: Player, children: React.ReactNode, onClick?: () => void }) => (
    <tr 
        onClick={onClick}
        className={`border-b border-slate-800 hover:bg-slate-700/30 transition-colors ${onClick ? 'cursor-pointer' : ''} ${player.injury.isInjured ? 'bg-red-900/10' : ''}`}
    >
        <td className="px-3 py-2">
            <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-slate-500 w-6 text-center bg-slate-800/50 rounded">{player.position}</span>
                <div className="flex flex-col">
                    <span className={`font-medium ${player.injury.isInjured ? 'text-red-400' : 'text-slate-200'}`}>{player.name}</span>
                    {player.isTwoWay && <span className="text-[10px] text-blue-400">Two-Way</span>}
                </div>
            </div>
        </td>
        {children}
    </tr>
  );

  const containerClass = "bg-slate-800/40 rounded-xl border border-slate-700 overflow-hidden shadow-sm flex flex-col";

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-2 sm:p-4 lg:p-6">
      <div className="bg-slate-900 w-full max-w-7xl h-[95vh] sm:h-[90vh] rounded-xl sm:rounded-2xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="relative shrink-0">
            <div className="absolute inset-0 opacity-20" style={{ background: `linear-gradient(135deg, ${team.primaryColor}, ${team.secondaryColor})` }}></div>
            <div className="relative p-3 sm:p-6 flex justify-between items-end border-b border-slate-700">
                <div className="flex gap-2 sm:gap-4 items-center">
                    {team.logoUrl ? (
                        <img src={team.logoUrl} alt={`${team.city} ${team.name}`} className="w-12 h-12 sm:w-20 sm:h-20 rounded-lg sm:rounded-xl shadow-lg" />
                    ) : (
                        <div className="w-12 h-12 sm:w-20 sm:h-20 rounded-lg sm:rounded-xl shadow-lg flex items-center justify-center text-xl sm:text-3xl font-black text-white" style={{backgroundColor: team.primaryColor}}>
                            {team.abbreviation[0]}
                        </div>
                    )}
                    <div>
                        <h2 className="text-xl sm:text-3xl font-bold text-white tracking-tight">{team.city} {team.name}</h2>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-1 text-xs sm:text-sm text-slate-300 font-mono">
                            <span className="bg-slate-800 px-1.5 sm:px-2 py-0.5 rounded border border-slate-600">{team.league} {team.division}</span>
                            <span>{team.wins}-{team.losses}</span>
                            <span className="hidden sm:inline text-slate-500">|</span>
                            <span className="hidden sm:flex items-center gap-1">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>
                                {team.stadium}
                            </span>
                        </div>
                    </div>
                </div>
                <button onClick={onClose} className="bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-full p-1.5 sm:p-2 transition">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>

        {/* Navigation Tabs */}
        {team.isRosterGenerated && (
          <div className="flex border-b border-slate-700 bg-slate-950/50 overflow-x-auto shrink-0">
            {[
                { id: 'roster', label: 'Active Roster' },
                { id: 'regulars', label: 'Roster Regulars' },
                { id: 'advanced', label: 'Advanced Stats' },
                { id: 'history', label: 'Career History' },
                { id: 'staff', label: 'Front Office' },
                { id: 'injuries', label: 'Injuries' }
            ].map(tab => (
                <button 
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)} 
                    className={`px-6 py-4 text-sm font-bold tracking-wide whitespace-nowrap border-b-2 transition-colors ${activeTab === tab.id ? 'border-emerald-500 text-white bg-slate-800/50' : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'}`}
                >
                    {tab.label}
                </button>
            ))}
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 overflow-auto bg-slate-900 p-6 custom-scrollbar">
          {!team.isRosterGenerated ? (
             <div className="flex flex-col items-center justify-center h-full space-y-6">
                <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center animate-pulse">
                    <span className="text-2xl">⚾️</span>
                </div>
                <div className="text-center">
                    <h3 className="text-xl font-bold text-white mb-2">Season Data Required</h3>
                    <p className="text-slate-400 max-w-md mx-auto mb-6">Initialize the roster to fetch real-time 2026 data, coaching staff, and financials.</p>
                    <button 
                    onClick={handleGenerateData}
                    disabled={loading}
                    className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow-lg shadow-emerald-900/20 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 mx-auto"
                    >
                    {loading ? (
                        <>
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Initializing Franchise...
                        </>
                    ) : (
                        <>Load 2026 Season Data</>
                    )}
                    </button>
                </div>
             </div>
          ) : (
            <div className="space-y-6 h-full">
              
              {/* === ROSTER TAB === */}
              {activeTab === 'roster' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
                  <div className={containerClass}>
                      <SectionHeader title="Position Players" colorClass="text-emerald-400" />
                      <div className="overflow-auto flex-1 custom-scrollbar">
                        <table className="w-full text-sm text-left text-slate-300">
                            <TableHeader cols={[
                                { label: 'Player', width: 'w-1/2' },
                                { label: 'Age', align: 'text-right' },
                                { label: 'WAR', align: 'text-right' },
                                { label: 'Action', align: 'text-right' }
                            ]} />
                            <tbody>
                                {team.roster.filter(p => !['P', 'SP', 'RP', 'CL'].includes(p.position) || p.isTwoWay).map(player => (
                                    <PlayerRow key={player.id} player={player}>
                                        <StatCell value={player.age} />
                                        <StatCell value={player.batting?.war?.toFixed(1) || '0.0'} type="highlight" />
                                        <td className="px-3 py-2 text-right">
                                            <button onClick={(e) => { e.stopPropagation(); handleScoutPlayer(player); }} className="text-xs bg-slate-700 hover:bg-emerald-600 text-white px-2 py-1 rounded transition">Scout</button>
                                        </td>
                                    </PlayerRow>
                                ))}
                            </tbody>
                        </table>
                      </div>
                  </div>

                  <div className={containerClass}>
                      <SectionHeader title="Pitching Staff" colorClass="text-orange-400" />
                      <div className="overflow-auto flex-1 custom-scrollbar">
                        <table className="w-full text-sm text-left text-slate-300">
                            <TableHeader cols={[
                                { label: 'Player', width: 'w-1/2' },
                                { label: 'Role', align: 'text-right' },
                                { label: 'Stam', align: 'text-right' },
                                { label: 'ERA', align: 'text-right' },
                                { label: 'Action', align: 'text-right' }
                            ]} />
                            <tbody>
                                {team.roster.filter(p => ['P', 'SP', 'RP', 'CL'].includes(p.position) || p.isTwoWay).sort((a,b) => a.rotationSlot - b.rotationSlot).map(player => (
                                    <PlayerRow key={player.id} player={player}>
                                        <td className="px-3 py-2 text-right font-mono text-xs">{player.rotationSlot <= 5 ? 'SP' : player.rotationSlot === 9 ? 'CL' : 'RP'}</td>
                                        <StatCell value={player.attributes.stamina} />
                                        <StatCell value={player.pitching?.era.toFixed(2) || '0.00'} type="highlight" />
                                        <td className="px-3 py-2 text-right">
                                            <button onClick={(e) => { e.stopPropagation(); handleScoutPlayer(player); }} className="text-xs bg-slate-700 hover:bg-emerald-600 text-white px-2 py-1 rounded transition">Scout</button>
                                        </td>
                                    </PlayerRow>
                                ))}
                            </tbody>
                        </table>
                      </div>
                  </div>
                </div>
              )}

              {/* === ROSTER REGULARS TAB === */}
              {activeTab === 'regulars' && (
                <RegularsSection team={team} />
              )}

              {/* === ADVANCED TAB === */}
              {activeTab === 'advanced' && (
                  <div className={`${containerClass} h-full`}>
                      <SectionHeader title="Advanced Metrics & Defense" colorClass="text-cyan-400" />
                      <div className="overflow-auto flex-1 custom-scrollbar">
                          <table className="w-full text-sm text-left text-slate-300 whitespace-nowrap">
                              <TableHeader cols={[
                                  { label: 'Player' },
                                  { label: 'wRC+', align: 'text-right' },
                                  { label: 'wOBA', align: 'text-right' },
                                  { label: 'ISO', align: 'text-right' },
                                  { label: 'BABIP', align: 'text-right' },
                                  { label: 'Exit Velo', align: 'text-right' },
                                  { label: 'Barrel%', align: 'text-right' },
                                  { label: 'HardHit%', align: 'text-right' },
                                  { label: 'DRS', align: 'text-right' },
                                  { label: 'UZR', align: 'text-right' },
                                  { label: 'OAA', align: 'text-right' },
                              ]} />
                              <tbody>
                                  {team.roster.filter(p => !['P'].includes(p.position) || p.isTwoWay).map(p => (
                                      <PlayerRow key={p.id} player={p}>
                                          <StatCell value={p.batting?.wrc_plus.toFixed(0) || '100'} type="highlight" />
                                          <StatCell value={p.batting?.woba.toFixed(3) || '.000'} />
                                          <StatCell value={p.batting?.iso.toFixed(3) || '.000'} />
                                          <StatCell value={p.batting?.babip.toFixed(3) || '.000'} />
                                          <StatCell value={p.batting?.exitVelocity.toFixed(1) || '0.0'} />
                                          <StatCell value={`${(p.batting?.barrel_pct! * 100).toFixed(1)}%`} />
                                          <StatCell value={`${(p.batting?.hardHit_pct! * 100).toFixed(1)}%`} />
                                          <StatCell value={p.defense?.drs.toFixed(1) || '0'} type={p.defense?.drs! > 0 ? 'good' : p.defense?.drs! < 0 ? 'bad' : 'neutral'} />
                                          <StatCell value={p.defense?.uzr.toFixed(1) || '0'} />
                                          <StatCell value={p.defense?.oaa.toFixed(1) || '0'} />
                                      </PlayerRow>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  </div>
              )}

              {/* === HISTORY TAB === */}
                            {activeTab === 'history' && (
                                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-full">
                                    {/* Sidebar roster (large screens) */}
                                    <div className="hidden lg:block bg-slate-800/40 border border-slate-700 rounded-lg overflow-hidden">
                                        <div className="bg-slate-800/80 px-4 py-2 border-b border-slate-700">
                                            <span className="font-bold text-white">Roster</span>
                                        </div>
                                        <div className="overflow-auto max-h-[70vh] custom-scrollbar">
                                            <ul>
                                                {team.roster.map(p => (
                                                    <li key={p.id}>
                                                        <button
                                                            className={`w-full text-left px-3 py-2 border-b border-slate-700/30 hover:bg-slate-700/30 ${historyPlayerId === p.id ? 'bg-slate-700/40 text-white' : 'text-slate-300'}`}
                                                            onClick={() => setHistoryPlayerId(p.id)}
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-bold">{p.name}</span>
                                                                    {p.injury.isInjured && (
                                                                        <span className="text-[10px] px-1.5 py-0.5 bg-red-600/20 text-red-400 border border-red-500/30 rounded font-mono">
                                                                            {p.injury.severity === '60-Day IL' ? '60-IL' : p.injury.severity === '10-Day IL' ? '10-IL' : 'DTD'} ({p.injury.daysRemaining}d)
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <span className="text-xs font-mono text-slate-500">{p.position}</span>
                                                            </div>
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>

                                    {/* History detail */}
                                    <div className="lg:col-span-3 bg-slate-800/40 border border-slate-700 rounded-lg overflow-hidden flex flex-col">
                                        <div className="bg-slate-800/80 px-4 py-2 border-b border-slate-700 flex justify-between items-center">
                                            <span className="font-bold text-white">Career History</span>
                                            {/* Mobile selector */}
                                            <div className="lg:hidden">
                                                <select
                                                    className="bg-slate-900 text-slate-200 text-xs px-2 py-1 rounded border border-slate-700"
                                                    value={historyPlayerId ?? team.roster[0]?.id}
                                                    onChange={e => setHistoryPlayerId(e.target.value)}
                                                >
                                                    {team.roster.map(p => (
                                                        <option key={p.id} value={p.id}>{p.name} ({p.position})</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                        <div className="overflow-auto flex-1 custom-scrollbar p-2">
                                            {(() => {
                                                const selected = team.roster.find(p => p.id === historyPlayerId) || team.roster[0];
                                                if (!selected) return <div className="p-4 text-slate-500 italic">No player selected</div>;
                                                const p = selected;
                                                return (
                                                    <div>
                                                        <div className="flex items-center justify-between mb-3">
                                                            <div>
                                                                <div className="text-xl font-bold text-white">{p.name}</div>
                                                                <div className="text-xs font-mono text-slate-500">{p.position}</div>
                                                            </div>
                                                        </div>
                                                        {p.history && p.history.length > 0 ? (
                                                            <table className="min-w-full text-xs text-left text-slate-300 whitespace-nowrap">
                                                                <thead className="text-slate-500 border-b border-slate-700/50">
                                                                    <tr>
                                                                        <th className="py-1">Year</th>
                                                                        <th className="py-1">Team</th>
                                                                        <th className="py-1 text-right">G</th>
                                                                        {(p.position === 'P' || p.isTwoWay) && (
                                                                            <>
                                                                                <th className="py-1 text-right">W-L</th>
                                                                                <th className="py-1 text-right">ERA</th>
                                                                                <th className="py-1 text-right">IP</th>
                                                                                <th className="py-1 text-right">SO</th>
                                                                                <th className="py-1 text-right">WHIP</th>
                                                                            </>
                                                                        )}
                                                                        {(p.position !== 'P' || p.isTwoWay) && (
                                                                            <>
                                                                                <th className="py-1 text-right">AVG</th>
                                                                                <th className="py-1 text-right">HR</th>
                                                                                <th className="py-1 text-right">RBI</th>
                                                                                <th className="py-1 text-right">SB</th>
                                                                                <th className="py-1 text-right">OPS</th>
                                                                            </>
                                                                        )}
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="font-mono">
                                                                    {p.history.map((h, idx) => (
                                                                        <tr key={idx} className="border-b border-slate-700/30 last:border-0 hover:bg-slate-700/20">
                                                                            <td className="py-1 text-emerald-500">{h.year}</td>
                                                                            <td className="py-1 text-slate-400 text-xs">{h.team}</td>
                                                                            <td className="py-1 text-right">{h.stats.games}</td>
                                                                            {(p.position === 'P' || p.isTwoWay) && (
                                                                                <>
                                                                                    <td className="py-1 text-right text-slate-300">{h.stats.wins || 0}-{h.stats.losses || 0}</td>
                                                                                    <td className="py-1 text-right text-white">{h.stats.era?.toFixed(2) || '-.--'}</td>
                                                                                    <td className="py-1 text-right">{h.stats.ip?.toFixed(1) || '0.0'}</td>
                                                                                    <td className="py-1 text-right">{h.stats.so || 0}</td>
                                                                                    <td className="py-1 text-right">{h.stats.whip?.toFixed(2) || '-.--'}</td>
                                                                                </>
                                                                            )}
                                                                            {(p.position !== 'P' || p.isTwoWay) && (
                                                                                <>
                                                                                    <td className="py-1 text-right text-white">{h.stats.avg?.toFixed(3) || '.000'}</td>
                                                                                    <td className="py-1 text-right text-orange-400">{h.stats.hr || 0}</td>
                                                                                    <td className="py-1 text-right">{h.stats.rbi || 0}</td>
                                                                                    <td className="py-1 text-right">{h.stats.sb || 0}</td>
                                                                                    <td className="py-1 text-right">{h.stats.ops?.toFixed(3) || '.000'}</td>
                                                                                </>
                                                                            )}
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        ) : (
                                                            <div className="flex h-full items-center justify-center text-xs text-slate-500 italic">No history available</div>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            )}

              {/* === STAFF TAB === */}
              {activeTab === 'staff' && (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
                    {/* Front Office */}
                    <div className={containerClass}>
                       <SectionHeader title="Front Office" colorClass="text-indigo-400" />
                       <div className="p-6 space-y-6">
                           <div className="flex justify-between items-center border-b border-slate-700 pb-4">
                                <div>
                                    <div className="text-xs text-slate-500 uppercase font-bold mb-1">General Manager</div>
                                    <div className="text-xl font-bold text-white">{team.frontOffice?.gmName || 'Vacant'}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs text-slate-500 uppercase font-bold mb-1">Budget</div>
                                    <div className="text-xl font-mono text-emerald-400">${team.frontOffice?.budget}M</div>
                                </div>
                           </div>
                           <div>
                                <div className="text-xs text-slate-500 uppercase font-bold mb-2">Organizational Strategy</div>
                                <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700 text-slate-300 text-sm">
                                    {team.frontOffice?.strategy === 'Analytics' && "Heavily reliant on sabermetrics and data-driven decision making."}
                                    {team.frontOffice?.strategy === 'Traditional' && "Focuses on scouting, tools, and traditional baseball values."}
                                    {team.frontOffice?.strategy === 'Big Spender' && "Aggressive in free agency, prioritizing established star power."}
                                    {team.frontOffice?.strategy === 'Small Market' && "Focuses on draft development, international scouting, and efficiency."}
                                    {team.frontOffice?.strategy === 'Moneyball' && "Exploits market inefficiencies to find undervalued talent."}
                                </div>
                           </div>
                       </div>
                    </div>

                    {/* Coaching Staff */}
                    <div className={containerClass}>
                       <SectionHeader title="Coaching Staff" colorClass="text-yellow-400" />
                       <div className="overflow-auto flex-1 custom-scrollbar">
                           <table className="w-full text-sm text-left text-slate-300">
                               <TableHeader cols={[
                                   { label: 'Name' },
                                   { label: 'Role' },
                                   { label: 'Style' },
                                   { label: 'Impact', align: 'text-right' }
                               ]} />
                               <tbody>
                                   {team.staff?.map((staff, i) => (
                                       <tr key={i} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                                           <td className="px-3 py-3 font-bold text-white">{staff.name}</td>
                                           <td className="px-3 py-3 text-slate-400">{staff.role}</td>
                                           <td className="px-3 py-3 text-slate-400 italic">{staff.philosophy}</td>
                                           <td className="px-3 py-3 text-right font-mono text-emerald-400">+{staff.bonus}</td>
                                       </tr>
                                   )) || (
                                       <tr>
                                           <td colSpan={4} className="px-3 py-8 text-center text-slate-500 italic">No staff information available.</td>
                                       </tr>
                                   )}
                               </tbody>
                           </table>
                       </div>
                    </div>
                 </div>
              )}

              {/* === INJURIES TAB === */}
              {activeTab === 'injuries' && (
                 <div className={`${containerClass} h-full`}>
                    <SectionHeader title="Medical Report & Injured List" colorClass="text-red-400" />
                    <div className="overflow-auto flex-1 custom-scrollbar">
                        {team.roster.filter(p => p.injury.isInjured).length === 0 ? (
                           <div className="flex h-full items-center justify-center text-slate-500 italic p-8">
                               <div className="text-center">
                                   <div className="text-4xl mb-2">🏥</div>
                                   <div>No active injuries. The team is fully healthy.</div>
                               </div>
                           </div>
                        ) : (
                           <table className="w-full text-sm text-left text-slate-300">
                              <TableHeader cols={[
                                  { label: 'Player' },
                                  { label: 'Position' },
                                  { label: 'Diagnosis' },
                                  { label: 'Status' },
                                  { label: 'Est. Return', align: 'text-right' }
                              ]} />
                              <tbody>
                                 {team.roster.filter(p => p.injury.isInjured).map(p => (
                                    <tr key={p.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                                       <td className="px-3 py-3 font-bold text-white">{p.name}</td>
                                       <td className="px-3 py-3 font-mono text-xs text-slate-500">{p.position}</td>
                                       <td className="px-3 py-3 text-red-300">{p.injury.type}</td>
                                       <td className="px-3 py-3">
                                            <span className="bg-red-900/40 text-red-200 border border-red-900 px-2 py-1 rounded text-xs font-bold uppercase">
                                                {p.injury.severity}
                                            </span>
                                       </td>
                                       <td className="px-3 py-3 text-right font-mono text-white">{p.injury.daysRemaining} days</td>
                                    </tr>
                                 ))}
                              </tbody>
                           </table>
                        )}
                    </div>
                 </div>
              )}
            </div>
          )}

          {/* Scouting Report Modal */}
          {scoutingReport && (
            <div className="absolute bottom-6 left-6 right-6 bg-slate-800 rounded-xl border border-emerald-500/50 shadow-2xl p-6 animate-in slide-in-from-bottom-10 fade-in duration-300 z-50 max-h-[60vh] overflow-auto custom-scrollbar">
               <div className="flex justify-between items-start mb-2">
                   <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                        <h4 className="font-bold text-emerald-400 uppercase tracking-wide text-xs">Scouting Department Report</h4>
                   </div>
                   <button onClick={() => setScoutingReport(null)} className="text-slate-500 hover:text-white transition">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                   </button>
               </div>
               <p className="text-slate-200 text-lg leading-relaxed font-serif italic pl-4 border-l-2 border-emerald-500/30 mb-4">
                  "{scoutingReport.report}"
               </p>
               
               {/* Pitch Repertoire for Pitchers */}
               {scoutingReport.player.position === 'P' && scoutingReport.player.pitchRepertoire && scoutingReport.player.pitchRepertoire.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-700">
                     <h5 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-3">Pitch Arsenal (MLB Data)</h5>
                     <div className="grid grid-cols-2 gap-2">
                        {scoutingReport.player.pitchRepertoire.map((pitch, idx) => (
                           <div key={idx} className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/50">
                              <div className="flex justify-between items-center">
                                 <span className="font-bold text-white text-sm">{pitch.type}</span>
                                 <span className="text-emerald-400 font-mono text-xs">{pitch.usage.toFixed(1)}%</span>
                              </div>
                              <div className="text-slate-400 text-xs mt-1">
                                 <span className="font-mono">{pitch.speed.toFixed(1)} mph</span>
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
               )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
