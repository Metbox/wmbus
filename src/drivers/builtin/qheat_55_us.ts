// qheat_55_us — auto-generated registry stub.
// Source: upstream wmbusmeters driver definition.
//
// Registers the driver with correct MVTs and library fields so the registry
// resolves its name. Specialised field extraction + mfct-specific quirks are
// not yet ported; production traffic will populate the standard library
// fields and fall back to auto-driver behaviour for anything non-standard.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

export const qheat_55_us = defineDriver({
  name: "qheat_55_us",
  meterType: "HeatMeter",
  linkModes: ["C1", "T1"],
  mvt: [
    { manufacturer: flagToManufacturer("LUG"), version: 0x07, type: 0x04 },
    { manufacturer: flagToManufacturer("LUG"), version: 0x0a, type: 0x04 },
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
