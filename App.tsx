
import React, { useState, useEffect, useRef } from 'react';
import { TEAMS_DATA } from './constants';
import { Team, GameResult, SeasonState, PostseasonSeries, Position } from './types';
import { simulateGame, generateSchedule, progressionSystem } from './services/simulator';
import { parseScheduleCSV } from './services/scheduleData';
import { Standings } from './components/Standings';
import { TeamDetail } from './components/TeamDetail';
import { Postseason } from './components/Postseason';
import { Leaderboard } from './components/Leaderboard';
import { GameArchive } from './components/GameArchive';
import { generateTeamData } from './services/leagueService';

const START_DATE = new Date('2026-03-26T12:00:00');

const App = () => {
  const [season, setSeason] = useState<SeasonState>({
    teams: TEAMS_DATA.map(t => ({ 
      ...t, 
      roster: [], 
      staff: [],
      frontOffice: { gmName: 'TBD', strategy: 'Traditional', budget: 100 },
      wins: 0, 
      losses: 0, 
      runsScored: 0, 
      runsAllowed: 0, 
      isRosterGenerated: false 
    })),
    schedule: [], 
    date: START_DATE,
    phase: 'Regular Season',
    isPlaying: false,
    postseason: null
  });

  const [view, setView] = useState<'league' | 'leaderboard' | 'archive'>('league');
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [simSpeed, setSimSpeed] = useState(500); 
  const [autoInit, setAutoInit] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (season.schedule.length === 0 && season.phase === 'Regular Season') {
       // Attempt to load from CSV
       const realSchedule = parseScheduleCSV();
       if (realSchedule.length > 0) {
           setSeason(prev => ({ ...prev, schedule: realSchedule }));
       } else {
           // Fallback if parsing fails or data missing
           const initialSchedule = generateSchedule(season.teams, START_DATE);
           setSeason(prev => ({ ...prev, schedule: initialSchedule }));
       }
    }
  }, []);

  const handleTeamUpdate = (updatedTeam: Team) => {
    setSeason(prev => ({
      ...prev,
      teams: prev.teams.map(t => t.id === updatedTeam.id ? updatedTeam : t)
    }));
    if (selectedTeam?.id === updatedTeam.id) setSelectedTeam(updatedTeam);
  };

  const initAllTeams = async () => {
    setAutoInit(true);
    const updatedTeams = [...season.teams];
    for (let i = 0; i < updatedTeams.length; i++) {
        if (!updatedTeams[i].isRosterGenerated) {
           try {
             const data = await generateTeamData(`${updatedTeams[i].city} ${updatedTeams[i].name}`);
             updatedTeams[i] = { ...updatedTeams[i], ...data, isRosterGenerated: true };
             setSeason(prev => ({ ...prev, teams: [...updatedTeams] }));
           } catch (e) {
             console.error(`Failed to init ${updatedTeams[i].name}`, e);
           }
           await new Promise(r => setTimeout(r, 200));
        }
    }
    setAutoInit(false);
  };

  const toggleSim = () => {
      if (!season.teams.every(t => t.isRosterGenerated)) {
          alert("Please Initialize All Rosters before simulating to ensure accurate results.");
          return;
      }
      setSeason(prev => ({...prev, isPlaying: !prev.isPlaying}));
  };

  const handleSaveData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(season));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "grand_slam_data.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleLoadData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (event.target.files && event.target.files[0]) {
        fileReader.readAsText(event.target.files[0], "UTF-8");
        fileReader.onload = (e) => {
            if (e.target?.result) {
                try {
                    const parsedData = JSON.parse(e.target.result as string);
                    if (parsedData.teams && parsedData.date) {
                        setSeason({
                            ...parsedData,
                            date: new Date(parsedData.date),
                            isPlaying: false 
                        });
                        alert("Season data loaded successfully!");
                    } else {
                        alert("Invalid file format.");
                    }
                } catch (error) {
                    console.error("Error parsing JSON:", error);
                    alert("Error parsing file.");
                }
            }
        };
    }
  };

  const triggerPostseason = (teams: Team[]) => {
     const alTeams = teams.filter(t => t.league === 'AL').sort((a,b) => b.wins - a.wins);
     const nlTeams = teams.filter(t => t.league === 'NL').sort((a,b) => b.wins - a.wins);
     
     const alSeeds = alTeams.slice(0, 6);
     const nlSeeds = nlTeams.slice(0, 6);

     const bracket: PostseasonSeries[] = [];
     
     [alSeeds, nlSeeds].forEach(seeds => {
         bracket.push({ id: `wc_${seeds[2].id}_${seeds[5].id}`, round: 'Wild Card', team1Id: seeds[2].id, team2Id: seeds[5].id, wins1: 0, wins2: 0, gamesNeeded: 2 });
         bracket.push({ id: `wc_${seeds[3].id}_${seeds[4].id}`, round: 'Wild Card', team1Id: seeds[3].id, team2Id: seeds[4].id, wins1: 0, wins2: 0, gamesNeeded: 2 });
     });

     setSeason(prev => ({
        ...prev,
        phase: 'Postseason',
        postseason: {
           bracket,
           round: 'Wild Card'
        }
     }));
  };

  const simulateDay = () => {
    if (season.phase === 'Regular Season') {
        const todaysGames = season.schedule.filter(g => 
            !g.played && new Date(g.date) <= season.date
        );

        const updatedTeams = [...season.teams];
        
        // Recover Rest
        updatedTeams.forEach(t => {
            t.roster.forEach(p => {
                if (p.position === Position.P) {
                    p.daysRest = Math.min(5, p.daysRest + 1);
                }
            });
        });

        // Check for End of Regular Season
        const gamesRemaining = season.schedule.filter(g => !g.played).length;

        if (todaysGames.length === 0) {
            const nextDate = new Date(season.date);
            nextDate.setDate(nextDate.getDate() + 1);
            
            // If no games today AND no games left, trigger postseason
            if (gamesRemaining === 0) {
                triggerPostseason(season.teams);
                return;
            }

            setSeason(prev => ({ ...prev, date: nextDate, teams: updatedTeams }));
            return;
        }

        const results: GameResult[] = [];

        todaysGames.forEach(game => {
          const homeIdx = updatedTeams.findIndex(t => t.id === game.homeTeamId);
          const awayIdx = updatedTeams.findIndex(t => t.id === game.awayTeamId);
          const home = updatedTeams[homeIdx];
          const away = updatedTeams[awayIdx];

          const result = simulateGame(home, away, season.date);
          const finalResult = { ...game, ...result, id: game.id, played: true };
          results.push(finalResult);
          
          result.log.forEach(event => {
             if (event.type === 'injury' && event.injured) {
                 const injData = event.injured;
                 const tIdx = updatedTeams.findIndex(t => t.id === (home.roster.some(p => p.id === injData.player.id) ? home.id : away.id));
                 if (tIdx > -1) {
                    const pIdx = updatedTeams[tIdx].roster.findIndex(p => p.id === injData.player.id);
                    if (pIdx > -1) {
                        updatedTeams[tIdx].roster[pIdx].injury = {
                            isInjured: true,
                            type: injData.type,
                            daysRemaining: injData.daysRemaining,
                            severity: injData.severity as any
                        };
                    }
                 }
             }
          });

          // Handle Rest Decrement for players who appeared
          const involvedTeams = [home, away];
          involvedTeams.forEach(t => {
              t.roster.filter(p => p.position === Position.P).forEach(p => {
                   // Logic: If name appears in log (pitcher change or starter info), reset rest
                   const played = result.log.some(l => l.description.includes(p.name));
                   if (played) {
                       p.daysRest = 0;
                   }
              });
          });

          updatedTeams[homeIdx].wins += result.homeScore > result.awayScore ? 1 : 0;
          updatedTeams[homeIdx].losses += result.homeScore < result.awayScore ? 1 : 0;
          updatedTeams[homeIdx].runsScored += result.homeScore;
          updatedTeams[homeIdx].runsAllowed += result.awayScore;

          updatedTeams[awayIdx].wins += result.awayScore > result.homeScore ? 1 : 0;
          updatedTeams[awayIdx].losses += result.awayScore < result.homeScore ? 1 : 0;
          updatedTeams[awayIdx].runsScored += result.awayScore;
          updatedTeams[awayIdx].runsAllowed += result.homeScore;
        });
        
        updatedTeams.forEach(t => {
            t.roster.forEach(p => {
                if (p.injury.isInjured) {
                    p.injury.daysRemaining--;
                    if (p.injury.daysRemaining <= 0) {
                        p.injury.isInjured = false;
                        p.injury.severity = "Day-to-Day";
                    }
                }
            });
        });

        const updatedSchedule = season.schedule.map(g => {
            const playedRes = results.find(r => r.id === g.id);
            return playedRes || g;
        });

        const nextDate = new Date(season.date);
        nextDate.setDate(nextDate.getDate() + 1);

        setSeason(prev => ({
          ...prev,
          teams: updatedTeams,
          schedule: updatedSchedule,
          date: nextDate
        }));

    } else if (season.phase === 'Postseason' && season.postseason) {
        const currentBracket = [...season.postseason.bracket];
        const activeSeries = currentBracket.filter(s => !s.winnerId);

        if (activeSeries.length === 0) {
            const roundOrder = ['Wild Card', 'DS', 'CS', 'World Series'];
            const currIdx = roundOrder.indexOf(season.postseason.round);
            
            if (currIdx === 3) {
                setSeason(prev => ({ ...prev, phase: 'Offseason', isPlaying: false }));
                progressionSystem(season.teams);
                return;
            }

             const nextRound = roundOrder[currIdx + 1];
             alert(`Round ${season.postseason.round} Complete! Moving to ${nextRound}.`);
             setSeason(prev => ({ ...prev, isPlaying: false }));
            return;
        }

        const updatedTeams = [...season.teams];
        
        updatedTeams.forEach(t => t.roster.forEach(p => { if(p.position===Position.P) p.daysRest = Math.min(5, p.daysRest+1); }));

        activeSeries.forEach(series => {
            const home = updatedTeams.find(t => t.id === series.team1Id)!;
            const away = updatedTeams.find(t => t.id === series.team2Id)!;
            
            const result = simulateGame(home, away, season.date, true);
            
            [home, away].forEach(t => t.roster.filter(p=>p.position===Position.P).forEach(p => {
                if (result.log.some(l => l.description.includes(p.name))) p.daysRest = 0;
            }));
            
            if (result.homeScore > result.awayScore) series.wins1++;
            else series.wins2++;

            if (series.wins1 >= series.gamesNeeded) series.winnerId = home.id;
            else if (series.wins2 >= series.gamesNeeded) series.winnerId = away.id;
        });

        const nextDate = new Date(season.date);
        nextDate.setDate(nextDate.getDate() + 1);

        setSeason(prev => ({
            ...prev,
            date: nextDate,
            postseason: {
                ...prev.postseason!,
                bracket: currentBracket
            }
        }));
    }
  };

  useEffect(() => {
    let interval: any;
    if (season.isPlaying) {
      interval = setInterval(simulateDay, simSpeed);
    }
    return () => clearInterval(interval);
  }, [season.isPlaying, simSpeed, season.teams, season.phase, season.date]);

  const formattedDate = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(season.date);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-emerald-500 selection:text-white">
      {/* Navigation */}
      <nav className="bg-slate-900 border-b border-slate-800 sticky top-0 z-30 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500">
                GRAND SLAM SIM
              </span>
              <span className="ml-4 px-3 py-1 text-xs font-mono bg-slate-800 rounded-full border border-slate-700 text-slate-400">
                {season.date.getFullYear()}
              </span>
            </div>
            <div className="flex items-center space-x-6">
                <div className="flex space-x-2 bg-slate-800 rounded-lg p-1">
                    <button onClick={() => setView('league')} className={`px-3 py-1 text-sm font-bold rounded transition ${view === 'league' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>League</button>
                    <button onClick={() => setView('leaderboard')} className={`px-3 py-1 text-sm font-bold rounded transition ${view === 'leaderboard' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>Leaders</button>
                    <button onClick={() => setView('archive')} className={`px-3 py-1 text-sm font-bold rounded transition ${view === 'archive' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>Archive</button>
                </div>
               <div className="text-lg font-mono text-emerald-400 font-bold border-r border-slate-700 pr-4 pl-4">
                  {formattedDate}
               </div>
               <button 
                onClick={toggleSim}
                className={`px-4 py-2 rounded-md font-bold transition ${season.isPlaying ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-emerald-500 hover:bg-emerald-600 text-white'}`}
               >
                 {season.isPlaying ? 'PAUSE' : 'SIMULATE'}
               </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Controls Panel */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-4 gap-4">
             {/* Same Controls as before */}
             <div className="bg-slate-900 p-4 rounded-lg border border-slate-800 shadow-sm">
                <h3 className="text-xs uppercase text-slate-500 font-bold mb-2">Sim Controls</h3>
                <div className="space-y-2">
                    <button onClick={initAllTeams} disabled={autoInit} className="w-full text-xs bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded py-1 transition disabled:opacity-50">
                        {autoInit ? 'Initializing All (MLB API)...' : 'Initialize All Rosters'}
                    </button>
                    
                    <div className="grid grid-cols-2 gap-2">
                         <button onClick={handleSaveData} className="text-xs bg-emerald-800 hover:bg-emerald-700 text-emerald-100 border border-emerald-600 rounded py-1 transition">
                             Save JSON
                         </button>
                         <button onClick={() => fileInputRef.current?.click()} className="text-xs bg-cyan-800 hover:bg-cyan-700 text-cyan-100 border border-cyan-600 rounded py-1 transition">
                             Load JSON
                         </button>
                         <input type="file" ref={fileInputRef} onChange={handleLoadData} accept=".json" className="hidden" />
                    </div>

                    <div className="pt-2">
                         <label className="text-xs text-slate-500 block mb-1">Sim Speed</label>
                         <input 
                          type="range" 
                          min="100" 
                          max="2000" 
                          step="100"
                          className="w-full accent-emerald-500 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                          value={simSpeed}
                          onChange={(e) => setSimSpeed(Number(e.target.value))}
                        />
                        <div className="flex justify-between text-xs text-slate-400"><span>Fast</span><span>Slow</span></div>
                    </div>
                </div>
             </div>

             <div className="bg-slate-900 p-4 rounded-lg border border-slate-800 shadow-sm md:col-span-3">
               <h3 className="text-xs uppercase text-slate-500 font-bold mb-2">Live Ticker</h3>
               <div className="h-28 overflow-y-auto pr-2 text-sm text-slate-300 font-mono space-y-1 custom-scrollbar">
                  {season.schedule.filter(g => g.played).slice(-5).reverse().map(game => {
                    const home = season.teams.find(t => t.id === game.homeTeamId);
                    const away = season.teams.find(t => t.id === game.awayTeamId);
                    const injuries = game.log.filter(l => l.type === 'injury').map(l => (l as any).injured.player.name).join(", ");
                    
                    return (
                        <div key={game.id} className="border-b border-slate-800 pb-1 last:border-0 flex justify-between items-center">
                           <span>
                             <span className="text-emerald-400 font-bold">FINAL:</span> {away?.abbreviation} {game.awayScore} - {home?.abbreviation} {game.homeScore} 
                           </span>
                           {injuries && <span className="text-red-400 text-xs px-2 py-0.5 bg-red-900/20 rounded">INJ: {injuries}</span>}
                        </div>
                    )
                  })}
                  {season.schedule.filter(g => g.played).length === 0 && <span className="italic opacity-50 pt-8 block text-center">Ready for First Pitch...</span>}
               </div>
             </div>
        </div>

        {/* View Routing */}
        {view === 'leaderboard' ? (
            <Leaderboard teams={season.teams} />
        ) : view === 'archive' ? (
            <GameArchive schedule={season.schedule} teams={season.teams} />
        ) : (
            <>
                {/* Postseason Bracket View */}
                {season.phase === 'Postseason' && season.postseason && (
                    <div className="mb-12">
                        <Postseason bracket={season.postseason.bracket} teams={season.teams} round={season.postseason.round} />
                    </div>
                )}

                {/* Always Show Standings if 'League' is selected */}
                <div className="grid grid-cols-1 gap-12 mb-12 animate-in fade-in slide-in-from-bottom-4">
                    <Standings teams={season.teams} league="AL" />
                    <Standings teams={season.teams} league="NL" />
                </div>
                
                <h2 className="text-2xl font-bold text-white border-b border-slate-700 pb-2 mb-6">League Franchises</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 animate-in fade-in slide-in-from-bottom-8">
                    {season.teams.map(team => (
                        <div 
                            key={team.id}
                            onClick={() => setSelectedTeam(team)}
                            className="cursor-pointer group relative bg-slate-800 rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition transform hover:-translate-y-1 border border-slate-700 hover:border-emerald-500/50"
                        >
                            <div className="h-2 w-full" style={{ background: `linear-gradient(to right, ${team.primaryColor}, ${team.secondaryColor})` }}></div>
                            <div className="p-4 flex flex-col items-center">
                                <div className="text-3xl font-black text-white/10 group-hover:text-white/20 absolute top-4 right-4 transition">{team.abbreviation}</div>
                                <div className="w-12 h-12 rounded-full mb-3 flex items-center justify-center text-xl font-bold text-white shadow-inner" style={{backgroundColor: team.primaryColor}}>
                                    {team.abbreviation[0]}
                                </div>
                                <h3 className="font-bold text-white text-center">{team.city}</h3>
                                <p className="text-xs text-slate-400">{team.name}</p>
                                <div className="mt-3 flex gap-2 text-xs font-mono">
                                    <span className="text-green-400">{team.wins}W</span>
                                    <span className="text-red-400">{team.losses}L</span>
                                </div>
                                {!team.isRosterGenerated && (
                                    <span className="absolute bottom-2 right-2 flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </>
        )}
      </main>

      {selectedTeam && (
        <TeamDetail 
          team={selectedTeam} 
          onUpdateTeam={handleTeamUpdate} 
          onClose={() => setSelectedTeam(null)} 
        />
      )}

      <footer className="bg-slate-900 border-t border-slate-800 mt-12 py-8 text-center text-slate-500 text-sm">
        <p>Built with React, Tailwind & MLB API</p>
      </footer>
    </div>
  );
};

export default App;
