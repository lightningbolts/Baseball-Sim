import { Team, GameResult, Player, Position } from "../types";

export interface TeamOdds {
  teamId: string;
  teamName: string;
  meanWins: number;
  meanLosses: number;
  playoffPct: number;
  divisionPct: number;
  wildCardPct: number;
  pennantPct: number;
  worldSeriesPct: number;
  winsDist: Record<number, number>;
}

export interface AwardEntry {
  playerId: string;
  name: string;
  teamId: string;
  probability: number;
}

export interface AwardOdds {
  mvpAL: AwardEntry[];
  mvpNL: AwardEntry[];
  cyAL: AwardEntry[];
  cyNL: AwardEntry[];
  royAL: AwardEntry[];
  royNL: AwardEntry[];
}

export interface FastSimSummary {
  teamOdds: Record<string, TeamOdds>;
  awardOdds: AwardOdds;
  simulations: number;
}

interface TeamStrength {
  offense: number;
  pitching: number;
  overall: number;
}

interface PlayerProjection {
  player: Player;
  score: number;
}

const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / Math.max(1, values.length);

const getTeamStrength = (team: Team): TeamStrength => {
  const hitters = team.roster.filter(p => p.position !== Position.P || p.isTwoWay);
  const pitchers = team.roster.filter(p => p.position === Position.P || p.isTwoWay);

  const topHitters = [...hitters].sort((a, b) => b.rating - a.rating).slice(0, 9);
  const topPitchers = [...pitchers].sort((a, b) => b.rating - a.rating).slice(0, 5);

  const offense = mean(topHitters.map(p => (p.attributes.contact + p.attributes.power + p.attributes.eye) / 3));
  const pitching = mean(topPitchers.map(p => (p.attributes.stuff + p.attributes.control + p.attributes.stamina) / 3));
  const overall = (offense * 0.52) + (pitching * 0.48);

  return { offense, pitching, overall };
};

const winProbability = (home: TeamStrength, away: TeamStrength): number => {
  const diff = home.overall - away.overall;
  const base = 1 / (1 + Math.pow(10, -diff / 12));
  const homeAdv = 0.035;
  return clamp(base + homeAdv, 0.2, 0.8);
};

const simulateSeries = (teamA: Team, teamB: Team, strengths: Record<string, TeamStrength>, bestOf: number): string => {
  const winsNeeded = Math.floor(bestOf / 2) + 1;
  let winsA = 0;
  let winsB = 0;

  while (winsA < winsNeeded && winsB < winsNeeded) {
    const pA = winProbability(strengths[teamA.id], strengths[teamB.id]);
    if (Math.random() < pA) winsA++;
    else winsB++;
  }

  return winsA > winsB ? teamA.id : teamB.id;
};

const getLeagueTeams = (teams: Team[], league: "AL" | "NL") => teams.filter(t => t.league === league);

const getDivisionWinners = (teams: Team[], wins: Record<string, number>, league: "AL" | "NL") => {
  const divisions = ["East", "Central", "West"] as const;
  return divisions.map(div => {
    const divTeams = teams.filter(t => t.league === league && t.division === div);
    return [...divTeams].sort((a, b) => wins[b.id] - wins[a.id])[0];
  });
};

const getWildcardTeams = (teams: Team[], wins: Record<string, number>, league: "AL" | "NL", divisionWinners: Team[]) => {
  const winners = new Set(divisionWinners.map(t => t.id));
  return teams
    .filter(t => t.league === league && !winners.has(t.id))
    .sort((a, b) => wins[b.id] - wins[a.id])
    .slice(0, 3);
};

const getHitterProjection = (player: Player): number => {
  const batting = (player.attributes.contact + player.attributes.power + player.attributes.eye) / 3;
  const speedBonus = player.attributes.speed * 0.08;
  const twoWayBonus = player.isTwoWay ? 5 : 0;
  return (player.rating * 0.55) + (batting * 0.45) + speedBonus + twoWayBonus;
};

const getPitcherProjection = (player: Player): number => {
  const pitching = (player.attributes.stuff + player.attributes.control + player.attributes.stamina) / 3;
  const velocityBonus = player.attributes.velocity * 0.06;
  return (player.rating * 0.5) + (pitching * 0.5) + velocityBonus;
};

const getRookieCandidates = (players: Player[]) => {
  const rookies = players.filter(p => p.age <= 25 && (p.history?.length ?? 0) <= 1);
  return rookies.length > 0 ? rookies : players.filter(p => p.age <= 26);
};

const computeAwardWinners = (
  teams: Team[],
  wins: Record<string, number>,
  league: "AL" | "NL"
) => {
  const leagueTeams = teams.filter(t => t.league === league);
  const leaguePlayers = leagueTeams.flatMap(t => t.roster.map(p => ({ player: p, teamId: t.id })));

  const hitters = leaguePlayers.filter(p => p.player.position !== Position.P || p.player.isTwoWay);
  const pitchers = leaguePlayers.filter(p => p.player.position === Position.P || p.player.isTwoWay);

  const hitterScores: PlayerProjection[] = hitters.map(({ player, teamId }) => ({
    player,
    score: getHitterProjection(player) + wins[teamId] * 0.08 + (Math.random() * 8)
  }));

  const pitcherScores: PlayerProjection[] = pitchers.map(({ player, teamId }) => ({
    player,
    score: getPitcherProjection(player) + wins[teamId] * 0.06 + (Math.random() * 6)
  }));

  const rookies = getRookieCandidates(hitters.map(h => h.player));
  const rookieScores: PlayerProjection[] = rookies.map(player => ({
    player,
    score: getHitterProjection(player) + (Math.random() * 10)
  }));

  const mvp = hitterScores.sort((a, b) => b.score - a.score)[0]?.player;
  const cy = pitcherScores.sort((a, b) => b.score - a.score)[0]?.player;
  const roy = rookieScores.sort((a, b) => b.score - a.score)[0]?.player;

  return { mvp, cy, roy };
};

export const runFastSim = (
  teams: Team[],
  schedule: GameResult[],
  simulations: number
): FastSimSummary => {
  const strengths: Record<string, TeamStrength> = {};
  teams.forEach(t => { strengths[t.id] = getTeamStrength(t); });

  const baseWins: Record<string, number> = {};
  const baseLosses: Record<string, number> = {};
  teams.forEach(t => {
    baseWins[t.id] = t.wins;
    baseLosses[t.id] = t.losses;
  });

  const remainingGames = schedule.filter(g => !g.played && !g.isPostseason);

  const winsTotals: Record<string, number[]> = {};
  const playoffCounts: Record<string, number> = {};
  const divisionCounts: Record<string, number> = {};
  const wildCardCounts: Record<string, number> = {};
  const pennantCounts: Record<string, number> = {};
  const wsCounts: Record<string, number> = {};
  const winsDist: Record<string, Record<number, number>> = {};

  teams.forEach(t => {
    winsTotals[t.id] = [];
    playoffCounts[t.id] = 0;
    divisionCounts[t.id] = 0;
    wildCardCounts[t.id] = 0;
    pennantCounts[t.id] = 0;
    wsCounts[t.id] = 0;
    winsDist[t.id] = {};
  });

  const mvpAL: Record<string, number> = {};
  const mvpNL: Record<string, number> = {};
  const cyAL: Record<string, number> = {};
  const cyNL: Record<string, number> = {};
  const royAL: Record<string, number> = {};
  const royNL: Record<string, number> = {};

  for (let sim = 0; sim < simulations; sim++) {
    const wins: Record<string, number> = { ...baseWins };
    const losses: Record<string, number> = { ...baseLosses };

    for (const game of remainingGames) {
      const homeStrength = strengths[game.homeTeamId];
      const awayStrength = strengths[game.awayTeamId];
      if (!homeStrength || !awayStrength) continue;

      const pHome = winProbability(homeStrength, awayStrength);
      if (Math.random() < pHome) {
        wins[game.homeTeamId]++;
        losses[game.awayTeamId]++;
      } else {
        wins[game.awayTeamId]++;
        losses[game.homeTeamId]++;
      }
    }

    teams.forEach(t => {
      winsTotals[t.id].push(wins[t.id]);
      const dist = winsDist[t.id];
      dist[wins[t.id]] = (dist[wins[t.id]] || 0) + 1;
    });

    const leagueChampions: Record<'AL' | 'NL', string> = { AL: '', NL: '' };

    (['AL', 'NL'] as const).forEach(league => {
      const leagueTeams = getLeagueTeams(teams, league);
      const divisionWinners = getDivisionWinners(teams, wins, league);
      const wildcards = getWildcardTeams(teams, wins, league, divisionWinners);

      divisionWinners.forEach(team => {
        divisionCounts[team.id]++;
        playoffCounts[team.id]++;
      });
      wildcards.forEach(team => {
        wildCardCounts[team.id]++;
        playoffCounts[team.id]++;
      });

      const seeds = [...divisionWinners, ...wildcards].sort((a, b) => wins[b.id] - wins[a.id]);
      if (seeds.length < 6) return;

      const wc1 = simulateSeries(seeds[2], seeds[5], strengths, 3);
      const wc2 = simulateSeries(seeds[3], seeds[4], strengths, 3);

      const ds1 = simulateSeries(seeds[0], teams.find(t => t.id === wc2)!, strengths, 5);
      const ds2 = simulateSeries(seeds[1], teams.find(t => t.id === wc1)!, strengths, 5);

      const csWinner = simulateSeries(teams.find(t => t.id === ds1)!, teams.find(t => t.id === ds2)!, strengths, 7);

      pennantCounts[csWinner]++;
      leagueChampions[league] = csWinner;
    });

    if (leagueChampions.AL && leagueChampions.NL) {
      const wsWinner = simulateSeries(
        teams.find(t => t.id === leagueChampions.AL)!,
        teams.find(t => t.id === leagueChampions.NL)!,
        strengths,
        7
      );
      wsCounts[wsWinner]++;
    }

    const awardsAL = computeAwardWinners(teams, wins, 'AL');
    const awardsNL = computeAwardWinners(teams, wins, 'NL');

    if (awardsAL.mvp) mvpAL[awardsAL.mvp.id] = (mvpAL[awardsAL.mvp.id] || 0) + 1;
    if (awardsNL.mvp) mvpNL[awardsNL.mvp.id] = (mvpNL[awardsNL.mvp.id] || 0) + 1;
    if (awardsAL.cy) cyAL[awardsAL.cy.id] = (cyAL[awardsAL.cy.id] || 0) + 1;
    if (awardsNL.cy) cyNL[awardsNL.cy.id] = (cyNL[awardsNL.cy.id] || 0) + 1;
    if (awardsAL.roy) royAL[awardsAL.roy.id] = (royAL[awardsAL.roy.id] || 0) + 1;
    if (awardsNL.roy) royNL[awardsNL.roy.id] = (royNL[awardsNL.roy.id] || 0) + 1;
  }

  const teamOdds: Record<string, TeamOdds> = {};
  teams.forEach(t => {
    const winList = winsTotals[t.id];
    const total = Math.max(1, simulations);
    teamOdds[t.id] = {
      teamId: t.id,
      teamName: `${t.city} ${t.name}`,
      meanWins: mean(winList),
      meanLosses: 162 - mean(winList),
      playoffPct: (playoffCounts[t.id] / total) * 100,
      divisionPct: (divisionCounts[t.id] / total) * 100,
      wildCardPct: (wildCardCounts[t.id] / total) * 100,
      pennantPct: (pennantCounts[t.id] / total) * 100,
      worldSeriesPct: (wsCounts[t.id] / total) * 100,
      winsDist: winsDist[t.id]
    };
  });

  const toAwardEntries = (map: Record<string, number>) => {
    return Object.entries(map)
      .map(([id, count]) => {
        const team = teams.find(t => t.roster.some(p => p.id === id));
        const player = team?.roster.find(p => p.id === id);
        return player
          ? { playerId: player.id, name: player.name, teamId: team!.id, probability: (count / simulations) * 100 }
          : null;
      })
      .filter((entry): entry is AwardEntry => entry !== null)
      .sort((a, b) => b.probability - a.probability)
      .slice(0, 10);
  };

  return {
    teamOdds,
    awardOdds: {
      mvpAL: toAwardEntries(mvpAL),
      mvpNL: toAwardEntries(mvpNL),
      cyAL: toAwardEntries(cyAL),
      cyNL: toAwardEntries(cyNL),
      royAL: toAwardEntries(royAL),
      royNL: toAwardEntries(royNL)
    },
    simulations
  };
};
