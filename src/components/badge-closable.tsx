"use client";

import { RotateCcw, X } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";

export type BadgeTag = { id: string; label: string };

export function BadgeClosable({
	tags,
	onRemove,
	onReset,
}: {
	tags: BadgeTag[];
	onRemove: (id: string) => void;
	onReset?: () => void;
}) {
	return (
		<div className="closable-badges">
			{tags.map((tag) => (
				<Badge className="ui-badge-closable" key={tag.id} variant="secondary">
					{tag.label}
					<Button
						aria-label={`Remove ${tag.label}`}
						onClick={() => onRemove(tag.id)}
						size="icon-xs"
						type="button"
						variant="ghost"
					>
						<X aria-hidden="true" size={12} />
					</Button>
				</Badge>
			))}
			{tags.length === 0 && onReset && (
				<Button onClick={onReset} size="sm" variant="ghost">
					<RotateCcw aria-hidden="true" size={12} />
					Reset Tags
				</Button>
			)}
		</div>
	);
}
