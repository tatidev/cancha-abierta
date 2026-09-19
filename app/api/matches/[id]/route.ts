import { NextResponse } from "next/server";
import { initDb } from "@/lib/db";
import { getTournamentState } from "@/lib/stats";
import { logAnalyticsEvent } from "@/lib/analytics";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const matchId = parseInt(id, 10);
    const body = await req.json();
    const { action, t1_games, t2_games } = body;
    const db = await initDb();

    // Look up match tournament_id
    const matchRow = await db.execute({
      sql: "SELECT tournament_id FROM matches WHERE id = ?",
      args: [matchId],
    });
    const tourneyId = matchRow.rows[0]?.tournament_id
      ? Number(matchRow.rows[0].tournament_id)
      : undefined;

    if (action === "finish" || action === "edit_score") {
      const g1 = parseInt(t1_games, 10);
      const g2 = parseInt(t2_games, 10);

      if (isNaN(g1) || isNaN(g2) || g1 < 0 || g2 < 0) {
        return NextResponse.json(
          { error: "Los games deben ser números positivos." },
          { status: 400 }
        );
      }

      if (g1 === g2) {
        return NextResponse.json(
          { error: "En este formato debe haber un ganador de games (no empate)." },
          { status: 400 }
        );
      }

      await db.execute({
        sql: `UPDATE matches 
              SET t1_games = ?, t2_games = ?, status = 'finished', finished_at = CURRENT_TIMESTAMP
              WHERE id = ?`,
        args: [g1, g2, matchId],
      });

      logAnalyticsEvent("score_recorded", {
        tournament_id: tourneyId,
        metadata: { match_id: matchId, score: `${g1}-${g2}` },
      });
    } else if (action === "cancel") {
      await db.execute({
        sql: "UPDATE matches SET status = 'cancelled', finished_at = CURRENT_TIMESTAMP WHERE id = ?",
        args: [matchId],
      });
    }

    const state = await getTournamentState(tourneyId);
    return NextResponse.json({ success: true, state });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al actualizar partido";
    console.error("Error in PATCH /api/matches/[id]:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const matchId = parseInt(id, 10);
    const db = await initDb();

    const matchRow = await db.execute({
      sql: "SELECT tournament_id FROM matches WHERE id = ?",
      args: [matchId],
    });
    const tourneyId = matchRow.rows[0]?.tournament_id
      ? Number(matchRow.rows[0].tournament_id)
      : undefined;

    await db.execute({
      sql: "DELETE FROM matches WHERE id = ?",
      args: [matchId],
    });

    const state = await getTournamentState(tourneyId);
    return NextResponse.json({ success: true, message: "Partido eliminado.", state });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al eliminar partido";
    console.error("Error in DELETE /api/matches/[id]:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
