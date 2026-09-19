import { createClient, Client } from "@libsql/client";

let client: Client | null = null;
let initialized = false;

export function getDb(): Client {
  if (!client) {
    const url = process.env.TURSO_DATABASE_URL || "file:padel.db";
    const authToken = process.env.TURSO_AUTH_TOKEN || undefined;

    if (url.startsWith("libsql://")) {
      console.log("Connected to Turso Cloud:", url);
    } else {
      console.log("Using Local SQLite fallback: file:padel.db");
    }

    client = createClient({
      url,
      authToken,
    });
  }
  return client;
}

export async function initDb(): Promise<Client> {
  const db = getDb();
  if (initialized) return db;

  // Create tables if not exists
  await db.execute(`
    CREATE TABLE IF NOT EXISTS tournaments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      date TEXT NOT NULL,
      courts_count INTEGER DEFAULT 5,
      target_games INTEGER DEFAULT 4,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tournament_id INTEGER DEFAULT 1,
      name TEXT NOT NULL,
      phone TEXT,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS matches (
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
    );
  `);

  // Migrate columns in case table was created before tournament_id existed
  try {
    await db.execute("ALTER TABLE players ADD COLUMN tournament_id INTEGER DEFAULT 1");
  } catch {}
  try {
    await db.execute("ALTER TABLE matches ADD COLUMN tournament_id INTEGER DEFAULT 1");
  } catch {}

  // Initialize tournament #1 if tournaments is empty
  const tourneysCheck = await db.execute("SELECT COUNT(*) as count FROM tournaments");
  if (Number(tourneysCheck.rows[0]?.count || 0) === 0) {
    const today = new Date().toISOString().split("T")[0];
    await db.execute({
      sql: `INSERT INTO tournaments (id, name, date, courts_count, target_games, status)
            VALUES (1, 'Torneo Cancha Libre', ?, 5, 4, 'active')`,
      args: [today],
    });
  }

  // Initialize default settings if not present
  const defaultSettings: Record<string, string> = {
    active_tournament_id: "1",
    tournament_name: "Torneo Cancha Libre",
    courts_count: "5",
    target_games: "4",
    admin_pin: "1234",
    status: "active",
  };

  for (const [key, value] of Object.entries(defaultSettings)) {
    await db.execute({
      sql: `INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`,
      args: [key, value],
    });
  }

  initialized = true;
  return db;
}
