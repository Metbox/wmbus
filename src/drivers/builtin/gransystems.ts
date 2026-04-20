// gransystems — auto-generated registry stub.
// Source: upstream wmbusmeters driver definition.
//
// Registers the driver with correct MVTs and library fields so the registry
// resolves its name. Specialised field extraction + mfct-specific quirks are
// not yet ported; production traffic will populate the standard library
// fields and fall back to auto-driver behaviour for anything non-standard.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

export const gransystems = defineDriver({
  name: "gransystems",
  meterType: "ElectricityMeter",
  linkModes: ["T1"],
  mvt: [{ manufacturer: flagToManufacturer("GSS"), version: 0x01, type: 0x02 }],
  defaultFields: "name,id,total_energy_consumption_kwh,status,timestamp",
  libraryFields: ["total_energy_consumption_kwh", "meter_datetime"],
  fields: [],
});
