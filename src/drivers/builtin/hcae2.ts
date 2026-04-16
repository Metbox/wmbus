// HCA-e2 (Engelmann) heat cost allocator driver.
//
// Port of vendor/wmbusmeters@af48083/src/driver_hcae2.cc.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

const EFE = flagToManufacturer("EFE");

const STATUS_MAP = [
  { value: 0x0001, text: "MEASUREMENT" },
  { value: 0x0002, text: "SABOTAGE" },
  { value: 0x0004, text: "BATTERY" },
  { value: 0x0008, text: "CS" },
  { value: 0x0010, text: "HF" },
  { value: 0x0020, text: "RESET" },
];

export const hcae2 = defineDriver({
  name: "hcae2",
  meterType: "HeatCostAllocationMeter",
  linkModes: ["T1"],
  mvt: [{ manufacturer: EFE, version: 0x08, type: 0x31 }],
  defaultFields: "name,id,current_consumption_hca,status,timestamp",
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
      name: "consumption_at_set_date_{storage_counter}",
      description: "The heat cost allocation at set date #.",
      quantity: "HCA",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "HeatCostAllocation",
        storageNr: { from: 1, to: 17 },
      },
    },
    {
      kind: "numeric",
      name: "consumption_at_set_date",
      description: "Deprecated field — same as consumption_at_set_date_1.",
      quantity: "HCA",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "HeatCostAllocation",
        storageNr: 1,
      },
    },
  ],
});
