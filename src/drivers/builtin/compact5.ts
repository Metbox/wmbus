// Techem Compact V heat meter — mfct-specific (CI=0xA1/0xA2) payload.
//
// Port of vendor/wmbusmeters@af48083/src/driver_compact5.cc. The Compact V
// ships an entirely proprietary post-CI blob; `processContent` pulls three
// 3-byte LE counters out of fixed offsets and exposes them as library-style
// numeric fields.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

const TCH = flagToManufacturer("TCH");

export const compact5 = defineDriver({
  name: "compact5",
  meterType: "HeatMeter",
  linkModes: ["T1", "C1"],
  mvt: [
    { manufacturer: TCH, version: 0x45, type: 0x04 },
    { manufacturer: TCH, version: 0x45, type: 0xc3 },
    { manufacturer: TCH, version: 0x22, type: 0x43 },
    { manufacturer: TCH, version: 0x45, type: 0x43 },
    { manufacturer: TCH, version: 0x39, type: 0x43 },
  ],
  defaultFields: "name,id,total_kwh,current_kwh,previous_kwh,timestamp",
  fields: [],
  postprocess(ctx) {
    // bytes [3..5] = previous-period counter, [7..9] = current-period counter
    // (3-byte LE ints in kWh), per driver_compact5.cc:63 processContent.
    const raw = ctx.plaintext;
    if (!raw || raw.length < 10) return;

    const prev = ((raw[5] as number) << 16) | ((raw[4] as number) << 8) | (raw[3] as number);
    const curr = ((raw[9] as number) << 16) | ((raw[8] as number) << 8) | (raw[7] as number);

    ctx.output.total_kwh = prev + curr;
    ctx.output.current_kwh = curr;
    ctx.output.previous_kwh = prev;
  },
});
