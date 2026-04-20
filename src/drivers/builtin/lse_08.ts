// Landis+Gyr LSE 08 heat cost allocator driver.
//
// Port of vendor/wmbusmeters@af48083/src/driver_lse_08.cc.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

const LSE = flagToManufacturer("LSE");

export const lse_08 = defineDriver({
  name: "lse_08",
  meterType: "HeatCostAllocationMeter",
  linkModes: ["C1", "T1", "S1"],
  mvt: [{ manufacturer: LSE, version: 0x01, type: 0x08 }],
  defaultFields: "name,id,set_date,consumption_at_set_date_hca,timestamp",
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
      match: { measurementType: "Instantaneous", vifRange: "Date", storageNr: 8 },
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
        storageNr: 8,
      },
    },
    {
      kind: "string",
      name: "device_date_time",
      description: "Date and time when the meter sent the telegram.",
      match: { measurementType: "Instantaneous", vifRange: "DateTime" },
    },
    {
      kind: "numeric",
      name: "duration_since_readout",
      description: "Duration since last measurement.",
      quantity: "Time",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "DurationSinceReadout",
        vifCombinables: [0x7e],
      },
    },
    {
      kind: "string",
      name: "model_version",
      description: "Model version.",
      match: { measurementType: "Instantaneous", vifRange: "ModelVersion" },
    },
  ],
});
