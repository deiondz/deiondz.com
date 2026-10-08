import { spawnSync } from "node:child_process";

const current = spawnSync("git", ["config", "--get", "core.hooksPath"], {
	encoding: "utf8",
});
if (current.status !== 0 && current.status !== 1) {
	console.error(current.stderr || "Could not inspect Git hook configuration.");
	process.exit(1);
}
if (current.stdout.trim() && current.stdout.trim() !== ".githooks") {
	console.error(`Existing hooks path: ${current.stdout.trim()}. Integrate hooks before installing.`);
	process.exit(1);
}
const result = spawnSync("git", ["config", "--local", "core.hooksPath", ".githooks"], {
	stdio: "inherit",
});
if (result.status !== 0) process.exit(result.status || 1);
console.log("Automatic push enabled for this clone. Every commit pushes its branch to origin.");
