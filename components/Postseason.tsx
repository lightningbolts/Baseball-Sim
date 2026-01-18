import React from 'react';
import { PostseasonSeries, Team } from '../types';

interface PostseasonProps {
  bracket: PostseasonSeries[];
  teams: Team[];
  round: string;
}

export const Postseason: React.FC<PostseasonProps> = ({ bracket, teams, round }) => {
  const getTeam = (id: string) => teams.find(t => t.id === id);

  const renderSeries = (series: PostseasonSeries) => {
    const t1 = getTeam(series.team1Id);
    const t2 = getTeam(series.team2Id);
    if (!t1 || !t2) return null;

    return (
      <div key={series.id} className="bg-slate-800 rounded-lg p-3 border border-slate-700 w-64 mb-4">
         <div className="text-xs text-slate-500 uppercase font-bold mb-2 text-center">{series.round}</div>
         <div className="flex justify-between items-center mb-1">
            <span className={`font-bold ${series.winnerId === t1.id ? 'text-emerald-400' : 'text-white'}`}>{t1.abbreviation}</span>
            <span className="text-white bg-slate-700 px-2 rounded">{series.wins1}</span>
         </div>
         <div className="flex justify-between items-center">
            <span className={`font-bold ${series.winnerId === t2.id ? 'text-emerald-400' : 'text-white'}`}>{t2.abbreviation}</span>
            <span className="text-white bg-slate-700 px-2 rounded">{series.wins2}</span>
         </div>
      </div>
    );
  };

  const rounds = ['Wild Card', 'DS', 'CS', 'World Series'];

  return (
    <div className="w-full overflow-x-auto">
      <h2 className="text-3xl font-bold text-center mb-8 text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500 uppercase tracking-widest">
        2025 Postseason: {round}
      </h2>
      <div className="flex gap-8 justify-center min-w-[1000px]">
         {rounds.map(r => (
            <div key={r} className="flex flex-col justify-center space-y-4">
               {bracket.filter(s => s.round === r).map(renderSeries)}
            </div>
         ))}
      </div>
    </div>
  );
};