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
// Apator Elf 2 heat / heat-cooling meter driver.
//
// Port of vendor/wmbusmeters@af48083/drivers/src/elf2.xmq.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

const APA = flagToManufacturer("APA");

export const elf2 = defineDriver({
  name: "elf2",
  meterType: "HeatMeter",
  linkModes: [],
  mvt: [
    { manufacturer: APA, version: 0x42, type: 0x04 },
    { manufacturer: APA, version: 0x42, type: 0x0d },
  ],
  defaultFields: "name,id,status,total_energy_kwh,timestamp",
  libraryFields: ["fabrication_no", "on_time_h", "on_time_at_error_h"],
  fields: [
    {
      kind: "string",
      name: "meter_date",
      description: "Meter date when telegram was sent.",
      match: { measurementType: "Instantaneous", vifRange: "Date" },
    },
    {
      kind: "string",
      name: "meter_datetime",
      description: "Meter datetime when telegram was sent.",
      match: { measurementType: "Instantaneous", vifRange: "DateTime" },
    },
    {
      kind: "numeric",
      name: "t2_temperature",
      description: "Return water temperature.",
      quantity: "Temperature",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "ReturnTemperature" },
    },
    {
      kind: "numeric",
      name: "t1_temperature",
      description: "Incoming water temperature.",
      quantity: "Temperature",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "FlowTemperature" },
    },
    {
      kind: "numeric",
      name: "current_power",
      description: "Current power consumption.",
      quantity: "Power",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "AnyPowerVIF" },
    },
    {
      kind: "numeric",
      name: "current_volume_flow",
      description: "Current water flow.",
      quantity: "Flow",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "VolumeFlow" },
    },
    {
      kind: "numeric",
      name: "total_volume",
      description: "Total water volume.",
      quantity: "Volume",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "AnyVolumeVIF" },
    },
    {
      kind: "numeric",
      name: "total_volume_cooling",
      description: "Total cooling water volume.",
      quantity: "Volume",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "AnyVolumeVIF",
        subUnitNr: 1,
        tariffNr: 0,
        storageNr: 0,
      },
    },
    {
      kind: "numeric",
      name: "input1_volume",
      description: "Input 1 water volume.",
      quantity: "Volume",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "AnyVolumeVIF",
        subUnitNr: 0,
        tariffNr: 1,
        storageNr: 0,
      },
    },
    {
      kind: "numeric",
      name: "input2_volume",
      description: "Input 2 water volume.",
      quantity: "Volume",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "AnyVolumeVIF",
        subUnitNr: 0,
        tariffNr: 2,
        storageNr: 0,
      },
    },
    {
      kind: "numeric",
      name: "total_energy",
      description: "Total heat energy.",
      quantity: "Energy",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "AnyEnergyVIF" },
    },
    {
      kind: "numeric",
      name: "total_energy_cooling",
      description: "Total cooling energy.",
      quantity: "Energy",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "AnyEnergyVIF",
        subUnitNr: 1,
        tariffNr: 0,
        storageNr: 0,
      },
    },
    {
      kind: "numeric",
      name: "total_energy_period",
      description: "Energy at end of previous period.",
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
      name: "total_energy_cooling_period",
      description: "Cooling energy at end of previous period.",
      quantity: "Energy",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "AnyEnergyVIF",
        subUnitNr: 1,
        tariffNr: 0,
        storageNr: 1,
      },
    },
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
              { value: 0x0001, text: "MINIMUM_FLOW" },
              { value: 0x0002, text: "FLOW_METER_FAILURE" },
              { value: 0x0004, text: "RETURN_TEMPERATURE_ERROR" },
              { value: 0x0008, text: "SUPPLY_TEMPERATURE_ERROR" },
              { value: 0x0010, text: "DIFFERENTIAL_TEMPERATURE_ERROR" },
              { value: 0x0020, text: "MAXIMUM_FLOW" },
              { value: 0x0040, text: "MEMORY_FAILURE" },
              { value: 0x0080, text: "LOW_BATTERY_VOLTAGE" },
              { value: 0x0100, text: "DAILY_ABNORMAL_NOMINAL_FLOW" },
              { value: 0x0200, text: "ANNUAL_ABNORMAL_NOMINAL_FLOW" },
              { value: 0x0400, text: "DIFFERENTIAL_TEMPERATURE_TOO_LOW" },
              { value: 0x0800, text: "CRC_ERROR" },
              { value: 0x1000, text: "FLASH_ERROR" },
              { value: 0x2000, text: "CRITICAL_BATTERY_VOLTAGE" },
              { value: 0x4000, text: "CPU_OVERTEMPERATURE" },
              { value: 0x8000, text: "UART_LIMIT_OVERRUN" },
            ],
          },
        ],
      },
    },
  ],
});
