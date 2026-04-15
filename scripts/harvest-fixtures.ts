// Extracts golden-file parity fixtures from the upstream wmbusmeters source
// tree checked into `vendor/wmbusmeters@af48083/` and writes them as typed JSON
// to `test/fixtures/upstream.json`.
//
// Sources harvested:
//   1. `// Test:` comment blocks at the top of each `src/driver_*.cc` file.
//   2. `telegram=|...|\n<expected_json>` pairs in `simulations/simulation_*.txt`.
//   3. `tests { test { args=..., telegram=..., json=... } }` blocks in
//      `drivers/src/*.xmq` — these cover 29 drivers (iperl, kamheat, apator162,
//      apator08, sensostar, …) that Metbox depends on but which live in the
//      XMQ system rather than the static C++ driver tree.
//
// Each record in the output is one (hex, expected) pair — `// Test:` headers
// and `tests { … }` blocks that cover N telegrams expand to N records sharing
// the same driver/name/id/key.

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const VENDOR_ROOT = join(REPO_ROOT, "vendor", "wmbusmeters@af48083");
const DRIVERS_DIR = join(VENDOR_ROOT, "src");
const SIMS_DIR = join(VENDOR_ROOT, "simulations");
const XMQ_DRIVERS_DIR = join(VENDOR_ROOT, "drivers", "src");
const OUT = join(REPO_ROOT, "test", "fixtures", "upstream.json");

export interface FixtureRecord {
  /** Where the fixture came from (filename). */
  source: string;
  /** Driver name used by wmbusmeters — e.g. "multical21". */
  driver: string;
  /** Meter configuration name used in the test. */
  name: string;
  /** Meter ID (BCD, as hex string). */
  id: string;
  /** 32-hex AES-128 key, or "NOKEY" when the telegram is unencrypted. */
  key: string;
  /** Raw telegram hex exactly as upstream writes it — may contain `_` separators. */
  hex: string;
  /** Expected JSON output, as a parsed object. */
  expected: Record<string, unknown>;
}

/** Extract every `// Test: ...` block from a driver source file. */
function harvestDriverFile(path: string): FixtureRecord[] {
  const source = path.split("/").pop() ?? path;
  const lines = readFileSync(path, "utf8").split("\n");
  const records: FixtureRecord[] = [];

  // Parser state — once a `// Test:` header is seen, subsequent `// telegram=`
  // and `// {json}` lines belong to that header until we hit something that
  // isn't a comment line (blank or code).
  let currentHeader: { driver: string; name: string; id: string; key: string } | null = null;
  let pendingHex: string | null = null;

  const headerRe = /^\/\/ Test:\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s*$/;
  // Upstream writes `// telegram=|AABB…|`. Some fixtures embed `|` as a
  // readability separator *inside* the telegram (e.g. `|DLL|TPL|`), so a
  // greedy match across all inner pipes is required. A few files also omit
  // the delimiters entirely and use a bare hex token.
  const telegramRe = /^\/\/\s*telegram=(?:\|(.+)\||(\S+))/;
  const jsonRe = /^\/\/\s*(\{.*\})\s*$/;

  for (const line of lines) {
    const headerMatch = headerRe.exec(line);
    if (headerMatch) {
      currentHeader = {
        name: headerMatch[1] as string,
        driver: headerMatch[2] as string,
        id: headerMatch[3] as string,
        key: headerMatch[4] as string,
      };
      pendingHex = null;
      continue;
    }

    // Once we leave the comment-block world, reset. Plain-text `//` comment
    // lines we don't recognise just fall through without resetting.
    if (!line.startsWith("//")) {
      // Blank line inside a test block is common (between telegrams); only
      // reset the hex pairing buffer, not the header — same header can cover
      // multiple blank-separated telegram pairs.
      pendingHex = null;
      continue;
    }

    if (!currentHeader) continue;

    const telegramMatch = telegramRe.exec(line);
    if (telegramMatch) {
      pendingHex = (telegramMatch[1] ?? telegramMatch[2]) as string;
      continue;
    }

    const jsonMatch = jsonRe.exec(line);
    if (jsonMatch && pendingHex) {
      let expected: Record<string, unknown>;
      try {
        expected = JSON.parse(jsonMatch[1] as string) as Record<string, unknown>;
      } catch (err) {
        throw new Error(
          `${source}: failed to parse expected JSON for telegram ${pendingHex.slice(0, 24)}…\n  ${(err as Error).message}`,
        );
      }
      // Some driver files group multiple Test headers under a single block,
      // or put a second telegram under a `// Comment:` divider that belongs
      // to a previous Test. Trust the JSON as the source of truth for id /
      // name / media — the header is just a hint.
      const jsonId = stringField(expected, "id") ?? currentHeader.id;
      const jsonName = stringField(expected, "name") ?? currentHeader.name;
      const jsonDriver = stringField(expected, "meter") ?? currentHeader.driver;
      records.push({
        source,
        driver: jsonDriver,
        name: jsonName,
        id: jsonId,
        key: currentHeader.key,
        hex: pendingHex,
        expected,
      });
      pendingHex = null;
    }
  }

  return records;
}

/** Extract every telegram/expected pair from a simulation file. */
function harvestSimFile(path: string): FixtureRecord[] {
  const source = path.split("/").pop() ?? path;
  const lines = readFileSync(path, "utf8").split("\n");
  const records: FixtureRecord[] = [];

  // Simulation files embed the same `|`-as-readability-separator convention
  // that driver .cc `// Test:` blocks use. Match greedily across all inner
  // pipes — hexToBytes strips them out downstream.
  const telegramRe = /^telegram=\|(.+)\|/;

  let pendingHex: string | null = null;

  for (const line of lines) {
    // Skip shell-style comments and blanks.
    if (line.length === 0 || line.startsWith("#")) {
      pendingHex = null;
      continue;
    }

    const telegramMatch = telegramRe.exec(line);
    if (telegramMatch) {
      pendingHex = telegramMatch[1] as string;
      continue;
    }

    if (pendingHex && line.startsWith("{")) {
      let expected: Record<string, unknown>;
      try {
        expected = JSON.parse(line) as Record<string, unknown>;
      } catch {
        // Some simulation files carry plain-text output lines ("|Name;id;...")
        // or invalid JSON — skip these quietly so a handful of malformed lines
        // don't block the whole harvest.
        pendingHex = null;
        continue;
      }
      records.push({
        source,
        driver: stringField(expected, "meter") ?? "unknown",
        name: stringField(expected, "name") ?? "",
        id: stringField(expected, "id") ?? "",
        // Simulation files use pre-decrypted or NOKEY telegrams.
        key: "NOKEY",
        hex: pendingHex,
        expected,
      });
      pendingHex = null;
    }
  }

  return records;
}

function stringField(obj: Record<string, unknown>, key: string): string | null {
  const v = obj[key];
  return typeof v === "string" ? v : null;
}

/**
 * Extract every `test { ... }` block from an XMQ driver file.
 *
 * XMQ grammar subset we care about:
 *   tests {
 *     test {
 *       args     = '<name> <driver> <id> <key>'
 *       telegram = <bare-hex>
 *       json     = '<expected_json>'
 *     }
 *   }
 *
 * The tricky part: the `json` value is a single-quoted string that itself
 * contains `{` and `}` (valid JSON), so a non-greedy regex terminates early.
 * Instead, walk character by character and count braces only outside of
 * single-quoted strings.
 */
function harvestXmqFile(path: string): FixtureRecord[] {
  const source = path.split("/").pop() ?? path;
  const content = readFileSync(path, "utf8");
  const records: FixtureRecord[] = [];

  // Find each `test {` keyword, then extract the balanced-brace body.
  const testKeywordRe = /\btest\s*\{/g;

  for (const keywordMatch of content.matchAll(testKeywordRe)) {
    const openBraceIdx = (keywordMatch.index ?? 0) + keywordMatch[0].length - 1;
    const bodyStart = openBraceIdx + 1;

    // Walk forward counting braces, ignoring anything inside '...'.
    let depth = 1;
    let i = bodyStart;
    let inQuote = false;
    for (; i < content.length && depth > 0; i++) {
      const ch = content[i];
      if (inQuote) {
        if (ch === "'") inQuote = false;
      } else {
        if (ch === "'") inQuote = true;
        else if (ch === "{") depth++;
        else if (ch === "}") depth--;
      }
    }
    if (depth !== 0) break; // malformed — stop
    const body = content.slice(bodyStart, i - 1);

    const argsMatch = /\bargs\s*=\s*'([^']*)'/.exec(body);
    const telegramMatch = /\btelegram\s*=\s*([^\s]+)/.exec(body);
    const jsonMatch = /\bjson\s*=\s*'([\s\S]*?)'\s*(?:\n|$|fields\s*=)/.exec(body);
    if (!argsMatch || !telegramMatch || !jsonMatch) continue;

    const argTokens = (argsMatch[1] as string).trim().split(/\s+/);
    if (argTokens.length < 4) continue;
    const [name, driver, id, key] = argTokens;
    const hex = (telegramMatch[1] as string).trim();

    let expected: Record<string, unknown>;
    try {
      expected = JSON.parse(jsonMatch[1] as string) as Record<string, unknown>;
    } catch (err) {
      throw new Error(
        `${source}: failed to parse expected JSON (args=${argsMatch[1]})\n  ${(err as Error).message}`,
      );
    }

    records.push({
      source,
      driver: driver as string,
      name: name as string,
      id: id as string,
      key: key as string,
      hex,
      expected,
    });
  }

  return records;
}

function main(): void {
  const driverFiles = readdirSync(DRIVERS_DIR)
    .filter((f) => f.startsWith("driver_") && f.endsWith(".cc"))
    .map((f) => join(DRIVERS_DIR, f));

  const simFiles = readdirSync(SIMS_DIR)
    .filter((f) => f.startsWith("simulation_") && f.endsWith(".txt"))
    .map((f) => join(SIMS_DIR, f));

  const xmqFiles = readdirSync(XMQ_DRIVERS_DIR)
    .filter((f) => f.endsWith(".xmq"))
    .map((f) => join(XMQ_DRIVERS_DIR, f));

  const records: FixtureRecord[] = [];
  let driverCount = 0;
  let simCount = 0;
  let xmqCount = 0;

  for (const f of driverFiles) {
    const rs = harvestDriverFile(f);
    records.push(...rs);
    driverCount += rs.length;
  }

  for (const f of simFiles) {
    const rs = harvestSimFile(f);
    records.push(...rs);
    simCount += rs.length;
  }

  for (const f of xmqFiles) {
    const rs = harvestXmqFile(f);
    records.push(...rs);
    xmqCount += rs.length;
  }

  writeFileSync(OUT, `${JSON.stringify(records, null, 2)}\n`, "utf8");

  const uniqueDrivers = new Set(records.map((r) => r.driver));
  const encrypted = records.filter((r) => r.key !== "NOKEY").length;

  console.log(`Harvested ${records.length} fixtures → ${OUT}`);
  console.log(`  from driver_*.cc Test blocks: ${driverCount}`);
  console.log(`  from simulation_*.txt files:  ${simCount}`);
  console.log(`  from drivers/*.xmq tests:     ${xmqCount}`);
  console.log(`  covering ${uniqueDrivers.size} unique drivers`);
  console.log(`  encrypted: ${encrypted}, NOKEY: ${records.length - encrypted}`);
}

main();
