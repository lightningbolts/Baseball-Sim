
import { Team, GameResult } from "../types";
import { TEAMS_DATA } from "../constants";

export const SCHEDULE_CSV = `Title,Description,Location,Starts,Ends,Location
⚾️ Milwaukee Brewers @ Colorado Rockies,"Watch live on MLB.TV | Follow this game on MLB Gameday or the MLB app.

Buy Tickets for This Game
https://e.cal.mlb/f/21lwzQ/3nLwH

Follow This Game on Gameday
https://e.cal.mlb/f/21lwB2/3nLwH

Check Out The Game Preview
https://e.cal.mlb/f/21lwB8/3nLwH

Watch This Game's Highlights
https://e.cal.mlb/f/21lwBk/3nLwH

Follow This Game in the MLB App
https://e.cal.mlb/f/21lwBv/3nLwH

Personalize Your Visit with the MLB Ballpark App - Download the App
https://e.cal.mlb/f/21lwBC/3nLwH

Manage my ECAL
https://e.cal.mlb/f/21lwC2/3nLwH

",Coors Field,2026-06-06 00:40:00+00:00,2026-06-06 03:40:00+00:00,Coors Field
⚾️ Athletics @ Texas Rangers,"Watch live on MLB.TV | Follow this game on MLB Gameday or the MLB app.

Let everyone know where your allegiance lies. Shop authentic MLB gear at the official MLB online store.

Buy Tickets for This Game
https://e.cal.mlb/f/25Vb54/3nLwH

Shop
https://e.cal.mlb/f/25Vb56/3nLwH

Follow This Game on Gameday
https://e.cal.mlb/f/25Vb59/3nLwH

Check Out The Game Preview
https://e.cal.mlb/f/25Vb5g/3nLwH

Watch This Game's Highlights
https://e.cal.mlb/f/25Vb5l/3nLwH

Follow This Game in the MLB App
https://e.cal.mlb/f/25Vb5p/3nLwH

Personalize Your Visit with the MLB Ballpark App - Download the App
https://e.cal.mlb/f/25Vb5r/3nLwH

Manage my ECAL
https://e.cal.mlb/f/25Vb5y/3nLwH

",Globe Life Field,2026-09-02 00:05:00+00:00,2026-09-02 03:05:00+00:00,Globe Life Field
⚾️ Houston Astros @ Chicago White Sox,"Watch live on MLB.TV | Follow this game on MLB Gameday or the MLB app.

Buy Tickets for This Game
https://e.cal.mlb/f/24jzck/3nLwH

Follow This Game on Gameday
https://e.cal.mlb/f/24jzcl/3nLwH

Check Out The Game Preview
https://e.cal.mlb/f/24jzcm/3nLwH

Watch This Game's Highlights
https://e.cal.mlb/f/24jzcp/3nLwH

Follow This Game in the MLB App
https://e.cal.mlb/f/24jzct/3nLwH

Personalize Your Visit with the MLB Ballpark App - Download the App
https://e.cal.mlb/f/24jzcB/3nLwH

Manage my ECAL
https://e.cal.mlb/f/24jzcP/3nLwH

",Rate Field,2026-07-25 23:10:00+00:00,2026-07-26 02:10:00+00:00,Rate Field
⚾️ Detroit Tigers @ Boston Red Sox,"Watch live on MLB.TV | Follow this game on MLB Gameday or the MLB app.

Buy Tickets for This Game
https://e.cal.mlb/f/21kCZB/3nLwH

Follow This Game on Gameday
https://e.cal.mlb/f/21kCZJ/3nLwH

Check Out The Game Preview
https://e.cal.mlb/f/21kCZR/3nLwH

Watch This Game's Highlights
https://e.cal.mlb/f/21kD11/3nLwH

Follow This Game in the MLB App
https://e.cal.mlb/f/21kD18/3nLwH

Personalize Your Visit with the MLB Ballpark App - Download the App
https://e.cal.mlb/f/21kD1n/3nLwH

Manage my ECAL
https://e.cal.mlb/f/21kD1H/3nLwH

",Fenway Park,2026-04-18 20:10:00+00:00,2026-04-18 23:10:00+00:00,Fenway Park
⚾️ Colorado Rockies @ Detroit Tigers,"Watch live on MLB.TV | Follow this game on MLB Gameday or the MLB app.

Let everyone know where your allegiance lies. Shop authentic MLB gear at the official MLB online store.

Buy Tickets for This Game
https://e.cal.mlb/f/27Cb8f/3nLwH

Shop
https://e.cal.mlb/f/27Yk3L/3nLwH

Follow This Game on Gameday
https://e.cal.mlb/f/27Cb8j/3nLwH

Check Out The Game Preview
https://e.cal.mlb/f/27Cb8q/3nLwH

Watch This Game's Highlights
https://e.cal.mlb/f/27Cb8v/3nLwH

Follow This Game in the MLB App
https://e.cal.mlb/f/27Cb8z/3nLwH

Personalize Your Visit with the MLB Ballpark App - Download the App
https://e.cal.mlb/f/27Cb8F/3nLwH

Manage my ECAL
https://e.cal.mlb/f/27Cb8Q/3nLwH

",Comerica Park,2026-09-12 17:10:00+00:00,2026-09-12 20:10:00+00:00,Comerica Park
⚾️ Arizona Diamondbacks @ Pittsburgh Pirates,"Watch live on MLB.TV | Follow this game on MLB Gameday or the MLB app.

Buy Tickets for This Game
https://e.cal.mlb/f/24jC8d/3nLwH

Follow This Game on Gameday
https://e.cal.mlb/f/24jC8j/3nLwH

Check Out The Game Preview
https://e.cal.mlb/f/24jC8n/3nLwH

Watch This Game's Highlights
https://e.cal.mlb/f/24jC8p/3nLwH

Follow This Game in the MLB App
https://e.cal.mlb/f/24jC8s/3nLwH

Personalize Your Visit with the MLB Ballpark App - Download the App
https://e.cal.mlb/f/24jC8x/3nLwH

Manage my ECAL
https://e.cal.mlb/f/24jC8L/3nLwH

",PNC Park,2026-07-28 22:40:00+00:00,2026-07-29 01:40:00+00:00,PNC Park
⚾️ Arizona Diamondbacks @ Los Angeles Dodgers,"Watch live on MLB.TV | Follow this game on MLB Gameday or the MLB app.

Buy Tickets for This Game
https://e.cal.mlb/f/24jFfY/3nLwH

Follow This Game on Gameday
https://e.cal.mlb/f/24jFg3/3nLwH

Check Out The Game Preview
https://e.cal.mlb/f/24jFg7/3nLwH

Watch This Game's Highlights
https://e.cal.mlb/f/24jFg8/3nLwH

Follow This Game in the MLB App
https://e.cal.mlb/f/24jFgc/3nLwH

Personalize Your Visit with the MLB Ballpark App - Download the App
https://e.cal.mlb/f/24jFgf/3nLwH

Manage my ECAL
https://e.cal.mlb/f/24jFgj/3nLwH

",Dodger Stadium,2026-07-12 20:10:00+00:00,2026-07-12 23:10:00+00:00,Dodger Stadium
⚾️ Texas Rangers @ Philadelphia Phillies,"Watch live on MLB.TV | Follow this game on MLB Gameday or the MLB app.

Let everyone know where your allegiance lies. Shop authentic MLB gear at the official MLB online store.

Buy Tickets for This Game
https://e.cal.mlb/f/21lmfy/3nLwH

Shop
https://e.cal.mlb/f/21lmfG/3nLwH

Follow This Game on Gameday
https://e.cal.mlb/f/21lmfQ/3nLwH

Check Out The Game Preview
https://e.cal.mlb/f/21lmfT/3nLwH

Watch This Game's Highlights
https://e.cal.mlb/f/21lmg1/3nLwH

Follow This Game in the MLB App
https://e.cal.mlb/f/21lmg7/3nLwH

Personalize Your Visit with the MLB Ballpark App - Download the App
https://e.cal.mlb/f/21lmgf/3nLwH

Manage my ECAL
https://e.cal.mlb/f/21lmgB/3nLwH

",Citizens Bank Park,2026-03-28 20:05:00+00:00,2026-03-28 23:05:00+00:00,Citizens Bank Park
⚾️ Chicago White Sox @ San Francisco Giants,"Watch live on MLB.TV | Follow this game on MLB Gameday or the MLB app.

Buy Tickets for This Game
https://e.cal.mlb/f/29pZDq/3nLwH

Follow This Game on Gameday
https://e.cal.mlb/f/21l5Pg/3nLwH

Check Out The Game Preview
https://e.cal.mlb/f/21l5Pn/3nLwH

Watch This Game's Highlights
https://e.cal.mlb/f/21l5Py/3nLwH

Follow This Game in the MLB App
https://e.cal.mlb/f/21l5PJ/3nLwH

Personalize Your Visit with the MLB Ballpark App - Download the App
https://e.cal.mlb/f/21l5PQ/3nLwH

Manage my ECAL
https://e.cal.mlb/f/21l5Qc/3nLwH

",Oracle Park,2026-05-23 10:33:00+00:00,2026-05-23 13:33:00+00:00,Oracle Park
⚾️ Detroit Tigers @ Cleveland Guardians,"Watch live on MLB.TV | Follow this game on MLB Gameday or the MLB app.

Buy Tickets for This Game
https://e.cal.mlb/f/21kRh7/3nLwH

Follow This Game on Gameday
https://e.cal.mlb/f/21kRhf/3nLwH

Check Out The Game Preview
https://e.cal.mlb/f/21kRhn/3nLwH

Watch This Game's Highlights
https://e.cal.mlb/f/21kRhx/3nLwH

Follow This Game in the MLB App
https://e.cal.mlb/f/21kRhG/3nLwH

Personalize Your Visit with the MLB Ballpark App - Download the App
https://e.cal.mlb/f/21kRhP/3nLwH

Manage my ECAL
https://e.cal.mlb/f/21kRjq/3nLwH

",Progressive Field,2026-06-12 07:33:00+00:00,2026-06-12 10:33:00+00:00,Progressive Field
⚾️ Philadelphia Phillies @ Seattle Mariners,"Watch live on MLB.TV | Follow this game on MLB Gameday or the MLB app.

Buy Tickets for This Game
https://e.cal.mlb/f/2926qj/3nLwH

Follow This Game on Gameday
https://e.cal.mlb/f/25VcMc/3nLwH

Check Out The Game Preview
https://e.cal.mlb/f/25VcMg/3nLwH

Watch This Game's Highlights
https://e.cal.mlb/f/25VcMk/3nLwH

Follow This Game in the MLB App
https://e.cal.mlb/f/25VcMn/3nLwH

Personalize Your Visit with the MLB Ballpark App - Download the App
https://e.cal.mlb/f/25VcMr/3nLwH

Manage my ECAL
https://e.cal.mlb/f/25VcMB/3nLwH

",T-Mobile Park,2026-08-26 20:10:00+00:00,2026-08-26 23:10:00+00:00,T-Mobile Park
⚾️ New York Yankees @ Washington Nationals,"Watch live on MLB.TV | Follow this game on MLB Gameday or the MLB app.

Buy Tickets for This Game
https://e.cal.mlb/f/29wlGK/3nLwH

Follow This Game on Gameday
https://e.cal.mlb/f/24jDGh/3nLwH

Check Out The Game Preview
https://e.cal.mlb/f/24jDGj/3nLwH

Watch This Game's Highlights
https://e.cal.mlb/f/24jDGk/3nLwH

Follow This Game in the MLB App
https://e.cal.mlb/f/24jDGl/3nLwH

Personalize Your Visit with the MLB Ballpark App - Download the App
https://e.cal.mlb/f/24jDGm/3nLwH

Manage my ECAL
https://e.cal.mlb/f/24jDGr/3nLwH

",Nationals Park,2026-07-10 22:45:00+00:00,2026-07-11 01:45:00+00:00,Nationals Park
⚾️ Los Angeles Dodgers @ Chicago Cubs,"Watch live on MLB.TV | Follow this game on MLB Gameday or the MLB app.

Buy Tickets for This Game
https://e.cal.mlb/f/29p1w6/3nLwH

Follow This Game on Gameday
https://e.cal.mlb/f/287y4c/3nLwH

Check Out The Game Preview
https://e.cal.mlb/f/287y4k/3nLwH

Watch This Game's Highlights
https://e.cal.mlb/f/287y4p/3nLwH

Follow This Game in the MLB App
https://e.cal.mlb/f/287y4t/3nLwH

Personalize Your Visit with the MLB Ballpark App - Download the App
https://e.cal.mlb/f/287y4y/3nLwH

Manage my ECAL
https://e.cal.mlb/f/287y4G/3nLwH

",Sloan Park,2026-03-15 20:05:00+00:00,2026-03-15 23:05:00+00:00,Sloan Park
⚾️ Toronto Blue Jays @ Detroit Tigers,"Watch live on MLB.TV | Follow this game on MLB Gameday or the MLB app.

Buy Tickets for This Game
https://e.cal.mlb/f/29xtxX/3nLwH

Follow This Game on Gameday
https://e.cal.mlb/f/287vHB/3nLwH

Check Out The Game Preview
https://e.cal.mlb/f/287vHF/3nLwH

Watch This Game's Highlights
https://e.cal.mlb/f/287vHL/3nLwH

Follow This Game in the MLB App
https://e.cal.mlb/f/287vHQ/3nLwH

Personalize Your Visit with the MLB Ballpark App - Download the App
https://e.cal.mlb/f/287vHT/3nLwH

Manage my ECAL
https://e.cal.mlb/f/287vJ2/3nLwH

",Publix Field at Joker Marchant Stadium,2026-03-01 18:05:00+00:00,2026-03-01 21:05:00+00:00,Publix Field at Joker Marchant Stadium
⚾️ Milwaukee Brewers @ San Francisco Giants,"Watch live on MLB.TV | Follow this game on MLB Gameday or the MLB app.

Buy Tickets for This Game
https://e.cal.mlb/f/24jCJM/3nLwH

Follow This Game on Gameday
https://e.cal.mlb/f/24jCJQ/3nLwH

Check Out The Game Preview
https://e.cal.mlb/f/24jCJR/3nLwH

Watch This Game's Highlights
https://e.cal.mlb/f/24jCJT/3nLwH

Follow This Game in the MLB App
https://e.cal.mlb/f/24jCJZ/3nLwH

Personalize Your Visit with the MLB Ballpark App - Download the App
https://e.cal.mlb/f/24jCK1/3nLwH

Manage my ECAL
https://e.cal.mlb/f/24jCKd/3nLwH

",Oracle Park,2026-07-28 01:45:00+00:00,2026-07-28 04:45:00+00:00,Oracle Park
⚾️ Washington Nationals @ San Diego Padres,"Watch live on MLB.TV | Follow this game on MLB Gameday or the MLB app.

Let everyone know where your allegiance lies. Shop authentic MLB gear at the official MLB online store.

Buy Tickets for This Game
https://e.cal.mlb/f/292hNv/3nLwH

Shop
https://e.cal.mlb/f/27Yk1b/3nLwH

Follow This Game on Gameday
https://e.cal.mlb/f/27C8Xv/3nLwH

Check Out The Game Preview
https://e.cal.mlb/f/27C8Xy/3nLwH

Watch This Game's Highlights
https://e.cal.mlb/f/27C8XD/3nLwH

Follow This Game in the MLB App
https://e.cal.mlb/f/27C8XH/3nLwH

Personalize Your Visit with the MLB Ballpark App - Download the App
https://e.cal.mlb/f/27C8XM/3nLwH

Manage my ECAL
https://e.cal.mlb/f/27C8XV/3nLwH

",Petco Park,2026-09-09 01:40:00+00:00,2026-09-09 04:40:00+00:00,Petco Park
⚾️ Colorado Rockies @ Arizona Diamondbacks,"Watch live on MLB.TV | Follow this game on MLB Gameday or the MLB app.

Buy Tickets for This Game
https://e.cal.mlb/f/21l7qj/3nLwH

Follow This Game on Gameday
https://e.cal.mlb/f/21l7qv/3nLwH

Check Out The Game Preview
https://e.cal.mlb/f/21l7qF/3nLwH

Watch This Game's Highlights
https://e.cal.mlb/f/21l7qK/3nLwH

Follow This Game in the MLB App
https://e.cal.mlb/f/21l7qQ/3nLwH

Personalize Your Visit with the MLB Ballpark App - Download the App
https://e.cal.mlb/f/21l7qY/3nLwH

Manage my ECAL
https://e.cal.mlb/f/21l7rg/3nLwH

",Chase Field,2026-05-24 02:10:00+00:00,2026-05-24 05:10:00+00:00,Chase Field
⚾️ New York Yankees @ Arizona Diamondbacks,"Watch live on MLB.TV | Follow this game on MLB Gameday or the MLB app.

Buy Tickets for This Game
https://e.cal.mlb/f/27Cbmv/3nLwH

Follow This Game on Gameday
https://e.cal.mlb/f/27Cbmz/3nLwH

Check Out The Game Preview
https://e.cal.mlb/f/27CbmD/3nLwH

Watch This Game's Highlights
https://e.cal.mlb/f/27CbmJ/3nLwH

Follow This Game in the MLB App
https://e.cal.mlb/f/27CbmM/3nLwH

Personalize Your Visit with the MLB Ballpark App - Download the App
https://e.cal.mlb/f/27CbmP/3nLwH

Manage my ECAL
https://e.cal.mlb/f/27CbmT/3nLwH

",Chase Field,2026-09-19 01:40:00+00:00,2026-09-19 04:40:00+00:00,Chase Field
`;

export const parseScheduleCSV = (): GameResult[] => {
    const lines = SCHEDULE_CSV.trim().split('\n');
    const games: GameResult[] = [];
    
    // Helper to find team ID from name
    const findTeamId = (name: string): string => {
        // Known mappings based on CSV content vs TEAMS_DATA
        const mapping: Record<string, string> = {
            "Arizona Diamondbacks": "ari",
            "Atlanta Braves": "atl",
            "Baltimore Orioles": "bal",
            "Boston Red Sox": "bos",
            "Chicago Cubs": "chc",
            "Chicago White Sox": "cws",
            "Cincinnati Reds": "cin",
            "Cleveland Guardians": "cle",
            "Colorado Rockies": "col",
            "Detroit Tigers": "det",
            "Houston Astros": "hou",
            "Kansas City Royals": "kc",
            "Los Angeles Angels": "laa",
            "Los Angeles Dodgers": "lad",
            "Miami Marlins": "mia",
            "Milwaukee Brewers": "mil",
            "Minnesota Twins": "min",
            "New York Mets": "nym",
            "New York Yankees": "nyy",
            "Oakland Athletics": "oak",
            "Athletics": "oak",
            "Philadelphia Phillies": "phi",
            "Pittsburgh Pirates": "pit",
            "San Diego Padres": "sd",
            "San Francisco Giants": "sf",
            "Seattle Mariners": "sea",
            "St. Louis Cardinals": "stl",
            "Tampa Bay Rays": "tb",
            "Texas Rangers": "tex",
            "Toronto Blue Jays": "tor",
            "Washington Nationals": "wsh"
        };
        return mapping[name] || "";
    };

    // CSV Format is a bit grouped. Lines 1 is header.
    // Data lines:
    // 1. Title (e.g. "⚾️ Away @ Home")
    // ... description lines ...
    // n. Location,Start,End,Location
    
    let currentMatchup = "";
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        if (line.startsWith("⚾️")) {
            // New Game Block
            currentMatchup = line.split(',')[0].replace("⚾️ ", "").trim();
        } else if (line.includes("00:00,2026")) {
            // This is the data line with date
            // Format: Location,Start,End,Location
            // But Description might contain commas, so we look for the date pattern
            // Pattern: YYYY-MM-DD HH:mm:ss+00:00
            
            // Extract date
            const dateMatch = line.match(/(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\+00:00)/);
            if (dateMatch && currentMatchup) {
                const dateStr = dateMatch[1];
                const parts = currentMatchup.split(" @ ");
                if (parts.length === 2) {
                    const awayName = parts[0].trim();
                    const homeName = parts[1].trim();
                    
                    const homeId = findTeamId(homeName);
                    const awayId = findTeamId(awayName);
                    
                    if (homeId && awayId) {
                        // Extract stadium from line (before date)
                        // This line format is weird in CSV provided: ",Coors Field,2026..."
                        // We can just use the stadium from TEAMS_DATA later or try to parse
                        
                        games.push({
                            id: `g_${games.length}_${homeId}_${awayId}`,
                            date: dateStr,
                            homeTeamId: homeId,
                            awayTeamId: awayId,
                            homeScore: 0,
                            awayScore: 0,
                            innings: 9,
                            winnerId: '',
                            played: false,
                            log: [],
                            stadium: TEAMS_DATA.find(t => t.id === homeId)?.stadium
                        });
                    }
                }
                currentMatchup = ""; // Reset
            }
        }
    }
    
    return games;
};
