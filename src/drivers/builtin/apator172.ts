// Apator 172 water meter (IXML grammar-driven, variant of apator08).
//
// Port of vendor/wmbusmeters@af48083/src/driver_apator172.cc. First 4 bytes
// of the CI=0xA0 payload are the total volume (DV 0413), same shape as
// apator08 but upstream uses a unique rounding step:
//   total_m3 = 0.1 * round(10000 * m3 / 3)
// Also rewrites the DLL type byte 0x11 → 0x07 (water) so the JSON media
// reports correctly — our port handles that by forcing media in postprocess.

import { defineDriver } from "../registry.js";

export const apator172 = defineDriver({
  name: "apator172",
  meterType: "WaterMeter",
  linkModes: ["T1"],
  // Upstream uses raw manufacturer code 0x8614 (the APT flag code with the
  // custom high-bit Apator uses on the 172 variant).
  mvt: [{ manufacturer: 0x8614, version: 0x04, type: 0x11 }],
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
    if (plaintext.length < 4) return plaintext;
    const synthetic = new Uint8Array(2 + 4);
    synthetic[0] = 0x04;
    synthetic[1] = 0x13;
    synthetic.set(plaintext.subarray(0, 4), 2);
    return synthetic;
  },
  postprocess(ctx) {
    // Upstream forces media to water even when the DLL type says something
    // else (the 0x11 "apator proprietary" byte).
    ctx.output.media = "water";
    const v = ctx.output.total_m3;
    if (typeof v === "number") {
      // Single tick = 1/3 m3; upstream's rule keeps one decimal:
      //   0.1 * round(10000 * m3 / 3)
      // Divide-then-multiply via integer to dodge FP noise like 7177.700000000001.
      ctx.output.total_m3 = Math.round((10000 * v) / 3) / 10;
    }
  },
});
