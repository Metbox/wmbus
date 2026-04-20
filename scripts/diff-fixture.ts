/*
 * Copyright (C) 2017-2026 Fredrik Öhrström (gpl-3.0-or-later)
 * Copyright (C) 2026 Metbox / @metbox/wmbus contributors (gpl-3.0-or-later)
 *
 * This program is free software: you can redistribute it and/or modify
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
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */
// Print the first field diff for a given driver. Usage:
//   npx tsx scripts/diff-fixture.ts <driver>

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeWmbusHexSync } from "../src/api.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_PATH = resolve(__dirname, "..", "test", "fixtures", "upstream.json");

interface Fixture {
  source: string;
  driver: string;
  name: string;
  id: string;
  key: string;
  hex: string;
  expected: Record<string, unknown>;
}
const FIXTURES = JSON.parse(readFileSync(FIXTURES_PATH, "utf8")) as Fixture[];

const targetDriver = process.argv[2];
if (!targetDriver) {
  console.error("Usage: diff-fixture.ts <driver>");
  process.exit(1);
}

const matching = FIXTURES.filter((f) => f.driver === targetDriver);
console.log(`${matching.length} fixtures for driver=${targetDriver}`);

for (const fx of matching) {
  const hexLen = fx.hex.replace(/[^0-9A-Fa-f]/g, "").length / 2;
  if (hexLen < 20) continue;
  const key = fx.key === "NOKEY" ? "" : fx.key;
  let actual: Record<string, unknown>;
  try {
    actual = decodeWmbusHexSync(fx.hex, fx.driver, key, {
      name: fx.name,
      idOverride: fx.id,
      timestampOverride: "1111-11-11T11:11:11Z",
    });
  } catch (err) {
    console.log(`[${fx.name}/${fx.id} @ ${fx.source}] threw: ${(err as Error).message}`);
    continue;
  }
  const diffs: string[] = [];
  const allKeys = new Set([...Object.keys(fx.expected), ...Object.keys(actual)]);
  for (const k of allKeys) {
    const a = actual[k];
    const e = fx.expected[k];
    if (JSON.stringify(a) !== JSON.stringify(e)) {
      diffs.push(`  ${k}: actual=${JSON.stringify(a)}  expected=${JSON.stringify(e)}`);
    }
  }
  if (diffs.length === 0) {
    console.log(`[${fx.name}/${fx.id} @ ${fx.source}] ✓`);
  } else {
    console.log(`[${fx.name}/${fx.id} @ ${fx.source}] diff:`);
    for (const d of diffs.slice(0, 10)) console.log(d);
    if (diffs.length > 10) console.log(`  ... (${diffs.length - 10} more)`);
  }
}
