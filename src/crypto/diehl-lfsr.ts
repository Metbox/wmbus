// Diehl LFSR descrambler for Izar/PRIOS and Sharky meters.
//
// Verbatim port of `decodeDiehlLfsr()` at manufacturer_specificities.cc:167.
// The algorithm is a 32-bit Galois-style LFSR with taps at bit positions
// 1, 2, 11, and 31 (counting from LSB). For each output byte it shifts
// eight bits through the LFSR and XORs the low 8 bits of the new state
// against the ciphertext byte.
//
// The key derivation and frame-byte selection are quirky enough that we
// copy upstream's positions (`origin[2]`, `origin[6]`, `frame[10]`) to the
// letter — any deviation silently corrupts the output.

export enum DiehlLfsrCheckMethod {
  NONE = 0,
  HEADER_1_BYTE = 1, // first decoded byte must equal 0x4B
  CHECKSUM_AND_0XEF = 2, // final decoded byte sum & 0xEF must equal `checkValue`
}

/** Read a 32-bit big-endian unsigned integer starting at `offset`. */
function uint32Be(data: Uint8Array, offset: number): number {
  // Use >>> 0 to force uint32 semantics (JS numbers are 53-bit IEEE-754).
  return (
    (((data[offset] as number) << 24) |
      ((data[offset + 1] as number) << 16) |
      ((data[offset + 2] as number) << 8) |
      (data[offset + 3] as number)) >>>
    0
  );
}

/**
 * Combine a 16-byte AES master key into the 32-bit LFSR seed Diehl expects.
 * Port of `convertKey(const vector<uchar>&)` at manufacturer_specificities.cc:229.
 */
export function diehlConvertKey(key16: Uint8Array): number {
  if (key16.length < 8) {
    throw new Error(`diehlConvertKey expects at least 8 key bytes (got ${key16.length})`);
  }
  const k1 = uint32Be(key16, 0);
  const k2 = uint32Be(key16, 4);
  return (k1 ^ k2) >>> 0;
}

/**
 * Descramble `frame` with the Diehl LFSR, using the given seed `key` and the
 * telegram header bytes supplied in `origin`.
 *
 * Returns the decoded payload (length = frame.length - 15), or an empty
 * Uint8Array when the optional check fails.
 */
export function decodeDiehlLfsr(
  origin: Uint8Array,
  frame: Uint8Array,
  key: number,
  checkMethod: DiehlLfsrCheckMethod = DiehlLfsrCheckMethod.NONE,
  checkValue = 0,
): Uint8Array {
  if (origin.length < 10 || frame.length < 15) {
    throw new Error("decodeDiehlLfsr: origin/frame too short for Diehl header mixing");
  }

  // Initial seed is perturbed by (M+A[0-1]), (A[2-3]+V+T), and (CI + frame[11..14]).
  // Port of manufacturer_specificities.cc:170-172.
  let k = key >>> 0;
  k = (k ^ uint32Be(origin, 2)) >>> 0;
  k = (k ^ uint32Be(origin, 6)) >>> 0;
  k = (k ^ uint32Be(frame, 10)) >>> 0;

  const size = frame.length - 15;
  const decoded = new Uint8Array(size);

  for (let i = 0; i < size; i++) {
    // Shift 8 bits through the LFSR before emitting one output byte.
    for (let j = 0; j < 8; j++) {
      // Bits to XOR (taps): bit 1 (0x2), bit 2 (0x4), bit 11 (0x800),
      // bit 31 (0x80000000) — layout from manufacturer_specificities.cc:182.
      const bit =
        ((k & 0x2) !== 0 ? 1 : 0) ^
        ((k & 0x4) !== 0 ? 1 : 0) ^
        ((k & 0x800) !== 0 ? 1 : 0) ^
        ((k & 0x80000000) !== 0 ? 1 : 0);
      k = (((k << 1) >>> 0) | bit) >>> 0;
    }
    decoded[i] = ((frame[i + 15] as number) ^ (k & 0xff)) & 0xff;

    // Early-out checks — identical to upstream's in-loop behaviour.
    if (checkMethod === DiehlLfsrCheckMethod.HEADER_1_BYTE) {
      if ((decoded[0] as number) !== 0x4b) {
        return new Uint8Array(0);
      }
    } else if (checkMethod === DiehlLfsrCheckMethod.CHECKSUM_AND_0XEF && i === size - 1) {
      let checksum = 0;
      for (let idx = 0; idx < size; idx++) {
        checksum = (checksum + (decoded[idx] as number)) & 0xffffffff;
      }
      if ((checksum & 0xef) !== checkValue) {
        return new Uint8Array(0);
      }
    }
  }

  return decoded;
}
