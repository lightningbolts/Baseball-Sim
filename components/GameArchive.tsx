
import React, { useState } from 'react';
import { GameResult, Team, BoxScorePlayer } from '../types';

interface GameArchiveProps {
  schedule: GameResult[];
  teams: Team[];
}

export const GameArchive: React.FC<GameArchiveProps> = ({ schedule, teams }) => {
  const [selectedGame, setSelectedGame] = useState<GameResult | null>(null);
  const [filterTeam, setFilterTeam] = useState<string>('all');
  const [page, setPage] = useState(0);
  const [activeTab, setActiveTab] = useState<'log' | 'box'>('box');
  const [expandedEventIndex, setExpandedEventIndex] = useState<number | null>(null);
  const ITEMS_PER_PAGE = 20;

  const playedGames = schedule
     .filter(g => g.played)
     .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  const filteredGames = filterTeam === 'all' 
    ? playedGames 
    : playedGames.filter(g => g.homeTeamId === filterTeam || g.awayTeamId === filterTeam);

  const paginatedGames = filteredGames.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);

  const getTeam = (id: string) => teams.find(t => t.id === id);

  const toggleEvent = (idx: number) => {
      setExpandedEventIndex(expandedEventIndex === idx ? null : idx);
  };

  const renderBoxTable = (players: BoxScorePlayer[], isPitching: boolean) => (
      <table className="w-full text-xs text-left text-slate-300">
          <thead className="bg-slate-800 text-slate-400 uppercase">
              <tr>
                  <th className="px-2 py-1 w-1/3">Name</th>
                  {isPitching ? (
                      <>
                          <th className="px-2 py-1 text-center">IP</th>
                          <th className="px-2 py-1 text-center">H</th>
                          <th className="px-2 py-1 text-center">R</th>
                          <th className="px-2 py-1 text-center">ER</th>
                          <th className="px-2 py-1 text-center">BB</th>
                          <th className="px-2 py-1 text-center">K</th>
                          <th className="px-2 py-1 text-center">PC-S</th>
                      </>
                  ) : (
                      <>
                          <th className="px-2 py-1 text-center">AB</th>
                          <th className="px-2 py-1 text-center">R</th>
                          <th className="px-2 py-1 text-center">H</th>
                          <th className="px-2 py-1 text-center">RBI</th>
                          <th className="px-2 py-1 text-center">BB</th>
                          <th className="px-2 py-1 text-center">SO</th>
                          <th className="px-2 py-1 text-center">AVG</th>
                      </>
                  )}
              </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
              {players.map(p => {
                  const s = p.stats;
                  return (
                      <tr key={p.id}>
                          <td className="px-2 py-1 font-medium text-white truncate max-w-[100px]">{p.name} <span className="text-slate-500 text-[10px]">{p.pos}</span></td>
                          {isPitching ? (
                              <>
                                  <td className="px-2 py-1 text-center">{(s.outsPitched / 3).toFixed(1)}</td>
                                  <td className="px-2 py-1 text-center">{s.p_h}</td>
                                  <td className="px-2 py-1 text-center">{s.p_r}</td> 
                                  <td className="px-2 py-1 text-center">{s.er}</td>
                                  <td className="px-2 py-1 text-center">{s.p_bb}</td>
                                  <td className="px-2 py-1 text-center">{s.p_so}</td>
                                  <td className="px-2 py-1 text-center">{s.pitchesThrown}-{s.strikes}</td>
                              </>
                          ) : (
                              <>
                                  <td className="px-2 py-1 text-center">{s.ab}</td>
                                  <td className="px-2 py-1 text-center">{s.r}</td>
                                  <td className="px-2 py-1 text-center font-bold text-white">{s.h}</td>
                                  <td className="px-2 py-1 text-center">{s.rbi}</td>
                                  <td className="px-2 py-1 text-center">{s.bb}</td>
                                  <td className="px-2 py-1 text-center">{s.so}</td>
                                  <td className="px-2 py-1 text-center text-slate-500">-</td>
                              </>
                          )}
                      </tr>
                  );
              })}
          </tbody>
      </table>
  );

  return (
    <div className="bg-slate-900 rounded-xl shadow-xl border border-slate-800 p-6">
       <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Game Archive</h2>
          <select 
            className="bg-slate-800 border border-slate-700 text-white text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block p-2.5"
            value={filterTeam}
            onChange={(e) => { setFilterTeam(e.target.value); setPage(0); }}
          >
             <option value="all">All Teams</option>
             {teams.map(t => <option key={t.id} value={t.id}>{t.city} {t.name}</option>)}
          </select>
       </div>

       <div className="space-y-2 mb-4">
          {paginatedGames.length === 0 ? (
              <div className="text-center text-slate-500 py-12">No games played yet.</div>
          ) : (
              paginatedGames.map(game => {
                  const home = getTeam(game.homeTeamId);
                  const away = getTeam(game.awayTeamId);
                  const date = new Date(game.date).toLocaleDateString();
                  
                  return (
                      <div 
                        key={game.id} 
                        onClick={() => { setSelectedGame(game); setExpandedEventIndex(null); setActiveTab('box'); }}
                        className="bg-slate-800/50 hover:bg-slate-700 p-4 rounded-lg cursor-pointer border border-transparent hover:border-emerald-500/50 transition flex justify-between items-center"
                      >
                         <div className="flex items-center gap-4 w-1/3">
                            <span className="text-slate-500 text-xs font-mono">{date}</span>
                            <span className="text-slate-400 text-xs">{game.stadium}</span>
                         </div>
                         <div className="flex-1 flex justify-center items-center gap-4">
                             <div className={`font-bold text-lg ${game.winnerId === away?.id ? 'text-white' : 'text-slate-400'}`}>
                                {away?.abbreviation} <span className="ml-2 text-2xl">{game.awayScore}</span>
                             </div>
                             <span className="text-slate-600">@</span>
                             <div className={`font-bold text-lg ${game.winnerId === home?.id ? 'text-white' : 'text-slate-400'}`}>
                                <span className="mr-2 text-2xl">{game.homeScore}</span> {home?.abbreviation}
                             </div>
                         </div>
                         <div className="w-1/3 text-right">
                            <span className="text-emerald-500 text-xs font-bold uppercase tracking-wider">Final {game.innings !== 9 && `(${game.innings})`}</span>
                         </div>
                      </div>
                  )
              })
          )}
       </div>

       {filteredGames.length > ITEMS_PER_PAGE && (
          <div className="flex justify-center gap-2">
             <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="px-3 py-1 bg-slate-800 rounded text-sm disabled:opacity-50">Prev</button>
             <span className="text-slate-400 text-sm py-1">Page {page + 1} of {Math.ceil(filteredGames.length / ITEMS_PER_PAGE)}</span>
             <button disabled={(page + 1) * ITEMS_PER_PAGE >= filteredGames.length} onClick={() => setPage(p => p + 1)} className="px-3 py-1 bg-slate-800 rounded text-sm disabled:opacity-50">Next</button>
          </div>
       )}

       {selectedGame && (
         <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 w-full max-w-4xl max-h-[90vh] rounded-xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col">
               <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
                  <div className="flex gap-4">
                      <button onClick={() => setActiveTab('box')} className={`px-4 py-1 rounded font-bold text-sm ${activeTab === 'box' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}>Box Score</button>
                      <button onClick={() => setActiveTab('log')} className={`px-4 py-1 rounded font-bold text-sm ${activeTab === 'log' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}>Play-by-Play</button>
                  </div>
                  <button onClick={() => setSelectedGame(null)} className="text-slate-400 hover:text-white text-xl">&times;</button>
               </div>
               
               <div className="p-4 overflow-y-auto custom-scrollbar bg-slate-900 flex-1">
                  {activeTab === 'box' && selectedGame.boxScore ? (
                      <>
                        {/* Line Score */}
                        {selectedGame.boxScore.lineScore && (
                            <div className="mb-6 bg-slate-800 rounded-lg p-4 overflow-x-auto">
                                <table className="w-full text-center text-sm font-mono text-slate-300">
                                    <thead className="text-slate-500 border-b border-slate-700">
                                        <tr>
                                            <th className="px-2 py-1 text-left">Team</th>
                                            {selectedGame.boxScore.lineScore.innings.map(i => <th key={i.inning} className="px-2 py-1">{i.inning}</th>)}
                                            <th className="px-2 py-1 text-white font-bold bg-slate-700/50">R</th>
                                            <th className="px-2 py-1 bg-slate-700/50">H</th>
                                            <th className="px-2 py-1 bg-slate-700/50">E</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr className="border-b border-slate-700/50">
                                            <td className="px-2 py-2 text-left font-bold text-white">{getTeam(selectedGame.awayTeamId)?.abbreviation}</td>
                                            {selectedGame.boxScore.lineScore.innings.map(i => <td key={i.inning} className="px-2 py-2">{i.away}</td>)}
                                            <td className="px-2 py-2 font-bold text-white bg-slate-700/50">{selectedGame.boxScore.lineScore.awayTotal}</td>
                                            <td className="px-2 py-2 bg-slate-700/50">{selectedGame.boxScore.lineScore.awayHits}</td>
                                            <td className="px-2 py-2 bg-slate-700/50">{selectedGame.boxScore.lineScore.awayErrors}</td>
                                        </tr>
                                        <tr>
                                            <td className="px-2 py-2 text-left font-bold text-white">{getTeam(selectedGame.homeTeamId)?.abbreviation}</td>
                                            {selectedGame.boxScore.lineScore.innings.map(i => <td key={i.inning} className="px-2 py-2">{i.home}</td>)}
                                            <td className="px-2 py-2 font-bold text-white bg-slate-700/50">{selectedGame.boxScore.lineScore.homeTotal}</td>
                                            <td className="px-2 py-2 bg-slate-700/50">{selectedGame.boxScore.lineScore.homeHits}</td>
                                            <td className="px-2 py-2 bg-slate-700/50">{selectedGame.boxScore.lineScore.homeErrors}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Away Team */}
                            <div>
                                <div className="bg-slate-800 px-3 py-2 rounded-t-lg border-b border-slate-700 font-bold text-emerald-400 flex justify-between">
                                    <span>{getTeam(selectedGame.awayTeamId)?.name}</span>
                                    <span className="text-white">{selectedGame.awayScore}</span>
                                </div>
                                <div className="bg-slate-800/50 rounded-b-lg p-2 mb-4">
                                    {renderBoxTable(selectedGame.boxScore.awayLineup, false)}
                                </div>
                                <div className="bg-slate-800/50 rounded-lg p-2">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Pitching</h4>
                                    {renderBoxTable(selectedGame.boxScore.awayPitchers, true)}
                                </div>
                            </div>

                            {/* Home Team */}
                            <div>
                                <div className="bg-slate-800 px-3 py-2 rounded-t-lg border-b border-slate-700 font-bold text-emerald-400 flex justify-between">
                                    <span>{getTeam(selectedGame.homeTeamId)?.name}</span>
                                    <span className="text-white">{selectedGame.homeScore}</span>
                                </div>
                                <div className="bg-slate-800/50 rounded-b-lg p-2 mb-4">
                                    {renderBoxTable(selectedGame.boxScore.homeLineup, false)}
                                </div>
                                <div className="bg-slate-800/50 rounded-lg p-2">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Pitching</h4>
                                    {renderBoxTable(selectedGame.boxScore.homePitchers, true)}
                                </div>
                            </div>
                        </div>
                      </>
                  ) : activeTab === 'box' ? (
                      <div className="text-center text-slate-500 mt-10">Box score not available for this game.</div>
                  ) : (
                      <div className="space-y-4">
                         {Array.from({ length: selectedGame.innings }).map((_, i) => {
                            const inning = i + 1;
                            const events = selectedGame.log.filter(l => l.inning === inning);
                            if (events.length === 0) return null;
                            
                            return (
                               <div key={inning} className="border border-slate-800 rounded-lg overflow-hidden">
                                  <div className="bg-slate-800 px-3 py-1 text-xs font-bold text-slate-400 uppercase">Inning {inning}</div>
                                  <div className="divide-y divide-slate-800/50">
                                     {events.map((ev, idx) => {
                                        const eventKey = `${inning}-${idx}`;
                                        const globalIdx = selectedGame.log.indexOf(ev);
                                        const isExpanded = expandedEventIndex === globalIdx;
                                        const hasPitches = ev.pitches && ev.pitches.length > 0;

                                        return (
                                        <div key={eventKey}>
                                            <div 
                                                onClick={() => hasPitches && toggleEvent(globalIdx)}
                                                className={`px-4 py-2 text-sm flex gap-3 ${ev.type === 'run' ? 'bg-emerald-900/10' : ''} ${ev.type === 'injury' ? 'bg-red-900/10' : ''} ${hasPitches ? 'cursor-pointer hover:bg-slate-800 transition' : ''}`}
                                            >
                                                <span className={`font-mono text-xs w-8 ${ev.isTop ? 'text-cyan-400' : 'text-orange-400'}`}>{ev.isTop ? 'TOP' : 'BOT'}</span>
                                                <span className={`flex-1 ${ev.type === 'run' ? 'text-emerald-400 font-bold' : ev.type === 'injury' ? 'text-red-400 font-bold' : 'text-slate-300'}`}>
                                                    {ev.description}
                                                </span>
                                                {hasPitches && (
                                                    <span className="text-xs text-slate-500 font-mono self-center">
                                                        {isExpanded ? '▲' : '▼'} {ev.pitches?.length}P
                                                    </span>
                                                )}
                                            </div>
                                            {isExpanded && hasPitches && (
                                                <div className="bg-slate-950/50 px-12 py-2 text-xs border-t border-slate-800/50">
                                                    <div className="space-y-1">
                                                        {ev.pitches?.map((pitch, pIdx) => (
                                                            <div key={pIdx} className="flex items-center gap-3 font-mono">
                                                                <span className="text-slate-500 w-4">{pitch.number}.</span>
                                                                <span className="text-emerald-500 w-8">{pitch.count}</span>
                                                                <span className="text-slate-300 flex-1">{pitch.description}</span>
                                                                <span className={`w-24 text-right ${pitch.result.includes('Strike') ? 'text-red-400' : pitch.result === 'Ball' ? 'text-green-400' : 'text-blue-400'}`}>
                                                                    {pitch.result}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                     )})}
                                  </div>
                               </div>
                            )
                         })}
                      </div>
                  )}
               </div>
            </div>
         </div>
       )}
    </div>
  );
};
