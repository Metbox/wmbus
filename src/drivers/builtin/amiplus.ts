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
// Apator / Otus amiplus electricity meter driver.
//
// Port of vendor/wmbusmeters@af48083/src/driver_amiplus.cc.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

const APA = flagToManufacturer("APA");
const DEV = flagToManufacturer("DEV");
const NES = flagToManufacturer("NES");

export const amiplus = defineDriver({
  name: "amiplus",
  meterType: "ElectricityMeter",
  linkModes: ["T1"],
  mvt: [
    { manufacturer: APA, version: 0x02, type: 0x02 },
    { manufacturer: DEV, version: 0x02, type: 0x37 },
    { manufacturer: DEV, version: 0x00, type: 0x02 },
    { manufacturer: DEV, version: 0x01, type: 0x02 },
    { manufacturer: NES, version: 0x03, type: 0x02 },
    { manufacturer: APA, version: 0x01, type: 0x02 }, // Otus 1/3
  ],
  defaultFields:
    "name,id,total_energy_consumption_kwh,current_power_consumption_kw,total_energy_production_kwh," +
    "current_power_production_kw,voltage_at_phase_1_v,voltage_at_phase_2_v,voltage_at_phase_3_v," +
    "total_energy_consumption_tariff_1_kwh,total_energy_consumption_tariff_2_kwh," +
    "total_energy_consumption_tariff_3_kwh,total_energy_production_tariff_1_kwh," +
    "total_energy_production_tariff_2_kwh,total_energy_production_tariff_3_kwh,timestamp",
  fields: [
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
      name: "total_energy_production",
      description: "Total energy production.",
      quantity: "Energy",
      scaling: "Auto",
      signedness: "Signed",
      match: { difVifKey: "0E833C" },
    },
    {
      kind: "numeric",
      name: "current_power_production",
      description: "Current power production.",
      quantity: "Power",
      scaling: "Auto",
      signedness: "Signed",
      match: { difVifKey: "0BAB3C" },
    },
    {
      kind: "numeric",
      name: "voltage_at_phase_1",
      description: "Voltage at phase L1.",
      quantity: "Voltage",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "Voltage",
        vifCombinables: [0x7c01],
      },
    },
    {
      kind: "numeric",
      name: "voltage_at_phase_2",
      description: "Voltage at phase L2.",
      quantity: "Voltage",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "Voltage",
        vifCombinables: [0x7c02],
      },
    },
    {
      kind: "numeric",
      name: "voltage_at_phase_3",
      description: "Voltage at phase L3.",
      quantity: "Voltage",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "Voltage",
        vifCombinables: [0x7c03],
      },
    },
    {
      kind: "string",
      name: "device_date_time",
      description: "Device date time.",
      match: { measurementType: "Instantaneous", vifRange: "DateTime" },
    },
    {
      kind: "numeric",
      name: "total_energy_consumption_tariff_1",
      description: "Total energy consumption on tariff 1.",
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
      name: "total_energy_consumption_tariff_2",
      description: "Total energy consumption on tariff 2.",
      quantity: "Energy",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "AnyEnergyVIF",
        tariffNr: 2,
      },
    },
    {
      kind: "numeric",
      name: "total_energy_consumption_tariff_3",
      description: "Total energy consumption on tariff 3.",
      quantity: "Energy",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "AnyEnergyVIF",
        tariffNr: 3,
      },
    },
    {
      kind: "numeric",
      name: "total_energy_production_tariff_1",
      description: "Total energy production on tariff 1.",
      quantity: "Energy",
      scaling: "Auto",
      signedness: "Signed",
      match: { difVifKey: "8E10833C" },
    },
    {
      kind: "numeric",
      name: "total_energy_production_tariff_2",
      description: "Total energy production on tariff 2.",
      quantity: "Energy",
      scaling: "Auto",
      signedness: "Signed",
      match: { difVifKey: "8E20833C" },
    },
    {
      kind: "numeric",
      name: "total_energy_production_tariff_3",
      description: "Total energy production on tariff 3.",
      quantity: "Energy",
      scaling: "Auto",
      signedness: "Signed",
      match: { difVifKey: "8E30833C" },
    },
    {
      kind: "numeric",
      name: "max_power_consumption",
      description: "Maximum power consumption (15-min avg this month).",
      quantity: "Power",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Maximum", vifRange: "AnyPowerVIF" },
    },
  ],
});
