// Techem FHKV data IV heat cost allocator driver.
//
// Port of vendor/wmbusmeters@af48083/src/driver_fhkvdataiv.cc. Unlike
// fhkvdataiii (CI=0xA0 mfct-specific), the IV uses a standard TPL header
// (CI=0x7A, Mode 5 encrypted). Fields don't bind to specific VIF ranges —
// upstream matches any Instantaneous DVEntry, then `quantity = HCA`
// determines the output unit suffix.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

const TCH = flagToManufacturer("TCH");

export const fhkvdataiv = defineDriver({
  name: "fhkvdataiv",
  meterType: "HeatCostAllocationMeter",
  linkModes: ["T1"],
  mvt: [
    { manufacturer: TCH, version: 0x69, type: 0x08 },
    { manufacturer: TCH, version: 0x94, type: 0x08 },
  ],
  defaultFields:
    "name,id,current_consumption_hca,set_date,consumption_at_set_date_hca,timestamp",
  fields: [
    {
      kind: "string",
      name: "status",
      description: "Meter status from tpl status field.",
      properties: ["STATUS", "INCLUDE_TPL_STATUS"],
      // No VIF match — the status comes from the TPL status byte.
      match: { vifRange: "None" },
    },
    {
      kind: "numeric",
      name: "current_consumption",
      description: "The current heat cost allocation.",
      quantity: "HCA",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous" },
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
      match: { measurementType: "Instantaneous", storageNr: 1 },
    },
    {
      kind: "string",
      name: "set_date_1",
      description: "Same DV as set_date (duplicate field upstream keeps).",
      match: { measurementType: "Instantaneous", vifRange: "Date", storageNr: 1 },
    },
    {
      kind: "numeric",
      name: "consumption_at_set_date_1",
      description: "Same DV as consumption_at_set_date.",
      quantity: "HCA",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", storageNr: 1 },
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
      match: { measurementType: "Instantaneous", storageNr: 8 },
    },
  ],
});
