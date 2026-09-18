import { createClient, Client } from "@libsql/client";

let client: Client | null = null;
let initialized = false;

export function getDb(): Client {
  if (!client) {
    const url = process.env.TURSO_DATABASE_URL || "file:padel.db";
    const authToken = process.env.TURSO_AUTH_TOKEN || undefined;

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
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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

  // Initialize default settings if not present
  const defaultSettings: Record<string, string> = {
    tournament_name: "Torneo Americano de Pádel",
    courts_count: "5",
    target_games: "4",
    admin_pin: "1234",
    status: "in_progress",
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
