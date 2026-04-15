// Kamstrup Kampress pressure sensor.
//
// Port of vendor/wmbusmeters@af48083/drivers/src/kampress.xmq.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

export const kampress = defineDriver({
  name: "kampress",
  meterType: "PressureSensor",
  linkModes: ["T1"],
  mvt: [{ manufacturer: flagToManufacturer("KAM"), version: 0x01, type: 0x18 }],
  defaultFields: "name,id,status,pressure_bar,max_pressure_bar,min_pressure_bar,timestamp",
  fields: [
    {
      kind: "string",
      name: "status",
      description: "Status and error flags.",
      properties: ["INCLUDE_TPL_STATUS"],
      match: { measurementType: "Instantaneous", vifRange: "ErrorFlags" },
      lookup: {
        rules: [
          {
            name: "ERROR_FLAGS",
            mapType: "BitToString",
            maskBits: 0xffff,
            defaultMessage: "OK",
            map: [
              { value: 0x01, text: "DROP" },
              { value: 0x02, text: "SURGE" },
              { value: 0x04, text: "HIGH" },
              { value: 0x08, text: "LOW" },
            ],
          },
        ],
      },
    },
    {
      kind: "numeric",
      name: "pressure",
      description: "Current pressure.",
      quantity: "Pressure",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "Pressure" },
    },
    {
      kind: "numeric",
      name: "max_pressure",
      description: "Maximum pressure observed.",
      quantity: "Pressure",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Maximum", vifRange: "Pressure" },
    },
    {
      kind: "numeric",
      name: "min_pressure",
      description: "Minimum pressure observed.",
      quantity: "Pressure",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Minimum", vifRange: "Pressure" },
    },
  ],
});
