import { cpSync } from "node:fs";

cpSync("public", ".next/standalone/public", { recursive: true });
cpSync(".next/static", ".next/standalone/.next/static", { recursive: true });
process.env.HOSTNAME = "127.0.0.1";
process.env.PORT = "3000";
await import("../.next/standalone/server.js");
