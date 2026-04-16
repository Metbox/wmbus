// Qundis QSmoke smoke detector driver.
//
// Port of vendor/wmbusmeters@af48083/src/driver_qsmoke.cc.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

const QDS = flagToManufacturer("QDS");

export const qsmoke = defineDriver({
  name: "qsmoke",
  meterType: "SmokeDetector",
  linkModes: ["T1"],
  mvt: [
    { manufacturer: QDS, version: 0x1a, type: 0x21 },
    { manufacturer: QDS, version: 0x1a, type: 0x23 },
  ],
  defaultFields: "name,id,status,last_alarm_date,alarm_counter,timestamp",
  fields: [
    {
      kind: "string",
      name: "status",
      description: "Meter error flags.",
      properties: ["STATUS", "INCLUDE_TPL_STATUS"],
      match: { measurementType: "Instantaneous", vifRange: "ErrorFlags" },
      lookup: {
        rules: [
          {
            name: "ERROR_FLAGS",
            mapType: "BitToString",
            maskBits: 0xffff,
            defaultMessage: "OK",
            map: [],
          },
        ],
      },
    },
    {
      kind: "string",
      name: "last_alarm_date",
      description: "Date of last smoke alarm.",
      match: { measurementType: "Instantaneous", vifRange: "Date", storageNr: 6 },
    },
    {
      kind: "numeric",
      name: "alarm",
      description: "Number of times the smoke alarm triggered.",
      quantity: "Counter",
      scaling: "None",
      signedness: "Unsigned",
      forceUnit: "COUNTER",
      match: { difVifKey: "81037C034C4123" },
    },
    {
      kind: "string",
      name: "message_datetime",
      description: "Device datetime.",
      match: { measurementType: "Instantaneous", vifRange: "DateTime" },
    },
    {
      kind: "string",
      name: "test_button_last_date",
      description: "Date of last test button press.",
      match: { measurementType: "Instantaneous", vifRange: "Date", storageNr: 4 },
    },
    {
      kind: "numeric",
      name: "test_button",
      description: "Number of test button presses.",
      quantity: "Counter",
      scaling: "None",
      signedness: "Signed",
      forceUnit: "COUNTER",
      match: { difVifKey: "81027C03495523" },
    },
    {
      kind: "numeric",
      name: "transmission",
      description: "Transmission counter.",
      quantity: "Counter",
      scaling: "None",
      signedness: "Unsigned",
      forceUnit: "COUNTER",
      match: { measurementType: "Instantaneous", vifRange: "AccessNumber" },
    },
    {
      kind: "string",
      name: "at_error_date",
      description: "Date of last error.",
      match: { measurementType: "AtError", vifRange: "Date" },
    },
    {
      kind: "numeric",
      name: "some_sort_of_duration",
      description: "Unknown duration counter.",
      quantity: "Time",
      scaling: "Auto",
      signedness: "Signed",
      match: { difVifKey: "02FDAC7E" },
    },
  ],
});
