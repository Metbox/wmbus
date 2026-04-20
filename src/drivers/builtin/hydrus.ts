// Diehl/Hydrometer Hydrus water meter driver.
//
// Port of vendor/wmbusmeters@af48083/src/driver_hydrus.cc.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

const DME = flagToManufacturer("DME");
const HYD = flagToManufacturer("HYD");

export const hydrus = defineDriver({
  name: "hydrus",
  meterType: "WaterMeter",
  linkModes: ["T1"],
  mvt: [
    { manufacturer: DME, version: 0x70, type: 0x07 },
    { manufacturer: DME, version: 0x76, type: 0x07 },
    { manufacturer: HYD, version: 0x24, type: 0x07 },
    { manufacturer: HYD, version: 0x8b, type: 0x07 },
    { manufacturer: HYD, version: 0x8b, type: 0x06 },
    { manufacturer: DME, version: 0x70, type: 0x06 },
    { manufacturer: DME, version: 0x70, type: 0x16 },
  ],
  defaultFields: "name,id,total_m3,total_at_date_m3,status,timestamp",
  fields: [
    {
      kind: "string",
      name: "status",
      description: "Status of meter.",
      properties: ["STATUS", "INCLUDE_TPL_STATUS"],
      match: { difVifKey: "FFFFFFFF" },
      lookup: {
        rules: [
          {
            name: "ERROR_FLAGS",
            mapType: "BitToString",
            maskBits: 0xff,
            defaultMessage: "OK",
            map: [],
          },
        ],
      },
    },
    {
      kind: "numeric",
      name: "total",
      description: "Total water consumption.",
      quantity: "Volume",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "Volume" },
    },
    {
      kind: "numeric",
      name: "total_tariff{tariff_counter}",
      description: "Total water consumption recorded on tariff N.",
      quantity: "Volume",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "Volume",
        tariffNr: { from: 1, to: 2 },
      },
    },
    {
      kind: "numeric",
      name: "total_tariff{tariff_counter}_at_date",
      description: "Total water consumption recorded on tariff N at billing date.",
      quantity: "Volume",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "Volume",
        tariffNr: { from: 1, to: 2 },
        storageNr: 1,
      },
    },
    {
      kind: "numeric",
      name: "flow",
      description: "Current water flow.",
      quantity: "Flow",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "VolumeFlow" },
    },
    {
      kind: "numeric",
      name: "total_at_date",
      description: "Total water consumption recorded at date.",
      quantity: "Volume",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "Volume",
        storageNr: 1,
      },
    },
    {
      kind: "string",
      name: "at_date",
      description: "Last billing period date.",
      match: { measurementType: "Instantaneous", vifRange: "Date", storageNr: 1 },
    },
    {
      kind: "numeric",
      name: "flow_temperature",
      description: "Water temperature.",
      quantity: "Temperature",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "FlowTemperature" },
    },
    {
      kind: "numeric",
      name: "target",
      description: "Total water consumption recorded at end of last month.",
      quantity: "Volume",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "Volume",
        storageNr: 3,
      },
    },
    {
      kind: "string",
      name: "target_datetime",
      description: "End of last month.",
      match: {
        measurementType: "Instantaneous",
        vifRange: "DateTime",
        storageNr: 3,
      },
    },
    {
      kind: "numeric",
      name: "remaining_battery_life",
      description: "Remaining battery life in years.",
      quantity: "Time",
      scaling: "Auto",
      signedness: "Unsigned",
      forceUnit: "Year",
      match: { measurementType: "Instantaneous", difVifKey: "02FD74" },
    },
  ],
});
