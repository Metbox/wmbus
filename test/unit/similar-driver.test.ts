/*
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
// Regression test for the similar-driver fallback. When a telegram's wire MVT
// doesn't exactly match any registered driver (common with OEM-relabelled
// meters, newer firmwares, Diehl v/t swaps etc.), the auto dispatcher falls
// back to scoring every driver by how many DV-payload bytes its declarative
// fields cover and picks the best match. Upstream's `analyze` mode prints the
// same thing as "Similar driver: <name> U/L".

import "../../src/index.js";
import { describe, expect, it } from "vitest";
import { decodeWmbusHexSync } from "../../src/api.js";
import { parseDv } from "../../src/data/dv-parser.js";
import { lookupDriverByName } from "../../src/drivers/registry.js";
import { findSimilarDriver, scoreDriver } from "../../src/drivers/similar.js";
import { hexToBytes } from "../../src/util/hex.js";

// Plaintext DV payload from the first sharky774 fixture (after the
// `2F2F` decrypt-check prefix is stripped). The full wire telegram has
// version=0x41, type=0x04 which doesn't match any registered driver — our
// sharky774 declares version=0x04, type=0x41 (upstream's on-wire swap issue).
const SHARKY774_DV_HEX =
  "0C06846800000C13195364000B3B0400000C2B110100000A5A17050A5E76020AA61800004C0647630000426CBF25";

describe("findSimilarDriver", () => {
  it("returns null for empty DV lists", () => {
    expect(findSimilarDriver([])).toBeNull();
  });

  it("picks sharky774 for a Sharky DV payload whose wire MVT is swapped", () => {
    const { entries } = parseDv(hexToBytes(SHARKY774_DV_HEX));
    const match = findSimilarDriver(entries);
    if (!match) throw new Error("expected similar-driver match, got null");
    expect(match.driver.name).toBe("sharky774");
    expect(match.understood).toBeGreaterThan(0);
    expect(match.understood).toBeLessThanOrEqual(match.total);
  });

  it("scoreDriver ranks the correct driver above an unrelated one", () => {
    const { entries } = parseDv(hexToBytes(SHARKY774_DV_HEX));
    const sharky = lookupDriverByName("sharky774");
    const water = lookupDriverByName("multical21");
    if (!sharky || !water) throw new Error("reference drivers not registered");
    const sharkyScore = scoreDriver(sharky, entries);
    const waterScore = scoreDriver(water, entries);
    expect(sharkyScore.total).toBe(waterScore.total);
    // A water meter may overlap on a few shared VIFs (volume/flow) but must
    // understand strictly fewer bytes than the purpose-built heat driver.
    expect(sharkyScore.understood).toBeGreaterThan(waterScore.understood);
  });
});

describe("auto driver similar-match fallback", () => {
  it("auto resolves to sharky774 for a telegram whose wire MVT isn't declared", () => {
    // First sharky774 fixture from upstream.json — wire MVT (DME, 0x41, 0x04)
    // is not declared (sharky774 declares version=0x04, type=0x41). Exact
    // lookup fails; similarity must pick sharky774.
    const hex =
      "3E44A5110564495841047A700030052F2F0C06846800000C13195364000B3B0400000C2B110100000A5A17050A5E76020AA61800004C0647630000426CBF25";
    const out = decodeWmbusHexSync(hex, "auto", "", {
      idOverride: "58496405",
      timestampOverride: "1111-11-11T11:11:11Z",
    });
    expect(out.meter).toBe("sharky774");
    // A real numeric field from the sharky774 driver must be present.
    expect(out.total_energy_consumption_kwh).toBe(6884);
  });

  it("falls through to minimal output when no driver matches any DV byte", () => {
    // Construct a DV record that no declarative driver's field matchers cover:
    // a manufacturer-specific VIF on a mfct-specific storage record.
    // DIF=04 (32-bit int), VIF=FF mfct-specific, 4 data bytes.
    // No driver declares vifRaw=0xff with no combinables and storage=0.
    const dvHex = "04FF01020304";
    const { entries } = parseDv(hexToBytes(dvHex));
    expect(findSimilarDriver(entries)).toBeNull();
  });
});
