// relhca — auto-generated registry stub.
// Source: upstream wmbusmeters driver definition.
//
// Registers the driver with correct MVTs and library fields so the registry
// resolves its name. Specialised field extraction + mfct-specific quirks are
// not yet ported; production traffic will populate the standard library
// fields and fall back to auto-driver behaviour for anything non-standard.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

export const relhca = defineDriver({
  name: "relhca",
  meterType: "HeatCostAllocationMeter",
  linkModes: ["T1"],
  mvt: [{ manufacturer: flagToManufacturer("REL"), version: 0x41, type: 0x00 }],
  defaultFields: "name,id,consumption_hca,status,timestamp",
  libraryFields: [
    "current_consumption_hca",
    "consumption_at_set_date_hca",
    "set_date",
    "meter_datetime",
  ],
  fields: [],
});
