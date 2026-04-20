// Aventies heat cost allocator driver.
//
// Port of vendor/wmbusmeters@af48083/src/driver_aventieshca.cc.

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

export const aventieshca = defineDriver({
  name: "aventieshca",
  meterType: "HeatCostAllocationMeter",
  linkModes: ["T1"],
  mvt: [{ manufacturer: AAA, version: 0x55, type: 0x08 }],
  defaultFields: "name,id,current_consumption_hca,error_flags,timestamp",
  fields: [
    {
      kind: "string",
      name: "status",
      description: "Meter status from error flags and tpl status field.",
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
      kind: "string",
      name: "error_flags",
      description: "Deprecated.",
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
    {
      kind: "numeric",
      name: "current_consumption",
      description: "The current heat cost allocation.",
      quantity: "HCA",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "HeatCostAllocation" },
    },
    {
      kind: "numeric",
      name: "consumption_at_set_date",
      description: "Heat cost allocation at the most recent billing period date.",
      quantity: "HCA",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "HeatCostAllocation",
        storageNr: 1,
      },
    },
    {
      kind: "numeric",
      name: "consumption_at_set_date_{storage_counter}",
      description: "The heat cost allocation at set date #.",
      quantity: "HCA",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "HeatCostAllocation",
        storageNr: { from: 2, to: 17 },
      },
    },
  ],
});
