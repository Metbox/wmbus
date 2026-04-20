// Sensus Pollucom F heat meter driver.
//
// Port of vendor/wmbusmeters@af48083/src/driver_pollucomf.cc.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

const SEN = flagToManufacturer("SEN");

export const pollucomf = defineDriver({
  name: "pollucomf",
  meterType: "HeatMeter",
  linkModes: ["T1", "C1", "MBUS"],
  mvt: [{ manufacturer: SEN, version: 0x1d, type: 0x04 }],
  defaultFields: "name,id,status,total_kwh,total_m3,target_kwh,target_m3,timestamp",
  fields: [
    {
      kind: "string",
      name: "status",
      description: "Meter status.",
      properties: ["STATUS", "INCLUDE_TPL_STATUS"],
      match: { vifRange: "None" },
    },
    {
      kind: "numeric",
      name: "total",
      description: "Total energy consumption.",
      quantity: "Energy",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "AnyEnergyVIF" },
    },
    {
      kind: "numeric",
      name: "total",
      description: "Total water volume.",
      quantity: "Volume",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "Volume" },
    },
    {
      kind: "numeric",
      name: "power",
      description: "Active power consumption.",
      quantity: "Power",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "AnyPowerVIF" },
    },
    {
      kind: "numeric",
      name: "flow",
      description: "Current volume flow.",
      quantity: "Flow",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "VolumeFlow" },
    },
    {
      kind: "numeric",
      name: "forward",
      description: "Forward temperature.",
      quantity: "Temperature",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "FlowTemperature" },
    },
    {
      kind: "numeric",
      name: "return",
      description: "Return temperature.",
      quantity: "Temperature",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "ReturnTemperature" },
    },
    {
      kind: "string",
      name: "target_date",
      description: "The most recent billing period date.",
      match: { measurementType: "Instantaneous", vifRange: "Date", storageNr: 1 },
    },
    {
      kind: "numeric",
      name: "target",
      description: "Energy at the set date.",
      quantity: "Energy",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "AnyEnergyVIF",
        storageNr: 1,
      },
    },
    {
      kind: "numeric",
      name: "target",
      description: "Volume at the set date.",
      quantity: "Volume",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "Volume", storageNr: 1 },
    },
    {
      kind: "numeric",
      name: "forward_max",
      description: "Maximum forward temperature.",
      quantity: "Temperature",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Maximum",
        vifRange: "FlowTemperature",
        storageNr: 1,
      },
    },
    {
      kind: "numeric",
      name: "return_max",
      description: "Maximum return temperature.",
      quantity: "Temperature",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Maximum",
        vifRange: "ReturnTemperature",
        storageNr: 1,
      },
    },
    {
      kind: "numeric",
      name: "flow_max",
      description: "Maximum volume flow.",
      quantity: "Flow",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Maximum",
        vifRange: "VolumeFlow",
        storageNr: 1,
      },
    },
  ],
  libraryFields: ["on_time_h", "on_time_at_error_h", "meter_datetime"],
});
