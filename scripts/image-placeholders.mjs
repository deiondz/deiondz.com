import { readdir, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import sharp from "sharp";

const placeholders = {};
async function collect(directory) {
	for (const entry of await readdir(directory, { withFileTypes: true })) {
		const path = join(directory, entry.name);
		if (entry.isDirectory()) await collect(path);
		else if (/\.(png|jpe?g|webp|svg)$/i.test(entry.name)) {
			const preview = await sharp(path)
				.resize(16, 16, { fit: "inside" })
				.png()
				.toBuffer();
			placeholders[`/${relative("public", path).replaceAll("\\", "/")}`] =
				`data:image/png;base64,${preview.toString("base64")}`;
		}
	}
}
await collect("public");
await writeFile(
	"src/lib/image-placeholders.json",
	`${JSON.stringify(placeholders, null, 2)}\n`,
);
console.log(`Generated ${Object.keys(placeholders).length} image previews.`);
