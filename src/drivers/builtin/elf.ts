// Apator Elf heat meter driver.
//
// Port of vendor/wmbusmeters@af48083/src/driver_elf.cc.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

const APA = flagToManufacturer("APA");

export const elf = defineDriver({
  name: "elf",
  meterType: "HeatMeter",
  linkModes: [],
  mvt: [{ manufacturer: APA, version: 0x04, type: 0x40 }],
  defaultFields:
    "name,id,total_energy_consumption_kwh,current_power_consumption_kw,total_volume_m3," +
    "flow_temperature_c,return_temperature_c,external_temperature_c,status,timestamp",
  fields: [
    {
      kind: "string",
      name: "status",
      description: "Meter status from manufacturer status + TPL status byte.",
      properties: ["STATUS", "INCLUDE_TPL_STATUS"],
      match: { difVifKey: "047F" },
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
      kind: "string",
      name: "meter_date",
      description: "Meter's own date.",
      match: { measurementType: "Instantaneous", vifRange: "Date" },
    },
    {
      kind: "numeric",
      name: "total_energy_consumption",
      description: "Total energy consumption.",
      quantity: "Energy",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "AnyEnergyVIF" },
    },
    {
      kind: "numeric",
      name: "current_power_consumption",
      description: "Current power consumption.",
      quantity: "Power",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "PowerW" },
    },
    {
      kind: "numeric",
      name: "total_volume",
      description: "Total heat media volume.",
      quantity: "Volume",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "Volume" },
    },
    {
      kind: "numeric",
      name: "total_energy_consumption_at_date",
      description: "Total energy at the set date.",
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
      name: "flow_temperature",
      description: "Flow temperature.",
      quantity: "Temperature",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "FlowTemperature" },
    },
    {
      kind: "numeric",
      name: "return_temperature",
      description: "Return temperature.",
      quantity: "Temperature",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "ReturnTemperature" },
    },
    {
      kind: "numeric",
      name: "external_temperature",
      description: "External temperature.",
      quantity: "Temperature",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "ExternalTemperature" },
    },
    {
      kind: "numeric",
      name: "operating_time",
      description: "Operating time.",
      quantity: "Time",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "OperatingTime" },
    },
    {
      kind: "string",
      name: "version",
      description: "Model version.",
      match: { measurementType: "Instantaneous", vifRange: "ModelVersion" },
    },
    {
      kind: "numeric",
      name: "battery",
      description: "Battery voltage.",
      quantity: "Voltage",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "Voltage" },
    },
  ],
});
