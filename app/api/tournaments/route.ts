import { NextResponse } from "next/server";
import { initDb } from "@/lib/db";
import { getAllTournaments, getTournamentState } from "@/lib/stats";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const tournaments = await getAllTournaments();
    return NextResponse.json({ tournaments });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al obtener torneos";
    console.error("Error in GET /api/tournaments:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      name,
      date,
      courts_count = 5,
      target_games = 4,
      copy_players_from_id,
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "El nombre del torneo es obligatorio." },
        { status: 400 }
      );
    }

    const tName = name.trim();
    const tDate = date && date.trim() ? date.trim() : new Date().toISOString().split("T")[0];
    const cCount = Math.max(1, Math.min(20, parseInt(courts_count, 10) || 5));
    const tgCount = Math.max(1, Math.min(10, parseInt(target_games, 10) || 4));

    const db = await initDb();

    // Mark current active tournament as finished
    const currentActiveSetting = await db.execute(
      "SELECT value FROM settings WHERE key = 'active_tournament_id'"
    );
    const prevActiveId = currentActiveSetting.rows[0]?.value
      ? parseInt(String(currentActiveSetting.rows[0].value), 10)
      : 1;

    await db.execute({
      sql: "UPDATE tournaments SET status = 'finished' WHERE id = ?",
      args: [prevActiveId],
    });

    // Create new tournament
    const insertResult = await db.execute({
      sql: `INSERT INTO tournaments (name, date, courts_count, target_games, status)
            VALUES (?, ?, ?, ?, 'active')`,
      args: [tName, tDate, cCount, tgCount],
    });

    const newTournamentId = Number(insertResult.lastInsertRowid);

    // Update settings to point to this new tournament
    await db.execute({
      sql: "INSERT OR REPLACE INTO settings (key, value) VALUES ('active_tournament_id', ?)",
      args: [newTournamentId.toString()],
    });

    await db.execute({
      sql: "INSERT OR REPLACE INTO settings (key, value) VALUES ('tournament_name', ?)",
      args: [tName],
    });

    await db.execute({
      sql: "INSERT OR REPLACE INTO settings (key, value) VALUES ('courts_count', ?)",
      args: [cCount.toString()],
    });

    await db.execute({
      sql: "INSERT OR REPLACE INTO settings (key, value) VALUES ('target_games', ?)",
      args: [tgCount.toString()],
    });

    // Optionally copy players from a previous tournament
    if (copy_players_from_id) {
      const sourceId = parseInt(copy_players_from_id, 10);
      const prevPlayers = await db.execute({
        sql: "SELECT name, phone FROM players WHERE tournament_id = ? ORDER BY id ASC",
        args: [sourceId],
      });

      for (const p of prevPlayers.rows) {
        await db.execute({
          sql: "INSERT INTO players (tournament_id, name, phone, active) VALUES (?, ?, ?, 1)",
          args: [newTournamentId, p.name as string, p.phone ? (p.phone as string) : null],
        });
      }
    }

    const state = await getTournamentState(newTournamentId);
    return NextResponse.json({
      success: true,
      message: `Torneo "${tName}" creado con éxito.`,
      tournament: state.tournament,
      state,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al crear nuevo torneo";
    console.error("Error in POST /api/tournaments:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
