/*
 * Copyright (C) 2024-2026 Fredrik Öhrström (gpl-3.0-or-later)
 * Copyright (C) 2026 Metbox / @metbox/wmbus contributors (gpl-3.0-or-later)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This file is a TypeScript port of the XMQ driver format used by
 * wmbusmeters (https://wmbusmeters.org). Only the subset needed to
 * express `driver { ... }` definitions is parsed — syntactic features
 * outside that scope (attributes, pi blocks, entity shorthand) are left
 * on the floor.
 */

// Minimal XMQ parser tailored to the wmbusmeters `driver { … }` dialect.
//
// Grammar we accept:
//
//   block   := ident '{' entries '}'
//   entries := (entry | block)*
//   entry   := ident '=' value
//   value   := string | raw-to-end-of-line
//   string  := "'" … "'"            (single quoted, `\` escapes the next char)
//            | "'''" … "'''"        (triple quoted, multi-line, verbatim)
//   raw     := everything until newline / `}` / comment start, trimmed
//
// Comments:  //  line, /* … */ block.

export interface XmqBlock {
  kind: "block";
  name: string;
  entries: XmqNode[];
}

export interface XmqEntry {
  kind: "entry";
  key: string;
  value: string;
}

export type XmqNode = XmqBlock | XmqEntry;

export function parseXmq(source: string): XmqBlock {
  const p = new Parser(source);
  return p.parse();
}

class Parser {
  private i = 0;
  constructor(private readonly src: string) {}

  parse(): XmqBlock {
    this.skipTrivia();
    return this.readBlock();
  }

  private readBlock(): XmqBlock {
    const name = this.readIdent();
    this.skipTrivia();
    this.expect("{");
    const entries: XmqNode[] = [];
    for (;;) {
      this.skipTrivia();
      if (this.peek() === "}") {
        this.i++;
        break;
      }
      if (this.eof()) {
        throw new Error(`parseXmq: unterminated block "${name}"`);
      }
      entries.push(this.readNode());
    }
    return { kind: "block", name, entries };
  }

  private readNode(): XmqNode {
    const ident = this.readIdent();
    this.skipTrivia();
    const ch = this.peek();
    if (ch === "=") {
      this.i++;
      this.skipTriviaInline();
      const value = this.readValue();
      return { kind: "entry", key: ident, value };
    }
    if (ch === "{") {
      this.i++;
      const entries: XmqNode[] = [];
      for (;;) {
        this.skipTrivia();
        if (this.peek() === "}") {
          this.i++;
          break;
        }
        if (this.eof()) {
          throw new Error(`parseXmq: unterminated nested block "${ident}"`);
        }
        entries.push(this.readNode());
      }
      return { kind: "block", name: ident, entries };
    }
    throw new Error(`parseXmq: expected '=' or '{' after "${ident}" at ${this.locate()}`);
  }

  private readIdent(): string {
    const start = this.i;
    while (this.i < this.src.length) {
      const c = this.src[this.i] as string;
      if (/[A-Za-z0-9_-]/.test(c)) this.i++;
      else break;
    }
    if (this.i === start) {
      throw new Error(`parseXmq: expected identifier at ${this.locate()}`);
    }
    return this.src.slice(start, this.i);
  }

  private readValue(): string {
    // Triple-quoted string — content is verbatim until the next `'''`.
    if (this.src.startsWith("'''", this.i)) {
      this.i += 3;
      const start = this.i;
      const end = this.src.indexOf("'''", this.i);
      if (end < 0)
        throw new Error(`parseXmq: unterminated triple-quoted string at ${this.locate()}`);
      this.i = end + 3;
      return this.src.slice(start, end);
    }
    // Single-quoted string.
    if (this.peek() === "'") {
      this.i++;
      let out = "";
      while (this.i < this.src.length) {
        const c = this.src[this.i] as string;
        if (c === "\\" && this.i + 1 < this.src.length) {
          out += this.src[this.i + 1];
          this.i += 2;
          continue;
        }
        if (c === "'") {
          this.i++;
          return out;
        }
        out += c;
        this.i++;
      }
      throw new Error(`parseXmq: unterminated string at ${this.locate()}`);
    }
    // Raw value — read until newline, end-of-block, or comment start.
    const start = this.i;
    while (this.i < this.src.length) {
      const c = this.src[this.i] as string;
      if (c === "\n" || c === "}" || c === "{") break;
      if (c === "/" && (this.src[this.i + 1] === "/" || this.src[this.i + 1] === "*")) break;
      this.i++;
    }
    return this.src.slice(start, this.i).trim();
  }

  private skipTrivia(): void {
    for (;;) {
      while (this.i < this.src.length && /\s/.test(this.src[this.i] as string)) this.i++;
      if (this.src.startsWith("//", this.i)) {
        while (this.i < this.src.length && this.src[this.i] !== "\n") this.i++;
        continue;
      }
      if (this.src.startsWith("/*", this.i)) {
        const end = this.src.indexOf("*/", this.i + 2);
        if (end < 0) {
          this.i = this.src.length;
        } else {
          this.i = end + 2;
        }
        continue;
      }
      break;
    }
  }

  private skipTriviaInline(): void {
    // Skip spaces/tabs only — leave newlines as terminators for raw values.
    while (this.i < this.src.length && (this.src[this.i] === " " || this.src[this.i] === "\t")) {
      this.i++;
    }
  }

  private peek(): string | undefined {
    return this.src[this.i];
  }

  private eof(): boolean {
    return this.i >= this.src.length;
  }

  private expect(ch: string): void {
    if (this.peek() !== ch) {
      throw new Error(`parseXmq: expected '${ch}' at ${this.locate()}`);
    }
    this.i++;
  }

  private locate(): string {
    let line = 1;
    let col = 1;
    for (let k = 0; k < this.i; k++) {
      if (this.src[k] === "\n") {
        line++;
        col = 1;
      } else {
        col++;
      }
    }
    return `line ${line} col ${col}`;
  }
}

// Convenience helpers for querying a parsed tree ---------------------------

/** Return the first `entry` value matching `key`, or undefined. */
export function entryValue(block: XmqBlock, key: string): string | undefined {
  for (const n of block.entries) {
    if (n.kind === "entry" && n.key === key) return n.value;
  }
  return undefined;
}

/** Return every `entry` value matching `key` (in declaration order). */
export function entryValues(block: XmqBlock, key: string): string[] {
  const out: string[] = [];
  for (const n of block.entries) {
    if (n.kind === "entry" && n.key === key) out.push(n.value);
  }
  return out;
}

/** Return the first nested block matching `name`, or undefined. */
export function childBlock(block: XmqBlock, name: string): XmqBlock | undefined {
  for (const n of block.entries) {
    if (n.kind === "block" && n.name === name) return n;
  }
  return undefined;
}

/** Return every nested block matching `name` (in declaration order). */
export function childBlocks(block: XmqBlock, name: string): XmqBlock[] {
  const out: XmqBlock[] = [];
  for (const n of block.entries) {
    if (n.kind === "block" && n.name === name) out.push(n);
  }
  return out;
}
