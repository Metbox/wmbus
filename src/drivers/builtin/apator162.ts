// Apator 162 water meter (IXML grammar-driven).
//
// Port of vendor/wmbusmeters@af48083/drivers/src/apator162.xmq. The payload
// carries an Apator-proprietary mfct block marked by 0x0F (DIF manufacturer-
// specific). Inside: one leading byte (skip), seven status bytes, then a
// run of tagged fields of the form `<tag-byte> <N bytes>`. We only care
// about the `total` field (tag 0x10, 4-byte little-endian integer in litres)
// — everything else the grammar names `woot_*` and is discarded.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

export const apator162 = defineDriver({
  name: "apator162",
  meterType: "WaterMeter",
  linkModes: ["T1"],
  mvt: [
    { manufacturer: flagToManufacturer("APA"), version: 0x05, type: 0x06 },
    { manufacturer: flagToManufacturer("APA"), version: 0x05, type: 0x07 },
  ],
  defaultFields: "name,id,total_m3,timestamp",
  fields: [
    {
      kind: "numeric",
      name: "total",
      description: "Total water consumption.",
      quantity: "Volume",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "Volume" },
    },
  ],
  preprocess(plaintext) {
    const total = extractApator162Total(plaintext);
    if (total === null) return plaintext;
    // Emit the standard DV 0413 prefix followed by the extracted 4 bytes so
    // the DV parser / interpreter pipeline takes over unchanged.
    const synthetic = new Uint8Array(2 + 4);
    synthetic[0] = 0x04;
    synthetic[1] = 0x13;
    synthetic.set(total, 2);
    return synthetic;
  },
});

function extractApator162Total(plaintext: Uint8Array): Uint8Array | null {
  // Upstream's grammar: `decode = -byte, status(7), field*, end_FF`. Most
  // fixtures lead with 0x0F (mfct-specific DIF marker) — that's the -byte
  // skip. Some older telegrams start with 0x80; walk past any non-tag
  // prefix until we reach the 7-byte status block, then scan tagged fields.
  const start = plaintext.length >= 1 && plaintext[0] === 0x0f ? 1 : 0;
  // Skip 7 status bytes.
  let pos = start + 7;
  while (pos + 4 < plaintext.length) {
    const tag = plaintext[pos] as number;
    if (tag === 0x10) {
      return plaintext.subarray(pos + 1, pos + 5);
    }
    // Tag 0xFF marks end-of-fields; stop scanning.
    if (tag === 0xff) return null;
    pos += fieldWidthFromTag(tag);
  }
  return null;
}

/**
 * Byte-width of an apator162 IXML field for a given tag. Values come from
 * the grammar at apator162.xmq:32 onward — each rule is literally
 * `<tag>, <N bytes of data>` with the tag included, so `width` counts both.
 */
function fieldWidthFromTag(tag: number): number {
  // Upper nibble first — these prefixes have variable-length payloads but we
  // only need to skip them on the way to tag 0x10.
  if (tag === 0x00) return 1 + 4; // date: quad
  if (tag === 0x01) return 1 + 3; // faults: triplet
  if (tag === 0x10) return 1 + 4; // total: quad  (handled above)
  if (tag === 0x11) return 1 + 2; // flow: word
  if (tag === 0x40) return 1 + 3 + 3; // detectors: triplet*2
  if (tag === 0x41) return 1 + 2; // voltage: word
  if (tag === 0x42) return 1 + 4; // energy: quad
  if (tag === 0x43) return 1 + 2; // days: word
  if (tag === 0x44) return 1 + 3; // woot_44: triplet
  if (tag >= 0x71 && tag <= 0x7b) {
    // woot_71..7B: byte + (tag - 0x6F) quads
    return 1 + 1 + (tag - 0x6f) * 4;
  }
  if ([0x80, 0x81, 0x82, 0x83, 0x84, 0x86, 0x87].includes(tag)) {
    return 1 + 4 + 4 + 2; // woot_8x: quad, quad, word
  }
  if ([0x85, 0x88, 0x8f].includes(tag)) {
    return 1 + 4 + 4 + 3; // woot_8xx: quad, quad, triplet
  }
  if (tag === 0x8a) return 1 + 4 + 4 + 1;
  if (tag === 0x8b || tag === 0x8c) return 1 + 3 + 3;
  if (tag === 0x8e) return 1 + 4 + 3;
  if (tag === 0xa0) return 1 + 4;
  if (tag === 0xa1) return 1 + 4;
  if (tag === 0xa2) return 1 + 1;
  if (tag === 0xa3) return 1 + 3 + 3 + 1;
  if (tag === 0xa4) return 1 + 4;
  if (tag === 0xa5) return 1 + 1;
  if (tag === 0xa6) return 1 + 3;
  if (tag === 0xa9) return 1 + 1;
  if (tag === 0xaf) return 1 + 1;
  if ([0xa7, 0xa8, 0xaa, 0xab, 0xac, 0xad].includes(tag)) return 1 + 2;
  if (tag === 0xb0) return 1 + 4 + 1;
  if (tag === 0xb1) return 1 + 4 + 4;
  if (tag === 0xb2) return 1 + 4 * 4;
  if (tag === 0xb3) return 1 + 4 + 4;
  if (tag === 0xb4) return 1 + 2;
  if (tag === 0xb5) return 1 + 4 * 4;
  if (tag >= 0xb6 && tag <= 0xbf) return 1 + 3;
  if (tag >= 0xc0 && tag <= 0xc7) return 1 + 3;
  if (tag === 0xd0 || tag === 0xd3) return 1 + 3;
  if (tag === 0xf0) return 1 + 4;
  // Unknown tag — bump by 1 so we don't infinite-loop.
  return 1;
}
