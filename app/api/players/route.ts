import { NextResponse } from "next/server";
import { initDb } from "@/lib/db";
import { getTournamentState } from "@/lib/stats";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, phone } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "El nombre del jugador es obligatorio." },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();
    const db = await initDb();

    // Check for duplicate name
    const existing = await db.execute({
      sql: "SELECT id FROM players WHERE LOWER(name) = LOWER(?)",
      args: [trimmedName],
    });

    if (existing.rows.length > 0) {
      return NextResponse.json(
        { error: `Ya existe un jugador registrado con el nombre "${trimmedName}".` },
        { status: 400 }
      );
    }

    await db.execute({
      sql: "INSERT INTO players (name, phone, active) VALUES (?, ?, 1)",
      args: [trimmedName, phone ? phone.trim() : null],
    });

    const state = await getTournamentState();
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
