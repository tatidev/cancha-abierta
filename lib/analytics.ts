import { getDb, initDb } from "./db";

export interface AnalyticsEvent {
  id: number;
  event_type: string;
  tournament_id?: number | null;
  metadata?: string | null;
  user_agent?: string | null;
  created_at: string;
}

export async function logAnalyticsEvent(
  eventType: string,
  options: {
    tournament_id?: number;
    metadata?: Record<string, unknown> | string;
    user_agent?: string;
  } = {}
) {
  try {
    const db = getDb();
    const metaStr =
      typeof options.metadata === "object"
        ? JSON.stringify(options.metadata)
        : options.metadata || null;

    await db.execute({
      sql: `INSERT INTO analytics_events (event_type, tournament_id, metadata, user_agent)
            VALUES (?, ?, ?, ?)`,
      args: [
        eventType,
        options.tournament_id || null,
        metaStr,
        options.user_agent ? options.user_agent.slice(0, 200) : null,
      ],
    });
  } catch (err) {
    // Analytics should never throw or break main operations
    console.warn("[Analytics] Failed to log event:", eventType, err);
  }
}

export async function getAnalyticsSummary() {
  const db = await initDb();

  // 1. KPI Counts
  const [
    eventsCountRes,
    viewsTodayRes,
    matchesRes,
    playersRes,
    tourneysRes,
    recentEventsRes,
    tourneysListRes,
  ] = await Promise.all([
    db.execute(`
      SELECT 
        COUNT(*) as total_events,
        SUM(CASE WHEN event_type = 'page_view' THEN 1 ELSE 0 END) as total_views,
        SUM(CASE WHEN event_type = 'qr_opened' THEN 1 ELSE 0 END) as total_qr_opens,
        SUM(CASE WHEN event_type = 'admin_login' THEN 1 ELSE 0 END) as total_admin_logins,
        SUM(CASE WHEN event_type = 'match_assigned' THEN 1 ELSE 0 END) as total_matches_assigned,
        SUM(CASE WHEN event_type = 'score_recorded' THEN 1 ELSE 0 END) as total_scores_recorded
      FROM analytics_events
    `),
    db.execute(`
      SELECT 
        COUNT(*) as views_today
      FROM analytics_events
      WHERE event_type = 'page_view'
        AND DATE(created_at) = DATE('now')
    `),
    db.execute(`
      SELECT 
        COUNT(*) as total_matches,
        SUM(CASE WHEN status = 'finished' THEN 1 ELSE 0 END) as finished_matches,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as active_matches,
        COALESCE(SUM(t1_games + t2_games), 0) as total_games
      FROM matches
    `),
    db.execute(`
      SELECT 
        COUNT(*) as total_players,
        SUM(CASE WHEN active = 1 THEN 1 ELSE 0 END) as active_players
      FROM players
    `),
    db.execute(`
      SELECT COUNT(*) as total_tournaments FROM tournaments
    `),
    db.execute(`
      SELECT id, event_type, tournament_id, metadata, user_agent, created_at
      FROM analytics_events
      ORDER BY id DESC
      LIMIT 50
    `),
    db.execute(`
      SELECT t.id, t.name, t.date, t.courts_count, t.status, t.created_at,
             COUNT(DISTINCT p.id) as players_count,
             COUNT(DISTINCT m.id) as matches_count
      FROM tournaments t
      LEFT JOIN players p ON p.tournament_id = t.id
      LEFT JOIN matches m ON m.tournament_id = t.id
      GROUP BY t.id
      ORDER BY t.id DESC
    `),
  ]);

  // 2. Timeline of last 14 days
  const timelineRes = await db.execute(`
    SELECT 
      DATE(created_at) as date,
      SUM(CASE WHEN event_type = 'page_view' THEN 1 ELSE 0 END) as views,
      SUM(CASE WHEN event_type = 'score_recorded' THEN 1 ELSE 0 END) as scores,
      COUNT(*) as total_actions
    FROM analytics_events
    WHERE created_at >= DATE('now', '-14 days')
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `);

  const eventsSummary = eventsCountRes.rows[0] || {};
  const matchesSummary = matchesRes.rows[0] || {};
  const playersSummary = playersRes.rows[0] || {};
  const viewsToday = Number(viewsTodayRes.rows[0]?.views_today || 0);

  // 3. Top players with most wins/games across all tournaments
  const topPlayersRes = await db.execute(`
    SELECT 
      p.name,
      COUNT(DISTINCT p.tournament_id) as tournaments_played,
      COUNT(DISTINCT p.id) as registrations
    FROM players p
    GROUP BY LOWER(TRIM(p.name))
    ORDER BY registrations DESC, p.name ASC
    LIMIT 10
  `);

  return {
    kpis: {
      total_views: Number(eventsSummary.total_views || 0),
      views_today: viewsToday,
      total_qr_opens: Number(eventsSummary.total_qr_opens || 0),
      total_admin_logins: Number(eventsSummary.total_admin_logins || 0),
      total_matches_assigned: Number(eventsSummary.total_matches_assigned || 0),
      total_scores_recorded: Number(eventsSummary.total_scores_recorded || 0),
      total_tournaments: Number(tourneysRes.rows[0]?.total_tournaments || 0),
      total_matches: Number(matchesSummary.total_matches || 0),
      finished_matches: Number(matchesSummary.finished_matches || 0),
      active_matches: Number(matchesSummary.active_matches || 0),
      total_games: Number(matchesSummary.total_games || 0),
      total_players: Number(playersSummary.total_players || 0),
      active_players: Number(playersSummary.active_players || 0),
    },
    timeline: timelineRes.rows.map((row) => ({
      date: String(row.date),
      views: Number(row.views || 0),
      scores: Number(row.scores || 0),
      total_actions: Number(row.total_actions || 0),
    })),
    recent_events: recentEventsRes.rows.map((r) => ({
      id: Number(r.id),
      event_type: String(r.event_type),
      tournament_id: r.tournament_id ? Number(r.tournament_id) : null,
      metadata: r.metadata ? String(r.metadata) : null,
      user_agent: r.user_agent ? String(r.user_agent) : null,
      created_at: String(r.created_at),
    })),
    tournaments: tourneysListRes.rows.map((t) => ({
      id: Number(t.id),
      name: String(t.name),
      date: String(t.date),
      courts_count: Number(t.courts_count),
      status: String(t.status),
      created_at: String(t.created_at),
      players_count: Number(t.players_count || 0),
      matches_count: Number(t.matches_count || 0),
    })),
    top_players: topPlayersRes.rows.map((tp) => ({
      name: String(tp.name),
      tournaments_played: Number(tp.tournaments_played),
    })),
  };
}
