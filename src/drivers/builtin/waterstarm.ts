// waterstarm — auto-generated registry stub.
// Source: upstream wmbusmeters driver definition.
//
// Registers the driver with correct MVTs and library fields so the registry
// resolves its name. Specialised field extraction + mfct-specific quirks are
// not yet ported; production traffic will populate the standard library
// fields and fall back to auto-driver behaviour for anything non-standard.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

export const waterstarm = defineDriver({
  name: "waterstarm",
  meterType: "WaterMeter",
  linkModes: ["T1"],
  mvt: [
    { manufacturer: flagToManufacturer("DWZ"), version: 0x00, type: 0x06 },
    { manufacturer: flagToManufacturer("DWZ"), version: 0x02, type: 0x06 },
    { manufacturer: flagToManufacturer("DWZ"), version: 0x02, type: 0x07 },
    { manufacturer: flagToManufacturer("EFE"), version: 0x03, type: 0x07 },
    { manufacturer: flagToManufacturer("EFE"), version: 0x70, type: 0x07 },
    { manufacturer: flagToManufacturer("DWZ"), version: 0x00, type: 0x07 },
  ],
  defaultFields: "name,id,total_m3,status,timestamp",
  libraryFields: ["total_m3", "target_m3", "target_date", "meter_datetime"],
  fields: [],
});
