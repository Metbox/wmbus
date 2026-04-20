// Techem MK Radio 3a water meter driver.
//
// Port of vendor/wmbusmeters@af48083/src/driver_mkradio3a.cc. The meter
// uses a mfct-specific (CI=0xA2) payload with 12 monthly readings laid
// out in one of two shapes depending on whether the billing day is in
// the first or second half of the month.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

const TCH = flagToManufacturer("TCH");

const MONTH_NAMES = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
];

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export const mkradio3a = defineDriver({
  name: "mkradio3a",
  meterType: "WaterMeter",
  linkModes: ["T1"],
  mvt: [{ manufacturer: TCH, version: 0x50, type: 0x72 }],
  defaultFields: "name,id,total_m3,target_m3,timestamp",
  fields: [],
  postprocess(ctx) {
    const raw = ctx.plaintext;
    if (!raw || raw.length < 42) return;

    const c = Array.from(raw) as number[];

    // Current date: bytes 2..3 (LE).
    const currDate = ((c[3] as number) << 8) | (c[2] as number);
    const day = currDate & 0x1f;
    const month = (currDate >> 5) & 0x0f;
    const year = (currDate >> 9) & 0xff;
    ctx.output.target_date = `${year + 2000}-${pad2(month)}-${pad2(day)}T02:00:00Z`;

    // Total = 24-bit LE at bytes 4..6, divided by 10.
    const total = (((c[6] as number) << 16) | ((c[5] as number) << 8) | (c[4] as number)) / 10;
    ctx.output.total_m3 = round3(total);

    // 12 months of readings: layout depends on day <= 15 or not.
    const prev: number[] = new Array(12).fill(0);
    let curr = 0;
    const n = (i: number) => c[i] as number;
    if (day <= 15) {
      curr = n(8) / 10;
      prev[(month + 12) % 12] = curr;
      prev[(month + 12 - 1) % 12] = (n(11) + n(9)) / 10;
      prev[(month + 12 - 2) % 12] = (n(14) + n(12)) / 10;
      prev[(month + 12 - 3) % 12] = (n(17) + n(15)) / 10;
      prev[(month + 12 - 4) % 12] = (n(20) + n(18)) / 10;
      prev[(month + 12 - 5) % 12] = (n(23) + n(21)) / 10;
      prev[(month + 12 - 6) % 12] = (n(26) + n(24)) / 10;
      prev[(month + 12 - 7) % 12] = (n(29) + n(27)) / 10;
      prev[(month + 12 - 8) % 12] = (n(32) + n(30)) / 10;
      prev[(month + 12 - 9) % 12] = (n(35) + n(33)) / 10;
      prev[(month + 12 - 10) % 12] = (n(38) + n(36)) / 10;
      prev[(month + 12 - 11) % 12] = (n(41) + n(39)) / 10;
    } else {
      curr = (n(9) + n(8)) / 10;
      prev[(month + 12) % 12] = curr;
      prev[(month + 12 - 1) % 12] = (n(12) + n(11)) / 10;
      prev[(month + 12 - 2) % 12] = (n(15) + n(14)) / 10;
      prev[(month + 12 - 3) % 12] = (n(18) + n(17)) / 10;
      prev[(month + 12 - 4) % 12] = (n(21) + n(20)) / 10;
      prev[(month + 12 - 5) % 12] = (n(24) + n(23)) / 10;
      prev[(month + 12 - 6) % 12] = (n(27) + n(26)) / 10;
      prev[(month + 12 - 7) % 12] = (n(30) + n(29)) / 10;
      prev[(month + 12 - 8) % 12] = (n(33) + n(32)) / 10;
      prev[(month + 12 - 9) % 12] = (n(36) + n(35)) / 10;
      prev[(month + 12 - 10) % 12] = (n(39) + n(38)) / 10;
      prev[(month + 12 - 11) % 12] = (n(42) + n(41)) / 10;
    }
    ctx.output.target_m3 = round3(curr);
    // Upstream: prev_month[1] → last_jan, prev_month[2] → last_feb, …,
    // prev_month[11] → last_nov, prev_month[0] → last_dec.
    for (let i = 1; i <= 11; i++) {
      const name = MONTH_NAMES[i - 1];
      ctx.output[`last_${name}_m3`] = round3(prev[i] as number);
    }
    ctx.output.last_dec_m3 = round3(prev[0] as number);
  },
});
