// Apator Elf 2 heat meter driver.
//
// Port of vendor/wmbusmeters@af48083/drivers/src/elf2.xmq (declarative).

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

const APA = flagToManufacturer("APA");

export const elf2 = defineDriver({
  name: "elf2",
  meterType: "HeatMeter",
  linkModes: ["T1"],
  mvt: [
    { manufacturer: APA, version: 0x42, type: 0x04 },
    { manufacturer: APA, version: 0x42, type: 0x0d },
  ],
  defaultFields: "name,id,status,total_energy_kwh,timestamp",
  libraryFields: ["fabrication_no", "on_time_h", "on_time_at_error_h"],
  fields: [
    {
      kind: "string",
      name: "meter_date",
      description: "Meter date when telegram was sent.",
      match: { measurementType: "Instantaneous", vifRange: "Date" },
    },
    {
      kind: "string",
      name: "meter_datetime",
      description: "Meter datetime when telegram was sent.",
      match: { measurementType: "Instantaneous", vifRange: "DateTime" },
    },
    {
      kind: "numeric",
      name: "t2_temperature",
      description: "Temperature of returned water.",
      quantity: "Temperature",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "ReturnTemperature" },
    },
    {
      kind: "numeric",
      name: "t1_temperature",
      description: "Temperature of incoming water.",
      quantity: "Temperature",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "FlowTemperature" },
    },
    {
      kind: "numeric",
      name: "current_power",
      description: "Instantaneous power consumed.",
      quantity: "Power",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "AnyPowerVIF" },
    },
    {
      kind: "numeric",
      name: "current_volume_flow",
      description: "Instantaneous water flow.",
      quantity: "Flow",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "VolumeFlow" },
    },
    {
      kind: "numeric",
      name: "total_volume",
      description: "Total volume of water used for heating.",
      quantity: "Volume",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "AnyVolumeVIF" },
    },
    {
      kind: "numeric",
      name: "total_energy",
      description: "Total heat energy consumption.",
      quantity: "Energy",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "AnyEnergyVIF" },
    },
  ],
});
