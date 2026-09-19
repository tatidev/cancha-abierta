import { initDb } from "./db";
import { Match, Player, PlayerStats, Tournament, TournamentSettings } from "./types";

export interface TournamentState {
  tournament: Tournament;
  settings: TournamentSettings;
  players: PlayerStats[];
  matches: Match[];
  courts: {
    courtNumber: number;
    activeMatch: Match | null;
  }[];
  currentlyPlayingPlayerIds: number[];
}

export async function getTournamentState(targetTournamentId?: number): Promise<TournamentState> {
  const db = await initDb();

  // 1. Fetch settings
  const settingsResult = await db.execute("SELECT key, value FROM settings");
  const settingsMap: Record<string, string> = {};
  for (const row of settingsResult.rows) {
    settingsMap[row.key as string] = row.value as string;
  }

  const activeTournamentId = parseInt(
    settingsMap.active_tournament_id || "1",
    10
  );

  const tournamentId = targetTournamentId || activeTournamentId;

  // 2. Fetch tournament details
  let tournamentRow = await db.execute({
    sql: "SELECT id, name, date, courts_count, target_games, status, created_at FROM tournaments WHERE id = ?",
    args: [tournamentId],
  });

  if (tournamentRow.rows.length === 0) {
    // Fallback: pick the latest or first tournament
    const fallback = await db.execute("SELECT id, name, date, courts_count, target_games, status, created_at FROM tournaments ORDER BY id DESC LIMIT 1");
    if (fallback.rows.length > 0) {
      tournamentRow = fallback;
    } else {
      // Create default tournament 1
      const today = new Date().toISOString().split("T")[0];
      await db.execute({
        sql: "INSERT INTO tournaments (id, name, date, courts_count, target_games, status) VALUES (1, 'Torneo Cancha Libre', ?, 5, 4, 'active')",
        args: [today],
      });
      tournamentRow = await db.execute("SELECT id, name, date, courts_count, target_games, status, created_at FROM tournaments WHERE id = 1");
    }
  }

  const tRow = tournamentRow.rows[0];
  const tournament: Tournament = {
    id: Number(tRow.id),
    name: String(tRow.name),
    date: String(tRow.date),
    courts_count: Number(tRow.courts_count),
    target_games: Number(tRow.target_games),
    status: (tRow.status as 'active' | 'finished') || 'active',
    created_at: String(tRow.created_at),
  };

  const settings: TournamentSettings = {
    active_tournament_id: tournament.id,
    tournament_name: tournament.name,
    tournament_date: tournament.date,
    courts_count: tournament.courts_count,
    target_games: tournament.target_games,
    admin_pin: settingsMap.admin_pin || "1234",
    status: tournament.status,
  };

  // 3. Fetch players for this tournament
  const playersResult = await db.execute({
    sql: "SELECT id, tournament_id, name, phone, active, created_at FROM players WHERE tournament_id = ? ORDER BY id ASC",
    args: [tournament.id],
  });

  const players: Player[] = playersResult.rows.map((row) => ({
    id: Number(row.id),
    tournament_id: Number(row.tournament_id),
    name: String(row.name),
    phone: row.phone ? String(row.phone) : undefined,
    active: Number(row.active),
    created_at: String(row.created_at),
  }));

  const playerMap = new Map<number, Player>();
  for (const p of players) {
    playerMap.set(p.id, p);
  }

  // 4. Fetch matches for this tournament
  const matchesResult = await db.execute({
    sql: `
      SELECT 
        m.id, m.tournament_id, m.round, m.court, 
        m.t1_p1_id, m.t1_p2_id, m.t2_p1_id, m.t2_p2_id,
        m.t1_games, m.t2_games, m.status, m.created_at, m.finished_at,
        p1.name as t1_p1_name,
        p2.name as t1_p2_name,
        p3.name as t2_p1_name,
        p4.name as t2_p2_name
      FROM matches m
      LEFT JOIN players p1 ON m.t1_p1_id = p1.id
      LEFT JOIN players p2 ON m.t1_p2_id = p2.id
      LEFT JOIN players p3 ON m.t2_p1_id = p3.id
      LEFT JOIN players p4 ON m.t2_p2_id = p4.id
      WHERE m.tournament_id = ?
      ORDER BY m.id DESC
    `,
    args: [tournament.id],
  });

  const matches: Match[] = matchesResult.rows.map((row) => ({
    id: Number(row.id),
    tournament_id: Number(row.tournament_id),
    round: Number(row.round),
    court: Number(row.court),
    t1_p1_id: Number(row.t1_p1_id),
    t1_p2_id: Number(row.t1_p2_id),
    t2_p1_id: Number(row.t2_p1_id),
    t2_p2_id: Number(row.t2_p2_id),
    t1_games: row.t1_games !== null ? Number(row.t1_games) : null,
    t2_games: row.t2_games !== null ? Number(row.t2_games) : null,
    status: row.status as Match['status'],
    created_at: String(row.created_at),
    finished_at: row.finished_at ? String(row.finished_at) : null,
    t1_p1_name: row.t1_p1_name ? String(row.t1_p1_name) : "Jugador " + row.t1_p1_id,
    t1_p2_name: row.t1_p2_name ? String(row.t1_p2_name) : "Jugador " + row.t1_p2_id,
    t2_p1_name: row.t2_p1_name ? String(row.t2_p1_name) : "Jugador " + row.t2_p1_id,
    t2_p2_name: row.t2_p2_name ? String(row.t2_p2_name) : "Jugador " + row.t2_p2_id,
  }));

  // 5. Compute statistics for each player
  const statsMap = new Map<number, PlayerStats>();

  for (const p of players) {
    statsMap.set(p.id, {
      ...p,
      matches_played: 0,
      matches_won: 0,
      matches_lost: 0,
      games_for: 0,
      games_against: 0,
      game_diff: 0,
      partner_ids: [],
      partner_names: [],
      opponent_ids: [],
      opponent_names: [],
    });
  }

  // Active matches players
  const currentlyPlayingPlayerIds = new Set<number>();

  for (const m of matches) {
    if (m.status === 'in_progress') {
      currentlyPlayingPlayerIds.add(m.t1_p1_id);
      currentlyPlayingPlayerIds.add(m.t1_p2_id);
      currentlyPlayingPlayerIds.add(m.t2_p1_id);
      currentlyPlayingPlayerIds.add(m.t2_p2_id);
    }

    if (m.status === 'finished' || m.status === 'in_progress') {
      const recordPair = (p1Id: number, p2Id: number) => {
        const s1 = statsMap.get(p1Id);
        const s2 = statsMap.get(p2Id);
        if (s1 && !s1.partner_ids.includes(p2Id)) {
          s1.partner_ids.push(p2Id);
          const p2 = playerMap.get(p2Id);
          if (p2) s1.partner_names.push(p2.name);
        }
        if (s2 && !s2.partner_ids.includes(p1Id)) {
          s2.partner_ids.push(p1Id);
          const p1 = playerMap.get(p1Id);
          if (p1) s2.partner_names.push(p1.name);
        }
      };

      const recordOpponents = (teamA: number[], teamB: number[]) => {
        for (const aId of teamA) {
          const sA = statsMap.get(aId);
          if (!sA) continue;
          for (const bId of teamB) {
            if (!sA.opponent_ids.includes(bId)) {
              sA.opponent_ids.push(bId);
              const pB = playerMap.get(bId);
              if (pB) sA.opponent_names.push(pB.name);
            }
          }
        }
      };

      recordPair(m.t1_p1_id, m.t1_p2_id);
      recordPair(m.t2_p1_id, m.t2_p2_id);
      recordOpponents([m.t1_p1_id, m.t1_p2_id], [m.t2_p1_id, m.t2_p2_id]);
      recordOpponents([m.t2_p1_id, m.t2_p2_id], [m.t1_p1_id, m.t1_p2_id]);
    }

    if (m.status === 'finished' && m.t1_games !== null && m.t2_games !== null) {
      const diff1 = m.t1_games - m.t2_games;
      const diff2 = m.t2_games - m.t1_games;

      const updateStats = (
        pId: number,
        gFor: number,
        gAgainst: number,
        diff: number,
        isWin: boolean
      ) => {
        const s = statsMap.get(pId);
        if (!s) return;
        s.matches_played += 1;
        s.games_for += gFor;
        s.games_against += gAgainst;
        s.game_diff += diff;
        if (isWin) {
          s.matches_won += 1;
        } else {
          s.matches_lost += 1;
        }
      };

      const t1Won = m.t1_games > m.t2_games;
      updateStats(m.t1_p1_id, m.t1_games, m.t2_games, diff1, t1Won);
      updateStats(m.t1_p2_id, m.t1_games, m.t2_games, diff1, t1Won);
      updateStats(m.t2_p1_id, m.t2_games, m.t1_games, diff2, !t1Won);
      updateStats(m.t2_p2_id, m.t2_games, m.t1_games, diff2, !t1Won);
    }
  }

  // Sort players
  const playerStatsList = Array.from(statsMap.values()).sort((a, b) => {
    if (b.game_diff !== a.game_diff) {
      return b.game_diff - a.game_diff;
    }
    if (b.games_for !== a.games_for) {
      return b.games_for - a.games_for;
    }
    if (b.matches_won !== a.matches_won) {
      return b.matches_won - a.matches_won;
    }
    return a.name.localeCompare(b.name);
  });

  // 6. Courts state
  const courts: { courtNumber: number; activeMatch: Match | null }[] = [];
  for (let c = 1; c <= settings.courts_count; c++) {
    const activeMatch = matches.find(
      (m) => m.court === c && m.status === 'in_progress'
    ) || null;
    courts.push({
      courtNumber: c,
      activeMatch,
    });
  }

  return {
    tournament,
    settings,
    players: playerStatsList,
    matches,
    courts,
    currentlyPlayingPlayerIds: Array.from(currentlyPlayingPlayerIds),
  };
}

export async function getAllTournaments(): Promise<Tournament[]> {
  const db = await initDb();
  const rows = await db.execute(`
    SELECT 
      t.id, t.name, t.date, t.courts_count, t.target_games, t.status, t.created_at,
      COUNT(DISTINCT p.id) as players_count,
      COUNT(DISTINCT CASE WHEN m.status = 'finished' THEN m.id END) as matches_count
    FROM tournaments t
    LEFT JOIN players p ON p.tournament_id = t.id
    LEFT JOIN matches m ON m.tournament_id = t.id
    GROUP BY t.id
    ORDER BY t.id DESC
  `);

  return rows.rows.map((row) => ({
    id: Number(row.id),
    name: String(row.name),
    date: String(row.date),
    courts_count: Number(row.courts_count),
    target_games: Number(row.target_games),
    status: (row.status as 'active' | 'finished') || 'active',
    created_at: String(row.created_at),
    players_count: Number(row.players_count || 0),
    matches_count: Number(row.matches_count || 0),
  }));
}
