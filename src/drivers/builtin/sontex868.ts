// Sontex 868 heat cost allocator driver.
//
// Port of vendor/wmbusmeters@af48083/src/driver_sontex868.cc.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

const SON = flagToManufacturer("SON");

export const sontex868 = defineDriver({
  name: "sontex868",
  meterType: "HeatCostAllocationMeter",
  linkModes: ["T1"],
  mvt: [{ manufacturer: SON, version: 0x16, type: 0x08 }],
  defaultFields: "name,id,current_consumption_hca,set_date,consumption_at_set_date_hca,timestamp",
  fields: [
    {
      kind: "numeric",
      name: "current_consumption",
      description: "The current heat cost allocation for this meter.",
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
      kind: "numeric",
      name: "current_temp",
      description: "The current temperature of the heating element.",
      quantity: "Temperature",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "FlowTemperature" },
    },
    {
      kind: "numeric",
      name: "current_room_temp",
      description: "The current room temperature.",
      quantity: "Temperature",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "ExternalTemperature" },
    },
    {
      kind: "numeric",
      name: "max_temp",
      description: "The maximum temperature so far during this billing period.",
      quantity: "Temperature",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Maximum", vifRange: "FlowTemperature" },
    },
    {
      kind: "numeric",
      name: "max_temp_previous_period",
      description: "The maximum temperature during the previous billing period.",
      quantity: "Temperature",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Maximum", vifRange: "FlowTemperature", storageNr: 1 },
    },
    {
      kind: "string",
      name: "device_date_time",
      description: "Date and time when the meter sent the telegram.",
      match: { measurementType: "Instantaneous", vifRange: "DateTime" },
    },
  ],
});
