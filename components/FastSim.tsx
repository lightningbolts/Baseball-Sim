import React, { useMemo, useState, useEffect } from "react";
import { Team, GameResult } from "../types";
import { runFastSim, FastSimSummary, AwardEntry } from "../services/fastSim";

interface FastSimProps {
  teams: Team[];
  schedule: GameResult[];
  savedResults: FastSimSummary | null;
  onResultsChange: (results: FastSimSummary | null) => void;
}

const formatPct = (value: number) => `${value.toFixed(1)}%`;

const AwardTable = ({ title, entries }: { title: string; entries: AwardEntry[] }) => (
  <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
    <h3 className="text-sm uppercase font-bold text-slate-400 mb-3">{title}</h3>
    <div className="space-y-2">
      {entries.length === 0 && <div className="text-xs text-slate-500">No candidates yet.</div>}
      {entries.map(entry => (
        <div key={entry.playerId} className="flex items-center justify-between text-sm">
          <div>
            <div className="text-slate-200 font-semibold">{entry.name}</div>
            <div className="text-xs text-slate-500">{entry.teamId}</div>
          </div>
          <div className="text-emerald-400 font-mono">{formatPct(entry.probability)}</div>
        </div>
      ))}
    </div>
  </div>
);

export const FastSim: React.FC<FastSimProps> = ({ teams, schedule, savedResults, onResultsChange }) => {
  const [simCount, setSimCount] = useState(2000);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedTeamId, setSelectedTeamId] = useState<string>(teams[0]?.id || "");
  const [freshProjection, setFreshProjection] = useState(false);
  
  // Use saved results from parent - persists across view changes
  const results = savedResults;
  
  // Calculate remaining games to show warning if season is complete
  const remainingGames = schedule.filter(g => !g.played && !g.isPostseason).length;
  const seasonComplete = remainingGames === 0 && schedule.length > 0;

  const runSimulation = async () => {
    if (!teams.every(t => t.isRosterGenerated)) {
      alert("Please initialize all rosters before running fast simulations.");
      return;
    }

    setRunning(true);
    setProgress(0);

    await new Promise(resolve => setTimeout(resolve, 0));
    // Pass freshProjection flag to simulate full season from scratch if enabled
    const summary = runFastSim(teams, schedule, simCount, freshProjection);
    onResultsChange(summary);
    setSelectedTeamId(teams[0]?.id || "");
    setProgress(100);

    setRunning(false);
  };

  const selectedTeamOdds = results?.teamOdds[selectedTeamId];

  const histogramData = useMemo(() => {
    if (!selectedTeamOdds) return [];
    const dist = selectedTeamOdds.winsDist;
    const wins = Object.keys(dist).map(Number);
    const binSize = 5;
    const bins: { label: string; count: number }[] = [];

    if (wins.length === 0) {
      const mean = Math.round(selectedTeamOdds.meanWins);
      return [{ label: `${mean}-${mean}`, count: results?.simulations || 1 }];
    }

    const minWin = Math.min(...wins);
    const maxWin = Math.max(...wins);

    for (let w = minWin; w <= maxWin; w += binSize) {
      let count = 0;
      for (let i = w; i < w + binSize; i++) {
        count += dist[i] || 0;
      }
      bins.push({ label: `${w}-${w + binSize - 1}`, count });
    }

    return bins;
  }, [selectedTeamOdds, results?.simulations]);

  const maxCount = Math.max(1, ...histogramData.map(b => b.count));

  return (
    <div className="space-y-6">
      {/* Warning banner when season is complete */}
      {seasonComplete && (
        <div className="bg-amber-900/30 border border-amber-700 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <span className="text-amber-400 text-xl">⚠️</span>
            <div>
              <h3 className="text-amber-300 font-semibold">Season Complete</h3>
              <p className="text-amber-200/70 text-sm">
                All regular season games have been played. Enable "Fresh Projection" below to simulate a full season from scratch.
              </p>
            </div>
          </div>
        </div>
      )}
      
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white">Fast Simulation Lab</h2>
            <p className="text-sm text-slate-400">
              Run thousands of seasons per second and estimate odds.
              {!freshProjection && remainingGames > 0 && <span className="text-emerald-400 ml-2">({remainingGames} games remaining)</span>}
              {freshProjection && <span className="text-blue-400 ml-2">(Fresh 162-game projection)</span>}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
            {/* Fresh Projection Toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={freshProjection}
                onChange={(e) => setFreshProjection(e.target.checked)}
                className="w-4 h-4 accent-blue-500"
              />
              <span className="text-xs text-slate-400">Fresh Projection</span>
            </label>
            <input
              type="number"
              min={100}
              step={100}
              value={simCount}
              onChange={(e) => setSimCount(Number(e.target.value))}
              className="w-32 bg-slate-950 border border-slate-700 text-slate-200 px-3 py-2 rounded text-sm"
            />
            <button
              onClick={runSimulation}
              disabled={running}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded transition disabled:opacity-50"
            >
              {running ? `Running ${progress}%` : "Run Monte Carlo"}
            </button>
          </div>
        </div>
      </div>

      {results && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm uppercase text-slate-400 font-bold">Team Odds</h3>
                <div className="text-xs text-slate-500">Simulations: {results.simulations}</div>
              </div>
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-sm text-left text-slate-300">
                  <thead className="text-xs uppercase text-slate-500 border-b border-slate-800">
                    <tr>
                      <th className="px-2 py-2">Team</th>
                      <th className="px-2 py-2 text-right">Mean W</th>
                      <th className="px-2 py-2 text-right">Playoffs</th>
                      <th className="px-2 py-2 text-right">Division</th>
                      <th className="px-2 py-2 text-right">Wild Card</th>
                      <th className="px-2 py-2 text-right">Pennant</th>
                      <th className="px-2 py-2 text-right">WS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.values(results.teamOdds)
                      .sort((a, b) => b.meanWins - a.meanWins)
                      .map(team => (
                        <tr key={team.teamId} className="border-b border-slate-800/50">
                          <td className="px-2 py-2 font-semibold text-slate-200">{team.teamName}</td>
                          <td className="px-2 py-2 text-right font-mono">{team.meanWins.toFixed(1)}</td>
                          <td className="px-2 py-2 text-right font-mono text-emerald-400">{formatPct(team.playoffPct)}</td>
                          <td className="px-2 py-2 text-right font-mono">{formatPct(team.divisionPct)}</td>
                          <td className="px-2 py-2 text-right font-mono">{formatPct(team.wildCardPct)}</td>
                          <td className="px-2 py-2 text-right font-mono">{formatPct(team.pennantPct)}</td>
                          <td className="px-2 py-2 text-right font-mono">{formatPct(team.worldSeriesPct)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm uppercase text-slate-400 font-bold">Win Distribution</h3>
                <select
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  className="bg-slate-950 border border-slate-700 text-slate-200 px-2 py-1 rounded text-xs"
                >
                  {teams.map(team => (
                    <option key={team.id} value={team.id}>
                      {team.city} {team.name}
                    </option>
                  ))}
                </select>
              </div>
              {selectedTeamOdds ? (
                histogramData.length > 0 ? (
                  <div className="space-y-3">
                    {/* Fixed-height container with proper responsive min-widths */}
                    <div className="flex items-end gap-[2px] sm:gap-1 overflow-x-auto pb-2" style={{ height: 180, minHeight: 180 }}>
                      {histogramData.map(bin => (
                        <div 
                          key={bin.label} 
                          className="flex flex-col items-center justify-end"
                          style={{ 
                            flex: '1 1 0',
                            minWidth: histogramData.length > 15 ? '12px' : '20px',
                            maxWidth: '50px'
                          }}
                        >
                          <div
                            className="w-full bg-emerald-500/80 rounded-t transition-all duration-200"
                            style={{ 
                              height: `${Math.max(4, (bin.count / maxCount) * 170)}px`,
                              minHeight: '4px'
                            }}
                          ></div>
                        </div>
                      ))}
                    </div>
                    {/* Labels with proper overflow handling */}
                    <div className="flex gap-[2px] sm:gap-1 text-[9px] sm:text-[10px] text-slate-500 overflow-x-auto">
                      {histogramData.map((bin, idx) => (
                        <div 
                          key={bin.label} 
                          className="text-center whitespace-nowrap"
                          style={{ 
                            flex: '1 1 0',
                            minWidth: histogramData.length > 15 ? '12px' : '20px',
                            maxWidth: '50px'
                          }}
                        >
                          {/* Show every label on large screens, every other on small */}
                          <span className="hidden sm:inline">{bin.label}</span>
                          <span className="sm:hidden">{idx % 2 === 0 ? bin.label.split('-')[0] : ''}</span>
                        </div>
                      ))}
                    </div>
                    {/* Stats summary */}
                    <div className="flex justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
                      <span>Mean: <span className="text-emerald-400 font-mono">{selectedTeamOdds.meanWins.toFixed(1)} W</span></span>
                      <span>Simulations: <span className="text-slate-300 font-mono">{results?.simulations.toLocaleString()}</span></span>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-slate-500">Run a simulation to generate a distribution.</div>
                )
              ) : (
                <div className="text-sm text-slate-500">Select a team to view distribution.</div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <AwardTable title="AL MVP Odds" entries={results.awardOdds.mvpAL} />
            <AwardTable title="NL MVP Odds" entries={results.awardOdds.mvpNL} />
            <AwardTable title="AL Cy Young Odds" entries={results.awardOdds.cyAL} />
            <AwardTable title="NL Cy Young Odds" entries={results.awardOdds.cyNL} />
            <AwardTable title="AL Rookie of the Year Odds" entries={results.awardOdds.royAL} />
            <AwardTable title="NL Rookie of the Year Odds" entries={results.awardOdds.royNL} />
          </div>
        </div>
      )}
    </div>
  );
};
