// Aventies water meter driver.
//
// Port of vendor/wmbusmeters@af48083/src/driver_aventieswm.cc.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

const AAA = flagToManufacturer("AAA");

const STATUS_MAP = [
  { value: 0x01, text: "MEASUREMENT" },
  { value: 0x02, text: "SABOTAGE" },
  { value: 0x04, text: "BATTERY" },
  { value: 0x08, text: "CS" },
  { value: 0x10, text: "HF" },
  { value: 0x20, text: "RESET" },
];

export const aventieswm = defineDriver({
  name: "aventieswm",
  meterType: "WaterMeter",
  linkModes: ["T1"],
  mvt: [{ manufacturer: AAA, version: 0x25, type: 0x07 }],
  defaultFields: "name,id,total_m3,error_flags,timestamp",
  fields: [
    {
      kind: "string",
      name: "status",
      description: "Meter status from error flags and TPL status field.",
      properties: ["STATUS", "INCLUDE_TPL_STATUS"],
      match: { measurementType: "Instantaneous", vifRange: "ErrorFlags" },
      lookup: {
        rules: [
          {
            name: "ERROR_FLAGS",
            mapType: "BitToString",
            maskBits: 0xffff,
            defaultMessage: "OK",
            map: STATUS_MAP,
          },
        ],
      },
    },
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
      name: "consumption_at_set_date_{storage_counter}",
      description: "Water consumption at the N-th billing period date.",
      quantity: "Volume",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "Volume",
        storageNr: { from: 1, to: 14 },
      },
    },
    {
      kind: "string",
      name: "error_flags",
      description: "Deprecated — use `status` instead.",
      properties: ["DEPRECATED"],
      match: { measurementType: "Instantaneous", vifRange: "ErrorFlags" },
      lookup: {
        rules: [
          {
            name: "ERROR_FLAGS",
            mapType: "BitToString",
            maskBits: 0xffff,
            defaultMessage: "",
            map: STATUS_MAP,
          },
        ],
      },
    },
  ],
});
