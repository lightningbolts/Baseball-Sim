import React, { useState, useEffect } from 'react';
import { PostseasonSeries, Team } from '../types';

interface PostseasonProps {
  bracket: PostseasonSeries[];
  teams: Team[];
  round: string;
  /** If a round just completed, this is the round name */
  completedRound?: string;
  /** Callback to advance to the next round */
  onAdvanceRound?: () => void;
  /** Whether we are currently between rounds (waiting for user to advance) */
  isBetweenRounds?: boolean;
  /** Travel days remaining before next game */
  travelDaysRemaining?: number;
}

export const Postseason: React.FC<PostseasonProps> = ({ 
  bracket, teams, round, completedRound, onAdvanceRound, isBetweenRounds, travelDaysRemaining 
}) => {
  const getTeam = (id: string) => teams.find(t => t.id === id);
  const [showAdvanceAnimation, setShowAdvanceAnimation] = useState(false);

  useEffect(() => {
    if (isBetweenRounds) {
      setShowAdvanceAnimation(true);
    } else {
      setShowAdvanceAnimation(false);
    }
  }, [isBetweenRounds]);

  const roundLabel = (r: string) => {
    if (r === 'Wild Card') return 'Wild Card Series';
    if (r === 'DS') return 'Division Series';
    if (r === 'CS') return 'Championship Series';
    if (r === 'World Series') return 'World Series';
    return r;
  };

  const nextRoundLabel = (r: string) => {
    if (r === 'Wild Card') return 'Division Series';
    if (r === 'DS') return 'Championship Series';
    if (r === 'CS') return 'World Series';
    return '';
  };

  const renderSeriesProgressBar = (wins: number, needed: number, isWinner: boolean) => {
    const dots = [];
    for (let i = 0; i < needed; i++) {
      dots.push(
        <div
          key={i}
          className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
            i < wins
              ? isWinner ? 'bg-emerald-400 shadow-emerald-400/50 shadow-sm' : 'bg-slate-400'
              : 'bg-slate-700'
          }`}
        />
      );
    }
    return <div className="flex gap-1">{dots}</div>;
  };

  const renderSeries = (series: PostseasonSeries) => {
    const t1 = getTeam(series.team1Id);
    const t2 = getTeam(series.team2Id);
    if (!t1 || !t2) return null;

    const isComplete = !!series.winnerId;
    const isActive = !isComplete && series.round === round;
    const gamesPlayed = series.gamesPlayed || 0;
    
    let statusText = '';
    if (isComplete) {
      const winner = series.winnerId === t1.id ? t1 : t2;
      const loserWins = series.winnerId === t1.id ? series.wins2 : series.wins1;
      statusText = `${winner.abbreviation} wins ${series.gamesNeeded}-${loserWins}`;
    } else if (isActive) {
      statusText = series.wins1 === 0 && series.wins2 === 0 ? 'Game 1' : `Game ${gamesPlayed + 1}`;
    }

    return (
      <div 
        key={series.id} 
        className={`rounded-xl p-3 sm:p-4 border-2 w-full sm:w-72 mb-3 sm:mb-4 transition-all duration-500 ${
          isComplete ? 'bg-slate-800/80 border-emerald-500/40' : 
          isActive ? 'bg-slate-800 border-amber-500/60 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/20' : 
          'bg-slate-800/50 border-slate-700/50'
        }`}
      >
        <div className="flex justify-between items-center mb-3">
          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{series.round}</span>
          {statusText && (
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
              isComplete ? 'bg-emerald-900/50 text-emerald-400' : 
              isActive ? 'bg-amber-900/50 text-amber-400 animate-pulse' : 'text-slate-500'
            }`}>
              {statusText}
            </span>
          )}
        </div>

        {/* Team 1 */}
        <div className={`flex items-center justify-between py-1.5 px-2 rounded-lg mb-1 transition-colors ${
          series.winnerId === t1.id ? 'bg-emerald-900/20' : ''
        }`}>
          <div className="flex items-center gap-2">
            {t1.logoUrl && <img src={t1.logoUrl} alt={t1.abbreviation} className="w-5 h-5 sm:w-6 sm:h-6 object-contain" />}
            <span className={`font-bold text-sm sm:text-base ${
              series.winnerId === t1.id ? 'text-emerald-400' : series.winnerId === t2.id ? 'text-slate-500' : 'text-white'
            }`}>{t1.abbreviation}</span>
            <span className="text-xs text-slate-500 font-mono">({t1.wins}-{t1.losses})</span>
          </div>
          <div className="flex items-center gap-3">
            {renderSeriesProgressBar(series.wins1, series.gamesNeeded, series.winnerId === t1.id)}
            <span className={`${
              series.winnerId === t1.id ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300'
            } px-2.5 py-0.5 rounded-md font-mono text-sm font-bold min-w-[28px] text-center`}>{series.wins1}</span>
          </div>
        </div>

        {/* Team 2 */}
        <div className={`flex items-center justify-between py-1.5 px-2 rounded-lg transition-colors ${
          series.winnerId === t2.id ? 'bg-emerald-900/20' : ''
        }`}>
          <div className="flex items-center gap-2">
            {t2.logoUrl && <img src={t2.logoUrl} alt={t2.abbreviation} className="w-5 h-5 sm:w-6 sm:h-6 object-contain" />}
            <span className={`font-bold text-sm sm:text-base ${
              series.winnerId === t2.id ? 'text-emerald-400' : series.winnerId === t1.id ? 'text-slate-500' : 'text-white'
            }`}>{t2.abbreviation}</span>
            <span className="text-xs text-slate-500 font-mono">({t2.wins}-{t2.losses})</span>
          </div>
          <div className="flex items-center gap-3">
            {renderSeriesProgressBar(series.wins2, series.gamesNeeded, series.winnerId === t2.id)}
            <span className={`${
              series.winnerId === t2.id ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300'
            } px-2.5 py-0.5 rounded-md font-mono text-sm font-bold min-w-[28px] text-center`}>{series.wins2}</span>
          </div>
        </div>

        {/* Series result */}
        {isComplete && (
          <div className="mt-2 pt-2 border-t border-slate-700/50">
            <div className="text-center">
              <span className="text-xs font-bold text-emerald-400">
                {series.winnerId === t1.id ? t1.name : t2.name}
              </span>
              <span className="text-xs text-slate-400">
                {series.round === 'World Series' ? ' — World Champions! 🏆' : ' advances →'}
              </span>
            </div>
          </div>
        )}

        {/* Travel day indicator */}
        {isActive && travelDaysRemaining != null && travelDaysRemaining > 0 && (
          <div className="mt-2 pt-2 border-t border-slate-700/50 flex items-center justify-center gap-2">
            <span className="text-xs text-amber-400/80">✈️ Travel Day</span>
            <span className="text-xs text-slate-500">({travelDaysRemaining} day{travelDaysRemaining > 1 ? 's' : ''} remaining)</span>
          </div>
        )}
      </div>
    );
  };

  const renderPlaceholder = (roundName: string) => (
    <div className="rounded-xl p-3 sm:p-4 border-2 border-slate-700/20 border-dashed w-full sm:w-72 mb-3 sm:mb-4 bg-slate-900/20">
      <div className="text-[10px] text-slate-600 uppercase font-bold mb-3 tracking-widest">{roundName}</div>
      <div className="flex justify-between items-center mb-1.5 text-slate-600 text-sm px-2 py-1.5">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-slate-800" />
          <span>TBD</span>
        </div>
        <span className="bg-slate-800/50 px-2.5 py-0.5 rounded-md font-mono">-</span>
      </div>
      <div className="flex justify-between items-center text-slate-600 text-sm px-2 py-1.5">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-slate-800" />
          <span>TBD</span>
        </div>
        <span className="bg-slate-800/50 px-2.5 py-0.5 rounded-md font-mono">-</span>
      </div>
    </div>
  );

  const rounds = ['Wild Card', 'DS', 'CS', 'World Series'];

  return (
    <div className="w-full">
      {/* Grand Header */}
      <div className="text-center mb-6 sm:mb-10">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-500 to-red-600 uppercase tracking-[0.2em] mb-2 drop-shadow-lg">
          2025 Postseason
        </h2>
        <div className="flex items-center justify-center gap-3">
          <div className="h-px w-16 bg-gradient-to-r from-transparent to-amber-500/50" />
          <span className="text-sm font-bold text-amber-400/80 uppercase tracking-widest">
            {roundLabel(round)}
          </span>
          <div className="h-px w-16 bg-gradient-to-l from-transparent to-amber-500/50" />
        </div>
      </div>

      {/* Between-rounds overlay / advance button */}
      {isBetweenRounds && completedRound && onAdvanceRound && (
        <div className={`mb-8 transition-all duration-700 ${showAdvanceAnimation ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="max-w-lg mx-auto bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border-2 border-amber-500/30 p-6 text-center shadow-2xl shadow-amber-500/10">
            <div className="text-4xl mb-3">
              {completedRound === 'World Series' ? '🏆' : '⚾'}
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              {roundLabel(completedRound)} Complete!
            </h3>
            {completedRound !== 'World Series' && (
              <>
                <p className="text-sm text-slate-400 mb-5">
                  The {nextRoundLabel(completedRound)} is about to begin. 
                  Teams are traveling to their next destinations.
                </p>
                <button
                  onClick={onAdvanceRound}
                  className="px-8 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold text-sm uppercase tracking-wider rounded-xl hover:from-amber-400 hover:to-orange-500 transition-all duration-300 shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 hover:scale-105 active:scale-95"
                >
                  Continue to {nextRoundLabel(completedRound)} →
                </button>
              </>
            )}
            {completedRound === 'World Series' && (
              <p className="text-lg text-emerald-400 font-bold">
                The champion has been crowned!
              </p>
            )}
          </div>
        </div>
      )}

      {/* Bracket */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 sm:gap-6 justify-start sm:justify-center min-w-max px-2 sm:px-0">
          {rounds.map(r => {
            const seriesInRound = bracket.filter(s => s.round === r);
            const expectedCount = r === 'Wild Card' ? 4 : r === 'DS' ? 4 : r === 'CS' ? 2 : 1;
            const isCurrentRound = r === round;
            const isPastRound = rounds.indexOf(r) < rounds.indexOf(round);
            
            return (
              <div key={r} className={`flex flex-col justify-center space-y-2 sm:space-y-3 min-w-[220px] sm:min-w-0 transition-opacity duration-500 ${
                isCurrentRound ? 'opacity-100' : isPastRound ? 'opacity-70' : 'opacity-40'
              }`}>
                <h3 className={`text-center text-xs sm:text-sm font-bold uppercase tracking-wider mb-2 px-3 py-1 rounded-full mx-auto ${
                  isCurrentRound 
                    ? 'text-amber-400 bg-amber-900/20 border border-amber-500/30' 
                    : isPastRound 
                      ? 'text-emerald-500 bg-emerald-900/10' 
                      : 'text-slate-500'
                }`}>
                  {r === 'DS' ? 'Division' : r === 'CS' ? 'Championship' : r}
                </h3>
                {seriesInRound.map(renderSeries)}
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