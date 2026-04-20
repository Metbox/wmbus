// Lansen door/window sensor driver.
//
// Port of vendor/wmbusmeters@af48083/src/driver_lansendw.cc.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

const LAS = flagToManufacturer("LAS");

export const lansendw = defineDriver({
  name: "lansendw",
  meterType: "DoorWindowSensor",
  linkModes: ["T1"],
  mvt: [{ manufacturer: LAS, version: 0x07, type: 0x1d }],
  defaultFields: "name,id,status,timestamp",
  fields: [
    {
      kind: "string",
      name: "status",
      description: "Door/window state.",
      properties: ["STATUS"],
      match: { measurementType: "Instantaneous", vifRange: "DigitalInput" },
      lookup: {
        rules: [
          {
            name: "INPUT_BITS",
            mapType: "IndexToString",
            maskBits: 0xffff,
            defaultMessage: "",
            map: [
              { value: 0x11, text: "CLOSED" },
              { value: 0x55, text: "OPEN" },
            ],
          },
        ],
      },
    },
    {
      kind: "string",
      name: "error_flags",
      description: "Error flags.",
      properties: ["STATUS", "INCLUDE_TPL_STATUS"],
      // Telegrams carry combinable 0x1d (StandardConformantDataContent).
      match: {
        measurementType: "Instantaneous",
        vifRange: "ErrorFlags",
        vifCombinables: [0x1d],
      },
      lookup: {
        rules: [
          {
            name: "ERROR_FLAGS",
            mapType: "BitToString",
            maskBits: 0xffff,
            defaultMessage: "OK",
            map: [],
          },
        ],
      },
    },
    {
      kind: "numeric",
      name: "a",
      description: "Open/close counter.",
      quantity: "Counter",
      scaling: "None",
      signedness: "Signed",
      forceUnit: "COUNTER",
      match: { measurementType: "Instantaneous", vifRange: "Dimensionless" },
    },
    {
      kind: "numeric",
      name: "b",
      description: "Counter B.",
      quantity: "Counter",
      scaling: "None",
      signedness: "Signed",
      forceUnit: "COUNTER",
      match: {
        measurementType: "Instantaneous",
        vifRange: "Dimensionless",
        subUnitNr: 1,
      },
    },
  ],
});
