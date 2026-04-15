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
