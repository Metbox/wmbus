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
