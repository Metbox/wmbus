// Library fields — the canonical field definitions that most drivers inherit
// verbatim via XMQ's `library { use = <name> }` or upstream's
// `addOptionalLibraryFields(...)`.
//
// Rather than copy-pasting the same FieldDefinition across 80 drivers, a
// driver declares `libraryFields: ["total_m3", "meter_datetime", …]` in its
// DriverDefinition. The interpreter looks each name up here and prepends the
// resolved FieldDefinition to the driver's explicit field list (explicit
// fields override library fields with the same key).
//
// This is a port of the relevant `addOptionalLibraryFields` cases in
// meters.cc:2908 — ~35 standard fields total. Phase 6 implements the ones
// Wave A drivers depend on; later waves can extend.

import type { FieldDefinition } from "./types.js";

const LIBRARY: Readonly<Record<string, FieldDefinition>> = Object.freeze({
  total_m3: {
    kind: "numeric",
    name: "total",
    description: "The total water/gas/etc consumption recorded by this meter.",
    quantity: "Volume",
    scaling: "Auto",
    signedness: "Signed",
    match: { measurementType: "Instantaneous", vifRange: "Volume" },
  },

  total_backward_m3: {
    kind: "numeric",
    name: "total_backward",
    description: "The total backward flow recorded (reverse direction).",
    quantity: "Volume",
    scaling: "Auto",
    signedness: "Signed",
    match: {
      measurementType: "Instantaneous",
      vifRange: "Volume",
      // VIFCombinable "BackwardFlow" = 0x3c per LIST_OF_VIF_COMBINABLES.
      vifCombinables: [0x3c],
    },
  },

  volume_flow_m3h: {
    kind: "numeric",
    name: "volume_flow",
    description: "The current flow of water/gas/etc.",
    quantity: "Flow",
    scaling: "Auto",
    signedness: "Signed",
    match: { measurementType: "Instantaneous", vifRange: "VolumeFlow" },
  },

  flow_temperature_c: {
    kind: "numeric",
    name: "flow_temperature",
    description: "The supply (flow) temperature.",
    quantity: "Temperature",
    scaling: "Auto",
    signedness: "Signed",
    match: { measurementType: "Instantaneous", vifRange: "FlowTemperature" },
  },

  return_temperature_c: {
    kind: "numeric",
    name: "return_temperature",
    description: "The return temperature.",
    quantity: "Temperature",
    scaling: "Auto",
    signedness: "Signed",
    match: { measurementType: "Instantaneous", vifRange: "ReturnTemperature" },
  },

  external_temperature_c: {
    kind: "numeric",
    name: "external_temperature",
    description: "The external (ambient) temperature.",
    quantity: "Temperature",
    scaling: "Auto",
    signedness: "Signed",
    match: { measurementType: "Instantaneous", vifRange: "ExternalTemperature" },
  },

  flow_return_temperature_difference_c: {
    kind: "numeric",
    name: "flow_return_temperature_difference",
    description: "The difference between supply and return temperatures.",
    quantity: "Temperature",
    scaling: "Auto",
    signedness: "Signed",
    match: { measurementType: "Instantaneous", vifRange: "TemperatureDifference" },
  },

  on_time_h: {
    kind: "numeric",
    name: "on_time",
    description: "How long the meter has been powered on.",
    quantity: "Time",
    scaling: "Auto",
    signedness: "Unsigned",
    match: { measurementType: "Instantaneous", vifRange: "OnTime" },
  },

  operating_time_h: {
    kind: "numeric",
    name: "operating_time",
    description: "How long the meter has been actively measuring.",
    quantity: "Time",
    scaling: "Auto",
    signedness: "Unsigned",
    match: { measurementType: "Instantaneous", vifRange: "OperatingTime" },
  },

  on_time_at_error_h: {
    kind: "numeric",
    name: "on_time_at_error",
    description: "Accumulated on-time while in an error state.",
    quantity: "Time",
    scaling: "Auto",
    signedness: "Unsigned",
    match: {
      measurementType: "AtError",
      vifRange: "OnTime",
    },
  },

  actuality_duration_s: {
    kind: "numeric",
    name: "actuality_duration",
    description: "Age of the data (how long ago was it measured).",
    quantity: "Time",
    scaling: "Auto",
    signedness: "Unsigned",
    match: { measurementType: "Instantaneous", vifRange: "ActualityDuration" },
    forceUnit: "Second",
  },

  meter_datetime: {
    kind: "string",
    name: "meter_datetime",
    description: "The meter's own clock.",
    match: { measurementType: "Instantaneous", vifRange: "DateTime" },
  },

  meter_date: {
    kind: "string",
    name: "meter_date",
    description: "The meter's own date.",
    match: { measurementType: "Instantaneous", vifRange: "Date" },
  },

  fabrication_no: {
    kind: "string",
    name: "fabrication_no",
    description: "Fabrication number (factory-assigned serial).",
    match: { measurementType: "Instantaneous", vifRange: "FabricationNo" },
  },

  target_m3: {
    kind: "numeric",
    name: "target",
    description: "Total volume at the end of the previous billing period.",
    quantity: "Volume",
    scaling: "Auto",
    signedness: "Signed",
    match: {
      measurementType: "Instantaneous",
      vifRange: "Volume",
      storageNr: 1,
    },
  },

  target_date: {
    kind: "string",
    name: "target_date",
    description: "Date at the end of the previous billing period.",
    match: {
      measurementType: "Instantaneous",
      vifRange: "Date",
      storageNr: 1,
    },
  },

  target_datetime: {
    kind: "string",
    name: "target_datetime",
    description: "Datetime at the end of the previous billing period.",
    match: {
      measurementType: "Instantaneous",
      vifRange: "DateTime",
      storageNr: 1,
    },
  },

  at_date: {
    kind: "string",
    name: "at_date",
    description: "Date the snapshot value was recorded.",
    match: { measurementType: "Instantaneous", vifRange: "Date", storageNr: 1 },
  },

  total_at_date_m3: {
    kind: "numeric",
    name: "total_at_date",
    description: "Total volume at snapshot date.",
    quantity: "Volume",
    scaling: "Auto",
    signedness: "Signed",
    match: { measurementType: "Instantaneous", vifRange: "Volume", storageNr: 1 },
  },

  customer: {
    kind: "string",
    name: "customer",
    description: "Customer field.",
    match: { measurementType: "Instantaneous", vifRange: "Customer" },
  },

  consumption_hca: {
    kind: "numeric",
    name: "consumption",
    description: "Heat cost allocation reading.",
    quantity: "HCA",
    scaling: "Auto",
    signedness: "Signed",
    match: { measurementType: "Instantaneous", vifRange: "HeatCostAllocation" },
  },

  target_hca: {
    kind: "numeric",
    name: "target",
    description: "Heat cost allocation at last billing date.",
    quantity: "HCA",
    scaling: "Auto",
    signedness: "Signed",
    match: {
      measurementType: "Instantaneous",
      vifRange: "HeatCostAllocation",
      storageNr: 1,
    },
  },

  parameter_set: {
    kind: "string",
    name: "parameter_set",
    description: "Parameter set identifier.",
    match: { measurementType: "Instantaneous", vifRange: "ParameterSet" },
  },

  software_version: {
    kind: "string",
    name: "software_version",
    description: "Software version of the meter firmware.",
    match: { measurementType: "Instantaneous", vifRange: "SoftwareVersion" },
  },

  hardware_version: {
    kind: "string",
    name: "hardware_version",
    description: "Hardware version of the meter.",
    match: { measurementType: "Instantaneous", vifRange: "HardwareVersion" },
  },

  firmware_version: {
    kind: "string",
    name: "firmware_version",
    description: "Firmware version of the meter.",
    match: { measurementType: "Instantaneous", vifRange: "FirmwareVersion" },
  },

  model_version: {
    kind: "string",
    name: "model_version",
    description: "Model version of the meter.",
    match: { measurementType: "Instantaneous", vifRange: "ModelVersion" },
  },
});

/**
 * Resolve a library-field name to its FieldDefinition. Returns `null` if the
 * name isn't recognised (Phase 6 extends the table as needed; other waves
 * won't blow up — the field is simply omitted).
 */
export function libraryField(name: string): FieldDefinition | null {
  // Strip any `|…` display-unit suffix (XMQ syntax: `meter_date|(…)`) —
  // those are presentation-only hints upstream uses for its plain-text trace.
  const core = name.split("|")[0]?.trim() ?? name;
  return LIBRARY[core] ?? null;
}

/** Used only in tests — full list of library field names. */
export function listLibraryFields(): string[] {
  return Object.keys(LIBRARY).sort();
}
