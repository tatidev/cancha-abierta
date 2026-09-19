import { PlayerStats, ProposedMatch, Match } from "./types";

interface PairHistory {
  hasPartnered: (id1: number, id2: number) => boolean;
  getOpponentCount: (id1: number, id2: number) => number;
}

function pairKey(id1: number, id2: number): string {
  return id1 < id2 ? `${id1}_${id2}` : `${id2}_${id1}`;
}

export function buildHistory(matches: Match[]): PairHistory {
  const partners = new Set<string>();
  const opponents = new Map<string, number>();

  for (const m of matches) {
    if (m.status === 'cancelled') continue;

    // Partners
    partners.add(pairKey(m.t1_p1_id, m.t1_p2_id));
    partners.add(pairKey(m.t2_p1_id, m.t2_p2_id));

    // Opponents
    const addOpponent = (a: number, b: number) => {
      const k = pairKey(a, b);
      opponents.set(k, (opponents.get(k) || 0) + 1);
    };

    addOpponent(m.t1_p1_id, m.t2_p1_id);
    addOpponent(m.t1_p1_id, m.t2_p2_id);
    addOpponent(m.t1_p2_id, m.t2_p1_id);
    addOpponent(m.t1_p2_id, m.t2_p2_id);
  }

  return {
    hasPartnered: (id1, id2) => partners.has(pairKey(id1, id2)),
    getOpponentCount: (id1, id2) => opponents.get(pairKey(id1, id2)) || 0,
  };
}

export interface MatchmakingResult {
  proposedMatches: ProposedMatch[];
  waitingPlayers: PlayerStats[];
  unassignedCourts: number[];
  warning?: string;
}

/**
 * Intelligent matchmaking algorithm:
 * - Hard constraint: Team 1 and Team 2 must NEVER have partnered before.
 * - Soft constraint 1: Prioritize players with fewest matches played (catch-up for late arrivals).
 * - Soft constraint 2: Minimize repeated opponents.
 */
export function generateMatchesForCourts(
  allPlayers: PlayerStats[],
  matches: Match[],
  freeCourts: number[],
  currentRound: number
): MatchmakingResult {
  const history = buildHistory(matches);

  // 1. Filter active players who are NOT currently in an in_progress match
  const busyPlayerIds = new Set<number>();
  for (const m of matches) {
    if (m.status === 'in_progress') {
      busyPlayerIds.add(m.t1_p1_id);
      busyPlayerIds.add(m.t1_p2_id);
      busyPlayerIds.add(m.t2_p1_id);
      busyPlayerIds.add(m.t2_p2_id);
    }
  }

  const availablePlayers = allPlayers.filter(
    (p) => p.active === 1 && !busyPlayerIds.has(p.id)
  );

  // Sort available players:
  // Primary: matches_played ascending (fewest matches first)
  // Secondary: random jitter or stable tie-break to avoid always picking the same order
  const shuffledAvailable = [...availablePlayers].sort((a, b) => {
    if (a.matches_played !== b.matches_played) {
      return a.matches_played - b.matches_played;
    }
    // Randomize slightly among those with identical matches played
    return Math.random() - 0.5;
  });

  const proposedMatches: ProposedMatch[] = [];
  const assignedPlayerIds = new Set<number>();
  const unassignedCourts: number[] = [];

  // For each free court, find a valid 4-player group and split
  for (const courtNumber of freeCourts) {
    const unassigned = shuffledAvailable.filter((p) => !assignedPlayerIds.has(p.id));

    if (unassigned.length < 4) {
      unassignedCourts.push(courtNumber);
      continue;
    }

    // Search for a valid group of 4 players
    // We prioritize candidates closer to the front (fewer matches played)
    const match = findBestMatchForCourt(unassigned, history, courtNumber, currentRound);

    if (match) {
      proposedMatches.push(match);
      assignedPlayerIds.add(match.team1[0].id);
      assignedPlayerIds.add(match.team1[1].id);
      assignedPlayerIds.add(match.team2[0].id);
      assignedPlayerIds.add(match.team2[1].id);
    } else {
      unassignedCourts.push(courtNumber);
    }
  }

  const waitingPlayers = shuffledAvailable.filter(
    (p) => !assignedPlayerIds.has(p.id)
  );

  let warning: string | undefined;
  if (proposedMatches.length === 0 && freeCourts.length > 0) {
    if (availablePlayers.length < 4) {
      warning = `Se necesitan al menos 4 jugadores disponibles (hay ${availablePlayers.length}).`;
    } else {
      warning = `No se encontró una combinación de 4 jugadores que no hayan sido pareja antes. Considerá habilitar más jugadores o revisar descansos.`;
    }
  }

  return {
    proposedMatches,
    waitingPlayers,
    unassignedCourts,
    warning,
  };
}

interface SplitEvaluation {
  team1: [PlayerStats, PlayerStats];
  team2: [PlayerStats, PlayerStats];
  penalty: number;
}

function findBestMatchForCourt(
  candidates: PlayerStats[],
  history: PairHistory,
  court: number,
  round: number
): ProposedMatch | null {
  // We limit combinatorial search depth to the first 16 candidates to keep it instantaneous
  const searchPool = candidates.slice(0, Math.min(candidates.length, 16));

  let bestEvaluation: SplitEvaluation | null = null;

  // Generate 4-combinations from searchPool
  for (let i = 0; i < searchPool.length; i++) {
    for (let j = i + 1; j < searchPool.length; j++) {
      for (let k = j + 1; k < searchPool.length; k++) {
        for (let l = k + 1; l < searchPool.length; l++) {
          const p1 = searchPool[i];
          const p2 = searchPool[j];
          const p3 = searchPool[k];
          const p4 = searchPool[l];

          // Priority penalty based on how far in the candidate list they are (since list is sorted by matches_played)
          const rankPenalty = (i + j + k + l) * 5;

          // Try the 3 pairings
          const splits: [ [PlayerStats, PlayerStats], [PlayerStats, PlayerStats] ][] = [
            [[p1, p2], [p3, p4]],
            [[p1, p3], [p2, p4]],
            [[p1, p4], [p2, p3]],
          ];

          for (const [t1, t2] of splits) {
            // HARD CONSTRAINT: Neither pair can have been partners before
            if (history.hasPartnered(t1[0].id, t1[1].id)) continue;
            if (history.hasPartnered(t2[0].id, t2[1].id)) continue;

            // SOFT CONSTRAINT: Calculate opponent repeat penalty
            const oppRepeats =
              history.getOpponentCount(t1[0].id, t2[0].id) +
              history.getOpponentCount(t1[0].id, t2[1].id) +
              history.getOpponentCount(t1[1].id, t2[0].id) +
              history.getOpponentCount(t1[1].id, t2[1].id);

            const totalPenalty = rankPenalty + oppRepeats * 20;

            if (!bestEvaluation || totalPenalty < bestEvaluation.penalty) {
              bestEvaluation = {
                team1: t1,
                team2: t2,
                penalty: totalPenalty,
              };

              // If ideal match found (0 opponent repeats from top 4), break early
              if (totalPenalty === 0) break;
            }
          }

          if (bestEvaluation && bestEvaluation.penalty === 0) break;
        }
        if (bestEvaluation && bestEvaluation.penalty === 0) break;
      }
      if (bestEvaluation && bestEvaluation.penalty === 0) break;
    }
    if (bestEvaluation && bestEvaluation.penalty === 0) break;
  }

  if (!bestEvaluation) {
    return null;
  }

  return {
    court,
    round,
    team1: [bestEvaluation.team1[0], bestEvaluation.team1[1]],
    team2: [bestEvaluation.team2[0], bestEvaluation.team2[1]],
  };
}

/**
 * Validate any custom or manually edited match before saving:
 * Returns an error message if the hard constraint is violated, or null if valid.
 */
export function validateManualMatch(
  t1_p1_id: number,
  t1_p2_id: number,
  t2_p1_id: number,
  t2_p2_id: number,
  allPlayers: PlayerStats[],
  matches: Match[],
  currentMatchId?: number,
  allowRepeatPartners: boolean = false
): { valid: boolean; error?: string; warning?: string; partnerRepeated?: boolean } {
  // Check unique players
  const ids = [t1_p1_id, t1_p2_id, t2_p1_id, t2_p2_id];
  const unique = new Set(ids);
  if (unique.size !== 4) {
    return { valid: false, error: "Los 4 jugadores de la cancha deben ser distintos." };
  }

  const pMap = new Map(allPlayers.map((p) => [p.id, p.name]));
  const relevantMatches = matches.filter((m) => m.id !== currentMatchId && m.status !== 'cancelled');
  const history = buildHistory(relevantMatches);

  let partnerRepeated = false;
  const warnings: string[] = [];

  // Check Team 1 partner
  if (history.hasPartnered(t1_p1_id, t1_p2_id)) {
    partnerRepeated = true;
    const msg = `Atención: ${pMap.get(t1_p1_id) || 'Jugador 1'} y ${pMap.get(t1_p2_id) || 'Jugador 2'} ya jugaron juntos como pareja en este torneo.`;
    if (!allowRepeatPartners) {
      return { valid: false, error: msg, partnerRepeated: true };
    }
    warnings.push(msg);
  }

  // Check Team 2 partner
  if (history.hasPartnered(t2_p1_id, t2_p2_id)) {
    partnerRepeated = true;
    const msg = `Atención: ${pMap.get(t2_p1_id) || 'Jugador 3'} y ${pMap.get(t2_p2_id) || 'Jugador 4'} ya jugaron juntos como pareja en este torneo.`;
    if (!allowRepeatPartners) {
      return { valid: false, error: msg, partnerRepeated: true };
    }
    warnings.push(msg);
  }

  // Soft warning about opponents
  const oppCount =
    history.getOpponentCount(t1_p1_id, t2_p1_id) +
    history.getOpponentCount(t1_p1_id, t2_p2_id) +
    history.getOpponentCount(t1_p2_id, t2_p1_id) +
    history.getOpponentCount(t1_p2_id, t2_p2_id);

  if (oppCount > 0) {
    warnings.push(`Nota: Algunos jugadores ya se enfrentaron como rivales (${oppCount} cruce(s) previo(s)).`);
  }

  return {
    valid: true,
    warning: warnings.length > 0 ? warnings.join(" | ") : undefined,
    partnerRepeated,
  };
}
