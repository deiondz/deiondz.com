import type { ComponentProps } from "react";
import "./badge.css";

export function Badge({
	className = "",
	variant = "secondary",
	...props
}: ComponentProps<"span"> & { variant?: "secondary" }) {
	return (
		<span className={`ui-badge ui-badge-${variant} ${className}`} {...props} />
	);
}
