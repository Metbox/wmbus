// Diehl/Hydrometer Hydrus water meter driver.
//
// Port of vendor/wmbusmeters@af48083/src/driver_hydrus.cc.
//
// Wave A coverage: declarative fields only. The multi-tariff `total_tariffN`
// fields (which use upstream's `{tariff_counter}` template expansion) and
// the `target` field that appears as both Volume and DateTime are deferred
// to a later pass when template-name expansion is implemented.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

const DME = flagToManufacturer("DME");
const HYD = flagToManufacturer("HYD");

export const hydrus = defineDriver({
  name: "hydrus",
  meterType: "WaterMeter",
  linkModes: ["T1"],
  mvt: [
    { manufacturer: DME, version: 0x07, type: 0x70 },
    { manufacturer: DME, version: 0x07, type: 0x76 },
    { manufacturer: HYD, version: 0x07, type: 0x24 },
    { manufacturer: HYD, version: 0x07, type: 0x8b },
    { manufacturer: HYD, version: 0x06, type: 0x8b },
    { manufacturer: DME, version: 0x06, type: 0x70 },
    { manufacturer: DME, version: 0x16, type: 0x70 },
  ],
  defaultFields: "name,id,total_m3,total_at_date_m3,status,timestamp",
  libraryFields: ["total_m3", "total_at_date_m3", "at_date"],
  fields: [
    {
      kind: "string",
      name: "status",
      description: "Status of meter (TPL status fallback).",
      properties: ["STATUS", "INCLUDE_TPL_STATUS"],
      // No matcher field — upstream's `addStringField` (no extractor) means
      // the field always emits the TPL status interpretation. With no
      // matcher specified, no DVEntry will match so the default-emit path
      // ("OK") fires.
      match: { difVifKey: "FFFFFF" },
      lookup: {
        rules: [
          {
            name: "ERROR_FLAGS",
            mapType: "BitToString",
            maskBits: 0xff,
            defaultMessage: "OK",
            map: [],
          },
        ],
      },
    },
  ],
});
