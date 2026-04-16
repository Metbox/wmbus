// TPL status byte decoder — port of wmbus.cc:5063-5116
// (decodeTPLStatusByteOnlyStandardBits, decodeTPLStatusByteNoMfct,
// decodeTPLStatusByteWithMfct).
//
// The TPL status byte has 3 standard bit-groups (0-4) and 3 mfct-specific
// bits (5-7):
//
//   bits 0-1: 00=no error, 01=BUSY, 10=ERROR, 11=ALARM
//   bit  2:   POWER_LOW
//   bit  3:   PERMANENT_ERROR
//   bit  4:   TEMPORARY_ERROR
//   bits 5-7: manufacturer-specific — decoded via driver's Translate.Lookup
//             if provided, else emitted as "UNKNOWN_<hex>".

import { applyLookup, sortStatusString } from "./translate.js";
import type { TranslateLookup } from "./types.js";

/** Decode only the standard bits 0-4. Returns "OK" when all clear. */
export function decodeTplStatusStandardBits(sts: number): string {
  if (sts === 0) return "OK";
  const parts: string[] = [];
  switch (sts & 0x03) {
    case 0x01:
      parts.push("BUSY");
      break;
    case 0x02:
      parts.push("ERROR");
      break;
    case 0x03:
      parts.push("ALARM");
      break;
  }
  if ((sts & 0x04) !== 0) parts.push("POWER_LOW");
  if ((sts & 0x08) !== 0) parts.push("PERMANENT_ERROR");
  if ((sts & 0x10) !== 0) parts.push("TEMPORARY_ERROR");
  return parts.join(" ");
}

/** Decode mfct bits 5-7 with no driver-provided translation. */
export function decodeTplStatusNoMfct(sts: number): string {
  const mfctBits = sts & 0xe0;
  if (mfctBits === 0) return "OK";
  return `UNKNOWN_${mfctBits.toString(16).toUpperCase().padStart(2, "0")}`;
}

/**
 * Decode the full TPL status byte, combining standard bits and mfct bits.
 * If a driver lookup is provided, it's used for the mfct half; otherwise we
 * emit UNKNOWN_<hex>.
 *
 * Matches upstream's `decodeTPLStatusByteWithMfct`: standard + mfct are
 * joined by a space, "OK"/empty sides are omitted.
 */
export function decodeTplStatusWithMfct(sts: number, lookup: TranslateLookup | null): string {
  const s = decodeTplStatusStandardBits(sts);
  const mfctBits = sts & 0xe0;
  let t = "OK";

  if (mfctBits !== 0) {
    if (lookup && hasLookupEntries(lookup)) {
      const translated = applyLookup(mfctBits, lookup);
      t = translated.length > 0 ? translated : "OK";
    } else {
      t = decodeTplStatusNoMfct(sts);
    }
  }

  if (t === "OK" || t === "") return sortStatusString(s);
  if (s === "OK" || s === "") return sortStatusString(t);
  return sortStatusString(`${s} ${t}`);
}

/** True if at least one rule in the lookup declares any map entries. */
function hasLookupEntries(lookup: TranslateLookup): boolean {
  for (const rule of lookup.rules) {
    if (rule.map.length > 0) return true;
  }
  return false;
}
