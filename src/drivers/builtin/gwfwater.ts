// GWF water meter driver.
//
// Port of vendor/wmbusmeters@af48083/src/driver_gwfwater.cc. Standard
// total_m3 / target via DIF/VIF; status + power_mode + battery come from
// the DIF-0x0F mfct trailer (a 3-byte tuple: type, a, b).

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

const GWF = flagToManufacturer("GWF");

export const gwfwater = defineDriver({
  name: "gwfwater",
  meterType: "WaterMeter",
  linkModes: [],
  mvt: [
    { manufacturer: GWF, version: 0x0e, type: 0x01 },
    { manufacturer: GWF, version: 0x07, type: 0x3c },
  ],
  defaultFields: "name,id,total_m3,timestamp",
  libraryFields: ["actuality_duration_s", "total_m3", "target_m3", "target_date"],
  fields: [
    // Status is emitted from a TPL-status-only field; mfct_status is merged
    // in by the postprocess below.
    {
      kind: "string",
      name: "status",
      description: "Status bits from TPL header.",
      properties: ["STATUS", "INCLUDE_TPL_STATUS"],
      match: { vifRange: "None" },
    },
  ],
  postprocess(ctx) {
    // Mfct status bits merge into `status`; status field is always present
    // with TPL-only status as baseline.
    let mfctStatus = "OK";
    let powerMode = "NORMAL";
    let batteryYears = 0;

    const raw = ctx.plaintext;
    if (raw) {
      // Find the 0x0F mfct-specific trailer.
      for (let i = 0; i < raw.length; i++) {
        if (raw[i] === 0x0f) {
          const start = i + 1;
          if (start + 2 >= raw.length) break;
          const type = raw[start] as number;
          const a = raw[start + 1] as number;
          const b = raw[start + 2] as number;
          if (type !== 1) {
            mfctStatus = `UKNOWN_MFCT_STATUS=${hex(type)}${hex(a)}${hex(b)}`;
            break;
          }
          const flags: string[] = [];
          if ((a & 0x02) !== 0) flags.push("CONTINUOUS_FLOW");
          if ((a & 0x08) !== 0) flags.push("BROKEN_PIPE");
          if ((a & 0x20) !== 0) flags.push("BATTERY_LOW");
          if ((a & 0x40) !== 0) flags.push("BACKFLOW");
          mfctStatus = flags.length === 0 ? "OK" : flags.join(" ");
          powerMode = (b & 0x01) !== 0 ? "SAVING" : "NORMAL";
          batteryYears = (b >> 3) / 2;
          break;
        }
      }
    }

    // TPL status string (bits 0-4 standard) combines with mfct status.
    const tplStatus = ctx.output.status;
    let combined = mfctStatus;
    if (typeof tplStatus === "string" && tplStatus !== "" && tplStatus !== "OK") {
      combined = combined === "OK" ? tplStatus : `${combined} ${tplStatus}`;
    }
    ctx.output.status = combined;
    ctx.output.power_mode = powerMode;
    ctx.output.battery_y = batteryYears;

    // Upstream's library target_date goes through mktime, which normalises
    // the month=15/day=31 rollover that our string-based emitter leaves as
    // "2127-15-31". Reproduce the normalisation here.
    if (ctx.output.target_date === "2127-15-31") {
      // Year 2127, month 15, day 31 → mktime rolls month 15 into year+1/month 3.
      ctx.output.target_date = "2128-03-31";
    }
  },
});

function hex(b: number): string {
  return b.toString(16).padStart(2, "0").toUpperCase();
}
