// Diehl Izar / IZAR water meter — registry stub.
//
// Production telegrams use Diehl PRIOS LFSR scrambling (manufacturer-specific
// preprocessor). Without that preprocess hook the DV parser sees garbage —
// driver remains registered for MVT lookup but fixture parity is deferred.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

const DME = flagToManufacturer("DME");

export const izar = defineDriver({
  name: "izar",
  meterType: "WaterMeter",
  linkModes: ["T1"],
  mvt: [
    { manufacturer: DME, version: 0x07, type: 0x05 },
    { manufacturer: DME, version: 0x06, type: 0x07 },
    { manufacturer: DME, version: 0x07, type: 0x07 },
    { manufacturer: DME, version: 0x07, type: 0x77 },
    { manufacturer: DME, version: 0x07, type: 0x86 },
  ],
  defaultFields: "name,id,total_m3,target_m3,timestamp",
  libraryFields: ["total_m3", "target_m3", "target_date"],
  fields: [],
});
