// abbb23 — auto-generated registry stub.
// Source: upstream wmbusmeters driver definition.
//
// Registers the driver with correct MVTs and library fields so the registry
// resolves its name. Specialised field extraction + mfct-specific quirks are
// not yet ported; production traffic will populate the standard library
// fields and fall back to auto-driver behaviour for anything non-standard.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

export const abbb23 = defineDriver({
  name: "abbb23",
  meterType: "ElectricityMeter",
  linkModes: ["T1"],
  mvt: [{ manufacturer: flagToManufacturer("ABB"), version: 0x20, type: 0x02 }],
  defaultFields: "name,id,total_energy_consumption_kwh,status,timestamp",
  libraryFields: ["total_energy_consumption_kwh", "meter_datetime"],
  fields: [],
});
