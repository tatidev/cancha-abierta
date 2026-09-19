import { NextResponse } from "next/server";
import { initDb } from "@/lib/db";
import { getTournamentState } from "@/lib/stats";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, phone, tournament_id } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "El nombre del jugador es obligatorio." },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();
    const db = await initDb();

    // Determine tournament_id
    let tourneyId = tournament_id ? parseInt(tournament_id, 10) : undefined;
    if (!tourneyId) {
      const activeSetting = await db.execute("SELECT value FROM settings WHERE key = 'active_tournament_id'");
      tourneyId = activeSetting.rows[0]?.value ? parseInt(String(activeSetting.rows[0].value), 10) : 1;
    }

    // Check for duplicate name in THIS tournament
    const existing = await db.execute({
      sql: "SELECT id FROM players WHERE LOWER(name) = LOWER(?) AND tournament_id = ?",
      args: [trimmedName, tourneyId],
    });

    if (existing.rows.length > 0) {
      return NextResponse.json(
        { error: `Ya existe un jugador registrado con el nombre "${trimmedName}" en este torneo.` },
        { status: 400 }
      );
    }

    await db.execute({
      sql: "INSERT INTO players (tournament_id, name, phone, active) VALUES (?, ?, ?, 1)",
      args: [tourneyId, trimmedName, phone ? phone.trim() : null],
    });

    const state = await getTournamentState(tourneyId);
    return NextResponse.json({
      success: true,
      message: `Jugador "${trimmedName}" registrado con éxito.`,
      state,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al registrar jugador";
    console.error("Error in POST /api/players:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
