// Lansen temperature/humidity sensor driver.
//
// Port of vendor/wmbusmeters@af48083/src/driver_lansenth.cc.
// Mfct TPL status bit 0x40 → SABOTAGE_ENCLOSURE.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

const LAS = flagToManufacturer("LAS");

export const lansenth = defineDriver({
  name: "lansenth",
  meterType: "TempHygroMeter",
  linkModes: [],
  mvt: [
    { manufacturer: LAS, version: 0x1b, type: 0x07 },
    { manufacturer: LAS, version: 0x1b, type: 0x09 },
  ],
  defaultFields: "name,id,current_temperature_c,current_relative_humidity_rh,timestamp",
  libraryFields: ["on_time_h"],
  fields: [
    {
      kind: "string",
      name: "status",
      description: "Meter status from TPL status byte.",
      properties: ["STATUS", "INCLUDE_TPL_STATUS"],
      match: { vifRange: "None" },
      lookup: {
        rules: [
          {
            name: "TPL_STS",
            mapType: "BitToString",
            maskBits: 0xe0,
            defaultMessage: "OK",
            map: [{ value: 0x40, text: "SABOTAGE_ENCLOSURE" }],
          },
        ],
      },
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
      name: "current_relative_humidity",
      description: "Current relative humidity.",
      quantity: "RH",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "RelativeHumidity" },
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
      kind: "numeric",
      name: "average_relative_humidity_1h",
      description: "Average relative humidity (last hour).",
      quantity: "RH",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "RelativeHumidity",
        storageNr: 1,
      },
    },
    {
      kind: "numeric",
      name: "average_temperature_24h",
      description: "Average temperature (last 24h).",
      quantity: "Temperature",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "ExternalTemperature",
        storageNr: 2,
      },
    },
    {
      kind: "numeric",
      name: "average_relative_humidity_24h",
      description: "Average relative humidity (last 24h).",
      quantity: "RH",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "RelativeHumidity",
        storageNr: 2,
      },
    },
  ],
});
