import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";

/**
 * `content/manifest.json` is the API's only view into content: every module
 * and lesson slug, generated from the files under `content/`. It is its own
 * reader of frontmatter — not `parseLesson()` — so this stays decoupled from
 * the step/criteria parser and only reads the handful of fields it needs.
 */

const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n?/;
const LESSON_FILENAME_PATTERN = /^(?:\d{2}-)?(.+)\.md$/;
const LESSON_KINDS = ["tutorial", "lab"];

export interface ManifestLesson {
  slug: string;
  kind: string;
  title: string;
}

export interface ManifestModule {
  slug: string;
  title: string;
  lessons: ManifestLesson[];
}

export interface Manifest {
  modules: ManifestModule[];
}

const scriptDir = dirname(fileURLToPath(import.meta.url));
export const DEFAULT_CONTENT_DIR = resolve(scriptDir, "../../content");
export const DEFAULT_MANIFEST_PATH = join(DEFAULT_CONTENT_DIR, "manifest.json");

/** Build the manifest from every module and lesson file under `contentDir`. */
export function buildManifest(contentDir: string): Manifest {
  const modules = listModuleDirs(contentDir)
    .map((name) => readModule(contentDir, name))
    .sort((a, b) => a.position - b.position || a.module.slug.localeCompare(b.module.slug))
    .map(({ module }) => module);

  return { modules };
}

/** Serialize a manifest the same way every time, so an unchanged manifest produces an empty diff. */
export function serializeManifest(manifest: Manifest): string {
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

/** Regenerate the manifest and write it to `manifestPath`. */
export function writeManifest(contentDir: string, manifestPath: string): void {
  writeFileSync(manifestPath, serializeManifest(buildManifest(contentDir)));
}

/** True if the committed manifest doesn't match what generation would produce now. */
export function isManifestStale(contentDir: string, manifestPath: string): boolean {
  const generated = serializeManifest(buildManifest(contentDir));

  if (!existsSync(manifestPath)) return true;

  return readFileSync(manifestPath, "utf-8") !== generated;
}

function listModuleDirs(contentDir: string): string[] {
  return readdirSync(contentDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

function readModule(contentDir: string, name: string): { module: ManifestModule; position: number } {
  const moduleDir = join(contentDir, name);
  const moduleYamlPath = join(moduleDir, "module.yaml");
  const path = relativePath(contentDir, moduleYamlPath);

  if (!existsSync(moduleYamlPath)) {
    throw new Error(`${relativePath(contentDir, moduleDir)}: missing "module.yaml".`);
  }

  const data = parseYamlMapping(readFileSync(moduleYamlPath, "utf-8"), path);

  const slug = requireString(data, "slug", path);
  const title = requireString(data, "title", path);
  requireString(data, "summary", path);
  const position = requireNumber(data, "position", path);

  if (slug !== name) {
    throw new Error(
      `${path}: the "slug" field ("${slug}") must match the directory name ("${name}").`,
    );
  }

  const lessons = listLessonFiles(moduleDir).map((filename) =>
    readLesson(contentDir, moduleDir, filename),
  );

  return { module: { slug, title, lessons }, position };
}

function listLessonFiles(moduleDir: string): string[] {
  return readdirSync(moduleDir)
    .filter((name) => name.endsWith(".md"))
    .sort();
}

function readLesson(contentDir: string, moduleDir: string, filename: string): ManifestLesson {
  const filePath = join(moduleDir, filename);
  const path = relativePath(contentDir, filePath);
  const source = readFileSync(filePath, "utf-8");

  const match = FRONTMATTER_PATTERN.exec(source);

  if (!match) {
    throw new Error(
      `${path}: missing frontmatter — a lesson file must start with "---", the YAML frontmatter, then "---".`,
    );
  }

  const data = parseYamlMapping(match[1], path);

  const slug = requireString(data, "slug", path);
  const kind = requireKind(data, path);
  const title = requireString(data, "title", path);

  const filenameSlug = LESSON_FILENAME_PATTERN.exec(filename)?.[1];

  if (filenameSlug !== slug) {
    throw new Error(
      `${path}: the "slug" field ("${slug}") must match the filename ("${filenameSlug ?? filename}").`,
    );
  }

  return { slug, kind, title };
}

function parseYamlMapping(source: string, path: string): Record<string, unknown> {
  let data: unknown;

  try {
    data = parseYaml(source);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`${path}: not valid YAML — ${reason}`);
  }

  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    throw new Error(`${path}: must be a YAML mapping of fields.`);
  }

  return data as Record<string, unknown>;
}

function requireString(data: Record<string, unknown>, field: string, path: string): string {
  const value = data[field];

  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${path}: the "${field}" field is required and must be a non-empty string.`);
  }

  return value;
}

function requireNumber(data: Record<string, unknown>, field: string, path: string): number {
  const value = data[field];

  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${path}: the "${field}" field is required and must be a number.`);
  }

  return value;
}

function requireKind(data: Record<string, unknown>, path: string): string {
  const value = data.type;

  if (typeof value !== "string" || !LESSON_KINDS.includes(value)) {
    throw new Error(
      `${path}: the "type" field must be one of ${LESSON_KINDS.map((kind) => `"${kind}"`).join(" or ")}.`,
    );
  }

  return value;
}

function relativePath(contentDir: string, filePath: string): string {
  return relative(dirname(contentDir), filePath);
}

function main(): void {
  const check = process.argv.includes("--check");

  if (check) {
    if (isManifestStale(DEFAULT_CONTENT_DIR, DEFAULT_MANIFEST_PATH)) {
      console.error(
        `${relative(process.cwd(), DEFAULT_MANIFEST_PATH)} is stale — run "npm run content:manifest" to regenerate it.`,
      );
      process.exitCode = 1;
      return;
    }

    console.log(`${relative(process.cwd(), DEFAULT_MANIFEST_PATH)} is up to date.`);
    return;
  }

  writeManifest(DEFAULT_CONTENT_DIR, DEFAULT_MANIFEST_PATH);
  console.log(`wrote ${relative(process.cwd(), DEFAULT_MANIFEST_PATH)}`);
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
