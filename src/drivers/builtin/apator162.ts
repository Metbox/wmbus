// apator162 — auto-generated registry stub.
// Source: upstream wmbusmeters driver definition.
//
// Registers the driver with correct MVTs and library fields so the registry
// resolves its name. Specialised field extraction + mfct-specific quirks are
// not yet ported; production traffic will populate the standard library
// fields and fall back to auto-driver behaviour for anything non-standard.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

export const apator162 = defineDriver({
  name: "apator162",
  meterType: "WaterMeter",
  linkModes: ["T1"],
  mvt: [
    { manufacturer: flagToManufacturer("APA"), version: 0x05, type: 0x06 },
    { manufacturer: flagToManufacturer("APA"), version: 0x05, type: 0x07 },
  ],
  defaultFields: "name,id,total_m3,status,timestamp",
  libraryFields: ["total_m3", "target_m3", "target_date", "meter_datetime"],
  fields: [],
});
