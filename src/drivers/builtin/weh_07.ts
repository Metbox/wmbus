// weh_07 — auto-generated registry stub.
// Source: upstream wmbusmeters driver definition.
//
// Registers the driver with correct MVTs and library fields so the registry
// resolves its name. Specialised field extraction + mfct-specific quirks are
// not yet ported; production traffic will populate the standard library
// fields and fall back to auto-driver behaviour for anything non-standard.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

export const weh_07 = defineDriver({
  name: "weh_07",
  meterType: "WaterMeter",
  linkModes: ["T1"],
  mvt: [
    { manufacturer: flagToManufacturer("WEH"), version: 0x07, type: 0xfe },
    { manufacturer: flagToManufacturer("WEH"), version: 0x07, type: 0x03 },
  ],
  defaultFields: "name,id,total_m3,status,timestamp",
  libraryFields: ["total_m3", "target_m3", "target_date", "meter_datetime"],
  fields: [],
});
