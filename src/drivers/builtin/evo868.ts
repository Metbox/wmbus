// Maddalena EVO 868 water meter driver.
//
// Port of vendor/wmbusmeters@af48083/src/driver_evo868.cc. The historic
// date list (history_1_date..history_12_date) is calculated via month
// arithmetic on the reference date in the postprocess hook.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

const MAD = flagToManufacturer("MAD");

export const evo868 = defineDriver({
  name: "evo868",
  meterType: "WaterMeter",
  linkModes: ["T1"],
  mvt: [
    { manufacturer: MAD, version: 0x50, type: 0x06 },
    { manufacturer: MAD, version: 0x50, type: 0x07 },
    { manufacturer: MAD, version: 0x50, type: 0x16 },
  ],
  defaultFields:
    "name,id,total_m3,current_status,consumption_at_set_date_m3,set_date,timestamp",
  libraryFields: ["fabrication_no", "total_m3"],
  fields: [
    {
      kind: "string",
      name: "current_status",
      description: "Status and error flags.",
      properties: ["STATUS", "INCLUDE_TPL_STATUS"],
      match: { measurementType: "Instantaneous", vifRange: "ErrorFlags" },
      lookup: {
        rules: [
          {
            name: "ERROR_FLAGS",
            mapType: "BitToString",
            maskBits: 0xffff,
            defaultMessage: "OK",
            map: [],
          },
        ],
      },
    },
    {
      kind: "numeric",
      name: "consumption_at_set_date",
      description: "Water consumption at the most recent billing period.",
      quantity: "Volume",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "Volume", storageNr: 1 },
    },
    {
      kind: "string",
      name: "set_date",
      description: "Most recent billing period date.",
      match: { measurementType: "Instantaneous", vifRange: "Date", storageNr: 1 },
    },
    {
      kind: "numeric",
      name: "consumption_at_set_date_2",
      description: "Water consumption at the 2nd most recent billing period.",
      quantity: "Volume",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "Volume", storageNr: 2 },
    },
    {
      kind: "string",
      name: "set_date_2",
      description: "2nd most recent billing period date.",
      match: { measurementType: "Instantaneous", vifRange: "Date", storageNr: 2 },
    },
    {
      kind: "numeric",
      name: "max_flow_since_datetime",
      description: "Maximum water flow since datetime.",
      quantity: "Flow",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Maximum", vifRange: "VolumeFlow", storageNr: 3 },
    },
    {
      kind: "string",
      name: "max_flow_datetime",
      description: "Datetime of max flow measurement.",
      match: {
        measurementType: "Instantaneous",
        vifRange: "DateTime",
        storageNr: 3,
      },
    },
    {
      kind: "string",
      name: "history_reference_date",
      description: "Reference date for history entries.",
      match: { measurementType: "Instantaneous", vifRange: "Date", storageNr: 8 },
    },
    {
      kind: "string",
      name: "device_date_time",
      description: "Date/time the meter sent this telegram.",
      match: { measurementType: "Instantaneous", vifRange: "DateTime" },
    },
  ],
  postprocess(ctx) {
    // Storage 8..19 carry historic monthly volume readings.
    // The JSON names shift by −7 so slot N becomes history_{N-7}.
    for (const entry of ctx.dvEntries) {
      if (
        entry.measurementType === "Instantaneous" &&
        entry.storageNr >= 8 &&
        entry.storageNr <= 19 &&
        typeof entry.asNumber === "number"
      ) {
        // Volume VIF range check (matches our Volume range 0x10..0x17).
        const lowVif = entry.vif & 0x7f;
        if (lowVif < 0x10 || lowVif > 0x17) continue;
        // Reuse vifScaleExponent to scale the m³ value.
        const raw = entry.asNumber;
        // Volume VIF exponent: (lowVif - 0x10) - 6 per m³. Apply × 10^exp.
        const exp = lowVif - 0x10 - 6;
        const m3 = Math.round(raw * 10 ** exp * 1000) / 1000;
        const slot = entry.storageNr - 7;
        ctx.output[`consumption_at_history_${slot}_m3`] = m3;
      }
    }

    // history_N_date = history_reference_date − (N−1) months, where the day
    // is the last day of the resulting month (matches upstream: reference
    // dates are always end-of-month billing markers).
    const ref = ctx.output.history_reference_date;
    if (typeof ref === "string" && /^\d{4}-\d{2}-\d{2}/.test(ref)) {
      const [yStr, mStr] = ref.split("-");
      const refYear = Number(yStr);
      const refMonth = Number(mStr); // 1..12
      for (let n = 1; n <= 12; n++) {
        let y = refYear;
        let m = refMonth - (n - 1);
        while (m <= 0) {
          m += 12;
          y -= 1;
        }
        const d = lastDayOfMonth(y, m);
        ctx.output[`history_${n}_date`] =
          `${y.toString().padStart(4, "0")}-${pad2(m)}-${pad2(d)}`;
      }
    }
  },
});

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function lastDayOfMonth(year: number, month: number): number {
  // month is 1..12; Date(year, month, 0) gives last day of previous JS month
  // which for month=1 is the last day of month #1 (January 31).
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}
