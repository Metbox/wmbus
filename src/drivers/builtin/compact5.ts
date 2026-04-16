// compact5 — auto-generated registry stub.
// Source: upstream wmbusmeters driver definition.
//
// Registers the driver with correct MVTs and library fields so the registry
// resolves its name. Specialised field extraction + mfct-specific quirks are
// not yet ported; production traffic will populate the standard library
// fields and fall back to auto-driver behaviour for anything non-standard.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

export const compact5 = defineDriver({
  name: "compact5",
  meterType: "WaterMeter",
  linkModes: ["T1"],
  mvt: [
    { manufacturer: flagToManufacturer("TCH"), version: 0x04, type: 0x45 },
    { manufacturer: flagToManufacturer("TCH"), version: 0xc3, type: 0x45 },
    { manufacturer: flagToManufacturer("TCH"), version: 0x43, type: 0x22 },
    { manufacturer: flagToManufacturer("TCH"), version: 0x43, type: 0x45 },
    { manufacturer: flagToManufacturer("TCH"), version: 0x43, type: 0x39 },
  ],
  defaultFields: "name,id,total_m3,status,timestamp",
  libraryFields: ["total_m3", "target_m3", "target_date", "meter_datetime"],
  fields: [],
});
