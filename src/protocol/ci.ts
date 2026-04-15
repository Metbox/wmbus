// CI-field classification.
//
// Port of the `LIST_OF_CI_FIELDS` macro table in wmbus.cc:631. The CI byte
// immediately after the DLL chooses which layer handles the rest of the
// frame — TPL, ELL, NWL, AFL, or a manufacturer-specific block. Phase 3
// wires up TPL + ELL; AFL is passthrough (user keys usually cover just TPL),
// NWL and manufacturer-specific are left to higher layers.

export type CiType = "TPL" | "ELL" | "NWL" | "AFL" | "MFCT" | "UNKNOWN";

interface CiEntry {
  value: number;
  type: CiType;
  /** Number of header bytes (excluding the CI byte itself). -1 = variable. */
  len: number;
  name: string;
}

const TABLE: CiEntry[] = [
  { value: 0x51, type: "TPL", len: 0, name: "TPL: APL follows" },
  { value: 0x72, type: "TPL", len: 12, name: "TPL: long header APL follows" },
  { value: 0x78, type: "TPL", len: 0, name: "TPL: no header APL follows" },
  { value: 0x79, type: "TPL", len: 0, name: "TPL: compact APL follows" },
  { value: 0x7a, type: "TPL", len: 4, name: "TPL: short header APL follows" },
  { value: 0x81, type: "NWL", len: 0, name: "NWL: TPL or APL follows?" },
  { value: 0x8c, type: "ELL", len: 2, name: "ELL: I" },
  { value: 0x8d, type: "ELL", len: 8, name: "ELL: II" },
  { value: 0x8e, type: "ELL", len: 10, name: "ELL: III" },
  { value: 0x8f, type: "ELL", len: 16, name: "ELL: IV" },
  { value: 0x86, type: "ELL", len: -1, name: "ELL: V (variable length)" },
  { value: 0x90, type: "AFL", len: 10, name: "AFL" },
];

const BY_VALUE = new Map(TABLE.map((e) => [e.value, e]));

/** Returns the CI-field type, or "UNKNOWN" for reserved / DLMS values. */
export function ciType(ci: number): CiType {
  const entry = BY_VALUE.get(ci);
  if (entry) return entry.type;
  // Manufacturer-specific block per wmbus.cc:668.
  if (ci >= 0xa0 && ci <= 0xb7) return "MFCT";
  return "UNKNOWN";
}

/** Header length (excluding the CI byte itself) for a known CI. */
export function ciHeaderLength(ci: number): number {
  return BY_VALUE.get(ci)?.len ?? -1;
}

/** Friendly label for diagnostics. */
export function ciName(ci: number): string {
  const entry = BY_VALUE.get(ci);
  if (entry) return entry.name;
  if (ci >= 0xa0 && ci <= 0xb7) return "Mfct specific";
  if (ci >= 0x00 && ci <= 0x1f) return "Reserved for DLMS";
  return "Reserved";
}

/** Convenience predicate. */
export function isTpl(ci: number): boolean {
  return ciType(ci) === "TPL";
}

/** Convenience predicate. */
export function isEll(ci: number): boolean {
  return ciType(ci) === "ELL";
}

/** Convenience predicate. */
export function isAfl(ci: number): boolean {
  return ci === 0x90;
}
