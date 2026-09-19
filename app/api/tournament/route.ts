import { NextResponse } from "next/server";
import { getTournamentState } from "@/lib/stats";
import { initDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const tournamentIdParam = url.searchParams.get("tournament_id");
    const targetId = tournamentIdParam ? parseInt(tournamentIdParam, 10) : undefined;

    const state = await getTournamentState(targetId);
    return NextResponse.json(state);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al obtener estado del torneo";
    console.error("Error in GET /api/tournament:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, courts_count, target_games, tournament_name, tournament_date, admin_pin } = body;
    const db = await initDb();

    // Get active tournament id
    const activeSetting = await db.execute("SELECT value FROM settings WHERE key = 'active_tournament_id'");
    const activeTournamentId = activeSetting.rows[0]?.value ? parseInt(String(activeSetting.rows[0].value), 10) : 1;

    if (action === "reset_tournament") {
      const keepPlayers = Boolean(body.keepPlayers);
      await db.execute({
        sql: "DELETE FROM matches WHERE tournament_id = ?",
        args: [activeTournamentId],
      });
      if (!keepPlayers) {
        await db.execute({
          sql: "DELETE FROM players WHERE tournament_id = ?",
          args: [activeTournamentId],
        });
      }
      const state = await getTournamentState(activeTournamentId);
      return NextResponse.json({ success: true, message: "Torneo reiniciado con éxito", state });
    }

    if (courts_count !== undefined) {
      const count = Math.max(1, Math.min(20, parseInt(courts_count, 10)));
      await db.execute({
        sql: "INSERT OR REPLACE INTO settings (key, value) VALUES ('courts_count', ?)",
        args: [count.toString()],
      });
      await db.execute({
        sql: "UPDATE tournaments SET courts_count = ? WHERE id = ?",
        args: [count, activeTournamentId],
      });
    }

    if (target_games !== undefined) {
      const tg = Math.max(1, Math.min(10, parseInt(target_games, 10)));
      await db.execute({
        sql: "INSERT OR REPLACE INTO settings (key, value) VALUES ('target_games', ?)",
        args: [tg.toString()],
      });
      await db.execute({
        sql: "UPDATE tournaments SET target_games = ? WHERE id = ?",
        args: [tg, activeTournamentId],
      });
    }

    if (tournament_name !== undefined && tournament_name.trim()) {
      const trimmed = tournament_name.trim();
      await db.execute({
        sql: "INSERT OR REPLACE INTO settings (key, value) VALUES ('tournament_name', ?)",
        args: [trimmed],
      });
      await db.execute({
        sql: "UPDATE tournaments SET name = ? WHERE id = ?",
        args: [trimmed, activeTournamentId],
      });
    }

    if (tournament_date !== undefined && tournament_date.trim()) {
      const trimmedDate = tournament_date.trim();
      await db.execute({
        sql: "UPDATE tournaments SET date = ? WHERE id = ?",
        args: [trimmedDate, activeTournamentId],
      });
    }

    if (admin_pin !== undefined && admin_pin.trim()) {
      await db.execute({
        sql: "INSERT OR REPLACE INTO settings (key, value) VALUES ('admin_pin', ?)",
        args: [admin_pin.trim()],
      });
    }

    const state = await getTournamentState(activeTournamentId);
    return NextResponse.json(state);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al actualizar configuración";
    console.error("Error in POST /api/tournament:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
