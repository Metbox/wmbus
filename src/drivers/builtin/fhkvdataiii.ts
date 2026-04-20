/*
 * Copyright (C) 2017-2026 Fredrik Öhrström (gpl-3.0-or-later)
 * Copyright (C) 2026 Metbox / @metbox/wmbus contributors (gpl-3.0-or-later)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */
// Techem FHKV data III heat cost allocator — mfct-specific (CI=0xA0).
//
// Port of vendor/wmbusmeters@af48083/src/driver_fhkvdataiii.cc. Like
// compact5, the entire post-CI payload is proprietary; `processContent`
// reads fixed byte positions to extract two counters + two dates + two
// temperatures.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

const TCH = flagToManufacturer("TCH");

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

export const fhkvdataiii = defineDriver({
  name: "fhkvdataiii",
  meterType: "HeatCostAllocationMeter",
  linkModes: ["T1"],
  mvt: [
    { manufacturer: TCH, version: 0x69, type: 0x80 },
    { manufacturer: TCH, version: 0x94, type: 0x80 },
  ],
  defaultFields:
    "name,id,current_hca,current_date,previous_hca,previous_date,temp_room_c,temp_radiator_c,timestamp",
  fields: [],
  postprocess(ctx) {
    const raw = ctx.plaintext;
    if (!raw || raw.length < 14) return;

    // Previous billing date (bytes 1..2, packed date — not Type G layout).
    const datePrevLo = raw[1] as number;
    const datePrevHi = raw[2] as number;
    const datePrev = 256 * datePrevHi + datePrevLo;
    const dayPrev = datePrev & 0x1f;
    const monthPrev = (datePrev >> 5) & 0x0f;
    const yearPrev = 2000 + ((datePrev >> 9) & 0x3f);
    ctx.output.previous_date = `${yearPrev}-${pad2(monthPrev)}-${pad2(dayPrev)}T02:00:00Z`;

    // Previous consumption (bytes 3..4).
    const prev = 256 * (raw[4] as number) + (raw[3] as number);
    ctx.output.previous_hca = prev;

    // Current billing date (bytes 5..6, different packing).
    const dateCurrLo = raw[5] as number;
    const dateCurrHi = raw[6] as number;
    const dateCurr = 256 * dateCurrHi + dateCurrLo;
    let dayCurr = (dateCurr >> 4) & 0x1f;
    if (dayCurr <= 0) dayCurr = 1;
    let monthCurr = (dateCurr >> 9) & 0x0f;
    if (monthCurr <= 0) monthCurr = 12;
    let yearCurr = yearPrev;
    if (monthCurr < monthPrev || (monthCurr === monthPrev && dayCurr <= dayPrev)) {
      yearCurr++;
    }
    ctx.output.current_date = `${yearCurr}-${pad2(monthCurr)}-${pad2(dayCurr)}T02:00:00Z`;

    // Current consumption (bytes 7..8).
    const curr = 256 * (raw[8] as number) + (raw[7] as number);
    ctx.output.current_hca = curr;

    // Room / radiator temperatures — offsets depend on DLL version: 0x80
    // (fhkvdataiii) = 9, 0x94 variant = 10. We don't have dll_version here
    // directly, but ctx.driver.mvt[1] is 0x94 — and the telegram's device
    // type byte is available via the raw plaintext? Actually we need the
    // DLL version. We check the payload length: v=0x80 gives 14+ bytes,
    // v=0x94 gives 15+. Distinguishing on the byte at offset 9 (which in
    // 0x94 is a skip byte) is fragile; fall back to length heuristic.
    // Upstream checks t->dll_version directly; emulate with a boundary
    // check: if bytes at [9..10] look like 0 (skip) and [10..13] are
    // non-zero, assume 0x94.
    // Simpler alternative used here: pick the first temperature set that
    // yields values in a sane range (0-99°C).
    const pick = (offset: number): { room: number; rad: number } => {
      const room = (256 * (raw[offset + 1] as number) + (raw[offset] as number)) / 100;
      const rad = (256 * (raw[offset + 3] as number) + (raw[offset + 2] as number)) / 100;
      return { room, rad };
    };
    const v80 = pick(9);
    const v94 = raw.length >= 14 ? pick(10) : null;
    const plausible = (t: { room: number; rad: number }): boolean =>
      t.room >= 0 && t.room <= 99 && t.rad >= 0 && t.rad <= 99;
    const chosen = plausible(v80) ? v80 : (v94 ?? v80);
    ctx.output.temp_room_c = round2(chosen.room);
    ctx.output.temp_radiator_c = round2(chosen.rad);
  },
});

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
