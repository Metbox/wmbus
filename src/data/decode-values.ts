// Raw value decoders for DVEntry data blocks.
//
// These are the low-level primitives used by the interpreter / driver layer
// (Phase 5) to pull numeric and string data out of the raw byte arrays
// produced by the dv-parser.
//
// Ports of the relevant `extractDVuint*`, `extractDouble`, BCD, date decoders
// in dvparser.cc + meters.cc.

/**
 * Little-endian unsigned integer of 1-8 bytes.
 */
export function readLeUint(data: Uint8Array, length: number): number {
  if (length < 1 || length > 8) {
    throw new Error(`readLeUint: length must be 1-8 (got ${length})`);
  }
  if (data.length < length) {
    throw new Error(`readLeUint: need ${length} bytes, got ${data.length}`);
  }
  if (length <= 6) {
    // JS numbers are IEEE-754 doubles — safe up to 2^53, so 6 bytes (48 bits)
    // always fit. 7/8-byte ints are handled via BigInt below to preserve precision.
    let out = 0;
    for (let i = length - 1; i >= 0; i--) {
      out = out * 256 + (data[i] as number);
    }
    return out;
  }
  let out = 0n;
  for (let i = length - 1; i >= 0; i--) {
    out = (out << 8n) + BigInt(data[i] as number);
  }
  // Number() is allowed to lose precision above 2^53 — for wM-Bus values
  // that's essentially never, but callers that need BigInt use readLeBigUint.
  return Number(out);
}

/** Little-endian unsigned integer as BigInt — preserves precision for 7/8-byte fields. */
export function readLeBigUint(data: Uint8Array, length: number): bigint {
  if (data.length < length) {
    throw new Error(`readLeBigUint: need ${length} bytes, got ${data.length}`);
  }
  let out = 0n;
  for (let i = length - 1; i >= 0; i--) {
    out = (out << 8n) + BigInt(data[i] as number);
  }
  return out;
}

/**
 * Signed integer of 1-8 bytes (two's complement, little-endian).
 */
export function readLeInt(data: Uint8Array, length: number): number {
  const u = readLeUint(data, length);
  // `1 << 31` is negative in JS (32-bit signed). Use 2**… to stay positive.
  const signBit = 2 ** (length * 8 - 1);
  if (length < 6 && u >= signBit) {
    return u - 2 * signBit;
  }
  if (length >= 6) {
    // For 6-8 byte signed: compute via BigInt and narrow back.
    const bu = readLeBigUint(data, length);
    const mask = 1n << BigInt(length * 8 - 1);
    if ((bu & mask) !== 0n) {
      return Number(bu - (mask << 1n));
    }
    return Number(bu);
  }
  return u;
}

/**
 * BCD integer decode (little-endian nibbles).
 *
 * wM-Bus BCD uses a quirky convention where `0xFFF…` is the "invalid" marker
 * and the high nibble of the most-significant byte can be 0xF to denote a
 * negative number (e.g. `0xF1 0x23 = -123`). We return `NaN` on the invalid
 * pattern and negate the result when the top nibble is 0xF.
 */
export function readBcd(data: Uint8Array, length: number): number {
  if (data.length < length) {
    throw new Error(`readBcd: need ${length} bytes, got ${data.length}`);
  }
  // Invalid marker: every nibble = 0xF except we still accept leading 0xF
  // as a sign flag, so treat "all 0xFF" as invalid.
  let allF = true;
  for (let i = 0; i < length; i++) {
    if (data[i] !== 0xff) {
      allF = false;
      break;
    }
  }
  if (allF) return Number.NaN;

  let result = 0;
  let negative = false;

  for (let i = length - 1; i >= 0; i--) {
    const byte = data[i] as number;
    const hi = (byte >>> 4) & 0x0f;
    const lo = byte & 0x0f;

    // Negative-sign marker on the top nibble of the MSB.
    if (i === length - 1 && hi === 0x0f) {
      negative = true;
      result = result * 10 + lo;
      continue;
    }

    // Any other 0xF nibble makes the whole number invalid (per upstream).
    if (hi > 9 || lo > 9) return Number.NaN;

    result = result * 100 + hi * 10 + lo;
  }

  return negative ? -result : result;
}

/**
 * IEEE 754 single-precision float (little-endian).
 */
export function readReal32(data: Uint8Array): number {
  if (data.length < 4) {
    throw new Error(`readReal32: need 4 bytes, got ${data.length}`);
  }
  const buf = new ArrayBuffer(4);
  const view = new DataView(buf);
  view.setUint8(0, data[0] as number);
  view.setUint8(1, data[1] as number);
  view.setUint8(2, data[2] as number);
  view.setUint8(3, data[3] as number);
  return view.getFloat32(0, true); // little-endian
}

/**
 * Date decode — wM-Bus type G (2-byte date, day-month-year).
 *
 * Layout (from EN 13757-3 Annex A.2):
 *   byte 0: bits 0-4  = day (1-31)
 *           bits 5-7  = year bits 4-6
 *   byte 1: bits 0-3  = month (1-12)
 *           bits 4-7  = year bits 0-3
 *
 * Years are offset from 2000 (so year 0..127 maps to 2000..2127).
 *
 * Returns an ISO date string `"YYYY-MM-DD"`, or the upstream sentinel
 * `"2127-15-31"` when all bits are 1 (meter reports no date).
 */
export function readDateTypeG(data: Uint8Array): string {
  if (data.length < 2) {
    throw new Error(`readDateTypeG: need 2 bytes, got ${data.length}`);
  }
  const b0 = data[0] as number;
  const b1 = data[1] as number;
  const day = b0 & 0x1f;
  const month = b1 & 0x0f;
  const year = (((b0 & 0xe0) >>> 5) | ((b1 & 0xf0) >>> 1)) + 2000;

  // Upstream's "invalid date" marker: everything 0x7F/0xFF-ish. Keep the same
  // literal so fixtures match.
  if (b0 === 0xff && b1 === 0xff) return "2127-15-31";

  return `${year}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
}

/**
 * Datetime decode — wM-Bus type F (4-byte datetime).
 *
 * Layout (EN 13757-3 Annex A.1):
 *   byte 0 bits 0-5   minute (0-59)
 *          bit  7     invalid flag
 *   byte 1 bits 0-4   hour (0-23)
 *          bits 5-6   timezone-related bits (ignored)
 *   byte 2 bits 0-4   day (1-31)
 *          bits 5-7   year bits 4-6
 *   byte 3 bits 0-3   month (1-12)
 *          bits 4-7   year bits 0-3
 *
 * Returns `"YYYY-MM-DD HH:MM"` matching upstream's JSON format.
 */
export function readDateTimeTypeF(data: Uint8Array): string {
  if (data.length < 4) {
    throw new Error(`readDateTimeTypeF: need 4 bytes, got ${data.length}`);
  }
  const minute = (data[0] as number) & 0x3f;
  const hour = (data[1] as number) & 0x1f;
  const day = (data[2] as number) & 0x1f;
  const month = (data[3] as number) & 0x0f;
  const year = ((((data[2] as number) & 0xe0) >>> 5) | (((data[3] as number) & 0xf0) >>> 1)) + 2000;

  if ((data[0] as number) === 0xff && (data[1] as number) === 0xff) {
    return "2127-15-31 31:63";
  }

  const dd = day.toString().padStart(2, "0");
  const mm = month.toString().padStart(2, "0");
  const hh = hour.toString().padStart(2, "0");
  const min = minute.toString().padStart(2, "0");
  return `${year}-${mm}-${dd} ${hh}:${min}`;
}

/**
 * Datetime decode — wM-Bus type I (6-byte datetime with seconds precision).
 *
 * Same layout as Type F but with an extra second-byte at offset 0. Layout:
 *
 *   byte 0:  second (0-59) + bit 7 invalid flag
 *   byte 1:  minute (0-59)
 *   byte 2:  hour (0-23) + timezone bits
 *   byte 3:  day (1-31) + year bits (high 3 shifted into bits 5-7)
 *   byte 4:  month (1-12) + year bits (low 4 shifted into bits 4-7)
 *   byte 5:  weekday (ignored)
 *
 * Returns `"YYYY-MM-DD HH:MM:SS"`.
 */
export function readDateTimeTypeI(data: Uint8Array): string {
  if (data.length < 6) {
    throw new Error(`readDateTimeTypeI: need 6 bytes, got ${data.length}`);
  }
  const second = (data[0] as number) & 0x3f;
  const minute = (data[1] as number) & 0x3f;
  const hour = (data[2] as number) & 0x1f;
  const day = (data[3] as number) & 0x1f;
  const month = (data[4] as number) & 0x0f;
  const year =
    ((((data[3] as number) & 0xe0) >>> 5) | (((data[4] as number) & 0xf0) >>> 1)) + 2000;

  if ((data[0] as number) === 0xff && (data[1] as number) === 0xff) {
    return "2127-15-31 31:63:63";
  }

  const dd = day.toString().padStart(2, "0");
  const mm = month.toString().padStart(2, "0");
  const hh = hour.toString().padStart(2, "0");
  const mi = minute.toString().padStart(2, "0");
  const ss = second.toString().padStart(2, "0");
  return `${year}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}

/**
 * Hex-string decode — the raw byte run rendered as uppercase hex. Used for
 * fabrication numbers and manufacturer-specific blobs.
 */
export function readHexString(data: Uint8Array): string {
  let out = "";
  for (const b of data) {
    out += (b >>> 4).toString(16);
    out += (b & 0x0f).toString(16);
  }
  return out;
}

/**
 * Readable ASCII decode. Upstream's `extractReadableString` does this:
 * - integer/binary DIFs (0x1-0x7, 0xD): if the bytes are "likely ASCII"
 *   (all printable), reverse them and return as ASCII; otherwise render
 *   as reversed hex (equivalent to upstream's `reverseBCD`).
 *
 * Single-byte values (e.g. model_version 0x01 → "01") hit the non-ASCII
 * branch and come back as padded hex. Pass `reverse=false` for the
 * `extractReadableStringReversed` variant which always tries ASCII.
 */
export function readReadableString(data: Uint8Array, reverse = true): string {
  if (reverse) {
    if (isLikelyAscii(data)) {
      const bytes = Array.from(data).reverse();
      return bytes.map((b) => String.fromCharCode(b)).join("");
    }
    // Non-ASCII → reversed hex (upstream's reverseBCD on hex string).
    let out = "";
    for (let i = data.length - 1; i >= 0; i--) {
      const b = data[i] as number;
      out += b.toString(16).padStart(2, "0");
    }
    return out;
  }
  // Non-reversed variant: keep wire order, best-effort ASCII, else '?'.
  return Array.from(data)
    .map((b) => (b >= 0x20 && b < 0x7f ? String.fromCharCode(b) : "?"))
    .join("");
}

/** True if every byte is printable ASCII (matches upstream `isLikelyAscii`). */
function isLikelyAscii(data: Uint8Array): boolean {
  if (data.length === 0) return false;
  for (const b of data) {
    if (b < 0x20 || b >= 0x7f) return false;
  }
  return true;
}
