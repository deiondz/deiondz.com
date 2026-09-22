"use client";

import Image from "next/image";
import { type ReactNode, useEffect, useRef, useState } from "react";
import graphData from "./contributions.json";

const projects = [
	{
		id: "shadcn-fullcalender",
		name: "shadcn-fullcalender",
		logo: null,
		owner: "deiondz",
		url: "https://github.com/deiondz/shadcn-fullcalender",
		description:
			"A customizable Full Calendar component built with shadcn/ui, with month and year views.",
		features: ["Month and year calendar views", "Configurable event rendering"],
		tags: ["TypeScript", "React", "Next.js", "shadcn/ui"],
	},
	{
		id: "subwatch",
		name: "Subwatch",
		logo: null,
		owner: "deiondz",
		url: "https://github.com/deiondz/subwatch",
		description:
			"A command-line tool that discovers certificate-derived subdomains and checks which public web services respond.",
		features: ["DNS and HTTP reachability checks", "JSON and CSV reports"],
		tags: ["Python", "CLI", "DNS", "HTTP"],
	},
	{
		id: "drishti",
		name: "Drishti",
		logo: "/projects/drishti.svg",
		owner: "Manasija AI",
		url: "https://drishti.manasija.in/",
		description:
			"Drishti turns Indian company filings, earnings, news, and conference calls into structured market data for research tools, fintech apps, and AI agents.",
		features: [
			"REST APIs for structured market information",
			"WebSocket event streams and MCP tools for live workflows and AI agents",
		],
		tags: ["Indian Equities", "REST APIs", "WebSockets", "MCP"],
	},
	{
		id: "ananta-market-stack",
		name: "Ananta Market Stack",
		logo: "/projects/ananta.svg",
		owner: "manasijatech",
		url: "https://github.com/manasijatech/ananta-market-stack",
		description:
			"A self-hosted market workspace for connecting broker accounts, viewing portfolio and market data, and running alert workflows.",
		features: [
			"Broker account and portfolio workflows",
			"Market-data APIs and alerts",
		],
		tags: ["Next.js", "FastAPI", "Docker", "Market Data"],
	},
];

const experience = [
	{
		role: "Growth Engineer",
		organization: "Manasija AI",
		logo: "/companies/manasija.svg",
		period: "Jul 2026 — Present",
		location: "Mangalore, India",
		description:
			"I work on Drishti's customer acquisition, developer onboarding, support, content, and automation. I bring customer feedback back to the product team.",
	},
	{
		role: "Founding Engineer",
		organization: "Manasija AI",
		logo: "/companies/manasija.svg",
		period: "Apr 2025 — Jul 2026",
		location: "Mangalore, India",
		description:
			"Built customer-facing tools for Drishti, designed Myuki’s web and desktop experience, built its Electron app, and worked on billing, releases, and production issues.",
	},
	{
		role: "Engineering Fellow",
		organization: "UDAL / DC’s Fellowship",
		logo: "/companies/udal.png",
		period: "Jun 2025 — Dec 2025",
		location: "Mangalore, India",
		description:
			"Turned rural-development challenges into team tasks and led work on a system for tracking waste collection, segregation, and residents’ complaints.",
	},
	{
		role: "Software Engineer",
		organization: "Tikanga",
		logo: "/companies/tikanga.jpg",
		period: "May 2023 — Mar 2025",
		location: "Mangalore, India",
		description:
			"Built responsive client interfaces with React and Next.js and developed frontend designs using shadcn/ui and Ant Design.",
	},
];

const skillGroups = [
	{
		name: "Languages",
		skills: [
			{ name: "TypeScript", logo: "typescript" },
			{ name: "JavaScript", logo: "javascript" },
			{ name: "Python", logo: "python" },
			{ name: "SQL", logo: null },
		],
	},
	{
		name: "Web and desktop",
		skills: [
			{ name: "React", logo: "react" },
			{ name: "Next.js", logo: "nextdotjs" },
			{ name: "Electron", logo: "electron" },
			{ name: "Tailwind CSS", logo: "tailwindcss" },
		],
	},
	{
		name: "APIs and data",
		skills: [
			{ name: "REST APIs", logo: null },
			{ name: "WebSockets", logo: null },
			{ name: "MCP", logo: "mcp" },
			{ name: "PostgreSQL", logo: "postgresql" },
			{ name: "MongoDB", logo: "mongodb" },
			{ name: "Supabase", logo: "supabase" },
		],
	},
	{
		name: "Operations and tools",
		skills: [
			{ name: "n8n", logo: "n8n" },
			{ name: "Git", logo: "git" },
			{ name: "Docker", logo: "docker" },
			{ name: "Linux", logo: "linux" },
			{ name: "PM2", logo: "pm2" },
			{ name: "Razorpay", logo: "razorpay" },
			{ name: "Zoho Books", logo: "zoho" },
		],
	},
];

function SkillIcon({ name }: { name: string }) {
	const paths: Record<string, ReactNode> = {
		SQL: (
			<>
				<ellipse cx="12" cy="5" rx="8" ry="3" />
				<path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" />
			</>
		),
		"REST APIs": (
			<>
				<path d="m8 7-5 5 5 5m8-10 5 5-5 5M14 4l-4 16" />
			</>
		),
		WebSockets: (
			<>
				<path d="M4 7h14l-3-3m3 3-3 3M20 17H6l3-3m-3 3 3 3" />
			</>
		),
	};
	return (
		<svg
			aria-hidden="true"
			className="skill-symbol"
			fill="none"
			stroke="currentColor"
			strokeLinecap="round"
			strokeLinejoin="round"
			strokeWidth="1.6"
			viewBox="0 0 24 24"
		>
			{paths[name]}
		</svg>
	);
}

function Icon({ name }: { name: "github" | "link" | "chevron" }) {
	if (name === "github")
		return (
			<svg aria-hidden="true" fill="currentColor" viewBox="0 0 24 24">
				<path d="M12 .9a11.1 11.1 0 0 0-3.51 21.63c.55.1.76-.24.76-.54v-2.08c-3.1.67-3.76-1.32-3.76-1.32-.5-1.28-1.23-1.62-1.23-1.62-1-.69.08-.68.08-.68 1.1.08 1.68 1.13 1.68 1.13.98 1.68 2.58 1.2 3.21.91.1-.71.38-1.2.69-1.48-2.48-.28-5.1-1.24-5.1-5.5 0-1.22.44-2.21 1.14-2.99-.11-.28-.5-1.42.11-2.95 0 0 .93-.3 3.05 1.14A10.6 10.6 0 0 1 12 6.3c.94 0 1.88.13 2.76.37 2.12-1.44 3.05-1.14 3.05-1.14.61 1.53.22 2.67.1 2.95.72.78 1.15 1.77 1.15 2.99 0 4.27-2.62 5.21-5.12 5.49.39.34.74 1.01.74 2.04v2.99c0 .3.2.65.77.54A11.1 11.1 0 0 0 12 .9Z" />
			</svg>
		);
	if (name === "link")
		return (
			<svg
				aria-hidden="true"
				fill="none"
				stroke="currentColor"
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth="1.8"
				viewBox="0 0 24 24"
			>
				<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
				<path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
			</svg>
		);
	return (
		<svg
			aria-hidden="true"
			fill="none"
			stroke="currentColor"
			strokeLinecap="round"
			strokeLinejoin="round"
			strokeWidth="1.8"
			viewBox="0 0 24 24"
		>
			<path d="m6 9 6 6 6-6" />
		</svg>
	);
}

function ActivityGraph() {
	const activity = graphData.contributions;
	const total = activity.reduce((sum, day) => sum + day.count, 0);
	const firstDay = new Date(`${activity[0]?.date}T00:00:00Z`).getUTCDay();
	const months: { label: string; week: number }[] = [];
	let lastMonth = -1;
	activity.forEach((day, i) => {
		const date = new Date(`${day.date}T00:00:00Z`);
		if (date.getUTCMonth() !== lastMonth) {
			months.push({
				label: date.toLocaleString("en-US", {
					month: "short",
					timeZone: "UTC",
				}),
				week: Math.floor((i + firstDay) / 7),
			});
			lastMonth = date.getUTCMonth();
		}
	});
	const fills = ["#f5f5f5", "#dedede", "#b5b5b5", "#8e8e8e", "#666666"];
	return (
		<div className="activity">
			<div className="activity-scroll">
				<svg
					aria-label={`${total} GitHub contributions in 2026`}
					height="103"
					role="img"
					width={Math.ceil((activity.length + firstDay) / 7) * 12 - 3}
				>
					<title>GitHub contributions in 2026</title>
					{months
						.filter((_month, i) => i > 0 || (months[1] && months[1].week >= 3))
						.map((month) => (
							<text
								className="month-label"
								key={month.label}
								x={month.week * 12}
								y="10"
							>
								{month.label}
							</text>
						))}
					{activity.map((day, i) => (
						<rect
							fill={fills[Math.min(day.level, 4)]}
							height="9"
							key={day.date}
							rx="2"
							width="9"
							x={Math.floor((i + firstDay) / 7) * 12}
							y={22 + ((i + firstDay) % 7) * 12}
						>
							<title>{`${day.date}: ${day.count} contributions`}</title>
						</rect>
					))}
				</svg>
			</div>
			<div className="activity-footer">
				<span>{total} contributions in 2026</span>
				<div className="legend">
					<span>Less</span>
					{fills.map((fill) => (
						<span
							className="legend-square"
							key={fill}
							style={{ backgroundColor: fill }}
						/>
					))}
					<span>More</span>
				</div>
			</div>
		</div>
	);
}

function Projects() {
	const [open, setOpen] = useState<string | null>("drishti");
	return (
		<section className="projects" id="projects">
			<h2>
				Projects <span className="project-count">({projects.length})</span>
			</h2>
			<div className="project-list">
				{projects.map((project) => (
					<article
						className={`project ${open === project.id ? "is-open" : ""}`}
						key={project.id}
					>
						<div className="project-row">
							<div aria-hidden="true" className="project-mark">
								{project.logo ? (
									<Image
										alt=""
										height={24}
										src={project.logo}
										unoptimized
										width={24}
									/>
								) : (
									project.name.slice(0, 1).toUpperCase()
								)}
							</div>
							<button
								aria-controls={`details-${project.id}`}
								aria-expanded={open === project.id}
								className="project-toggle"
								onClick={() => setOpen(open === project.id ? null : project.id)}
								type="button"
							>
								<span className="project-title">{project.name}</span>
								<span className="project-date">
									{project.id === "drishti"
										? "Indian equities data via APIs, WebSockets & MCP"
										: `${project.owner} / ${project.id}`}
								</span>
							</button>
							<a
								aria-label={
									project.id === "drishti"
										? "Visit Drishti"
										: `View ${project.name} on GitHub`
								}
								href={project.url}
								rel="noopener noreferrer"
								target="_blank"
							>
								<Icon name={project.id === "drishti" ? "link" : "github"} />
							</a>
							<button
								aria-label={`${open === project.id ? "Collapse" : "Expand"} ${project.name}`}
								className="chevron-button"
								onClick={() => setOpen(open === project.id ? null : project.id)}
								type="button"
							>
								<Icon name="chevron" />
							</button>
						</div>
						<div
							className="project-details"
							hidden={open !== project.id}
							id={`details-${project.id}`}
						>
								<p>{project.description}</p>
								<ul>
									{project.features.map((feature) => (
										<li key={feature}>{feature}</li>
									))}
								</ul>
								<div className="tags">
									{project.tags.map((tag) => (
										<span key={tag}>{tag}</span>
									))}
								</div>
								<a
									className="project-link"
									href={project.url}
									rel="noopener noreferrer"
									target="_blank"
								>
									{project.id === "drishti"
										? "Visit Drishti ↗"
										: "View repository ↗"}
								</a>
						</div>
					</article>
				))}
			</div>
		</section>
	);
}

export default function HomePage() {
	const [time, setTime] = useState("");
	const [size, setSize] = useState("");
	const bottomGridRef = useRef<HTMLDivElement>(null);
	useEffect(() => {
		const update = () => {
			setTime(
				new Date().toLocaleTimeString("en-US", {
					hour: "2-digit",
					minute: "2-digit",
					hour12: false,
				}),
			);
			setSize(`${window.innerWidth} x ${window.innerHeight}`);
		};
		update();
		const clock = window.setInterval(update, 1000);
		window.addEventListener("resize", update);
		return () => {
			window.clearInterval(clock);
			window.removeEventListener("resize", update);
		};
	}, []);
	useEffect(() => {
		const grid = bottomGridRef.current;
		if (!grid) return;
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
			grid.classList.add("is-visible");
			return;
		}
		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry?.isIntersecting) {
					grid.classList.add("is-visible");
					observer.disconnect();
				}
			},
			{ threshold: 0.1 },
		);
		observer.observe(grid);
		return () => observer.disconnect();
	}, []);
	return (
		<main className="page-shell">
			<div className="corner-info corner-time">{time}</div>
			<div className="corner-info corner-size">{size}</div>
			<div className="mobile-bar">Deion D&apos;Souza</div>
			<div className="content">
				<header className="profile-header">
					<Image
						alt="Deion D'Souza"
						className="profile-avatar"
						height={80}
						src="/deiondz-pfp.png"
						width={80}
					/>
					<div>
						<h1>Deion D&apos;Souza</h1>
						<p className="tagline">Growth Engineer at Manasija AI</p>
						<div className="profile-links">
							<a href="mailto:deiondsouza12@gmail.com">
								Email me
							</a>
							<a href="#projects">View projects</a>
							<a
								href="https://github.com/deiondz"
								rel="noopener noreferrer"
								target="_blank"
							>
								GitHub
							</a>
							<a
								href="https://www.linkedin.com/in/deiondz/"
								rel="noopener noreferrer"
								target="_blank"
							>
								LinkedIn
							</a>
						</div>
					</div>
				</header>
				<section className="about">
					<h2>About</h2>
					<p>
						I work across design, engineering, and growth. I shape interfaces,
						build software, and help people find and use it.
					</p>
					<p>
						Customer conversations show me where people get stuck. I use that
						feedback to make the interface, onboarding, and documentation
						clearer.
					</p>
				</section>
				<section className="contributions">
					<h2 className="sr-only">GitHub contributions</h2>
					<ActivityGraph />
				</section>
				<section className="experience">
					<h2>Experience</h2>
					<div className="experience-list">
						{experience.map((job) => (
							<article
								className="experience-item"
								key={`${job.role}-${job.organization}`}
							>
								<div className="experience-heading">
									<div className="experience-identity">
										<Image
											alt={`${job.organization} logo`}
											className="company-logo"
											height={32}
											src={job.logo}
											unoptimized
											width={32}
										/>
										<div>
											<h3>{job.role}</h3>
											<div className="experience-meta">
												{job.organization} · {job.location}
											</div>
										</div>
									</div>
									<span>{job.period}</span>
								</div>
								<p>{job.description}</p>
							</article>
						))}
					</div>
				</section>
				<Projects />
				<section className="skills">
					<h2>Skills</h2>
					<dl>
						{skillGroups.map((group) => (
							<div key={group.name}>
								<dt>{group.name}</dt>
								<dd>
									<ul className="skill-list">
										{group.skills.map((skill) => (
											<li className="skill" key={skill.name}>
												{skill.logo ? (
													<Image
														alt=""
														height={16}
														src={`/skills/${skill.logo}.svg`}
														unoptimized
														width={16}
													/>
												) : (
													<SkillIcon name={skill.name} />
												)}
												<span>{skill.name}</span>
											</li>
										))}
									</ul>
								</dd>
							</div>
						))}
					</dl>
				</section>
			</div>
			<div aria-hidden="true" className="bottom-grid" ref={bottomGridRef} />
		</main>
	);
}
