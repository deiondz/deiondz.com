"use client";

import { bind, setEnabled, setVolume } from "cuelume";
import { useEffect } from "react";

export function InteractionSounds() {
	useEffect(() => {
		setVolume(0.35);
		setEnabled(true);
		bind();
	}, []);

	return null;
}
