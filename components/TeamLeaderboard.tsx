import React, { useState } from "react";
import { Team, Position } from "../types";

interface TeamLeaderboardProps {
  teams: Team[];
}

type TeamSortKey =
  | "wins"
  | "losses"
  | "runDiff"
  | "avg"
  | "ops"
  | "hr"
  | "sb"
  | "era"
  | "whip"
  | "runs";

const formatPct = (value: number) => value.toFixed(3).replace("0.", ".");

export const TeamLeaderboard: React.FC<TeamLeaderboardProps> = ({ teams }) => {
  const [sortKey, setSortKey] = useState<TeamSortKey>("wins");
  const [ascending, setAscending] = useState(false);

  const rows = teams.map(team => {
    const hitters = team.roster.filter(p => p.position !== Position.P || p.isTwoWay);
    const pitchers = team.roster.filter(p => p.position === Position.P || p.isTwoWay);

    const totals = hitters.reduce(
      (acc, p) => {
        acc.ab += p.statsCounters.ab;
        acc.h += p.statsCounters.h;
        acc.bb += p.statsCounters.bb;
        acc.hbp += p.statsCounters.hbp;
        acc.sf += p.statsCounters.sf;
        acc.tb += p.statsCounters.tb;
        acc.hr += p.statsCounters.hr;
        acc.sb += p.statsCounters.sb;
        return acc;
      },
      { ab: 0, h: 0, bb: 0, hbp: 0, sf: 0, tb: 0, hr: 0, sb: 0 }
    );

    const pitchingTotals = pitchers.reduce(
      (acc, p) => {
        acc.outs += p.statsCounters.outsPitched;
        acc.er += p.statsCounters.er;
        acc.h += p.statsCounters.p_h;
        acc.bb += p.statsCounters.p_bb;
        return acc;
      },
      { outs: 0, er: 0, h: 0, bb: 0 }
    );

    const pa = totals.ab + totals.bb + totals.hbp + totals.sf;
    const avg = totals.ab > 0 ? totals.h / totals.ab : 0;
    const obp = pa > 0 ? (totals.h + totals.bb + totals.hbp) / pa : 0;
    const slg = totals.ab > 0 ? totals.tb / totals.ab : 0;
    const ops = obp + slg;

    const ip = pitchingTotals.outs / 3;
    const era = ip > 0 ? (pitchingTotals.er * 9) / ip : 0;
    const whip = ip > 0 ? (pitchingTotals.bb + pitchingTotals.h) / ip : 0;

    return {
      team,
      wins: team.wins,
      losses: team.losses,
      runDiff: team.runsScored - team.runsAllowed,
      runs: team.runsScored,
      avg,
      ops,
      hr: totals.hr,
      sb: totals.sb,
      era,
      whip
    };
  });

  const sorted = [...rows].sort((a, b) => {
    const valA = a[sortKey];
    const valB = b[sortKey];
    const lowerIsBetter = ["era", "whip", "losses"].includes(sortKey);

    if (lowerIsBetter) {
      return ascending ? valA - valB : valB - valA;
    }

    return ascending ? valA - valB : valB - valA;
  });

  const handleSort = (key: TeamSortKey) => {
    if (key === sortKey) {
      setAscending(!ascending);
    } else {
      setSortKey(key);
      setAscending(["era", "whip", "losses"].includes(key));
    }
  };

  return (
    <div className="bg-slate-900 rounded-xl shadow-xl border border-slate-800 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">Team Leaderboard</h2>
        <div className="text-xs text-slate-500">Aggregated season totals</div>
      </div>
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-sm text-left text-slate-300">
          <thead className="bg-slate-800 text-slate-400 uppercase font-bold sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="px-4 py-3">Team</th>
              <th className="px-3 py-3 text-right cursor-pointer" onClick={() => handleSort("wins")}>W</th>
              <th className="px-3 py-3 text-right cursor-pointer" onClick={() => handleSort("losses")}>L</th>
              <th className="px-3 py-3 text-right cursor-pointer" onClick={() => handleSort("runDiff")}>Diff</th>
              <th className="px-3 py-3 text-right cursor-pointer" onClick={() => handleSort("runs")}>R</th>
              <th className="px-3 py-3 text-right cursor-pointer" onClick={() => handleSort("avg")}>AVG</th>
              <th className="px-3 py-3 text-right cursor-pointer" onClick={() => handleSort("ops")}>OPS</th>
              <th className="px-3 py-3 text-right cursor-pointer" onClick={() => handleSort("hr")}>HR</th>
              <th className="px-3 py-3 text-right cursor-pointer" onClick={() => handleSort("sb")}>SB</th>
              <th className="px-3 py-3 text-right cursor-pointer" onClick={() => handleSort("era")}>ERA</th>
              <th className="px-3 py-3 text-right cursor-pointer" onClick={() => handleSort("whip")}>WHIP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {sorted.map(row => (
              <tr key={row.team.id} className="hover:bg-slate-800/50">
                <td className="px-4 py-3 font-semibold text-white">{row.team.city} {row.team.name}</td>
                <td className="px-3 py-3 text-right font-mono">{row.wins}</td>
                <td className="px-3 py-3 text-right font-mono">{row.losses}</td>
                <td className={`px-3 py-3 text-right font-mono ${row.runDiff > 0 ? "text-emerald-400" : row.runDiff < 0 ? "text-red-400" : ""}`}>
                  {row.runDiff > 0 ? "+" : ""}{row.runDiff}
                </td>
                <td className="px-3 py-3 text-right font-mono">{row.runs}</td>
                <td className="px-3 py-3 text-right font-mono">{formatPct(row.avg)}</td>
                <td className="px-3 py-3 text-right font-mono">{row.ops.toFixed(3).replace("0.", ".")}</td>
                <td className="px-3 py-3 text-right font-mono">{row.hr}</td>
                <td className="px-3 py-3 text-right font-mono">{row.sb}</td>
                <td className="px-3 py-3 text-right font-mono">{row.era.toFixed(2)}</td>
                <td className="px-3 py-3 text-right font-mono">{row.whip.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
