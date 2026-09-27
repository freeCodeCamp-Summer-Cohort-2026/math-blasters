import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseLesson } from "../src/content/parse";

const scriptDir = resolve(dirname(fileURLToPath(import.meta.url)));
/**
 * Validate every real lesson with the same parser used by the web app.
 * This keeps malformed content from reaching the browser bundle.
 */
const CONTENT_DIR = resolve(scriptDir, "../../content");

function main(): void {
  const moduleDirs = readdirSync(CONTENT_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory());

  for (const moduleDir of moduleDirs) {
    const modulePath = join(CONTENT_DIR, moduleDir.name);

    for (const filename of readdirSync(modulePath)) {
      if (!filename.endsWith(".md")) continue;

      const path = join(modulePath, filename);
      const source = readFileSync(path, "utf-8");

      parseLesson(source, path);
    }
  }

  console.log("All content lessons are valid.");
}

main();
