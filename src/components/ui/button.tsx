import type { ComponentProps } from "react";
import "./badge.css";

export function Button({
	className = "",
	variant = "ghost",
	size = "sm",
	type = "button",
	...props
}: ComponentProps<"button"> & { variant?: "ghost"; size?: "sm" | "icon-xs" }) {
	return (
		<button
			className={`ui-badge-button ui-badge-button-${variant} ui-badge-button-${size} ${className}`}
			type={type}
			{...props}
		/>
	);
}
