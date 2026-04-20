// Qundis QCaloric heat cost allocator driver.
//
// Port of vendor/wmbusmeters@af48083/src/driver_qcaloric.cc.
//
// Aliases: whe5x, whe46x — name-only aliases on the same definition.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

const LSE = flagToManufacturer("LSE");
const QDS = flagToManufacturer("QDS");
const ZRI = flagToManufacturer("ZRI");

export const qcaloric = defineDriver({
  name: "qcaloric",
  aliases: ["whe5x", "whe46x"],
  meterType: "HeatCostAllocationMeter",
  linkModes: ["C1", "T1", "S1"],
  mvt: [
    { manufacturer: LSE, version: 0x34, type: 0x08 },
    { manufacturer: LSE, version: 0x35, type: 0x08 },
    { manufacturer: LSE, version: 0x18, type: 0x08 }, // whe4
    { manufacturer: QDS, version: 0x34, type: 0x08 },
    { manufacturer: QDS, version: 0x35, type: 0x08 },
    { manufacturer: QDS, version: 0x36, type: 0x08 },
    { manufacturer: ZRI, version: 0xfd, type: 0x08 },
  ],
  defaultFields: "name,id,current_consumption_hca,set_date,consumption_at_set_date_hca,timestamp",
  fields: [
    {
      kind: "string",
      name: "status",
      description: "Meter status from tpl status field.",
      properties: ["STATUS", "INCLUDE_TPL_STATUS"],
      match: { difVifKey: "01FD73" },
      lookup: {
        rules: [
          {
            name: "ERROR_FLAGS",
            mapType: "BitToString",
            maskBits: 0xff,
            defaultMessage: "OK",
            map: [],
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
      kind: "string",
      name: "set_date",
      description: "The most recent billing period date.",
      match: { measurementType: "Instantaneous", vifRange: "Date", storageNr: 1 },
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
      kind: "string",
      name: "set_date_1",
      description: "Set date for storage slot 1 (same DVEntry as set_date).",
      match: { measurementType: "Instantaneous", vifRange: "Date", storageNr: 1 },
    },
    {
      kind: "numeric",
      name: "consumption_at_set_date_1",
      description:
        "Heat cost allocation for storage slot 1 (same DVEntry as consumption_at_set_date).",
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
      kind: "string",
      name: "set_date_8",
      description: "Set date for storage slot 8.",
      match: { measurementType: "Instantaneous", vifRange: "Date", storageNr: 8 },
    },
    {
      kind: "numeric",
      name: "consumption_at_set_date_8",
      description: "Heat cost allocation for storage slot 8.",
      quantity: "HCA",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "HeatCostAllocation",
        storageNr: 8,
      },
    },
    {
      kind: "string",
      name: "set_date_17",
      description: "Set date for storage slot 17.",
      match: { measurementType: "Instantaneous", vifRange: "Date", storageNr: 17 },
    },
    {
      kind: "numeric",
      name: "consumption_at_set_date_17",
      description: "Heat cost allocation for storage slot 17.",
      quantity: "HCA",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "HeatCostAllocation",
        storageNr: 17,
      },
    },
    {
      kind: "string",
      name: "error_date",
      description: "Date when the meter entered an error state.",
      match: { measurementType: "AtError", vifRange: "Date" },
    },
    {
      kind: "string",
      name: "device_date_time",
      description: "Date and time when the meter sent the telegram.",
      match: { measurementType: "Instantaneous", vifRange: "DateTime" },
    },
    {
      kind: "string",
      name: "model_version",
      description: "Model version.",
      match: { measurementType: "Instantaneous", vifRange: "ModelVersion" },
    },
    {
      kind: "numeric",
      name: "flow_temperature",
      description: "Forward media temperature.",
      quantity: "Temperature",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "FlowTemperature" },
    },
  ],
});
