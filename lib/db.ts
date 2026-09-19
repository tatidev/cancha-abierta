import { createClient, Client } from "@libsql/client";

let client: Client | null = null;
let initialized = false;

export function getDatabaseConfig() {
  let rawUrl = (process.env.TURSO_DATABASE_URL || "").trim();
  let rawToken = (process.env.TURSO_AUTH_TOKEN || "").trim();

  // Strip accidental quotes (single or double) from Vercel UI copy-paste
  if (
    (rawUrl.startsWith('"') && rawUrl.endsWith('"')) ||
    (rawUrl.startsWith("'") && rawUrl.endsWith("'"))
  ) {
    rawUrl = rawUrl.slice(1, -1).trim();
  }
  if (
    (rawToken.startsWith('"') && rawToken.endsWith('"')) ||
    (rawToken.startsWith("'") && rawToken.endsWith("'"))
  ) {
    rawToken = rawToken.slice(1, -1).trim();
  }

  let finalUrl = rawUrl;
  const isTurso =
    finalUrl.startsWith("libsql://") || finalUrl.startsWith("https://");

  // In Serverless environments like Vercel Lambda, https:// uses the HTTP fetch pipeline,
  // preventing WebSocket connection drops, timeouts, and native binary loading issues.
  if (finalUrl.startsWith("libsql://")) {
    finalUrl = finalUrl.replace("libsql://", "https://");
  }

  if (!finalUrl) {
    if (process.env.VERCEL || process.env.NODE_ENV === "production") {
      console.warn(
        "[DB WARNING] TURSO_DATABASE_URL is not set in environment variables! Using local fallback."
      );
    }
    finalUrl = "file:padel.db";
  }

  return {
    rawUrl,
    url: finalUrl,
    authToken: rawToken || undefined,
    isTurso,
  };
}

export function getDb(): Client {
  if (!client) {
    const config = getDatabaseConfig();

    if (config.isTurso) {
      console.log("[DB] Connecting to Turso Cloud via HTTP:", config.url);
    } else {
      console.log("[DB] Using Local SQLite fallback: file:padel.db");
    }

    client = createClient({
      url: config.url,
      authToken: config.authToken,
    });
  }
  return client;
}

export async function initDb(): Promise<Client> {
  const db = getDb();
  if (initialized) return db;

  try {
    // 1. Run schema and initial settings in a single batch to avoid multiple network roundtrips
    await db.batch(
      [
        `CREATE TABLE IF NOT EXISTS tournaments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          date TEXT NOT NULL,
          courts_count INTEGER DEFAULT 5,
          target_games INTEGER DEFAULT 4,
          status TEXT DEFAULT 'active',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );`,
        `CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );`,
        `CREATE TABLE IF NOT EXISTS players (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          tournament_id INTEGER DEFAULT 1,
          name TEXT NOT NULL,
          phone TEXT,
          active INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );`,
        `CREATE TABLE IF NOT EXISTS matches (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          tournament_id INTEGER DEFAULT 1,
          round INTEGER NOT NULL,
          court INTEGER NOT NULL,
          t1_p1_id INTEGER NOT NULL,
          t1_p2_id INTEGER NOT NULL,
          t2_p1_id INTEGER NOT NULL,
          t2_p2_id INTEGER NOT NULL,
          t1_games INTEGER DEFAULT NULL,
          t2_games INTEGER DEFAULT NULL,
          status TEXT DEFAULT 'in_progress',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          finished_at DATETIME DEFAULT NULL
        );`,
        {
          sql: "INSERT OR IGNORE INTO settings (key, value) VALUES ('active_tournament_id', '1')",
          args: [],
        },
        {
          sql: "INSERT OR IGNORE INTO settings (key, value) VALUES ('tournament_name', 'Torneo Cancha Libre')",
          args: [],
        },
        {
          sql: "INSERT OR IGNORE INTO settings (key, value) VALUES ('courts_count', '5')",
          args: [],
        },
        {
          sql: "INSERT OR IGNORE INTO settings (key, value) VALUES ('target_games', '4')",
          args: [],
        },
        {
          sql: "INSERT OR IGNORE INTO settings (key, value) VALUES ('admin_pin', '1234')",
          args: [],
        },
        {
          sql: "INSERT OR IGNORE INTO settings (key, value) VALUES ('status', 'active')",
          args: [],
        },
      ],
      "write"
    );

    // 2. Backward compatibility migration if columns don't exist
    try {
      await db.execute(
        "ALTER TABLE players ADD COLUMN tournament_id INTEGER DEFAULT 1"
      );
    } catch {}
    try {
      await db.execute(
        "ALTER TABLE matches ADD COLUMN tournament_id INTEGER DEFAULT 1"
      );
    } catch {}

    // 3. Initialize default tournament #1 if tournaments table is completely empty
    const tourneysCheck = await db.execute(
      "SELECT COUNT(*) as count FROM tournaments"
    );
    if (Number(tourneysCheck.rows[0]?.count || 0) === 0) {
      const today = new Date().toISOString().split("T")[0];
      await db.execute({
        sql: `INSERT INTO tournaments (id, name, date, courts_count, target_games, status)
              VALUES (1, 'Torneo Cancha Libre', ?, 5, 4, 'active')`,
        args: [today],
      });
    }

    initialized = true;
  } catch (error) {
    console.error("[DB ERROR] Error initializing database:", error);
    throw error;
  }

  return db;
}
