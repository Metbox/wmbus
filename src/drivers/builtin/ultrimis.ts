// Apator Ultrimis water meter driver.
//
// Port of vendor/wmbusmeters@af48083/src/driver_ultrimis.cc.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

const APA = flagToManufacturer("APA");

export const ultrimis = defineDriver({
  name: "ultrimis",
  meterType: "WaterMeter",
  linkModes: ["T1"],
  mvt: [{ manufacturer: APA, version: 0x01, type: 0x16 }],
  defaultFields:
    "name,id,total_m3,target_m3,current_status,total_backward_flow_m3,timestamp",
  fields: [
    {
      kind: "numeric",
      name: "total",
      description: "Total water consumption.",
      quantity: "Volume",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "Volume" },
    },
    {
      kind: "numeric",
      name: "target",
      description: "Total water consumption at the beginning of this month.",
      quantity: "Volume",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "Volume", storageNr: 1 },
    },
    {
      kind: "string",
      name: "current_status",
      description: "Status and error flags.",
      match: { difVifKey: "03FD17" },
      lookup: {
        rules: [
          {
            name: "ERROR_FLAGS",
            mapType: "BitToString",
            maskBits: 0xffffff,
            defaultMessage: "OK",
            map: [
              { value: 0x01, text: "TAMPER" },
              { value: 0x02, text: "LOW_BATTERY" },
              { value: 0x04, text: "DRY" },
              { value: 0x08, text: "NO_FLOW" },
              { value: 0x10, text: "HIGH_TEMPERATURE" },
              { value: 0x20, text: "BURST" },
              { value: 0x40, text: "REVERSE" },
              { value: 0x80, text: "LEAK" },
            ],
          },
        ],
      },
    },
    {
      kind: "numeric",
      name: "total_backward_flow",
      description: "Total backward water volume.",
      quantity: "Volume",
      scaling: "Auto",
      signedness: "Signed",
      match: { difVifKey: "04933C" },
    },
  ],
});
