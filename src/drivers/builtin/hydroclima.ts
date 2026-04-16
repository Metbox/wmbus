// Hydroclima heat cost allocator driver.
//
// Port of vendor/wmbusmeters@af48083/src/driver_hydroclima.cc. Standard DV
// parse pulls current_consumption_hca; the rest (ambient temperatures) is
// extracted from the DIF-0x0F mfct trailer. Only the RF_RKN0 variant is
// ported here — RKN9 exists but its fields aren't covered by fixtures.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

const BMP = flagToManufacturer("BMP");

export const hydroclima = defineDriver({
  name: "hydroclima",
  meterType: "HeatCostAllocationMeter",
  linkModes: ["T1"],
  mvt: [{ manufacturer: BMP, version: 0x08, type: 0x53 }],
  defaultFields:
    "name,id,current_consumption_hca,average_ambient_temperature_c,timestamp",
  fields: [
    {
      kind: "numeric",
      name: "current_consumption",
      description: "The current heat cost allocation.",
      quantity: "HCA",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "HeatCostAllocation" },
    },
  ],
  postprocess(ctx) {
    const raw = ctx.plaintext;
    if (!raw) return;

    // Find DIF 0x0F marker.
    let start = -1;
    for (let i = 0; i < raw.length; i++) {
      if (raw[i] === 0x0f) {
        start = i + 1;
        break;
      }
    }
    if (start < 0 || start >= raw.length) return;

    // Only the RKN0 shape (identified by a 036E current_consumption DVEntry
    // in the standard DV area) carries the four temperature fields.
    const hasCurrentConsumption = ctx.dvEntries.some((e) => e.difVifKey === "036E");
    if (!hasCurrentConsumption) return;

    // Byte-level layout after the 0x0F marker:
    //   0     frame_identifier
    //   1-2   status
    //   3-4   time
    //   5-6   date
    //   7-8   average_ambient_temperature (LE / 100)
    //   9-10  max_ambient_temperature     (LE / 100)
    //   11-12 max_date
    //   13-14 num_measurements
    //   15-16 average_ambient_temperature_last_month
    //   17-18 average_heater_temperature_last_month
    const b = (off: number): number | null => {
      const p = start + off;
      if (p + 1 >= raw.length) return null;
      return ((raw[p + 1] as number) << 8) | (raw[p] as number);
    };
    const toC = (val: number | null) => (val === null ? null : val / 100);

    const avg = toC(b(7));
    const max = toC(b(9));
    const avgLast = toC(b(15));
    const heaterLast = toC(b(17));

    if (avg !== null) ctx.output.average_ambient_temperature_c = avg;
    if (max !== null) ctx.output.max_ambient_temperature_c = max;
    if (avgLast !== null) ctx.output.average_ambient_temperature_last_month_c = avgLast;
    if (heaterLast !== null) ctx.output.average_heater_temperature_last_month_c = heaterLast;
  },
});
