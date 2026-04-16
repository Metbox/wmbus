// Translate rules — port of the relevant pieces of translatebits.cc.
//
// A StringField's `lookup` is a list of rules; each rule consumes the raw
// integer value of its matched DVEntry, applies an optional mask, and picks
// a string either by bit-inspection (BitToString) or exact lookup (IndexToString).
//
// When multiple rules fire, upstream concatenates their outputs with a space
// and a trimmed trailing space is removed. We do the same so fixture output
// matches byte-for-byte.

import type { TranslateLookup, TranslateRule } from "./types.js";

/**
 * Apply a TranslateLookup to a raw integer value. Returns the resulting
 * display string (possibly empty).
 */
export function applyLookup(value: number, lookup: TranslateLookup): string {
  const parts: string[] = [];
  for (const rule of lookup.rules) {
    const chunk = applyRule(value, rule);
    if (chunk !== null) parts.push(chunk);
  }
  // Upstream joins rule outputs with a space and drops empties.
  const nonEmpty = parts.filter((p) => p.length > 0);
  const joined = nonEmpty.join(" ");
  return sortStatusString(joined);
}

/**
 * Tokenise on spaces, sort alphabetically, dedupe, then replace `~` with
 * space. Mirrors `sortStatusString` in upstream util.cc:2158.
 */
export function sortStatusString(input: string): string {
  if (input.length === 0) return input;
  const tokens = new Set<string>();
  for (const token of input.split(" ")) {
    if (token.length > 0) tokens.add(token);
  }
  const sorted = Array.from(tokens).sort();
  return sorted.join(" ").replace(/~/g, " ");
}

function applyRule(rawValue: number, rule: TranslateRule): string | null {
  const mask = rule.maskBits ?? 0xffffffff;
  const masked = rawValue & mask;

  if (rule.mapType === "IndexToString") {
    for (const entry of rule.map) {
      if ((entry.value & mask) === masked) return entry.text;
    }
    return rule.defaultMessage ?? "";
  }

  if (rule.mapType === "BitToString") {
    const flags: string[] = [];
    let remaining = masked;
    for (const entry of rule.map) {
      if ((masked & entry.value) === entry.value && entry.value !== 0) {
        flags.push(entry.text);
        remaining &= ~entry.value;
      }
    }
    // Upstream: any bits set after map traversal get a `<rule_name>_<hex>`
    // label so the caller sees the unmapped bits instead of silently dropping
    // them. Matches handleBitToString in translatebits.cc:86.
    if (remaining !== 0) {
      flags.push(`${rule.name}_${remaining.toString(16).toUpperCase()}`);
    }
    if (flags.length === 0) {
      return rule.defaultMessage ?? "";
    }
    return flags.join(" ");
  }

  if (rule.mapType === "DecimalsToString") {
    // Rarely used — fall back to the default message so we don't mis-decode.
    return rule.defaultMessage ?? "";
  }

  return null;
}
