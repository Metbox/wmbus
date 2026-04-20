/*
 * Copyright (C) 2026 Metbox / @metbox/wmbus contributors (gpl-3.0-or-later)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Dynamic-driver loader — mirrors wmbusmeters' `@<name>` syntax that
 * fetches `<name>.xmq` from wmbusmeters.org on first use. The downloaded
 * XMQ is parsed, converted into a DriverDefinition, and registered with
 * the global registry so subsequent decodes resolve `<name>` (without the
 * `@` prefix) straight from the registry.
 */

import { lookupDriverByName, registerDriver } from "./registry.js";
import type { DriverDefinition } from "./types.js";
import { convertXmqDriver, type XmqConvertWarnings } from "./xmq-driver.js";
import { parseXmq } from "./xmq-parser.js";

/** Default base URL for downloadable drivers, matching upstream's util.cc:2330. */
export const DEFAULT_DRIVER_BASE_URL = "https://wmbusmeters.org/drivers/";

export interface RemoteDriverOptions {
  /** Override the base URL (tests, air-gapped mirrors, etc.). */
  baseUrl?: string;
  /** Use the cached driver instead of network fetch if already loaded. Default: true. */
  useCache?: boolean;
  /** Collect warnings about XMQ features this port doesn't yet support. */
  warnings?: XmqConvertWarnings;
  /** Inject a custom fetch implementation (tests). Defaults to global fetch. */
  fetchImpl?: (url: string) => Promise<Response>;
}

/**
 * Resolve `@<name>` → load the upstream XMQ driver, register it, return
 * the definition. Returns an already-registered driver if one exists.
 */
export async function loadRemoteDriver(
  name: string,
  opts: RemoteDriverOptions = {},
): Promise<DriverDefinition> {
  const useCache = opts.useCache !== false;
  if (useCache) {
    const existing = lookupDriverByName(name);
    if (existing) return existing;
  }

  const baseUrl = opts.baseUrl ?? DEFAULT_DRIVER_BASE_URL;
  const url = `${baseUrl.replace(/\/+$/, "")}/${encodeURIComponent(name)}.xmq`;
  const fetcher = opts.fetchImpl ?? fetch;
  const res = await fetcher(url);
  if (!res.ok) {
    throw new Error(`loadRemoteDriver("${name}"): HTTP ${res.status} fetching ${url}`);
  }
  const xmq = await res.text();
  const def = parseAndRegisterXmqDriver(xmq, { warnings: opts.warnings });
  if (def.name !== name) {
    // Upstream policy: the requested name must match the driver's `name =`
    // entry inside the XMQ block. Refuse otherwise so `@iperl` can't be
    // silently redirected to a different driver.
    throw new Error(`loadRemoteDriver("${name}"): fetched XMQ declares driver name "${def.name}"`);
  }
  return def;
}

/**
 * Parse an XMQ driver source string, convert it into a DriverDefinition,
 * and register it with the global registry. Returns the registered
 * definition.
 */
export function parseAndRegisterXmqDriver(
  xmq: string,
  opts: { warnings?: XmqConvertWarnings } = {},
): DriverDefinition {
  const tree = parseXmq(xmq);
  const def = convertXmqDriver(tree, { warnings: opts.warnings });
  registerDriver(def);
  return def;
}
