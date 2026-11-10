"use client";

import { Pin, PinOff, Trash2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { pinEntry, removeEntry } from "~/app/guestbook/actions";

export function EntryActions({
	id,
	pinned,
	canPin,
}: {
	id: number;
	pinned: boolean;
	canPin: boolean;
}) {
	const [pending, startTransition] = useTransition();
	const [confirming, setConfirming] = useState(false);

	useEffect(() => {
		if (!confirming) return;
		const timer = setTimeout(() => setConfirming(false), 4000);
		return () => clearTimeout(timer);
	}, [confirming]);

	return (
		<span aria-busy={pending} className="guestbook-actions">
			{canPin && (
				<button
					aria-label={pinned ? `Unpin message #${id}` : `Pin message #${id}`}
					disabled={pending}
					onClick={() => startTransition(() => pinEntry(id, !pinned))}
					title={pinned ? "Unpin" : "Pin"}
					type="button"
				>
					{pinned ? (
						<PinOff aria-hidden="true" size={14} />
					) : (
						<Pin aria-hidden="true" size={14} />
					)}
				</button>
			)}
			<button
				aria-label={
					confirming ? `Confirm delete message #${id}` : `Delete message #${id}`
				}
				data-confirming={confirming || undefined}
				disabled={pending}
				onClick={() => {
					if (!confirming) return setConfirming(true);
					startTransition(() => removeEntry(id));
				}}
				title={confirming ? "Click again to delete" : "Delete"}
				type="button"
			>
				<Trash2 aria-hidden="true" size={14} />
				{confirming && <span>Delete?</span>}
			</button>
		</span>
	);
}
