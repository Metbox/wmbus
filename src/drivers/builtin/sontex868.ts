// sontex868 — auto-generated registry stub.
// Source: upstream wmbusmeters driver definition.
//
// Registers the driver with correct MVTs and library fields so the registry
// resolves its name. Specialised field extraction + mfct-specific quirks are
// not yet ported; production traffic will populate the standard library
// fields and fall back to auto-driver behaviour for anything non-standard.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

export const sontex868 = defineDriver({
  name: "sontex868",
  meterType: "HeatCostAllocationMeter",
  linkModes: ["T1"],
  mvt: [{ manufacturer: flagToManufacturer("SON"), version: 0x08, type: 0x16 }],
  defaultFields: "name,id,consumption_hca,status,timestamp",
  libraryFields: [
    "current_consumption_hca",
    "consumption_at_set_date_hca",
    "set_date",
    "meter_datetime",
  ],
  fields: [],
});
