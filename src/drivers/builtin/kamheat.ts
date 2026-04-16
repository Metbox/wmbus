// Kamstrup Multical 302/303/402/403/602/603/803 heat meter driver.
//
// Port of vendor/wmbusmeters@af48083/drivers/src/kamheat.xmq.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

const KAM = flagToManufacturer("KAM");

// Kamstrup status bits 0x00000000..0x80000000 (32-bit). Full set from the
// upstream XMQ.
const STATUS_MAP_32 = [
  { value: 0x00000001, text: "VOLTAGE_INTERRUPTED" },
  { value: 0x00000002, text: "LOW_BATTERY_LEVEL" },
  { value: 0x00000004, text: "SENSOR_ERROR" },
  { value: 0x00000008, text: "SENSOR_T1_ABOVE_MEASURING_RANGE" },
  { value: 0x00000010, text: "SENSOR_T2_ABOVE_MEASURING_RANGE" },
  { value: 0x00000020, text: "SENSOR_T1_BELOW_MEASURING_RANGE" },
  { value: 0x00000040, text: "SENSOR_T2_BELOW_MEASURING_RANGE" },
  { value: 0x00000080, text: "TEMP_DIFF_WRONG_POLARITY" },
  { value: 0x00000100, text: "FLOW_SENSOR_WEAK_OR_AIR" },
  { value: 0x00000200, text: "WRONG_FLOW_DIRECTION" },
  { value: 0x00000400, text: "RESERVED_BIT_10" },
  { value: 0x00000800, text: "FLOW_INCREASED" },
  { value: 0x00001000, text: "IN_A1_LEAKAGE_IN_THE_SYSTEM" },
  { value: 0x00002000, text: "IN_B1_LEAKAGE_IN_THE_SYSTEM" },
  { value: 0x00004000, text: "IN_A1_A2_EXTERNAL_ALARM" },
  { value: 0x00008000, text: "IN_B1_B2_EXTERNAL_ALARM" },
  { value: 0x00010000, text: "V1_COMMUNICATION_ERROR" },
  { value: 0x00020000, text: "V1_WRONG_PULSE_FIGURE" },
  { value: 0x00040000, text: "IN_A2_LEAKAGE_IN_THE_SYSTEM" },
  { value: 0x00080000, text: "IN_B2_LEAKAGE_IN_THE_SYSTEM" },
  { value: 0x00100000, text: "T3_ABOVE_MEASURING_RANGE_OR_SWITCHED_OFF" },
  { value: 0x00200000, text: "T3_BELOW_MEASURING_RANGE_OR_SWITCHED_OFF" },
  { value: 0x00400000, text: "V2_COMMUNICATION_ERROR" },
  { value: 0x00800000, text: "V2_WRONG_PULSE_FIGURE" },
  { value: 0x01000000, text: "V2_AIR" },
  { value: 0x02000000, text: "V2_WRONG_FLOW_DIRECTION" },
  { value: 0x04000000, text: "RESERVED_BIT_26" },
  { value: 0x08000000, text: "V2_INCREASED_FLOW" },
  { value: 0x10000000, text: "V1_V2_BURST_WATER_LOSS" },
  { value: 0x20000000, text: "V1_V2_BURST_WATER_PENETRATION" },
  { value: 0x40000000, text: "V1_V2_LEAKAGE_WATER_LOSS" },
  { value: 0x80000000, text: "V1_V2_LEAKAGE_WATER_PENETRATION" },
];

export const kamheat = defineDriver({
  name: "kamheat",
  aliases: [
    "multical302",
    "multical303",
    "multical402",
    "multical403",
    "multical602",
    "multical603",
    "multical803",
  ],
  meterType: "HeatMeter",
  linkModes: ["C1", "T1"],
  mvt: [
    { manufacturer: KAM, version: 0x30, type: 0x04 }, // 302
    { manufacturer: KAM, version: 0x30, type: 0x0d }, // 302
    { manufacturer: KAM, version: 0x30, type: 0x0c }, // 302
    { manufacturer: KAM, version: 0x40, type: 0x04 }, // 303
    { manufacturer: KAM, version: 0x40, type: 0x0c }, // 303
    { manufacturer: KAM, version: 0x19, type: 0x04 }, // 402
    { manufacturer: KAM, version: 0x34, type: 0x04 }, // 403
    { manufacturer: KAM, version: 0x34, type: 0x0a }, // 403
    { manufacturer: KAM, version: 0x34, type: 0x0b }, // 403
    { manufacturer: KAM, version: 0x34, type: 0x0c }, // 403
    { manufacturer: KAM, version: 0x34, type: 0x0d }, // 403
    { manufacturer: KAM, version: 0x1c, type: 0x04 }, // 602
    { manufacturer: KAM, version: 0x35, type: 0x04 }, // 603
    { manufacturer: KAM, version: 0x35, type: 0x0c }, // 603
    { manufacturer: KAM, version: 0x39, type: 0x04 }, // 803
  ],
  defaultFields: "name,id,total_energy_consumption_kwh,total_volume_m3,status,timestamp",
  libraryFields: [
    "fabrication_no",
    "meter_date",
    "meter_datetime",
    "on_time_h",
    "on_time_at_error_h",
    "flow_return_temperature_difference_c",
    "target_date",
  ],
  // Kamstrup's operating_time entry ships with the manufacturer combinable
  // Mfct21 (VIF extension 0x7F21), so the default library field matcher
  // (which requires no combinables) won't find it. Declare an explicit field
  // so the right DVEntry is picked up.
  fields: [
    {
      kind: "string",
      name: "status",
      description: "Status and error flags.",
      properties: ["STATUS", "INCLUDE_TPL_STATUS"],
      match: { difVifKey: "04FF22" },
      lookup: {
        rules: [
          {
            name: "ERROR_FLAGS",
            mapType: "BitToString",
            maskBits: 0xffffffff,
            defaultMessage: "OK",
            map: STATUS_MAP_32,
          },
        ],
      },
    },
    {
      kind: "numeric",
      name: "operating_time",
      description: "Operating time (Kamstrup Mfct21 combinable).",
      quantity: "Time",
      scaling: "Auto",
      signedness: "Unsigned",
      match: {
        measurementType: "Instantaneous",
        vifRange: "OperatingTime",
        vifCombinables: [0x7f21],
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
      kind: "numeric",
      name: "total_energy_backward",
      description: "Total backwards energy.",
      quantity: "Energy",
      scaling: "Auto",
      signedness: "Signed",
      // VIFCombinable::BackwardFlow = 0x3c.
      match: {
        measurementType: "Instantaneous",
        vifRange: "AnyEnergyVIF",
        vifCombinables: [0x3c],
      },
    },
    {
      kind: "numeric",
      name: "total_volume",
      description: "Total volume.",
      quantity: "Volume",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "Volume" },
    },
    {
      kind: "numeric",
      name: "total_volume_subunit{subunit_counter}",
      description: "Total volume for a subunit.",
      quantity: "Volume",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "Volume",
        subUnitNr: { from: 1, to: 4 },
      },
    },
    {
      kind: "numeric",
      name: "volume_flow",
      description: "Current volume flow.",
      quantity: "Flow",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "VolumeFlow" },
    },
    {
      kind: "numeric",
      name: "power",
      description: "Current power.",
      quantity: "Power",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "AnyPowerVIF" },
    },
    {
      kind: "numeric",
      name: "max_power",
      description: "Maximum power.",
      quantity: "Power",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Maximum", vifRange: "AnyPowerVIF" },
    },
    {
      kind: "numeric",
      name: "t1_temperature",
      description: "Forward water temperature.",
      quantity: "Temperature",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "FlowTemperature" },
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
      name: "max_flow",
      description: "Maximum volume flow.",
      quantity: "Flow",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Maximum", vifRange: "VolumeFlow" },
    },
    {
      kind: "numeric",
      name: "forward_energy",
      description: "Forward water energy.",
      quantity: "Energy",
      scaling: "None",
      signedness: "Signed",
      forceUnit: "M3C",
      match: { difVifKey: "04FF07" },
    },
    {
      kind: "numeric",
      name: "return_energy",
      description: "Return water energy.",
      quantity: "Energy",
      scaling: "None",
      signedness: "Signed",
      forceUnit: "M3C",
      match: { difVifKey: "04FF08" },
    },
    {
      kind: "numeric",
      name: "target_energy",
      description: "Energy at the set date.",
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
      name: "target_volume",
      description: "Volume at the set date.",
      quantity: "Volume",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "Volume", storageNr: 1 },
    },
    {
      kind: "numeric",
      name: "target_volume_subunit{subunit_counter}",
      description: "Subunit volume at the set date.",
      quantity: "Volume",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "Volume",
        storageNr: 1,
        subUnitNr: { from: 1, to: 4 },
      },
    },
    {
      kind: "string",
      name: "enhanced_id",
      description: "Enhanced identification (dif/vif 02F9FF15).",
      match: { difVifKey: "02F9FF15" },
    },
    {
      kind: "numeric",
      name: "va",
      description: "Counter A.",
      quantity: "Counter",
      scaling: "None",
      signedness: "Unsigned",
      forceUnit: "COUNTER",
      match: { difVifKey: "04EEFF07" },
    },
    {
      kind: "numeric",
      name: "vb",
      description: "Counter B.",
      quantity: "Counter",
      scaling: "None",
      signedness: "Unsigned",
      forceUnit: "COUNTER",
      match: { difVifKey: "04EEFF08" },
    },
  ],
});
