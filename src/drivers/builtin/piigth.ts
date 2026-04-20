// Pii temperature / humidity wired M-Bus sensor.
//
// Port of vendor/wmbusmeters@af48083/src/driver_piigth.cc.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

const PII = flagToManufacturer("PII");

export const piigth = defineDriver({
  name: "piigth",
  meterType: "TempHygroMeter",
  linkModes: ["MBUS"],
  mvt: [{ manufacturer: PII, version: 0x01, type: 0x1b }],
  defaultFields: "name,id,status,temperature_c,relative_humidity_rh,timestamp",
  libraryFields: ["fabrication_no", "software_version"],
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
      name: "temperature",
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
      name: "relative_humidity",
      description: "Current relative humidity.",
      quantity: "RH",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "RelativeHumidity" },
    },
    {
      kind: "numeric",
      name: "relative_humidity_1h",
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
      name: "relative_humidity_24h",
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
