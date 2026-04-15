// wM-Bus address (A-field) decoding.
//
// The A-field in the DLL is 6 bytes: 4-byte BCD id (little-endian on the wire)
// followed by 1 byte version and 1 byte device type. On-wire byte order is
// reversed for display — `99 87 34 76` becomes id `"76348799"`.

/**
 * Reverse the 4-byte wire id into its display-string form. Each byte is
 * rendered as two hex digits — this keeps id strings BCD-compatible while
 * still representing the handful of meters that use binary (non-BCD) ids.
 */
export function decodeId(idBytes: Uint8Array, offset = 0): string {
  if (idBytes.length < offset + 4) {
    throw new RangeError(`id requires 4 bytes from offset ${offset}`);
  }
  let out = "";
  // Iterate in reverse: wire stores LSB first, display shows MSB first.
  for (let i = 3; i >= 0; i--) {
    out += (idBytes[offset + i] as number).toString(16).padStart(2, "0");
  }
  return out;
}

/**
 * Placeholder for Diehl / manufacturer-specific address swapping. The full
 * transform lands alongside the Diehl preprocessor in Phase 3; for now this
 * is the identity function so Phase 1 can wire up the pipeline end-to-end.
 */
export function maybeSwapAddress(address: Uint8Array, _mfct: number): Uint8Array {
  return address;
}
