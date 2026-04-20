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
// How often do multiple drivers register the same exact MVT triple?
// Answers: "is fingerprint-disambiguation actually needed, or does MVT
// uniquely identify the driver?"

import "../src/drivers/builtin/index.js";
import { listDrivers } from "../src/drivers/registry.js";

const byMVT = new Map<string, string[]>();

for (const def of listDrivers()) {
  for (const m of def.mvt) {
    const key = `m=0x${m.manufacturer.toString(16).padStart(4, "0")} v=0x${m.version.toString(16).padStart(2, "0")} t=0x${m.type.toString(16).padStart(2, "0")}`;
    const list = byMVT.get(key) ?? [];
    list.push(def.name);
    byMVT.set(key, list);
  }
}

const collisions = [...byMVT.entries()].filter(([, names]) => new Set(names).size > 1);
const totalMvts = byMVT.size;

console.log(`Total distinct MVTs registered: ${totalMvts}`);
console.log(`MVTs with multiple drivers (collisions): ${collisions.length}`);
console.log();
if (collisions.length > 0) {
  console.log("Collisions:");
  for (const [mvt, names] of collisions) {
    console.log(`  ${mvt}  →  ${[...new Set(names)].join(", ")}`);
  }
} else {
  console.log("No MVT collisions — fingerprint disambiguation not needed.");
}
