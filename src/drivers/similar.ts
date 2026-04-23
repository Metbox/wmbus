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
// Similar-driver fallback for the "auto" dispatcher. Port of upstream's
// `findBestNewStyleDriver()` (metermanager.cc:321) + `Telegram::analyzeParse()`
// (wmbus.cc:2280) scoring: for each registered driver, count DV-payload bytes
// whose records are matched by the driver's declared fields. Pick the driver
// with the highest understood-byte count. Ties broken by tighter coverage
// (smaller total), then name ordering for determinism.
//
// Deliberate deviations from upstream:
//  - Drivers that declare a `preprocess` hook are skipped. Those drivers
//    expect descrambled input (Diehl LFSR, apator08/162 synthetic DV), and
//    scoring their matchers against raw plaintext would systematically
//    underscore them. Running every candidate's preprocess speculatively is
//    possible but expensive; excluded for now.
//  - Drivers with zero matched bytes are never picked. Upstream's pure argmax
//    can return a driver with u=0 as "best" when nothing matches; we'd rather
//    fall through to minimalOutput() and let the caller retry.

import type { DVEntry } from "../data/dv-parser.js";
import { matchesField } from "./interpreter.js";
import { listDrivers } from "./registry.js";
import type { DriverDefinition } from "./types.js";

export interface SimilarDriverMatch {
  driver: DriverDefinition;
  /** Bytes of DV payload the driver's field matchers covered. */
  understood: number;
  /** Total DV-payload byte length (same across drivers for the same input). */
  total: number;
}

/** Total byte length of a DVEntry — DIF+DIFE+VIF+VIFE chain + data payload. */
function entryByteLength(entry: DVEntry): number {
  return entry.difVifKey.length / 2 + entry.rawValue.length;
}

/**
 * Score a single driver against a DVEntry list. An entry counts as understood
 * if any of the driver's declarative fields matches it.
 */
export function scoreDriver(
  driver: DriverDefinition,
  dvEntries: DVEntry[],
): { understood: number; total: number } {
  let understood = 0;
  let total = 0;
  for (const entry of dvEntries) {
    const bytes = entryByteLength(entry);
    total += bytes;
    for (const field of driver.fields) {
      if (matchesField(entry, field.match)) {
        understood += bytes;
        break;
      }
    }
  }
  return { understood, total };
}

/**
 * Find the best-fit driver for a DVEntry list when exact MVT lookup has
 * failed. Returns null when no driver covers any bytes.
 */
export function findSimilarDriver(dvEntries: DVEntry[]): SimilarDriverMatch | null {
  if (dvEntries.length === 0) return null;

  let best: SimilarDriverMatch | null = null;

  const candidates = listDrivers()
    .filter((d) => d.preprocess === undefined)
    .sort((a, b) => a.name.localeCompare(b.name));

  for (const driver of candidates) {
    const { understood, total } = scoreDriver(driver, dvEntries);
    if (understood === 0) continue;
    if (
      best === null ||
      understood > best.understood ||
      (understood === best.understood && total < best.total)
    ) {
      best = { driver, understood, total };
    }
  }

  return best;
}
