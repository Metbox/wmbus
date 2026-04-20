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
import { describe, expect, it } from "vitest";
import { decodeWmbusHex, listWmbusDrivers } from "../../src/index.js";

describe("@metbox/wmbus public API surface", () => {
  it("exports decodeWmbusHex", () => {
    expect(typeof decodeWmbusHex).toBe("function");
  });

  it("exports listWmbusDrivers", () => {
    expect(typeof listWmbusDrivers).toBe("function");
  });

  it("returns multical21 among registered drivers", async () => {
    const names = await listWmbusDrivers();
    expect(names).toContain("multical21");
    expect(names).toContain("auto");
  });

  it("decodes a known iPerl telegram end-to-end", async () => {
    // Pre-decrypted iPerl fixture — a good end-to-end smoke check through
    // pipeline → DV parser → auto driver (falls back to minimal output since
    // iperl driver isn't registered yet in Phase 5).
    const d = await decodeWmbusHex(
      "1E44AE4C9956341268077A36001000_2F2F0413181E0000023B00002F2F2F2F",
    );
    expect(d._).toBe("telegram");
    expect(d.id).toBe("12345699");
    expect(d.media).toBe("water");
  });
});
