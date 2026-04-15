// Qundis Q-Heat v2 heat meter driver.
//
// Port of vendor/wmbusmeters@af48083/drivers/src/qheatv2.xmq (declarative
// fields only — IXML mfct_specific_data block is deferred).

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

const QDS = flagToManufacturer("QDS");

export const qheatv2 = defineDriver({
  name: "qheatv2",
  meterType: "HeatMeter",
  linkModes: ["C1"],
  mvt: [
    { manufacturer: QDS, version: 0x23, type: 0x04 },
    { manufacturer: QDS, version: 0x23, type: 0x37 },
    { manufacturer: QDS, version: 0x3e, type: 0x04 },
    { manufacturer: QDS, version: 0x3e, type: 0x37 },
    { manufacturer: QDS, version: 0x46, type: 0x04 },
    { manufacturer: QDS, version: 0x46, type: 0x37 },
    { manufacturer: QDS, version: 0x47, type: 0x04 },
    { manufacturer: QDS, version: 0x47, type: 0x37 },
    { manufacturer: QDS, version: 0x48, type: 0x04 },
    { manufacturer: QDS, version: 0x48, type: 0x37 },
  ],
  defaultFields: "name,id,status,total_kwh,timestamp",
  libraryFields: ["meter_datetime", "enhanced_id"],
  fields: [
    {
      kind: "string",
      name: "status",
      description: "Status and error flags.",
      properties: ["STATUS", "INCLUDE_TPL_STATUS"],
      match: { measurementType: "Instantaneous", vifRange: "ErrorFlags" },
      lookup: {
        rules: [
          {
            name: "ERROR_FLAGS",
            mapType: "BitToString",
            maskBits: 0xffff,
            defaultMessage: "OK",
            map: [
              { value: 0x0001, text: "NO_FLOW" },
              { value: 0x0002, text: "SUPPLY_SENSOR_INTERRUPTED" },
              { value: 0x0004, text: "RETURN_SENSOR_INTERRUPTED" },
              { value: 0x0008, text: "TEMPERATURE_ELECTRONICS_ERROR" },
              { value: 0x0010, text: "BATTERY_VOLTAGE_ERROR" },
              { value: 0x0020, text: "SHORT_CIRCUIT_SUPPLY_SENSOR" },
              { value: 0x0040, text: "SHORT_CIRCUIT_RETURN_SENSOR" },
              { value: 0x0080, text: "MEMORY_ERROR" },
              { value: 0x0100, text: "SABOTAGE" },
              { value: 0x0200, text: "ELECTRONICS_ERROR" },
            ],
          },
        ],
      },
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
      name: "target",
      description: "Energy at the last billing period date.",
      quantity: "Energy",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "AnyEnergyVIF",
        storageNr: 17,
      },
    },
    {
      kind: "string",
      name: "target_date",
      description: "Last billing period date.",
      match: { measurementType: "Instantaneous", vifRange: "Date", storageNr: 17 },
    },
    {
      kind: "numeric",
      name: "target_year",
      description: "Energy at end of previous year.",
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
      kind: "string",
      name: "target_year_date",
      description: "Last day of previous year.",
      match: { measurementType: "Instantaneous", vifRange: "Date", storageNr: 1 },
    },
    {
      kind: "string",
      name: "device_error_date",
      description: "Device error date.",
      match: { measurementType: "AtError", vifRange: "Date" },
    },
  ],
});
