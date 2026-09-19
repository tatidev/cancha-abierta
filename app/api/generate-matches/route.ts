import { NextResponse } from "next/server";
import { getTournamentState } from "@/lib/stats";
import { generateMatchesForCourts } from "@/lib/matchmaker";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const tourneyId = body.tournament_id ? parseInt(body.tournament_id, 10) : undefined;
    const state = await getTournamentState(tourneyId);

    // Determine target courts
    let targetCourts: number[] = [];
    if (body.courtNumber) {
      targetCourts = [parseInt(body.courtNumber, 10)];
    } else {
      // Find all free courts
      targetCourts = state.courts
        .filter((c) => c.activeMatch === null)
        .map((c) => c.courtNumber);
    }

    if (targetCourts.length === 0) {
      return NextResponse.json(
        { error: "No hay canchas libres en este momento para asignar partidos." },
        { status: 400 }
      );
    }

    // Determine next round number
    const maxRound = state.matches.reduce(
      (max, m) => (m.round > max ? m.round : max),
      0
    );
    const nextRound = maxRound === 0 ? 1 : maxRound + 1;

    const result = generateMatchesForCourts(
      state.players,
      state.matches,
      targetCourts,
      nextRound
    );

    return NextResponse.json({
      success: true,
      nextRound,
      ...result,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al generar partidos";
    console.error("Error in POST /api/generate-matches:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
