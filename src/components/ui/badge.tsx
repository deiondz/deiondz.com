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

export function BadgeButton({
	className = "",
	type = "button",
	...props
}: ComponentProps<"button">) {
	return (
		<button
			className={`ui-badge ui-badge-secondary ui-badge-selector ${className}`}
			type={type}
			{...props}
		/>
	);
}
