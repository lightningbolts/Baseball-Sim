
import { Player, StaffMember, FrontOffice } from "../types";
import { TEAMS_DATA } from "../constants";
import { fetchRealRoster, fetchCoachingStaff } from "./mlbScraper";

// Realistic 2026 Data estimates for Budget (in Millions) and current GM/President
const TEAM_FINANCIALS: Record<string, { budget: number, strategy: string, gm: string }> = {
    "NYY": { budget: 305, strategy: "Big Spender", gm: "Brian Cashman" },
    "NYM": { budget: 330, strategy: "Big Spender", gm: "David Stearns" },
    "LAD": { budget: 315, strategy: "Big Spender", gm: "Brandon Gomes" },
    "PHI": { budget: 260, strategy: "Big Spender", gm: "Sam Fuld" },
    "HOU": { budget: 245, strategy: "Analytics", gm: "Dana Brown" },
    "ATL": { budget: 235, strategy: "Analytics", gm: "Alex Anthopoulos" },
    "TEX": { budget: 225, strategy: "Big Spender", gm: "Chris Young" },
    "TOR": { budget: 220, strategy: "Big Spender", gm: "Ross Atkins" },
    "CHC": { budget: 215, strategy: "Traditional", gm: "Carter Hawkins" },
    "SF": { budget: 205, strategy: "Analytics", gm: "Pete Putila" },
    "SD": { budget: 185, strategy: "Aggressive", gm: "A.J. Preller" },
    "LAA": { budget: 180, strategy: "Traditional", gm: "Perry Minasian" },
    "BOS": { budget: 190, strategy: "Analytics", gm: "Craig Breslow" },
    "STL": { budget: 175, strategy: "Traditional", gm: "Mike Girsch" },
    "ARI": { budget: 165, strategy: "Moneyball", gm: "Mike Hazen" },
    "MIN": { budget: 135, strategy: "Analytics", gm: "Thad Levine" },
    "SEA": { budget: 145, strategy: "Analytics", gm: "Justin Hollander" },
    "COL": { budget: 140, strategy: "Traditional", gm: "Bill Schmidt" },
    "CWS": { budget: 130, strategy: "Traditional", gm: "Chris Getz" },
    "DET": { budget: 125, strategy: "Analytics", gm: "Jeff Greenberg" },
    "KC": { budget: 120, strategy: "Small Market", gm: "J.J. Picollo" },
    "MIL": { budget: 115, strategy: "Analytics", gm: "Matt Arnold" },
    "CIN": { budget: 105, strategy: "Small Market", gm: "Nick Krall" },
    "CLE": { budget: 100, strategy: "Moneyball", gm: "Mike Chernoff" },
    "TB": { budget: 95, strategy: "Moneyball", gm: "Erik Neander" },
    "BAL": { budget: 110, strategy: "Moneyball", gm: "Mike Elias" },
    "PIT": { budget: 85, strategy: "Small Market", gm: "Ben Cherington" },
    "MIA": { budget: 90, strategy: "Small Market", gm: "Peter Bendix" },
    "WSH": { budget: 110, strategy: "Rebuilding", gm: "Mike Rizzo" },
    "OAK": { budget: 65, strategy: "Moneyball", gm: "David Forst" }
};

export const generateTeamData = async (teamName: string): Promise<{ roster: Player[], staff: StaffMember[], frontOffice: FrontOffice, sources: string[] }> => {
  // 1. Identify MLB ID
  const teamInfo = TEAMS_DATA.find(t => `${t.city} ${t.name}` === teamName);
  let realRoster: Player[] = [];
  let realStaff: StaffMember[] = [];
  let sources: string[] = ["statsapi.mlb.com"];

  if (teamInfo) {
      console.log(`Fetching real data for ${teamName} (ID: ${teamInfo.mlbId})...`);
      
      // Parallel fetch for efficiency
      const [roster, staff] = await Promise.all([
          fetchRealRoster(teamInfo.mlbId),
          fetchCoachingStaff(teamInfo.mlbId)
      ]);

      realRoster = roster;
      realStaff = staff;
  }

  // Get Realistic Front Office Data
  const financialData = teamInfo && TEAM_FINANCIALS[teamInfo.abbreviation] 
      ? TEAM_FINANCIALS[teamInfo.abbreviation] 
      : { budget: 150, strategy: "Traditional", gm: "Unknown Exec" };

  const frontOffice: FrontOffice = {
      gmName: financialData.gm,
      strategy: financialData.strategy as any,
      budget: financialData.budget
  };

  return {
      roster: realRoster,
      staff: realStaff,
      frontOffice,
      sources
  };
};
