// Diehl Sharky 775 heat meter driver.
//
// Port of vendor/wmbusmeters@af48083/src/driver_sharky.cc. The Diehl LFSR
// preprocess (PRIOS scrambling) isn't wired yet — telegrams that arrive
// with encrypted payload will need it once implemented.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

const HYD = flagToManufacturer("HYD");

export const sharky = defineDriver({
  name: "sharky",
  meterType: "HeatMeter",
  linkModes: ["T1"],
  mvt: [{ manufacturer: HYD, version: 0x20, type: 0x04 }],
  defaultFields:
    "name,id,total_energy_consumption_kwh,total_energy_consumption_tariff1_kwh,total_volume_m3," +
    "total_volume_tariff2_m3,volume_flow_m3h,power_kw,flow_temperature_c," +
    "return_temperature_c,temperature_difference_c,timestamp",
  libraryFields: ["operating_time_h"],
  fields: [
    {
      kind: "string",
      name: "status",
      description: "Status of meter.",
      properties: ["STATUS"],
      match: { measurementType: "Instantaneous", vifRange: "ErrorFlags" },
      lookup: {
        rules: [
          {
            name: "ERROR_FLAGS",
            mapType: "BitToString",
            maskBits: 0x0000,
            defaultMessage: "OK",
            map: [],
          },
        ],
      },
    },
    {
      kind: "numeric",
      name: "total_energy_consumption",
      description: "Total heat energy consumption.",
      quantity: "Energy",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "AnyEnergyVIF" },
    },
    {
      kind: "numeric",
      name: "total_energy_consumption_tariff1",
      description: "Total heat energy on tariff 1.",
      quantity: "Energy",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "AnyEnergyVIF", tariffNr: 1 },
    },
    {
      kind: "numeric",
      name: "total_volume",
      description: "Total heating media volume.",
      quantity: "Volume",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "Volume" },
    },
    {
      kind: "numeric",
      name: "total_volume_tariff2",
      description: "Total heating media volume on tariff 2.",
      quantity: "Volume",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "Volume", tariffNr: 2 },
    },
    {
      kind: "numeric",
      name: "volume_flow",
      description: "Current heat media volume flow.",
      quantity: "Flow",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "VolumeFlow" },
    },
    {
      kind: "numeric",
      name: "power",
      description: "Current power consumption.",
      quantity: "Power",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "PowerW" },
    },
    {
      kind: "numeric",
      name: "flow_temperature",
      description: "Current forward heat media temperature.",
      quantity: "Temperature",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "FlowTemperature" },
    },
    {
      kind: "numeric",
      name: "return_temperature",
      description: "Current return heat media temperature.",
      quantity: "Temperature",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "ReturnTemperature" },
    },
    {
      kind: "numeric",
      name: "temperature_difference",
      description: "Current temperature difference.",
      quantity: "Temperature",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "TemperatureDifference" },
    },
    {
      kind: "numeric",
      name: "target_energy_consumption",
      description: "Heat energy at end of previous billing period.",
      quantity: "Energy",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "AnyEnergyVIF", storageNr: 5 },
    },
    {
      kind: "numeric",
      name: "target_volume",
      description: "Heating media volume at end of previous billing period.",
      quantity: "Volume",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "Volume", storageNr: 5 },
    },
    {
      kind: "string",
      name: "target_date",
      description: "Last billing period end date.",
      match: { measurementType: "Instantaneous", vifRange: "Date", storageNr: 5 },
    },
  ],
});
