// eQ-3 CMA12W room sensor driver.
//
// Port of vendor/wmbusmeters@af48083/src/driver_cma12w.cc.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

const ELV = flagToManufacturer("ELV");

export const cma12w = defineDriver({
  name: "cma12w",
  meterType: "TempHygroMeter",
  linkModes: ["C1", "T1"],
  mvt: [{ manufacturer: ELV, version: 0x1b, type: 0x20 }],
  defaultFields: "name,id,current_temperature_c,timestamp",
  libraryFields: ["software_version"],
  fields: [
    {
      kind: "string",
      name: "status",
      description: "Meter status from TPL status byte.",
      properties: ["STATUS", "INCLUDE_TPL_STATUS"],
      match: { vifRange: "None" },
    },
    {
      kind: "numeric",
      name: "current_temperature",
      description: "Current temperature.",
      quantity: "Temperature",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "ExternalTemperature" },
    },
    {
      kind: "numeric",
      name: "average_temperature_1h",
      description: "Average temperature (last hour).",
      quantity: "Temperature",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "ExternalTemperature",
        storageNr: 1,
      },
    },
    {
      kind: "string",
      name: "battery",
      description: "Battery status.",
      match: { measurementType: "Instantaneous", vifRange: "DigitalInput" },
      lookup: {
        rules: [
          {
            name: "BATTERY",
            mapType: "BitToString",
            maskBits: 0xffff,
            defaultMessage: "",
            map: [],
          },
        ],
      },
    },
  ],
});
