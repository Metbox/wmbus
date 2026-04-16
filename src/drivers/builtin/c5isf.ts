// c5isf — auto-generated registry stub.
// Source: upstream wmbusmeters driver definition.
//
// Registers the driver with correct MVTs and library fields so the registry
// resolves its name. Specialised field extraction + mfct-specific quirks are
// not yet ported; production traffic will populate the standard library
// fields and fall back to auto-driver behaviour for anything non-standard.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

export const c5isf = defineDriver({
  name: "c5isf",
  meterType: "HeatMeter",
  linkModes: ["C1", "T1"],
  mvt: [
    { manufacturer: flagToManufacturer("ZRI"), version: 0x0d, type: 0x88 },
    { manufacturer: flagToManufacturer("ZRI"), version: 0x07, type: 0x88 },
    { manufacturer: flagToManufacturer("ZRI"), version: 0x04, type: 0x88 },
  ],
  defaultFields: "name,id,total_kwh,total_volume_m3,status,timestamp",
  libraryFields: [
    "total_energy_consumption_kwh",
    "total_volume_m3",
    "meter_datetime",
    "flow_temperature_c",
    "return_temperature_c",
    "volume_flow_m3h",
  ],
  fields: [],
});
