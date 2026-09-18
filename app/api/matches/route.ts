import { NextResponse } from "next/server";
import { initDb } from "@/lib/db";
import { getTournamentState } from "@/lib/stats";
import { validateManualMatch } from "@/lib/matchmaker";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const state = await getTournamentState();
    return NextResponse.json({ matches: state.matches });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al obtener partidos";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const matchesToCreate = Array.isArray(body.matches)
      ? body.matches
      : [body];

    if (matchesToCreate.length === 0) {
      return NextResponse.json({ error: "No se proporcionaron partidos para crear." }, { status: 400 });
    }

    const state = await getTournamentState();
    const db = await initDb();

    // Validate each match
    for (const m of matchesToCreate) {
      const court = parseInt(m.court, 10);
      const round = parseInt(m.round || "1", 10);
      const t1_p1_id = parseInt(m.t1_p1_id, 10);
      const t1_p2_id = parseInt(m.t1_p2_id, 10);
      const t2_p1_id = parseInt(m.t2_p1_id, 10);
      const t2_p2_id = parseInt(m.t2_p2_id, 10);

      // Verify court availability
      const courtOccupied = state.courts.some(
        (c) => c.courtNumber === court && c.activeMatch !== null
      );
      if (courtOccupied) {
        return NextResponse.json(
          { error: `La Cancha ${court} ya tiene un partido en curso. Debe finalizarse o cancelarse antes.` },
          { status: 400 }
        );
      }

      // Validate anti-repetition rule
      const validation = validateManualMatch(
        t1_p1_id,
        t1_p2_id,
        t2_p1_id,
        t2_p2_id,
        state.players,
        state.matches
      );

      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }

      // Insert match
      await db.execute({
        sql: `INSERT INTO matches (round, court, t1_p1_id, t1_p2_id, t2_p1_id, t2_p2_id, status)
              VALUES (?, ?, ?, ?, ?, ?, 'in_progress')`,
        args: [round, court, t1_p1_id, t1_p2_id, t2_p1_id, t2_p2_id],
      });
    }

    const updatedState = await getTournamentState();
    return NextResponse.json({
      success: true,
      message: `${matchesToCreate.length} partido(s) iniciado(s) correctamente.`,
      state: updatedState,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al registrar partido";
    console.error("Error in POST /api/matches:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
