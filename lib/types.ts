export interface Tournament {
  id: number;
  name: string;
  date: string; // YYYY-MM-DD
  courts_count: number;
  target_games: number;
  status: 'active' | 'finished';
  created_at: string;
  players_count?: number;
  matches_count?: number;
  leader_name?: string;
  leader_points?: number;
}

export interface Player {
  id: number;
  tournament_id?: number;
  name: string;
  phone?: string;
  active: number; // 1 = active, 0 = paused/inactive
  created_at: string;
}

export interface PlayerStats extends Player {
  matches_played: number;
  matches_won: number;
  matches_lost: number;
  games_for: number;
  games_against: number;
  game_diff: number; // Net score (points)
  partner_ids: number[];
  partner_names: string[];
  opponent_ids: number[];
  opponent_names: string[];
}

export interface Match {
  id: number;
  tournament_id?: number;
  round: number;
  court: number;
  t1_p1_id: number;
  t1_p2_id: number;
  t2_p1_id: number;
  t2_p2_id: number;
  t1_games: number | null;
  t2_games: number | null;
  status: 'in_progress' | 'finished' | 'cancelled';
  created_at: string;
  finished_at: string | null;

  // Joined player names for display
  t1_p1_name?: string;
  t1_p2_name?: string;
  t2_p1_name?: string;
  t2_p2_name?: string;
}

export interface TournamentSettings {
  active_tournament_id: number;
  tournament_name: string;
  tournament_date: string;
  courts_count: number;
  target_games: number;
  admin_pin: string;
  status: 'active' | 'finished';
}

export interface ProposedMatch {
  court: number;
  round: number;
  team1: [Player, Player];
  team2: [Player, Player];
  conflictWarning?: string;
}
