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
// NZR / EMH electricity meter driver.
//
// Port of vendor/wmbusmeters@af48083/drivers/src/nzr.xmq.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

const NZR = flagToManufacturer("NZR");
const EMH = flagToManufacturer("EMH");

export const nzr = defineDriver({
  name: "nzr",
  meterType: "ElectricityMeter",
  linkModes: [],
  mvt: [
    { manufacturer: NZR, version: 0x00, type: 0x02 },
    { manufacturer: EMH, version: 0x00, type: 0x02 },
  ],
  defaultFields: "name,id,status,total_energy_consumption_kwh,timestamp",
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
            maskBits: 0xff,
            defaultMessage: "OK",
            map: [
              { value: 0x01, text: "BUSY" },
              { value: 0x02, text: "GENERIC_APP_ERROR" },
              { value: 0x04, text: "CURRENT_LOW" },
              { value: 0x08, text: "PERMANENT_ERROR" },
              { value: 0x10, text: "TEMPORARY_ERROR" },
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
      match: {
        measurementType: "Instantaneous",
        vifRange: "AnyEnergyVIF",
        tariffNr: 1,
      },
    },
    {
      kind: "numeric",
      name: "current_power_consumption",
      description: "Active power overall.",
      quantity: "Power",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "AnyPowerVIF" },
    },
    {
      kind: "numeric",
      name: "current_power_consumption_1",
      description: "Active power in L1 phase.",
      quantity: "Power",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "AnyPowerVIF",
        storageNr: 2,
      },
    },
    {
      kind: "numeric",
      name: "voltage_at_phase_1",
      description: "Voltage L1-N.",
      quantity: "Voltage",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "Voltage",
        storageNr: 2,
      },
    },
    {
      kind: "numeric",
      name: "current_at_phase_1",
      description: "Current in L1 phase.",
      quantity: "Amperage",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "Amperage",
        storageNr: 2,
      },
    },
    {
      kind: "numeric",
      name: "current_power_consumption_2",
      description: "Active power in L2 phase.",
      quantity: "Power",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "AnyPowerVIF",
        storageNr: 4,
      },
    },
    {
      kind: "numeric",
      name: "voltage_at_phase_2",
      description: "Voltage L2-N.",
      quantity: "Voltage",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "Voltage",
        storageNr: 4,
      },
    },
    {
      kind: "numeric",
      name: "current_at_phase_2",
      description: "Current in L2 phase.",
      quantity: "Amperage",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "Amperage",
        storageNr: 4,
      },
    },
    {
      kind: "numeric",
      name: "current_power_consumption_3",
      description: "Active power in L3 phase.",
      quantity: "Power",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "AnyPowerVIF",
        storageNr: 6,
      },
    },
    {
      kind: "numeric",
      name: "voltage_at_phase_3",
      description: "Voltage L3-N.",
      quantity: "Voltage",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "Voltage",
        storageNr: 6,
      },
    },
    {
      kind: "numeric",
      name: "current_at_phase_3",
      description: "Current in L3 phase.",
      quantity: "Amperage",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "Amperage",
        storageNr: 6,
      },
    },
  ],
});
