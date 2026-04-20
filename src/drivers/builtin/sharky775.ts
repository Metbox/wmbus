// Diehl Sharky 775 ultrasonic heat meter — Metbox custom driver.
//
// Port of vendor/wmbusmeters@af48083/src/driver_sharky775.cc (originally
// added to upstream by Metbox). Diehl's PRIOS LFSR scrambling is bypassed
// for these telegrams because they use Mode 5 AES-CBC-IV instead — the
// driver's test fixture provides a 16-byte AES key.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

export const sharky775 = defineDriver({
  name: "sharky775",
  meterType: "HeatMeter",
  linkModes: ["T1"],
  mvt: [{ manufacturer: flagToManufacturer("DME"), version: 0x40, type: 0x04 }],
  defaultFields:
    "name,id,total_energy_consumption_kwh,total_volume_m3,volume_flow_m3h,power_kw,flow_temperature_c,return_temperature_c,temperature_difference_c,timestamp",
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
      description: "Total cooling energy consumption.",
      quantity: "Energy",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "AnyEnergyVIF",
        tariffNr: 1,
      },
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
      description: "Current supply temperature.",
      quantity: "Temperature",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "FlowTemperature" },
    },
    {
      kind: "numeric",
      name: "return_temperature",
      description: "Current return temperature.",
      quantity: "Temperature",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "ReturnTemperature" },
    },
    {
      kind: "numeric",
      name: "temperature_difference",
      description: "Temperature difference between supply and return.",
      quantity: "Temperature",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "TemperatureDifference",
      },
    },
    {
      kind: "numeric",
      name: "target_energy_consumption",
      description: "Total energy consumption at end of previous billing period.",
      quantity: "Energy",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "AnyEnergyVIF",
        storageNr: 5,
      },
    },
    {
      kind: "numeric",
      name: "target_volume",
      description: "Total volume at end of previous billing period.",
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
