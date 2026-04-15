// Qundis Q-Heat heat meter driver.
//
// Port of vendor/wmbusmeters@af48083/src/driver_qheat.cc.
//
// Manufacturer: QDS (Qundis). MVTs registered dynamically by the driver via
// processContent — for the standard telegram variants we just need the field
// matchers; the walk-by message variant ("0DFF5F" container) is deferred to
// a later wave with a postprocess hook.

import { defineDriver } from "../registry.js";

export const qheat = defineDriver({
  name: "qheat",
  meterType: "HeatMeter",
  linkModes: ["C1"],
  // No MVTs declared — qheat detects via the inner TPL header in upstream's
  // processContent. Resolution by name only for now.
  mvt: [],
  defaultFields:
    "name,id,total_energy_consumption_kwh,last_month_date,last_month_energy_consumption_kwh,timestamp",
  fields: [
    {
      kind: "string",
      name: "status",
      description: "Meter status.",
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
              { value: 0x01, text: "NO_FLOW" },
              { value: 0x02, text: "SUPPLY_SENSOR_INTERRUPTED" },
              { value: 0x04, text: "RETURN_SENSOR_INTERRUPTED" },
              { value: 0x08, text: "TEMPERATURE_ELECTRONICS_ERROR" },
              { value: 0x10, text: "BATTERY_VOLTAGE_ERROR" },
              { value: 0x20, text: "SHORT_CIRCUIT_SUPPLY_SENSOR" },
              { value: 0x40, text: "SHORT_CIRCUIT_RETURN_SENSOR" },
              { value: 0x80, text: "MEMORY_ERROR" },
              { value: 0x100, text: "SABOTAGE" },
              { value: 0x200, text: "ELECTRONICS_ERROR" },
            ],
          },
        ],
      },
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
      kind: "string",
      name: "last_month_date",
      description: "Last day of previous month when total energy was recorded.",
      match: { measurementType: "Instantaneous", vifRange: "Date", storageNr: 17 },
    },
    {
      kind: "numeric",
      name: "last_month_energy_consumption",
      description: "Total energy at last day of previous month.",
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
      name: "last_year_date",
      description: "Last day of previous year when total energy was recorded.",
      match: { measurementType: "Instantaneous", vifRange: "Date", storageNr: 1 },
    },
    {
      kind: "numeric",
      name: "last_year_energy_consumption",
      description: "Total energy at last day of previous year.",
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
      name: "device_date_time",
      description: "Device date time.",
      match: { measurementType: "Instantaneous", vifRange: "DateTime" },
    },
    {
      kind: "string",
      name: "device_error_date",
      description: "Device error date.",
      match: { measurementType: "AtError", vifRange: "Date" },
    },
  ],
});
