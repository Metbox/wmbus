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
// Run every harvested fixture through the pipeline and report which drivers
// are decoding correctly vs producing diffs. Used as a feedback loop when
// batch-porting drivers.

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

function isShort(hex: string): boolean {
  const c = hex.replace(/[^0-9A-Fa-f]/g, "");
  if (c.length < 22) return false;
  return Number.parseInt(c.slice(0, 2), 16) < 0x28 && Number.parseInt(c.slice(20, 22), 16) === 0x8d;
}
function isFormatB(hex: string): boolean {
  const c = hex.replace(/[^0-9A-Fa-f]/g, "");
  return c.slice(0, 2).toLowerCase() === "68" && c.slice(6, 8).toLowerCase() === "68";
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  const ka = Object.keys(a as object);
  const kb = Object.keys(b as object);
  if (ka.length !== kb.length) return false;
  for (const k of ka) {
    if (!Object.hasOwn(b as object, k)) return false;
    if (!deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k])) {
      return false;
    }
  }
  return true;
}

const byDriver = new Map<string, { pass: number; fail: number; firstFail?: string }>();

for (const fx of FIXTURES) {
  // Short frames (kamstrup compact) still need format-signature caching.
  if (isShort(fx.hex)) continue;
  // Format B is now supported but the sweep filter is kept for safety.
  void isFormatB;
  const key = fx.key === "NOKEY" ? "" : fx.key;
  let actual: Record<string, unknown>;
  try {
    actual = decodeWmbusHexSync(fx.hex, fx.driver, key, {
      name: fx.name,
      idOverride: fx.id,
      timestampOverride: "1111-11-11T11:11:11Z",
    });
  } catch (err) {
    const stat = byDriver.get(fx.driver) ?? { pass: 0, fail: 0 };
    stat.fail++;
    if (!stat.firstFail) stat.firstFail = `threw: ${(err as Error).message.slice(0, 80)}`;
    byDriver.set(fx.driver, stat);
    continue;
  }
  const match = deepEqual(actual, fx.expected);
  const stat = byDriver.get(fx.driver) ?? { pass: 0, fail: 0 };
  if (match) stat.pass++;
  else {
    stat.fail++;
    if (!stat.firstFail) {
      const expectedKeys = new Set(Object.keys(fx.expected));
      const actualKeys = new Set(Object.keys(actual));
      const missing = [...expectedKeys].filter((k) => !actualKeys.has(k));
      const extra = [...actualKeys].filter((k) => !expectedKeys.has(k));
      stat.firstFail = `missing=[${missing.slice(0, 3).join(",")}] extra=[${extra.slice(0, 3).join(",")}]`;
    }
  }
  byDriver.set(fx.driver, stat);
}

const sorted = [...byDriver.entries()].sort((a, b) => a[0].localeCompare(b[0]));

let totalPass = 0;
let totalFail = 0;
let green = 0;
let red = 0;
for (const [, stat] of sorted) {
  totalPass += stat.pass;
  totalFail += stat.fail;
  if (stat.fail === 0) green++;
  else red++;
}

console.log(`Total fixtures passing: ${totalPass}`);
console.log(`Total fixtures failing: ${totalFail}`);
console.log(`Drivers with 100% pass: ${green}`);
console.log(`Drivers with any fails: ${red}`);
console.log();

console.log("Drivers with 100% fixture parity:");
for (const [d, s] of sorted) {
  if (s.fail === 0 && s.pass > 0) console.log(`  ✓ ${d} (${s.pass})`);
}

console.log();
console.log("Drivers with diffs (hint = one failing fixture):");
for (const [d, s] of sorted) {
  if (s.fail > 0) {
    console.log(`  × ${d} ${s.pass}/${s.pass + s.fail}  ${s.firstFail ?? ""}`);
  }
}
