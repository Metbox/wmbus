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
// Public entry point for @metbox/wmbus.
//
// Keep this module tiny — everything exported here becomes part of the
// package's stable API surface. See `api.ts` for the 3-function WASM-wrapper-
// compatible functions; `drivers/types.ts` exports the types consumers need
// to register a custom driver.
export * from "./api.js";
export type {
  DriverDefinition,
  FieldDefinition,
  FieldMatcher,
  FieldProperty,
  LinkMode,
  MeasurementType,
  MeterType,
  MVT,
  NumericField,
  PostprocessContext,
  PreprocessContext,
  Signedness,
  StringField,
  TranslateEntry,
  TranslateLookup,
  TranslateMapType,
  TranslateRule,
} from "./drivers/types.js";
