import "~/styles/globals.css";

import type { Metadata } from "next";
import { Rethink_Sans } from "next/font/google";

const rethinkSans = Rethink_Sans({
	subsets: ["latin"],
	display: "swap",
	variable: "--font-rethink-sans",
});

const title = "Deion D'Souza | Growth Engineer at Manasija AI";
const description =
	"Deion D'Souza is a Growth Engineer at Manasija AI. Explore his work on Drishti, developer onboarding, and product development.";
const socialImage =
	"https://raw.githubusercontent.com/deiondz/deiondz.com/main/public/og-image-1200x630.jpg";

export const metadata: Metadata = {
	metadataBase: new URL("https://deiondz.com"),
	title,
	description,
	alternates: { canonical: "/" },
	icons: [{ rel: "icon", url: "/favicon.svg" }],
	openGraph: {
		type: "website",
		url: "/",
		title,
		description,
		images: [
			{
				url: socialImage,
				width: 1200,
				height: 630,
				type: "image/jpeg",
				alt: "Deion D'Souza portfolio preview",
			},
		],
	},
	twitter: {
		card: "summary_large_image",
		title,
		description,
		images: [socialImage],
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
