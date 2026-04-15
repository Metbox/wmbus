// Kamstrup FlowIQ 2200 water meter.
//
// Port of vendor/wmbusmeters@af48083/src/driver_flowiq2200.cc.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

const KAM = flagToManufacturer("KAM");

export const flowiq2200 = defineDriver({
  name: "flowiq2200",
  meterType: "WaterMeter",
  linkModes: ["C1"],
  mvt: [
    { manufacturer: KAM, version: 0x16, type: 0x16 },
    { manufacturer: KAM, version: 0x18, type: 0x06 },
    { manufacturer: KAM, version: 0x18, type: 0x16 },
    { manufacturer: KAM, version: 0x1f, type: 0x16 },
  ],
  defaultFields: "name,id,total_m3,target_m3,flow_temperature_c,timestamp",
  libraryFields: ["total_m3", "target_m3", "target_date"],
  fields: [
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
      name: "min_flow_temperature",
      description: "Minimum flow temperature.",
      quantity: "Temperature",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Minimum", vifRange: "FlowTemperature" },
    },
    {
      kind: "numeric",
      name: "max_flow_temperature",
      description: "Maximum flow temperature.",
      quantity: "Temperature",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Maximum", vifRange: "FlowTemperature" },
    },
    {
      kind: "numeric",
      name: "min_external_temperature",
      description: "Minimum external temperature.",
      quantity: "Temperature",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Minimum", vifRange: "ExternalTemperature" },
    },
    {
      kind: "numeric",
      name: "max_flow",
      description: "Maximum flow recorded.",
      quantity: "Flow",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Maximum", vifRange: "VolumeFlow" },
    },
    {
      kind: "numeric",
      name: "min_flow",
      description: "Minimum flow recorded.",
      quantity: "Flow",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Minimum", vifRange: "VolumeFlow" },
    },
  ],
});
