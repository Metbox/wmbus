/*
 * Copyright (C) 2017-2026 Fredrik Öhrström (gpl-3.0-or-later)
 * Copyright (C) 2026 Metbox / @metbox/wmbus contributors (gpl-3.0-or-later)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */
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
    {
      kind: "numeric",
      name: "total_tariff{tariff_counter}",
      description: "Total heat energy for tariff 2-3.",
      quantity: "Energy",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "AnyEnergyVIF",
        tariffNr: { from: 2, to: 3 },
      },
    },
    {
      kind: "numeric",
      name: "total_subunit{subunit_counter}",
      description: "Total volume for subunit 1-3.",
      quantity: "Volume",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "Volume",
        subUnitNr: { from: 1, to: 3 },
      },
    },
    {
      kind: "numeric",
      name: "total_water_tariff2",
      description: "Volume on tariff 2.",
      quantity: "Volume",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "Volume",
        tariffNr: 2,
      },
    },
    {
      kind: "numeric",
      name: "target_water",
      description: "Volume at the last billing date.",
      quantity: "Volume",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "Volume", storageNr: 1 },
    },
    {
      kind: "numeric",
      name: "power_max",
      description: "Maximum power.",
      quantity: "Power",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Maximum", vifRange: "AnyPowerVIF" },
    },
    {
      kind: "numeric",
      name: "flow_water_max",
      description: "Maximum volume flow.",
      quantity: "Flow",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Maximum", vifRange: "VolumeFlow" },
    },
    {
      kind: "numeric",
      name: "target_tariff{tariff_counter}",
      description: "Energy at last billing date on tariff 2-3.",
      quantity: "Energy",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "AnyEnergyVIF",
        storageNr: 1,
        tariffNr: { from: 2, to: 3 },
      },
    },
    {
      kind: "numeric",
      name: "target_subunit{subunit_counter}",
      description: "Volume at last billing date on subunit 1-3.",
      quantity: "Volume",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "Volume",
        storageNr: 1,
        subUnitNr: { from: 1, to: 3 },
      },
    },
    {
      kind: "numeric",
      name: "target_{storage_counter}",
      description: "Energy at storage slots 2-32 (historical monthly values).",
      quantity: "Energy",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "AnyEnergyVIF",
        storageNr: { from: 2, to: 32 },
      },
    },
  ],
});
