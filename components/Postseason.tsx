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

    const isComplete = !!series.winnerId;

    return (
      <div key={series.id} className={`bg-slate-800 rounded-lg p-2 sm:p-3 border ${isComplete ? 'border-emerald-500/50' : 'border-slate-700'} w-full sm:w-64 mb-3 sm:mb-4`}>
         <div className="text-xs text-slate-500 uppercase font-bold mb-2 text-center">{series.round}</div>
         <div className="flex justify-between items-center mb-1">
            <div className="flex items-center gap-1.5 sm:gap-2">
              {t1.logoUrl && <img src={t1.logoUrl} alt={t1.abbreviation} className="w-4 h-4 sm:w-5 sm:h-5 object-contain" />}
              <span className={`font-bold text-sm sm:text-base ${series.winnerId === t1.id ? 'text-emerald-400' : isComplete ? 'text-slate-500' : 'text-white'}`}>{t1.abbreviation}</span>
            </div>
            <span className={`${series.winnerId === t1.id ? 'bg-emerald-600' : 'bg-slate-700'} text-white px-2 rounded font-mono text-sm`}>{series.wins1}</span>
         </div>
         <div className="flex justify-between items-center">
            <div className="flex items-center gap-1.5 sm:gap-2">
              {t2.logoUrl && <img src={t2.logoUrl} alt={t2.abbreviation} className="w-4 h-4 sm:w-5 sm:h-5 object-contain" />}
              <span className={`font-bold text-sm sm:text-base ${series.winnerId === t2.id ? 'text-emerald-400' : isComplete ? 'text-slate-500' : 'text-white'}`}>{t2.abbreviation}</span>
            </div>
            <span className={`${series.winnerId === t2.id ? 'bg-emerald-600' : 'bg-slate-700'} text-white px-2 rounded font-mono text-sm`}>{series.wins2}</span>
         </div>
         {isComplete && (
            <div className="mt-2 pt-2 border-t border-slate-700 text-center text-xs text-emerald-400 font-semibold">
              {series.winnerId === t1.id ? t1.name : t2.name} Advances
            </div>
         )}
      </div>
    );
  };

  // Show empty placeholders for future rounds
  const renderPlaceholder = (roundName: string) => (
    <div className="bg-slate-800/30 rounded-lg p-2 sm:p-3 border border-slate-700/30 w-full sm:w-64 mb-3 sm:mb-4">
       <div className="text-xs text-slate-600 uppercase font-bold mb-2 text-center">{roundName}</div>
       <div className="flex justify-between items-center mb-1 text-slate-600 text-sm">
          <span>TBD</span>
          <span className="bg-slate-700/50 px-2 rounded">-</span>
       </div>
       <div className="flex justify-between items-center text-slate-600 text-sm">
          <span>TBD</span>
          <span className="bg-slate-700/50 px-2 rounded">-</span>
       </div>
    </div>
  );

  const rounds = ['Wild Card', 'DS', 'CS', 'World Series'];

  return (
    <div className="w-full">
      <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4 sm:mb-8 text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500 uppercase tracking-widest">
        2025 Postseason: {round}
      </h2>
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 sm:gap-8 justify-start sm:justify-center min-w-max px-2 sm:px-0">
           {rounds.map(r => {
              const seriesInRound = bracket.filter(s => s.round === r);
              const expectedCount = r === 'Wild Card' ? 4 : r === 'DS' ? 4 : r === 'CS' ? 2 : 1;
              
              return (
                <div key={r} className="flex flex-col justify-center space-y-3 sm:space-y-4 min-w-[200px] sm:min-w-0">
                  <h3 className="text-center text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">{r}</h3>
                  {seriesInRound.map(renderSeries)}
                  {/* Show placeholders for empty slots */}
                  {Array.from({ length: Math.max(0, expectedCount - seriesInRound.length) }).map((_, i) => (
                    <div key={`placeholder-${i}`}>{renderPlaceholder(r)}</div>
                  ))}
                </div>
              );
           })}
        </div>
      </div>
    </div>
  );
};