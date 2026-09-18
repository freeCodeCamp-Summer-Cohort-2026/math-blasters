import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  buildManifest,
  isManifestStale,
  serializeManifest,
  writeManifest,
} from "../scripts/generate-manifest";

const FIXTURE_CONTENT_DIR = join(__dirname, "fixtures", "manifest-content");

describe("buildManifest", () => {
  it("generates module and lesson slugs, ordered by position and filename", () => {
    const manifest = buildManifest(FIXTURE_CONTENT_DIR);

    expect(manifest).toEqual({
      modules: [
        {
          slug: "module-a",
          title: "Module A",
          lessons: [
            { slug: "intro", kind: "tutorial", title: "Intro" },
            { slug: "outro", kind: "lab", title: "Outro" },
          ],
        },
        {
          slug: "module-b",
          title: "Module B",
          lessons: [{ slug: "first", kind: "tutorial", title: "First" }],
        },
      ],
    });
  });

  it("serializes deterministically, so regenerating with no content change is a no-op", () => {
    const manifest = buildManifest(FIXTURE_CONTENT_DIR);

    expect(serializeManifest(manifest)).toBe(serializeManifest(buildManifest(FIXTURE_CONTENT_DIR)));
  });
});

describe("isManifestStale", () => {
  let tmpDir: string;
  let manifestPath: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "manifest-test-"));
    manifestPath = join(tmpDir, "manifest.json");
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("is stale when no manifest has been written yet", () => {
    expect(isManifestStale(FIXTURE_CONTENT_DIR, manifestPath)).toBe(true);
  });

  it("is not stale right after writing the manifest", () => {
    writeManifest(FIXTURE_CONTENT_DIR, manifestPath);

    expect(isManifestStale(FIXTURE_CONTENT_DIR, manifestPath)).toBe(false);
  });

  it("is stale once the committed manifest is hand-edited away from what generation produces", () => {
    writeManifest(FIXTURE_CONTENT_DIR, manifestPath);

    const generated = readFileSync(manifestPath, "utf-8");
    writeFileSync(manifestPath, generated.replace("Module A", "Module Z"));

    expect(isManifestStale(FIXTURE_CONTENT_DIR, manifestPath)).toBe(true);
  });
});
