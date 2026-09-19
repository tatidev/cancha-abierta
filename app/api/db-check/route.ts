import { NextResponse } from "next/server";
import { getDatabaseConfig, initDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const startTime = Date.now();
  const config = getDatabaseConfig();

  const maskedUrl = config.url
    ? config.url.replace(/\/\/([^:]+):?([^@]*)@/, "//***:***@")
    : null;

  const maskedToken = config.authToken
    ? `${config.authToken.slice(0, 10)}...${config.authToken.slice(-8)} (len: ${config.authToken.length})`
    : null;

  const diagnostics: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    environment: {
      is_vercel: Boolean(process.env.VERCEL),
      node_env: process.env.NODE_ENV,
      turso_database_url_set: Boolean(process.env.TURSO_DATABASE_URL),
      turso_auth_token_set: Boolean(process.env.TURSO_AUTH_TOKEN),
      resolved_url: maskedUrl,
      resolved_token: maskedToken,
      is_turso: config.isTurso,
    },
  };

  try {
    const db = await initDb();
    const pingStart = Date.now();
    await db.execute("SELECT 1 as ping");
    const pingMs = Date.now() - pingStart;

    const [tourneys, players, matches] = await Promise.all([
      db.execute("SELECT COUNT(*) as count FROM tournaments"),
      db.execute("SELECT COUNT(*) as count FROM players"),
      db.execute("SELECT COUNT(*) as count FROM matches"),
    ]);

    diagnostics.status = "connected";
    diagnostics.ping_ms = pingMs;
    diagnostics.total_time_ms = Date.now() - startTime;
    diagnostics.counts = {
      tournaments: Number(tourneys.rows[0]?.count || 0),
      players: Number(players.rows[0]?.count || 0),
      matches: Number(matches.rows[0]?.count || 0),
    };

    return NextResponse.json(diagnostics, { status: 200 });
  } catch (error: unknown) {
    const err = error as Error & { code?: string };
    diagnostics.status = "error";
    diagnostics.total_time_ms = Date.now() - startTime;
    diagnostics.error = {
      name: err.name,
      message: err.message,
      code: err.code,
    };

    let suggestion = "Verifica los logs en Vercel.";
    if (!process.env.TURSO_DATABASE_URL) {
      suggestion =
        "TURSO_DATABASE_URL no está configurada en las Variables de Entorno de Vercel. Agrégala en Settings -> Environment Variables y haz un Redeploy.";
    } else if (!process.env.TURSO_AUTH_TOKEN) {
      suggestion =
        "TURSO_AUTH_TOKEN no está configurada en las Variables de Entorno de Vercel. Agrégala en Settings -> Environment Variables y haz un Redeploy.";
    } else if (err.message.includes("401") || err.message.includes("Unauthorized")) {
      suggestion =
        "El token de autenticación (TURSO_AUTH_TOKEN) es inválido o expiró. Genera uno nuevo con turso CLI y actualízalo en Vercel.";
    } else if (err.message.includes("read-only")) {
      suggestion =
        "Vercel está intentando usar SQLite local ('file:padel.db') porque no se detectaron las variables de entorno de Turso. Asegúrate de agregarlas a Production y hacer Redeploy.";
    }

    diagnostics.suggestion = suggestion;

    return NextResponse.json(diagnostics, { status: 500 });
  }
}
