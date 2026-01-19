import { Team, GameResult } from "../types";
import { TEAMS_DATA } from "../constants";
import generatedSchedule from "./schedule.json";

/**
 * Loads the actual 2026 MLB schedule from schedule.json
 * This JSON file is pre-generated from real MLB schedule data
 */
export const parseScheduleCSV = (): GameResult[] => {
    // Use the imported schedule.json directly - this contains the real 2026 MLB schedule
    if (generatedSchedule && Array.isArray(generatedSchedule) && generatedSchedule.length > 0) {
        // Filter to regular season games only (starts March 25, 2026)
        const regularSeasonGames = (generatedSchedule as GameResult[])
            .map(game => {
                const d = new Date(game.date);
                const normalized = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0));
                return { ...game, date: normalized.toISOString() };
            })
            .filter(game => {
                const gameDate = new Date(game.date);
                return gameDate >= new Date('2026-03-25T00:00:00Z') && 
                       gameDate <= new Date('2026-10-01T00:00:00Z');
            });
        
        console.log(`Loaded ${regularSeasonGames.length} regular season games from 2026 MLB schedule`);
        return regularSeasonGames;
    }
    
    console.warn("schedule.json is empty or invalid");
    return [];
};
