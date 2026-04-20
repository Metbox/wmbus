// Apator E.ITN 30.51/30.60 heat cost allocator driver.
//
// Port of vendor/wmbusmeters@af48083/src/driver_apatoreitn.cc.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

const APA = flagToManufacturer("APA");
const APT = flagToManufacturer("APT");

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function dateToString(lo: number, hi: number): string {
  const value = 256 * hi + lo;
  if (value === 0) return "";
  const day = value & 0x1f;
  const month = (value >> 5) & 0x0f;
  const year = ((value >> 9) & 0x1f) + 2000;
  return `${year.toString().padStart(4, "0")}-${pad2(month)}-${pad2(day)}T02:00:00Z`;
}

export const apatoreitn = defineDriver({
  name: "apatoreitn",
  meterType: "HeatCostAllocationMeter",
  linkModes: [],
  mvt: [
    { manufacturer: APA, version: 0x04, type: 0x08 },
    { manufacturer: APT, version: 0x04, type: 0x08 },
  ],
  defaultFields:
    "name,id,current_hca,previous_hca,current_date,season_start_date,esb_date," +
    "temp_room_avg_c,temp_room_prev_avg_c,timestamp",
  fields: [],
  postprocess(ctx) {
    const raw = ctx.plaintext;
    if (!raw) return;

    // Upstream switches on t->tpl_ci:
    //  - 0xA0: re-inject the CI byte as content[0] (our payload starts one
    //    byte later, so prepend 0xA0 to make it 16 bytes).
    //  - 0xB6: content[0] is a header length, skip header_len+1 bytes.
    // Detect by looking at first byte: 0xA1 (byte after A0) or a tiny
    // length prefix.
    let content = Array.from(raw);

    if (content.length > 0 && content[0] === 0xa1) {
      content = [0xa0, ...content];
    } else if (content.length > 2 && (content[0] as number) < 0x20) {
      const headerLen = (content[0] as number) + 1;
      if (content.length > headerLen && content[headerLen] === 0xa0) {
        content = content.slice(headerLen);
      }
    }

    if (content.length < 16) return;
    content = content.slice(0, 16);

    ctx.output.season_start_date = dateToString(content[1] as number, content[0] as number);
    ctx.output.previous_hca = 256 * (content[5] as number) + (content[4] as number);
    ctx.output.esb_date = dateToString(content[6] as number, content[7] as number);
    ctx.output.current_hca = 256 * (content[9] as number) + (content[8] as number);
    ctx.output.current_date = dateToString(content[10] as number, content[11] as number);
    ctx.output.temp_room_prev_avg_c = (content[13] as number) + (content[12] as number) / 256;
    ctx.output.temp_room_avg_c = (content[15] as number) + (content[14] as number) / 256;
  },
});
