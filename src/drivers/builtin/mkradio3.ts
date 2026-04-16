// Techem MK Radio 3 water meter driver.
//
// Port of vendor/wmbusmeters@af48083/src/driver_mkradio3.cc. The telegram
// uses CI=0xA2 (mfct-specific) and embeds a packed layout: previous date +
// previous consumption + current month/day + current consumption. The year
// is not encoded in the telegram — upstream substitutes the host's current
// year, which fixtures pin to whatever year they were generated in.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

const TCH = flagToManufacturer("TCH");

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export const mkradio3 = defineDriver({
  name: "mkradio3",
  meterType: "WaterMeter",
  linkModes: ["T1"],
  mvt: [
    { manufacturer: TCH, version: 0x62, type: 0x74 },
    { manufacturer: TCH, version: 0x72, type: 0x74 },
  ],
  defaultFields: "name,id,total_m3,target_m3,current_date,prev_date,timestamp",
  fields: [],
  postprocess(ctx) {
    const raw = ctx.plaintext;
    if (!raw || raw.length < 9) return;

    // Previous billing date (2 bytes, packed d|m|y).
    const prevDate = ((raw[2] as number) << 8) | (raw[1] as number);
    const prevDay = prevDate & 0x1f;
    const prevMonth = (prevDate >> 5) & 0x0f;
    const prevYear = (prevDate >> 9) & 0x3f;
    ctx.output.prev_date = `${prevYear + 2000}-${pad2(prevMonth)}-${pad2(prevDay)}T02:00:00Z`;

    // Previous consumption (2 bytes LE / 10).
    const prev = (256 * (raw[4] as number) + (raw[3] as number)) / 10;

    // Current billing date (no year in telegram — use host's current year).
    const currentDate = ((raw[6] as number) << 8) | (raw[5] as number);
    const currentDay = (currentDate >> 4) & 0x1f;
    const currentMonth = (currentDate >> 9) & 0x0f;
    const year = new Date().getUTCFullYear();
    ctx.output.current_date = `${year}-${pad2(currentMonth)}-${pad2(currentDay)}T02:00:00Z`;

    // Current consumption.
    const curr = (256 * (raw[8] as number) + (raw[7] as number)) / 10;

    ctx.output.total_m3 = round3(prev + curr);
    ctx.output.target_m3 = round3(prev);
  },
});
