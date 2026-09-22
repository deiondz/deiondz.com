import "~/styles/globals.css";

import type { Metadata } from "next";
import { Rethink_Sans } from "next/font/google";

const rethinkSans = Rethink_Sans({
	subsets: ["latin"],
	display: "swap",
	variable: "--font-rethink-sans",
});

const title = "Deion D'Souza — Growth Engineer";
const description =
	"Deion D'Souza works across product engineering, developer relations, and growth at Manasija AI.";

export const metadata: Metadata = {
	metadataBase: new URL("https://deiondz.com"),
	title,
	description,
	icons: [{ rel: "icon", url: "/favicon.svg" }],
	openGraph: {
		type: "website",
		url: "/",
		title,
		description,
		images: [
			{
				url: "/og-image.jpg",
				width: 7680,
				height: 4320,
				alt: "Deion D'Souza portfolio preview",
			},
		],
	},
	twitter: {
		card: "summary_large_image",
		title,
		description,
		images: ["/og-image.jpg"],
	},
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
