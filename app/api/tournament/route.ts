import { NextResponse } from "next/server";
import { getTournamentState } from "@/lib/stats";
import { initDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const state = await getTournamentState();
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
    const { action, courts_count, target_games, tournament_name, admin_pin } = body;
    const db = await initDb();

    if (action === "reset_tournament") {
      // Clear matches and optionally keep or clear players
      const keepPlayers = Boolean(body.keepPlayers);
      await db.execute("DELETE FROM matches");
      if (!keepPlayers) {
        await db.execute("DELETE FROM players");
      }
      return NextResponse.json({ success: true, message: "Torneo reiniciado con éxito" });
    }

    if (courts_count !== undefined) {
      const count = Math.max(1, Math.min(20, parseInt(courts_count, 10)));
      await db.execute({
        sql: "INSERT OR REPLACE INTO settings (key, value) VALUES ('courts_count', ?)",
        args: [count.toString()],
      });
    }

    if (target_games !== undefined) {
      const tg = Math.max(1, Math.min(10, parseInt(target_games, 10)));
      await db.execute({
        sql: "INSERT OR REPLACE INTO settings (key, value) VALUES ('target_games', ?)",
        args: [tg.toString()],
      });
    }

    if (tournament_name !== undefined && tournament_name.trim()) {
      await db.execute({
        sql: "INSERT OR REPLACE INTO settings (key, value) VALUES ('tournament_name', ?)",
        args: [tournament_name.trim()],
      });
    }

    if (admin_pin !== undefined && admin_pin.trim()) {
      await db.execute({
        sql: "INSERT OR REPLACE INTO settings (key, value) VALUES ('admin_pin', ?)",
        args: [admin_pin.trim()],
      });
    }

    const state = await getTournamentState();
    return NextResponse.json(state);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al actualizar configuración";
    console.error("Error in POST /api/tournament:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
