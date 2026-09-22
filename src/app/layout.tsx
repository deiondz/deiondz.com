import "~/styles/globals.css";

import type { Metadata } from "next";
import { Rethink_Sans } from "next/font/google";

const rethinkSans = Rethink_Sans({
	subsets: ["latin"],
	display: "swap",
	variable: "--font-rethink-sans",
});

export const metadata: Metadata = {
	title: "Deion D'Souza — Growth Engineer",
	description:
		"Deion D'Souza works across product engineering, developer relations, and growth at Manasija AI.",
	icons: [{ rel: "icon", url: "/favicon.svg" }],
};

export default function RootLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	return (
		<html className={rethinkSans.variable} lang="en">
			<body>{children}</body>
		</html>
	);
}
