// Zenner EDC B.One wireless M-Bus module water meter driver.
//
// Port of vendor/wmbusmeters@af48083/src/driver_zenner0b.cc. Uses a DIF
// 0x0F mfct-specific trailer with 13 bytes:
//   bytes 0-3  status (LE uint32, 0 = OK else hex)
//   bytes 4-7  target consumption (/ 256000 m³)
//   bytes 8-11 total consumption (/ 256000 m³)
//   byte  12   padding

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

const ZRI = flagToManufacturer("ZRI");

function le32(raw: Uint8Array, offset: number): number {
  return (
    ((raw[offset] as number) |
      ((raw[offset + 1] as number) << 8) |
      ((raw[offset + 2] as number) << 16) |
      ((raw[offset + 3] as number) << 24)) >>>
    0
  );
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export const zenner0b = defineDriver({
  name: "zenner0b",
  linkModes: ["C1"],
  meterType: "WaterMeter",
  mvt: [{ manufacturer: ZRI, version: 0x16, type: 0x0b }],
  defaultFields: "name,id,status,total_m3,target_m3,timestamp",
  fields: [],
  postprocess(ctx) {
    const raw = ctx.plaintext;
    if (!raw) return;

    // Find DIF 0x0F marker in the plaintext.
    let start = -1;
    for (let i = 0; i < raw.length; i++) {
      if (raw[i] === 0x0f) {
        start = i + 1;
        break;
      }
    }
    if (start < 0 || start + 12 > raw.length) return;

    const status = le32(raw, start);
    const target = le32(raw, start + 4);
    const total = le32(raw, start + 8);

    ctx.output.status = status === 0 ? "OK" : `0x${status.toString(16).toUpperCase().padStart(8, "0")}`;
    ctx.output.target_m3 = round4(target / 256000);
    ctx.output.total_m3 = round4(total / 256000);
  },
});
