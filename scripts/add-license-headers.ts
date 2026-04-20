/*
 * Copyright (C) 2026 Metbox / @metbox/wmbus contributors (gpl-3.0-or-later)
 *
 * Adds a GPL-3.0-or-later license notice to every .ts source file in `src/`
 * (and this `scripts/` directory). Idempotent — skips files that already
 * carry a "GNU General Public License" blurb in their first 40 lines.
 *
 * Header attribution strategy:
 *
 *  - `src/drivers/builtin/<name>.ts` → port of vendor `driver_<name>.cc` or
 *    `<name>.xmq`. Attribute Fredrik Öhrström + Metbox contributors.
 *  - `src/crypto/diehl-lfsr.ts` → port of `manufacturer_specificities.cc`;
 *    additionally attribute Jacek Tomasiak and Vincent Privat.
 *  - Everything else in `src/` and `scripts/` → attribute Fredrik Öhrström
 *    + Metbox contributors (this covers the protocol / data / driver-core
 *    files that are conceptual ports of the upstream C++).
 *
 * This is a one-shot tool; after it runs you can delete or retain it. It is
 * idempotent so re-running is safe.
 */

import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");

const STANDARD_GPL_BODY = ` * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.`;

type Attribution = readonly string[];

const FREDRIK = "Copyright (C) 2017-2026 Fredrik Öhrström (gpl-3.0-or-later)";
const METBOX = "Copyright (C) 2026 Metbox / @metbox/wmbus contributors (gpl-3.0-or-later)";

const DEFAULT_ATTRIB: Attribution = [FREDRIK, METBOX];
const DIEHL_ATTRIB: Attribution = [
  "Copyright (C) 2019 Jacek Tomasiak (gpl-3.0-or-later)",
  "Copyright (C) 2020-2023 Fredrik Öhrström (gpl-3.0-or-later)",
  "Copyright (C) 2021 Vincent Privat (gpl-3.0-or-later)",
  METBOX,
];

function attributionFor(relPath: string): Attribution {
  if (relPath.endsWith("src/crypto/diehl-lfsr.ts")) return DIEHL_ATTRIB;
  if (relPath.endsWith("src/drivers/builtin/izar.ts")) return DIEHL_ATTRIB;
  if (relPath.endsWith("src/drivers/builtin/sharky.ts")) return DIEHL_ATTRIB;
  if (relPath.endsWith("src/drivers/builtin/sharky774.ts")) return DIEHL_ATTRIB;
  if (relPath.endsWith("src/drivers/builtin/sharky775.ts")) return DIEHL_ATTRIB;
  if (relPath.endsWith("src/drivers/builtin/hydrus.ts")) return DIEHL_ATTRIB;
  return DEFAULT_ATTRIB;
}

function buildHeader(attributions: Attribution): string {
  const lines: string[] = ["/*"];
  for (const a of attributions) lines.push(` * ${a}`);
  lines.push(" *");
  lines.push(STANDARD_GPL_BODY);
  lines.push(" */");
  return `${lines.join("\n")}\n`;
}

function hasGplHeader(source: string): boolean {
  const head = source.slice(0, 2000);
  return head.includes("GNU General Public License");
}

function walk(dir: string, out: string[]): void {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (name === "node_modules" || name === "dist" || name === ".git") continue;
      walk(full, out);
      continue;
    }
    if (st.isFile() && name.endsWith(".ts")) {
      out.push(full);
    }
  }
}

function main(): void {
  const files: string[] = [];
  walk(join(REPO_ROOT, "src"), files);
  walk(join(REPO_ROOT, "scripts"), files);
  walk(join(REPO_ROOT, "test"), files);

  let added = 0;
  let skipped = 0;
  for (const f of files) {
    const rel = relative(REPO_ROOT, f);
    const src = readFileSync(f, "utf8");
    if (hasGplHeader(src)) {
      skipped++;
      continue;
    }
    const header = buildHeader(attributionFor(rel));
    // Preserve any leading shebang (there aren't any in .ts but future-proof).
    let body = src;
    let prefix = "";
    if (src.startsWith("#!")) {
      const nl = src.indexOf("\n");
      prefix = src.slice(0, nl + 1);
      body = src.slice(nl + 1);
    }
    writeFileSync(f, prefix + header + body, "utf8");
    added++;
  }

  console.log(`License headers: added ${added}, skipped (already present) ${skipped}`);
}

main();
