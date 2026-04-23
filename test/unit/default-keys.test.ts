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
// Regression test for the Diehl OMS default-key auto-injection. Ports upstream's
// `addDefaultManufacturerKeyIfAny()` behaviour: when a Diehl-family meter sends
// a short-TPL Mode-5 frame and the caller supplied no key, the pipeline uses
// the hardcoded PRIOS key pair (KEY2 duplicated) to decrypt.

import "../../src/index.js";
import { describe, expect, it } from "vitest";
import { decodeWmbusHexSync } from "../../src/api.js";
import {
  DIEHL_OMS_DEFAULT_AES_KEY,
  isDiehlManufacturer,
  shouldUseDiehlDefaultKey,
} from "../../src/protocol/default-keys.js";
import { flagToManufacturer } from "../../src/protocol/manufacturers.js";

// User-provided telegram — DME Sharky meter, AES_CBC_IV (mode 5), 5 blocks,
// exactly the kind of frame wmbusmeters.org can decrypt without a key.
const SHARKY_TELEGRAM =
  "5e44a51173916587400c7a8a0050054061a72ba19e7f843dd132eb0ae2201583c1b9fc307a0f508da024cfec6462d3ca603ed172dec976e03839245d7625f1cf61735b47cba97a669d1d1fa04425b429efda24a9d49368f8a6b45400e14462";

describe("Diehl default-key support", () => {
  it("assembles the hardcoded AES key to `51728910E66D83F8` twice over", () => {
    expect(Buffer.from(DIEHL_OMS_DEFAULT_AES_KEY).toString("hex")).toBe(
      "51728910e66d83f851728910e66d83f8",
    );
  });

  it("recognises every Diehl-family manufacturer code", () => {
    for (const flag of ["DME", "HYD", "SAP", "EWT", "SPL"]) {
      expect(isDiehlManufacturer(flagToManufacturer(flag))).toBe(true);
    }
    expect(isDiehlManufacturer(flagToManufacturer("KAM"))).toBe(false);
  });

  it("triggers only on (Diehl mfct, SND_NR/IR, CI=0x7A, mode=5)", () => {
    const dme = flagToManufacturer("DME");
    const kam = flagToManufacturer("KAM");

    const base = { manufacturer: dme, cField: 0x44, ci: 0x7a, cfgWord: 0x0550 };
    expect(shouldUseDiehlDefaultKey(base)).toBe(true);
    expect(shouldUseDiehlDefaultKey({ ...base, cField: 0x46 })).toBe(true);

    // Non-Diehl mfct
    expect(shouldUseDiehlDefaultKey({ ...base, manufacturer: kam })).toBe(false);
    // Not SND_NR/IR
    expect(shouldUseDiehlDefaultKey({ ...base, cField: 0x08 })).toBe(false);
    // Long TPL header
    expect(shouldUseDiehlDefaultKey({ ...base, ci: 0x72 })).toBe(false);
    // Mode 0 (no security)
    expect(shouldUseDiehlDefaultKey({ ...base, cfgWord: 0x0000 })).toBe(false);
    // Mode 7 (AES_CBC_NO_IV) — upstream default-key only covers mode 5
    expect(shouldUseDiehlDefaultKey({ ...base, cfgWord: 0x0750 })).toBe(false);
  });
});

describe("auto-decode with Diehl default key", () => {
  it("decodes a Sharky telegram end-to-end without any caller-supplied key", () => {
    const out = decodeWmbusHexSync(SHARKY_TELEGRAM, "auto", "", {
      timestampOverride: "1111-11-11T11:11:11Z",
    });
    expect(out.meter).toBe("sharky");
    expect(out.id).toBe("87659173");
    expect(out.total_energy_consumption_kwh).toBe(44400);
    expect(out.total_volume_m3).toBe(20362.44);
    expect(out.flow_temperature_c).toBe(19);
    expect(out.return_temperature_c).toBe(18.9);
    expect(out.operating_time_h).toBe(4688);
    expect(out.target_energy_consumption_kwh).toBe(26950);
    expect(out.target_volume_m3).toBe(11231.39);
    expect(out.target_date).toBe("2026-03-31");
    expect(out.timestamp).toBe("1111-11-11T11:11:11Z");
  });

  it("does not emit the 1970 missing-key sentinel for Diehl OMS frames", () => {
    const out = decodeWmbusHexSync(SHARKY_TELEGRAM, "auto", "");
    expect(out.timestamp).not.toBe("1970-01-01T00:00:00Z");
  });
});
