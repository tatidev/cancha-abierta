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
    const tournamentId = parseInt(id, 10);
    const body = await req.json();
    const { action, name, date, courts_count, target_games, status } = body;
    const db = await initDb();

    if (action === "set_active") {
      // Mark as active
      await db.execute({
        sql: "UPDATE tournaments SET status = 'active' WHERE id = ?",
        args: [tournamentId],
      });

      // Update settings
      await db.execute({
        sql: "INSERT OR REPLACE INTO settings (key, value) VALUES ('active_tournament_id', ?)",
        args: [tournamentId.toString()],
      });

      // Load tournament details into settings
      const t = await db.execute({
        sql: "SELECT name, courts_count, target_games FROM tournaments WHERE id = ?",
        args: [tournamentId],
      });

      if (t.rows.length > 0) {
        await db.execute({
          sql: "INSERT OR REPLACE INTO settings (key, value) VALUES ('tournament_name', ?)",
          args: [String(t.rows[0].name)],
        });
        await db.execute({
          sql: "INSERT OR REPLACE INTO settings (key, value) VALUES ('courts_count', ?)",
          args: [String(t.rows[0].courts_count)],
        });
        await db.execute({
          sql: "INSERT OR REPLACE INTO settings (key, value) VALUES ('target_games', ?)",
          args: [String(t.rows[0].target_games)],
        });
      }

      const state = await getTournamentState(tournamentId);
      return NextResponse.json({ success: true, state });
    }

    // Generic update
    if (name) {
      await db.execute({
        sql: "UPDATE tournaments SET name = ? WHERE id = ?",
        args: [name.trim(), tournamentId],
      });
      await db.execute({
        sql: "INSERT OR REPLACE INTO settings (key, value) VALUES ('tournament_name', ?)",
        args: [name.trim()],
      });
    }

    if (date) {
      await db.execute({
        sql: "UPDATE tournaments SET date = ? WHERE id = ?",
        args: [date.trim(), tournamentId],
      });
    }

    if (courts_count !== undefined) {
      const c = Math.max(1, Math.min(20, parseInt(courts_count, 10)));
      await db.execute({
        sql: "UPDATE tournaments SET courts_count = ? WHERE id = ?",
        args: [c, tournamentId],
      });
      await db.execute({
        sql: "INSERT OR REPLACE INTO settings (key, value) VALUES ('courts_count', ?)",
        args: [c.toString()],
      });
    }

    if (target_games !== undefined) {
      const tg = Math.max(1, Math.min(10, parseInt(target_games, 10)));
      await db.execute({
        sql: "UPDATE tournaments SET target_games = ? WHERE id = ?",
        args: [tg, tournamentId],
      });
      await db.execute({
        sql: "INSERT OR REPLACE INTO settings (key, value) VALUES ('target_games', ?)",
        args: [tg.toString()],
      });
    }

    if (status) {
      await db.execute({
        sql: "UPDATE tournaments SET status = ? WHERE id = ?",
        args: [status, tournamentId],
      });
    }

    const state = await getTournamentState(tournamentId);
    return NextResponse.json({ success: true, state });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al actualizar torneo";
    console.error("Error in PATCH /api/tournaments/[id]:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tournamentId = parseInt(id, 10);
    const db = await initDb();

    // Check count of tournaments
    const countCheck = await db.execute("SELECT COUNT(*) as count FROM tournaments");
    const totalTournaments = Number(countCheck.rows[0]?.count || 0);

    if (totalTournaments <= 1) {
      return NextResponse.json(
        { error: "No podés eliminar el único torneo existente. En su lugar, podés reiniciarlo o crear uno nuevo." },
        { status: 400 }
      );
    }

    // Delete matches and players belonging to this tournament
    await db.execute({
      sql: "DELETE FROM matches WHERE tournament_id = ?",
      args: [tournamentId],
    });

    await db.execute({
      sql: "DELETE FROM players WHERE tournament_id = ?",
      args: [tournamentId],
    });

    await db.execute({
      sql: "DELETE FROM tournaments WHERE id = ?",
      args: [tournamentId],
    });

    // Check if deleted tournament was the active one
    const activeSetting = await db.execute("SELECT value FROM settings WHERE key = 'active_tournament_id'");
    const activeId = activeSetting.rows[0]?.value ? parseInt(String(activeSetting.rows[0].value), 10) : 1;

    let newActiveId = activeId;
    if (activeId === tournamentId) {
      // Pick the latest remaining tournament
      const remaining = await db.execute("SELECT id, name, courts_count, target_games FROM tournaments ORDER BY id DESC LIMIT 1");
      if (remaining.rows.length > 0) {
        newActiveId = Number(remaining.rows[0].id);
        await db.execute({
          sql: "INSERT OR REPLACE INTO settings (key, value) VALUES ('active_tournament_id', ?)",
          args: [newActiveId.toString()],
        });
        await db.execute({
          sql: "INSERT OR REPLACE INTO settings (key, value) VALUES ('tournament_name', ?)",
          args: [String(remaining.rows[0].name)],
        });
        await db.execute({
          sql: "INSERT OR REPLACE INTO settings (key, value) VALUES ('courts_count', ?)",
          args: [String(remaining.rows[0].courts_count)],
        });
        await db.execute({
          sql: "INSERT OR REPLACE INTO settings (key, value) VALUES ('target_games', ?)",
          args: [String(remaining.rows[0].target_games)],
        });
      }
    }

    const state = await getTournamentState(newActiveId);
    return NextResponse.json({
      success: true,
      message: "Torneo e historial eliminados correctamente.",
      state,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al eliminar torneo";
    console.error("Error in DELETE /api/tournaments/[id]:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
