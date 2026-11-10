import "server-only";

import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";

type Db = InstanceType<typeof Database>;

const globalForDb = globalThis as unknown as { guestbookDb?: Db };

/**
 * Shared SQLite connection for Better Auth and the guestbook. Opened lazily so
 * builds never touch the database. Production keeps the file outside the
 * release directory (see README), so deployments don't replace it.
 */
export function getDb(): Db {
	if (globalForDb.guestbookDb) return globalForDb.guestbookDb;
	// Relative paths resolve against the server's working directory.
	const file = process.env.GUESTBOOK_DATABASE_PATH || ".data/guestbook.db";
	mkdirSync(dirname(file), { recursive: true });
	const db = new Database(file);
	db.pragma("journal_mode = WAL");
	db.pragma("foreign_keys = ON");
	db.pragma("busy_timeout = 5000");
	globalForDb.guestbookDb = db;
	return db;
}

export const GUESTBOOK_SCHEMA = `
CREATE TABLE IF NOT EXISTS guestbook_entry (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
	body TEXT NOT NULL,
	pinned INTEGER NOT NULL DEFAULT 0,
	created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS guestbook_entry_user ON guestbook_entry(user_id, created_at);
CREATE TABLE IF NOT EXISTS guestbook_like (
	entry_id INTEGER NOT NULL REFERENCES guestbook_entry(id) ON DELETE CASCADE,
	user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
	created_at INTEGER NOT NULL,
	PRIMARY KEY (entry_id, user_id)
);
`;
