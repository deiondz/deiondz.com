import "server-only";

import { getDb } from "./db";

export const MAX_ENTRY_LENGTH = 500;
const HOURLY_LIMIT = 3;
const COOLDOWN_MS = 30_000;

export type GuestbookEntry = {
	id: number;
	body: string;
	pinned: boolean;
	createdAt: number;
	userId: string;
	name: string;
	image: string | null;
	likes: number;
	likedByMe: boolean;
	backAgain: boolean;
};

type Row = Omit<GuestbookEntry, "pinned" | "likedByMe" | "backAgain"> & {
	pinned: number;
	likedByMe: number;
	backAgain: number;
};

export function listEntries(viewerId: string | null): GuestbookEntry[] {
	const rows = getDb()
		.prepare(
			`SELECT e.id, e.body, e.pinned, e.created_at AS createdAt,
				u.id AS userId, u.name, u.image,
				(SELECT COUNT(*) FROM guestbook_like l WHERE l.entry_id = e.id) AS likes,
				EXISTS (SELECT 1 FROM guestbook_like l WHERE l.entry_id = e.id AND l.user_id = @viewer) AS likedByMe,
				EXISTS (SELECT 1 FROM guestbook_entry p WHERE p.user_id = e.user_id AND p.id < e.id) AS backAgain
			FROM guestbook_entry e
			JOIN "user" u ON u.id = e.user_id
			ORDER BY e.pinned DESC, e.id DESC`,
		)
		.all({ viewer: viewerId ?? "" }) as Row[];
	return rows.map((row) => ({
		...row,
		pinned: row.pinned === 1,
		likedByMe: row.likedByMe === 1,
		backAgain: row.backAgain === 1,
	}));
}

/** Returns an error message, or null once the entry is saved. */
export function createEntry(userId: string, body: string): string | null {
	const db = getDb();
	const now = Date.now();
	const recent = db
		.prepare(
			`SELECT COUNT(*) AS count, MAX(created_at) AS latest
			FROM guestbook_entry WHERE user_id = ? AND created_at > ?`,
		)
		.get(userId, now - 60 * 60 * 1000) as {
		count: number;
		latest: number | null;
	};
	if (recent.latest && now - recent.latest < COOLDOWN_MS)
		return "Give it a few seconds before posting again.";
	if (recent.count >= HOURLY_LIMIT)
		return "That’s plenty for now. Come back in a bit.";
	db.prepare(
		"INSERT INTO guestbook_entry (user_id, body, created_at) VALUES (?, ?, ?)",
	).run(userId, body, now);
	return null;
}

export function toggleLike(entryId: number, userId: string, liked: boolean) {
	const db = getDb();
	if (liked)
		db.prepare(
			`INSERT OR IGNORE INTO guestbook_like (entry_id, user_id, created_at)
			SELECT id, ?, ? FROM guestbook_entry WHERE id = ?`,
		).run(userId, Date.now(), entryId);
	else
		db.prepare(
			"DELETE FROM guestbook_like WHERE entry_id = ? AND user_id = ?",
		).run(entryId, userId);
}

export function entryAuthor(entryId: number): string | null {
	const row = getDb()
		.prepare("SELECT user_id AS userId FROM guestbook_entry WHERE id = ?")
		.get(entryId) as { userId: string } | undefined;
	return row?.userId ?? null;
}

export function deleteEntry(entryId: number) {
	getDb().prepare("DELETE FROM guestbook_entry WHERE id = ?").run(entryId);
}

export function setPinned(entryId: number, pinned: boolean) {
	getDb()
		.prepare("UPDATE guestbook_entry SET pinned = ? WHERE id = ?")
		.run(pinned ? 1 : 0, entryId);
}
