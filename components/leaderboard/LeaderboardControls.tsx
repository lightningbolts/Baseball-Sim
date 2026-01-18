
import React from 'react';
import { StatCategory } from './utils';

interface LeaderboardControlsProps {
    category: StatCategory;
    setCategory: (c: StatCategory) => void;
    searchTerm: string;
    setSearchTerm: (s: string) => void;
    showAll: boolean;
    setShowAll: (b: boolean) => void;
}

export const LeaderboardControls: React.FC<LeaderboardControlsProps> = ({ 
    category, setCategory, searchTerm, setSearchTerm, showAll, setShowAll 
}) => {
    return (
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <h2 className="text-2xl font-bold text-white">League Leaders</h2>
            
            <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto items-center">
                 <div className="flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-700">
                     <label className="text-sm text-slate-300 font-medium cursor-pointer select-none" htmlFor="showAll">Show Qualified Only</label>
                     <div 
                       onClick={() => setShowAll(!showAll)}
                       className={`w-10 h-5 flex items-center rounded-full p-1 cursor-pointer transition-colors ${!showAll ? 'bg-emerald-500' : 'bg-slate-600'}`}
                     >
                        <div className={`bg-white w-3 h-3 rounded-full shadow-md transform transition-transform ${!showAll ? 'translate-x-5' : ''}`}></div>
                     </div>
                 </div>
    
                 <div className="relative">
                    <input 
                      type="text" 
                      placeholder="Search Player..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="bg-slate-800 border border-slate-700 text-white rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none w-full md:w-64"
                    />
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                 </div>
    
                <div className="flex bg-slate-800 rounded-lg p-1 shrink-0 flex-wrap justify-center shadow-lg border border-slate-700">
                  <button onClick={() => setCategory('batting')} className={`px-3 py-1 rounded text-xs font-bold transition ${category === 'batting' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>Standard</button>
                  <button onClick={() => setCategory('adv_bat')} className={`px-3 py-1 rounded text-xs font-bold transition ${category === 'adv_bat' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>Advanced</button>
                  <button onClick={() => setCategory('statcast_bat')} className={`px-3 py-1 rounded text-xs font-bold transition ${category === 'statcast_bat' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>Statcast</button>
                  <button onClick={() => setCategory('defense')} className={`px-3 py-1 rounded text-xs font-bold transition ${category === 'defense' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>Defense</button>
                  <button onClick={() => setCategory('pitching')} className={`px-3 py-1 rounded text-xs font-bold transition ${category === 'pitching' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>Pitching</button>
                </div>
            </div>
        </div>
    );
};
