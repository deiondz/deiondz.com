"use server";

import { refresh } from "next/cache";
import { headers } from "next/headers";
import { getSession, isOwner } from "~/lib/auth";
import {
	createEntry,
	deleteEntry,
	entryAuthor,
	MAX_ENTRY_LENGTH,
	setPinned,
	toggleLike,
} from "~/lib/guestbook";

export type PostState = { error?: string; ok?: boolean; at?: number };

async function requireUser() {
	const session = await getSession(await headers());
	if (!session) throw new Error("Please sign in first.");
	return session.user;
}

function entryId(value: unknown) {
	const id = Number(value);
	if (!Number.isSafeInteger(id) || id < 1) throw new Error("Unknown message.");
	return id;
}

export async function postEntry(
	_previous: PostState,
	formData: FormData,
): Promise<PostState> {
	const session = await getSession(await headers());
	if (!session) return { error: "Please sign in first." };
	const body = String(formData.get("body") ?? "")
		.replace(/\r\n/g, "\n")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
	if (!body) return { error: "Write something first." };
	if ([...body].length > MAX_ENTRY_LENGTH)
		return { error: `Keep it under ${MAX_ENTRY_LENGTH} characters.` };
	const error = createEntry(session.user.id, body);
	if (error) return { error };
	refresh();
	return { ok: true, at: Date.now() };
}

export async function likeEntry(id: number, liked: boolean) {
	const user = await requireUser();
	toggleLike(entryId(id), user.id, Boolean(liked));
	refresh();
}

export async function removeEntry(id: number) {
	const user = await requireUser();
	const target = entryId(id);
	const author = entryAuthor(target);
	if (!author) return;
	if (author !== user.id && !isOwner(user.email))
		throw new Error("You can only delete your own messages.");
	deleteEntry(target);
	refresh();
}

export async function pinEntry(id: number, pinned: boolean) {
	const user = await requireUser();
	if (!isOwner(user.email)) throw new Error("Only the owner can pin.");
	setPinned(entryId(id), Boolean(pinned));
	refresh();
}
