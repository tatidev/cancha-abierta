import { NextResponse } from "next/server";
import { initDb } from "@/lib/db";
import { getTournamentState } from "@/lib/stats";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const playerId = parseInt(id, 10);
    const body = await req.json();
    const { active, name, phone } = body;
    const db = await initDb();

    if (active !== undefined) {
      await db.execute({
        sql: "UPDATE players SET active = ? WHERE id = ?",
        args: [active ? 1 : 0, playerId],
      });
    }

    if (name !== undefined && name.trim()) {
      await db.execute({
        sql: "UPDATE players SET name = ? WHERE id = ?",
        args: [name.trim(), playerId],
      });
    }

    if (phone !== undefined) {
      await db.execute({
        sql: "UPDATE players SET phone = ? WHERE id = ?",
        args: [phone.trim() || null, playerId],
      });
    }

    const state = await getTournamentState();
    return NextResponse.json({ success: true, state });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al actualizar jugador";
    console.error("Error in PATCH /api/players/[id]:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const playerId = parseInt(id, 10);
    const db = await initDb();

    // Check if player has played any matches
    const matchesCount = await db.execute({
      sql: `SELECT COUNT(*) as count FROM matches 
            WHERE (t1_p1_id = ? OR t1_p2_id = ? OR t2_p1_id = ? OR t2_p2_id = ?) 
            AND status != 'cancelled'`,
      args: [playerId, playerId, playerId, playerId],
    });

    const hasMatches = Number(matchesCount.rows[0]?.count || 0) > 0;

    if (hasMatches) {
      // If player already played matches, instead of hard deleting which would break historical scores,
      // we deactivate the player
      await db.execute({
        sql: "UPDATE players SET active = 0 WHERE id = ?",
        args: [playerId],
      });
      const state = await getTournamentState();
      return NextResponse.json({
        success: true,
        message: "El jugador ya tiene partidos jugados, por lo que fue pausado/desactivado para conservar el historial.",
        state,
      });
    }

    // Hard delete if never played
    await db.execute({
      sql: "DELETE FROM players WHERE id = ?",
      args: [playerId],
    });

    const state = await getTournamentState();
    return NextResponse.json({ success: true, message: "Jugador eliminado con éxito.", state });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al eliminar jugador";
    console.error("Error in DELETE /api/players/[id]:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
