import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// jsdom applies no stylesheets, so axe can't measure contrast; this measures the tokens directly.
const css = readFileSync(join(__dirname, "../src/styles/tokens.css"), "utf-8");

type Tokens = Record<string, string>;

function block(selector: string): Tokens {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`No ${selector} block in tokens.css`);
  const body = css.slice(start, css.indexOf("}", start));
  const tokens: Tokens = {};
  for (const [, name, value] of body.matchAll(/--([\w-]+):\s*([^;]+);/g)) {
    tokens[name] = value.trim();
  }
  return tokens;
}

const root = block(":root");
const osDark = block(':root:not([data-theme="light"])');
const toggledDark = block('[data-theme="dark"]');
const THEMES = { light: root, dark: { ...root, ...toggledDark } };

function resolve(tokens: Tokens, name: string): string {
  const value = tokens[name];
  if (value === undefined) throw new Error(`--${name} is not defined`);
  const ref = value.match(/^var\(--([\w-]+)\)$/);
  return ref ? resolve(tokens, ref[1]) : value;
}

function luminance(hex: string): number {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) throw new Error(`${hex} is not a six-digit hex colour`);
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const SOFT_SURFACES = ["accent-soft", "success-soft", "danger-soft", "warning-soft"];
const ALL_SURFACES = ["bg", "surface", "surface-sunken", ...SOFT_SURFACES];

// WCAG 1.4.3: body text, links and badge labels on the surfaces they sit on.
const TEXT_PAIRS: [string, string][] = [
  ...ALL_SURFACES.flatMap((bg): [string, string][] => [
    ["text", bg],
    ["text-muted", bg],
  ]),
  ["accent", "bg"], // back links, hero eyebrow
  ["accent", "surface"], // brand, markdown links
  ["accent", "surface-sunken"], // menu item hover
  ["accent", "accent-soft"], // tutorial badge
  ["success", "surface"], // completed mark
  ["success", "success-soft"], // lab badge
  ["danger", "surface"], // account menu error
  ["danger", "danger-soft"], // error state
  ["on-accent", "accent-fill"],
  ["on-success-fill", "success-fill"],
  ["on-warning-fill", "warning-fill"],
  ["on-danger-fill", "danger-fill"],
  ["on-highlight-fill", "highlight-fill"], // hero <em>
];

// WCAG 1.4.11: outlines that identify a control or its state.
const NON_TEXT_PAIRS: [string, string][] = [
  ...ALL_SURFACES.map((bg): [string, string] => ["focus-ring", bg]),
  ["input-border", "surface-sunken"], // answer field fill
  ["input-border", "surface"], // the card around it
  ["accent", "surface-sunken"], // checking card border
  ["success", "success-soft"], // correct card border
  ["warning", "warning-soft"], // not-yet card border and chip
  ["danger", "danger-soft"], // error card border
];

describe("token contrast", () => {
  it("defines the same dark values for the OS preference and the toggle", () => {
    expect(osDark).toEqual(toggledDark);
  });

  describe.each(Object.entries(THEMES))("%s theme", (_, tokens) => {
    it.each(TEXT_PAIRS)("--%s on --%s is at least 4.5:1", (fg, bg) => {
      expect(ratio(resolve(tokens, fg), resolve(tokens, bg))).toBeGreaterThanOrEqual(4.5);
    });

    it.each(NON_TEXT_PAIRS)("--%s against --%s is at least 3:1", (fg, bg) => {
      expect(ratio(resolve(tokens, fg), resolve(tokens, bg))).toBeGreaterThanOrEqual(3);
    });
  });
});
