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
// "auto" driver — dispatcher used when no explicit driver name is given.
//
// Behaviour matches upstream's Unknown/auto meter: for a given MVT triple,
// try to find a real driver. If none matches, fall through to a minimal
// output that exposes just the effective id + media.
//
// The no-driver fallback intentionally *doesn't* emit any numeric fields —
// Metbox's auto-discovery path stores the raw `decoded` object which is then
// re-processed later once a real driver is assigned.

import type { DVEntry } from "../data/dv-parser.js";
import { type InterpretContext, interpret } from "./interpreter.js";
import { lookupDriverByMVT } from "./registry.js";
import { findSimilarDriver } from "./similar.js";
import type { DriverDefinition, MVT } from "./types.js";

export interface AutoContext extends InterpretContext {
  /** (manufacturer, version, type) triple to look up a real driver. */
  mvt: MVT;
}

/** Produce the minimal output object when we can't pick a real driver. */
function minimalOutput(ctx: AutoContext): Record<string, unknown> {
  const out: Record<string, unknown> = {
    _: "telegram",
    media: ctx.media,
    meter: "auto",
  };
  if (ctx.meterName !== undefined) out.name = ctx.meterName;
  out.id = ctx.id;
  out.timestamp = ctx.timestampOverride ?? new Date().toISOString().replace(/\..*/, "Z");
  return out;
}

/**
 * Run the auto driver against a DVEntry list. If a driver matches the MVT,
 * use it; otherwise fall back to the minimal output.
 */
export function runAutoDriver(dvEntries: DVEntry[], ctx: AutoContext): Record<string, unknown> {
  const resolved = lookupDriverByMVT(ctx.mvt);
  if (resolved) return interpret(resolved, dvEntries, ctx);
  // No exact MVT match. Score every declarative driver against the DV payload
  // and pick the one that covers the most bytes — upstream calls this
  // "Similar driver" in analyze mode.
  const similar = findSimilarDriver(dvEntries);
  if (similar) return interpret(similar.driver, dvEntries, ctx);
  return minimalOutput(ctx);
}

// Re-export so the auto path can be used without directly importing registry.
export { lookupDriverByMVT, type DriverDefinition };
