// BMeters Hydrocalm 3 heat/cooling meter driver.
//
// Port of vendor/wmbusmeters@af48083/src/driver_hydrocalm3.cc. Uses IndexNr
// to select the N-th matching DVEntry (two Energy/Volume fields at the same
// VIF range / storage).

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

const BMT = flagToManufacturer("BMT");

export const hydrocalm3 = defineDriver({
  name: "hydrocalm3",
  meterType: "HeatCoolingMeter",
  linkModes: ["T1"],
  mvt: [{ manufacturer: BMT, version: 0x0b, type: 0x0d }],
  defaultFields:
    "name,id,status,total_heating_kwh,total_cooling_kwh,device_datetime," +
    "total_heating_m3,total_cooling_m3,timestamp",
  fields: [
    {
      kind: "string",
      name: "status",
      description: "Meter status from TPL status byte (mfct bit 0x80 = SABOTAGE).",
      properties: ["STATUS", "INCLUDE_TPL_STATUS"],
      match: { vifRange: "None" },
      lookup: {
        rules: [
          {
            name: "TPL_STS",
            mapType: "BitToString",
            maskBits: 0xe0,
            defaultMessage: "OK",
            map: [{ value: 0x80, text: "SABOTAGE_ENCLOSURE" }],
          },
        ],
      },
    },
    {
      kind: "numeric",
      name: "total_heating",
      description: "Total heating energy.",
      quantity: "Energy",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "AnyEnergyVIF",
        indexNr: 1,
      },
    },
    {
      kind: "string",
      name: "device_datetime",
      description: "Recording datetime.",
      match: { measurementType: "Instantaneous", vifRange: "DateTime" },
    },
    {
      kind: "numeric",
      name: "total_cooling",
      description: "Total cooling energy.",
      quantity: "Energy",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "AnyEnergyVIF",
        indexNr: 2,
      },
    },
    {
      kind: "numeric",
      name: "total_heating",
      description: "Total heating media volume.",
      quantity: "Volume",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "Volume",
        indexNr: 1,
      },
    },
    {
      kind: "numeric",
      name: "total_cooling",
      description: "Total cooling media volume.",
      quantity: "Volume",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "Volume",
        indexNr: 2,
      },
    },
    {
      kind: "numeric",
      name: "c1_volume",
      description: "Supply C1 volume.",
      quantity: "Volume",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "Volume",
        indexNr: 3,
      },
    },
    {
      kind: "numeric",
      name: "c2_volume",
      description: "Return C2 volume.",
      quantity: "Volume",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "Volume",
        indexNr: 4,
      },
    },
    {
      kind: "numeric",
      name: "supply_temperature",
      description: "Supply (T1) temperature.",
      quantity: "Temperature",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "FlowTemperature",
        indexNr: 1,
      },
    },
    {
      kind: "numeric",
      name: "return_temperature",
      description: "Return (T2) temperature.",
      quantity: "Temperature",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "ReturnTemperature" },
    },
  ],
});
