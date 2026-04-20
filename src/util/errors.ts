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
// Error types used across the decode pipeline.

import { bytesToHex } from "./hex.js";

/** Thrown when a telegram can't be parsed — includes frame context for debugging. */
export class DecodeError extends Error {
  readonly stage: string;
  readonly frame: Uint8Array | null;
  readonly offset: number | null;

  constructor(stage: string, message: string, opts: { frame?: Uint8Array; offset?: number } = {}) {
    let suffix = "";
    if (opts.frame) {
      const hex = bytesToHex(opts.frame);
      const snippet = hex.length > 60 ? `${hex.slice(0, 60)}…` : hex;
      suffix = ` (frame=${snippet}`;
      if (opts.offset != null) suffix += ` offset=${opts.offset}`;
      suffix += ")";
    }
    super(`[${stage}] ${message}${suffix}`);
    this.name = "DecodeError";
    this.stage = stage;
    this.frame = opts.frame ?? null;
    this.offset = opts.offset ?? null;
  }
}
