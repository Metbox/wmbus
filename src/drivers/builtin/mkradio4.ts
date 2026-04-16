// Techem MK Radio 4 water meter driver.
//
// Port of vendor/wmbusmeters@af48083/src/driver_mkradio4.cc. Mfct-specific
// (CI=0xA2) payload — stripped down vs MKRadio3: no dates, just total +
// target counters at fixed offsets.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

const TCH = flagToManufacturer("TCH");

export const mkradio4 = defineDriver({
  name: "mkradio4",
  meterType: "WaterMeter",
  linkModes: ["T1"],
  mvt: [
    { manufacturer: TCH, version: 0x62, type: 0x95 },
    { manufacturer: TCH, version: 0x62, type: 0x70 },
    { manufacturer: TCH, version: 0x72, type: 0x95 },
    { manufacturer: TCH, version: 0x72, type: 0x70 },
  ],
  defaultFields: "name,id,total_m3,target_m3,timestamp",
  fields: [],
  postprocess(ctx) {
    const raw = ctx.plaintext;
    if (!raw || raw.length < 9) return;

    const prev = (256 * (raw[4] as number) + (raw[3] as number)) / 10;
    const curr = (256 * (raw[8] as number) + (raw[7] as number)) / 10;

    const round3 = (n: number) => Math.round(n * 1000) / 1000;
    ctx.output.total_m3 = round3(prev + curr);
    ctx.output.target_m3 = round3(prev);
  },
});
