import { NextResponse } from "next/server";
import { initDb } from "@/lib/db";
import { getTournamentState } from "@/lib/stats";
import { validateManualMatch } from "@/lib/matchmaker";
import { logAnalyticsEvent } from "@/lib/analytics";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const tournamentIdParam = url.searchParams.get("tournament_id");
    const targetId = tournamentIdParam ? parseInt(tournamentIdParam, 10) : undefined;

    const state = await getTournamentState(targetId);
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

    const db = await initDb();
    let tourneyId = body.tournament_id ? parseInt(body.tournament_id, 10) : undefined;
    if (!tourneyId) {
      const activeSetting = await db.execute("SELECT value FROM settings WHERE key = 'active_tournament_id'");
      tourneyId = activeSetting.rows[0]?.value ? parseInt(String(activeSetting.rows[0].value), 10) : 1;
    }

    const state = await getTournamentState(tourneyId);

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

      const allowRepeat = Boolean(m.allow_repeat || body.allow_repeat);

      // Validate anti-repetition rule
      const validation = validateManualMatch(
        t1_p1_id,
        t1_p2_id,
        t2_p1_id,
        t2_p2_id,
        state.players,
        state.matches,
        undefined,
        allowRepeat
      );

      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }

      // Insert match
      await db.execute({
        sql: `INSERT INTO matches (tournament_id, round, court, t1_p1_id, t1_p2_id, t2_p1_id, t2_p2_id, status)
              VALUES (?, ?, ?, ?, ?, ?, ?, 'in_progress')`,
        args: [tourneyId, round, court, t1_p1_id, t1_p2_id, t2_p1_id, t2_p2_id],
      });
    }

    logAnalyticsEvent("match_assigned", {
      tournament_id: tourneyId,
      metadata: { count: matchesToCreate.length },
    });

    const updatedState = await getTournamentState(tourneyId);
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
