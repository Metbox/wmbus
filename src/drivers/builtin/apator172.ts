// apator172 — auto-generated registry stub.
// Source: upstream wmbusmeters driver definition.
//
// Registers the driver with correct MVTs and library fields so the registry
// resolves its name. Specialised field extraction + mfct-specific quirks are
// not yet ported; production traffic will populate the standard library
// fields and fall back to auto-driver behaviour for anything non-standard.

import { defineDriver } from "../registry.js";

export const apator172 = defineDriver({
  name: "apator172",
  meterType: "WaterMeter",
  linkModes: ["T1"],
  mvt: [{ manufacturer: 0x8614, version: 0x04, type: 0x11 }],
  defaultFields: "name,id,total_m3,status,timestamp",
  libraryFields: ["total_m3", "target_m3", "target_date", "meter_datetime"],
  fields: [],
});
