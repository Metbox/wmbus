// Qundis Q-Water v2 water meter driver.
//
// Port of vendor/wmbusmeters@af48083/drivers/src/qwaterv2.xmq.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

const QDS = flagToManufacturer("QDS");

export const qwaterv2 = defineDriver({
  name: "qwaterv2",
  meterType: "WaterMeter",
  linkModes: ["C1", "T1"],
  mvt: [
    { manufacturer: QDS, version: 0x33, type: 0x37 },
    { manufacturer: QDS, version: 0x35, type: 0x37 },
    { manufacturer: QDS, version: 0x16, type: 0x06 },
    { manufacturer: QDS, version: 0x16, type: 0x07 },
    { manufacturer: QDS, version: 0x17, type: 0x06 },
    { manufacturer: QDS, version: 0x17, type: 0x07 },
    { manufacturer: QDS, version: 0x18, type: 0x06 },
    { manufacturer: QDS, version: 0x18, type: 0x07 },
    { manufacturer: QDS, version: 0x19, type: 0x07 },
    { manufacturer: QDS, version: 0x1a, type: 0x06 },
    { manufacturer: QDS, version: 0x1a, type: 0x07 },
    { manufacturer: QDS, version: 0x1d, type: 0x06 },
    { manufacturer: QDS, version: 0x1d, type: 0x07 },
    { manufacturer: QDS, version: 0x36, type: 0x06 },
    { manufacturer: QDS, version: 0x36, type: 0x07 },
  ],
  defaultFields: "name,id,status,total_m3,timestamp",
  libraryFields: ["total_m3", "meter_datetime", "enhanced_id"],
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
      name: "target",
      description: "Volume at last billing date.",
      quantity: "Volume",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "AnyVolumeVIF",
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
      description: "Volume at end of previous year.",
      quantity: "Volume",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "AnyVolumeVIF",
        storageNr: 1,
      },
    },
    {
      kind: "string",
      name: "target_year_date",
      description: "End of previous year.",
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
