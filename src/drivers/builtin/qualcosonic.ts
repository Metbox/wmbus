// Axioma Qualcosonic heat/cooling meter driver.
//
// Port of vendor/wmbusmeters@af48083/src/driver_qualcosonic.cc.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

const AXI = flagToManufacturer("AXI");

// VIFCombinable::ForwardFlow = 0x3b, BackwardFlow = 0x3c.
const FWD = 0x3b;
const BWD = 0x3c;

export const qualcosonic = defineDriver({
  name: "qualcosonic",
  meterType: "HeatCoolingMeter",
  linkModes: ["C1"],
  mvt: [
    { manufacturer: AXI, version: 0x0b, type: 0x0d },
    { manufacturer: AXI, version: 0x0c, type: 0x0d },
  ],
  defaultFields:
    "name,id,status,total_heat_energy_kwh,total_cooling_energy_kwh," +
    "power_kw,target_datetime,target_heat_energy_kwh,target_cooling_energy_kwh,timestamp",
  libraryFields: [
    "fabrication_no",
    "operating_time_h",
    "on_time_h",
    "meter_datetime",
    "meter_datetime_at_error",
    "total_m3",
    "flow_temperature_c",
    "return_temperature_c",
    "flow_return_temperature_difference_c",
    "volume_flow_m3h",
  ],
  fields: [
    {
      kind: "string",
      name: "status",
      description: "Meter status. Includes meter error flags + TPL status byte.",
      properties: ["STATUS", "INCLUDE_TPL_STATUS"],
      match: { vifRange: "ErrorFlags" },
      lookup: {
        rules: [
          {
            name: "ERROR_FLAGS",
            mapType: "BitToString",
            maskBits: 0xffffffff,
            defaultMessage: "OK",
            map: [],
          },
        ],
      },
    },
    {
      kind: "numeric",
      name: "total_heat_energy",
      description: "Total heating energy consumption.",
      quantity: "Energy",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "AnyEnergyVIF",
        vifCombinables: [FWD],
      },
    },
    {
      kind: "numeric",
      name: "total_cooling_energy",
      description: "Total cooling energy consumption.",
      quantity: "Energy",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "AnyEnergyVIF",
        vifCombinables: [BWD],
      },
    },
    {
      kind: "numeric",
      name: "power",
      description: "Current power consumption.",
      quantity: "Power",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "AnyPowerVIF" },
    },
    {
      kind: "string",
      name: "target_datetime",
      description: "End of previous billing period.",
      match: {
        measurementType: "Instantaneous",
        vifRange: "DateTime",
        storageNr: 16,
      },
    },
    {
      kind: "numeric",
      name: "target_heat_energy",
      description: "Heat energy at end of previous billing period.",
      quantity: "Energy",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "AnyEnergyVIF",
        vifCombinables: [FWD],
        storageNr: 16,
      },
    },
    {
      kind: "numeric",
      name: "target_cooling_energy",
      description: "Cooling energy at end of previous billing period.",
      quantity: "Energy",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "AnyEnergyVIF",
        vifCombinables: [BWD],
        storageNr: 16,
      },
    },
  ],
});
