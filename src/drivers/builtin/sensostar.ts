// Sensostar / Engelmann heat meter — registry stub (declarative subset).
//
// Port of vendor/wmbusmeters@af48083/drivers/src/sensostar.xmq.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

export const sensostar = defineDriver({
  name: "sensostar",
  meterType: "HeatMeter",
  linkModes: ["T1"],
  mvt: [{ manufacturer: flagToManufacturer("EFE"), version: 0x00, type: 0x04 }],
  defaultFields: "name,id,status,total_kwh,total_water_m3,timestamp",
  libraryFields: [
    "meter_datetime",
    "fabrication_no",
    "model_version",
    "on_time_h",
    "parameter_set",
  ],
  fields: [
    {
      kind: "string",
      name: "status",
      description: "Status and error flags.",
      properties: ["INCLUDE_TPL_STATUS"],
      match: { measurementType: "Instantaneous", vifRange: "ErrorFlags" },
      lookup: {
        rules: [
          {
            name: "ERROR_FLAGS",
            mapType: "BitToString",
            maskBits: 0xff,
            defaultMessage: "OK",
            map: [
              { value: 0x01, text: "ERROR_TEMP_SENSOR_1_CABLE_BREAK" },
              { value: 0x02, text: "ERROR_TEMP_SENSOR_1_SHORT_CIRCUIT" },
              { value: 0x04, text: "ERROR_TEMP_SENSOR_2_CABLE_BREAK" },
              { value: 0x08, text: "ERROR_TEMP_SENSOR_2_SHORT_CIRCUIT" },
              { value: 0x10, text: "ERROR_FLOW_MEASUREMENT_SYSTEM_ERROR" },
              { value: 0x20, text: "ERROR_ELECTRONICS_DEFECT" },
              { value: 0x40, text: "OK_INSTRUMENT_RESET" },
              { value: 0x80, text: "OK_BATTERY_LOW" },
            ],
          },
        ],
      },
    },
    {
      kind: "numeric",
      name: "total",
      description: "Total heat energy consumption.",
      quantity: "Energy",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "AnyEnergyVIF" },
    },
    {
      kind: "numeric",
      name: "total_water",
      description: "Total volume of heating media.",
      quantity: "Volume",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "Volume" },
    },
    {
      kind: "numeric",
      name: "power",
      description: "Power consumption.",
      quantity: "Power",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "AnyPowerVIF" },
    },
    {
      kind: "numeric",
      name: "flow_water",
      description: "Water flow.",
      quantity: "Flow",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "VolumeFlow" },
    },
    {
      kind: "numeric",
      name: "forward",
      description: "Forward water temperature.",
      quantity: "Temperature",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "FlowTemperature" },
    },
    {
      kind: "numeric",
      name: "return",
      description: "Return water temperature.",
      quantity: "Temperature",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "ReturnTemperature" },
    },
    {
      kind: "numeric",
      name: "difference",
      description: "Forward minus return temperature.",
      quantity: "Temperature",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "TemperatureDifference" },
    },
    {
      kind: "string",
      name: "target_date",
      description: "Last billing period date.",
      match: { measurementType: "Instantaneous", vifRange: "Date", storageNr: 1 },
    },
    {
      kind: "numeric",
      name: "target",
      description: "Energy at last billing date.",
      quantity: "Energy",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "AnyEnergyVIF",
        storageNr: 1,
      },
    },
  ],
});
