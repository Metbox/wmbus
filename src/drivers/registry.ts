// Driver registry — lookup by name, alias, or MVT triple.

import type { DriverDefinition, MVT } from "./types.js";

const byName = new Map<string, DriverDefinition>();
const byMVTKey = new Map<number, DriverDefinition[]>();

/**
 * Pack a (manufacturer, version, type) triple into a 32-bit key.
 *
 * Format: `(mfct << 16) | (version << 8) | type` — upstream's
 * matchesByVersionAndType() uses the same shape.
 */
function packMVT(m: MVT): number {
  return ((m.manufacturer & 0xffff) * 0x10000 + ((m.version & 0xff) << 8) + (m.type & 0xff)) >>> 0;
}

/**
 * Register a driver with the global registry. Safe to call multiple times
 * with the same driver — subsequent calls are no-ops.
 */
export function registerDriver(def: DriverDefinition): DriverDefinition {
  byName.set(def.name, def);
  for (const alias of def.aliases ?? []) byName.set(alias, def);
  for (const mvt of def.mvt) {
    const key = packMVT(mvt);
    const existing = byMVTKey.get(key);
    if (!existing) {
      byMVTKey.set(key, [def]);
    } else if (!existing.includes(def)) {
      existing.push(def);
    }
  }
  return def;
}

/** Convenience helper used inside driver files: registers + returns the def. */
export function defineDriver(def: DriverDefinition): DriverDefinition {
  return registerDriver(def);
}

/**
 * Look up a driver by name (exact or alias). Returns null when not found.
 */
export function lookupDriverByName(name: string): DriverDefinition | null {
  return byName.get(name) ?? null;
}

/** Look up the first driver that declared this exact MVT. */
export function lookupDriverByMVT(m: MVT): DriverDefinition | null {
  const candidates = byMVTKey.get(packMVT(m));
  return candidates?.[0] ?? null;
}

/** All distinct drivers, regardless of how many names / MVTs point at them. */
export function listDrivers(): DriverDefinition[] {
  const seen = new Set<DriverDefinition>();
  const out: DriverDefinition[] = [];
  for (const def of byName.values()) {
    if (!seen.has(def)) {
      seen.add(def);
      out.push(def);
    }
  }
  return out;
}

/** Alphabetically-sorted driver names (for the public listWmbusDrivers API). */
export function listDriverNames(): string[] {
  return [...byName.keys()].sort();
}

/** Clear the registry — ONLY for tests. */
export function _resetRegistry(): void {
  byName.clear();
  byMVTKey.clear();
}
