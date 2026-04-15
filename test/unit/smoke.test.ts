import { describe, expect, it } from "vitest";
import { decodeWmbusHex, listWmbusDrivers } from "../../src/index.js";

// Smoke tests prove the package resolves, imports, and the public API surface
// exists. They deliberately assert the NotImplemented behaviour for now — the
// moment a phase lands real logic, these tests get replaced with parity tests.
describe("@metbox/wmbus public API surface", () => {
  it("exports decodeWmbusHex", () => {
    expect(typeof decodeWmbusHex).toBe("function");
  });

  it("exports listWmbusDrivers", () => {
    expect(typeof listWmbusDrivers).toBe("function");
  });

  it("decodeWmbusHex throws NotImplemented before phase 7", async () => {
    await expect(decodeWmbusHex("deadbeef")).rejects.toThrow(/not yet implemented/);
  });
});
