// Lansen wM-Bus repeater driver.
//
// Port of vendor/wmbusmeters@af48083/src/driver_lansenrp.cc.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

const LAS = flagToManufacturer("LAS");

export const lansenrp = defineDriver({
  name: "lansenrp",
  meterType: "Repeater",
  linkModes: ["C1"],
  mvt: [{ manufacturer: LAS, version: 0x32, type: 0x0b }],
  defaultFields:
    "name,id,status,total_routed_messages_counter,used_router_slots_counter," +
    "is_repeater_listening,timestamp",
  libraryFields: ["software_version", "meter_datetime"],
  fields: [
    {
      kind: "string",
      name: "status",
      description: "Meter status from TPL status byte.",
      properties: ["STATUS", "INCLUDE_TPL_STATUS"],
      match: { vifRange: "None" },
      lookup: {
        rules: [
          {
            name: "TPL_STS",
            mapType: "BitToString",
            maskBits: 0xe0,
            defaultMessage: "OK",
            map: [{ value: 0x04, text: "LOW_BATTERY" }],
          },
        ],
      },
    },
    {
      kind: "numeric",
      name: "total_routed_messages",
      description: "Number of total routed messages since power up.",
      quantity: "Counter",
      scaling: "None",
      signedness: "Signed",
      forceUnit: "COUNTER",
      match: { measurementType: "Instantaneous", vifRange: "Dimensionless" },
    },
    {
      kind: "numeric",
      name: "used_router_slots",
      description: "Used router slots (maximum 936).",
      quantity: "Counter",
      scaling: "None",
      signedness: "Signed",
      forceUnit: "COUNTER",
      match: {
        measurementType: "Instantaneous",
        vifRange: "Dimensionless",
        subUnitNr: 1,
      },
    },
    {
      kind: "string",
      name: "is_repeater_listening",
      description: "Is the repeater listening (YES/NO).",
      match: {
        measurementType: "Instantaneous",
        vifRange: "Dimensionless",
        subUnitNr: 2,
      },
      lookup: {
        rules: [
          {
            name: "INPUT_BITS",
            mapType: "IndexToString",
            maskBits: 0x01,
            defaultMessage: "",
            map: [
              { value: 0x00, text: "NO" },
              { value: 0x01, text: "YES" },
            ],
          },
        ],
      },
    },
    {
      kind: "numeric",
      name: "seconds_to_mode_change",
      description: "Seconds to mode change (max 32767).",
      quantity: "Counter",
      scaling: "None",
      signedness: "Signed",
      forceUnit: "COUNTER",
      match: {
        measurementType: "Instantaneous",
        vifRange: "Dimensionless",
        subUnitNr: 3,
      },
    },
    {
      kind: "numeric",
      name: "listen_timer_value",
      description: "Listen timer value.",
      quantity: "Counter",
      scaling: "None",
      signedness: "Signed",
      forceUnit: "COUNTER",
      match: {
        measurementType: "Instantaneous",
        vifRange: "Dimensionless",
        storageNr: 1,
      },
    },
    {
      kind: "numeric",
      name: "pause_timer_value",
      description: "Pause timer value.",
      quantity: "Counter",
      scaling: "None",
      signedness: "Signed",
      forceUnit: "COUNTER",
      match: {
        measurementType: "Instantaneous",
        vifRange: "Dimensionless",
        storageNr: 2,
      },
    },
    {
      kind: "string",
      name: "repeater_listening_on_weekdays",
      description: "Weekdays the repeater is listening (MO/TU/WE/TH/FR/SA/SU).",
      match: {
        measurementType: "Instantaneous",
        vifRange: "Dimensionless",
        storageNr: 3,
      },
      lookup: {
        rules: [
          {
            name: "INPUT_BITS",
            mapType: "BitToString",
            maskBits: 0xffff,
            defaultMessage: "",
            map: [
              { value: 0x01, text: "SU" },
              { value: 0x02, text: "MO" },
              { value: 0x04, text: "TU" },
              { value: 0x08, text: "WE" },
              { value: 0x10, text: "TH" },
              { value: 0x20, text: "FR" },
              { value: 0x40, text: "SA" },
            ],
          },
        ],
      },
    },
    {
      kind: "numeric",
      name: "start_time_value",
      description: "Start-time parameter (minutes after midnight, -1 = unused).",
      quantity: "Counter",
      scaling: "None",
      signedness: "Signed",
      forceUnit: "COUNTER",
      match: {
        measurementType: "Instantaneous",
        vifRange: "Dimensionless",
        storageNr: 4,
      },
    },
    {
      kind: "numeric",
      name: "battery",
      description: "Battery voltage.",
      quantity: "Voltage",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "Voltage" },
    },
  ],
});
