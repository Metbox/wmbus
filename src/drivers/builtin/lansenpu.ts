// Lansen pulse counter driver.
//
// Port of vendor/wmbusmeters@af48083/src/driver_lansenpu.cc.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

const LAS = flagToManufacturer("LAS");

export const lansenpu = defineDriver({
  name: "lansenpu",
  meterType: "PulseCounter",
  linkModes: [],
  mvt: [
    { manufacturer: LAS, version: 0x00, type: 0x14 },
    { manufacturer: LAS, version: 0x00, type: 0x1b },
    { manufacturer: LAS, version: 0x02, type: 0x0b },
  ],
  defaultFields: "name,id,status,a_counter,b_counter,timestamp",
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
      name: "a",
      description: "Counter A.",
      quantity: "Counter",
      scaling: "None",
      signedness: "Signed",
      forceUnit: "COUNTER",
      match: { difVifKey: "0EFD3A" },
    },
    {
      kind: "numeric",
      name: "b",
      description: "Counter B.",
      quantity: "Counter",
      scaling: "None",
      signedness: "Signed",
      forceUnit: "COUNTER",
      match: { difVifKey: "8E40FD3A" },
    },
  ],
});
