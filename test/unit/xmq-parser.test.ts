/*
 * Copyright (C) 2026 Metbox / @metbox/wmbus contributors (gpl-3.0-or-later)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import { describe, expect, it } from "vitest";
import { decodeWmbusHex } from "../../src/api.js";
import { convertXmqDriver } from "../../src/drivers/xmq-driver.js";
import { childBlock, entryValue, parseXmq } from "../../src/drivers/xmq-parser.js";

describe("parseXmq", () => {
  it("parses nested blocks and key-value pairs", () => {
    const src = `driver {
      name = iperl
      meter_type = WaterMeter
      detect {
        mvt = SEN,68,06
        mvt = SEN,68,07
      }
    }`;
    const root = parseXmq(src);
    expect(root.name).toBe("driver");
    expect(entryValue(root, "name")).toBe("iperl");
    expect(entryValue(root, "meter_type")).toBe("WaterMeter");
    const detect = childBlock(root, "detect");
    expect(detect).toBeDefined();
    // Use childBlocks(root, 'detect') — just verify the parser captured multiple mvt entries.
    const mvts = detect ? detect.entries.filter((e) => e.kind === "entry" && e.key === "mvt") : [];
    expect(mvts.length).toBe(2);
  });

  it("parses single-quoted strings with embedded commas", () => {
    const src = `driver { info = 'one, two, three' }`;
    const root = parseXmq(src);
    expect(entryValue(root, "info")).toBe("one, two, three");
  });

  it("parses triple-quoted multi-line strings", () => {
    const src = `driver {
      ixml = '''line one
             line two
             line three'''
    }`;
    const root = parseXmq(src);
    const v = entryValue(root, "ixml");
    expect(v).toContain("line one");
    expect(v).toContain("line three");
  });

  it("ignores // line comments and /* block comments */", () => {
    const src = `// header comment
    /* block
       comment */
    driver {
      // inside block
      name = foo
    }`;
    const root = parseXmq(src);
    expect(entryValue(root, "name")).toBe("foo");
  });

  it("throws on unterminated block", () => {
    const src = `driver { name = foo`;
    expect(() => parseXmq(src)).toThrow(/unterminated/i);
  });
});

describe("convertXmqDriver", () => {
  it("converts a minimal iperl driver", () => {
    const src = `driver {
      name           = iperl
      meter_type     = WaterMeter
      default_fields = name,id,total_m3,timestamp
      detect {
        mvt = SEN,68,07
      }
      fields {
        field {
          name     = total
          quantity = Volume
          match {
            measurement_type = Instantaneous
            vif_range        = Volume
          }
        }
      }
    }`;
    const tree = parseXmq(src);
    const def = convertXmqDriver(tree);
    expect(def.name).toBe("iperl");
    expect(def.meterType).toBe("WaterMeter");
    expect(def.mvt).toHaveLength(1);
    expect(def.mvt[0]?.version).toBe(0x68);
    expect(def.mvt[0]?.type).toBe(0x07);
    expect(def.fields).toHaveLength(1);
    expect(def.fields[0]?.name).toBe("total");
  });

  it("reports ignored fields in warnings", () => {
    const src = `driver {
      name = calc_driver
      meter_type = HeatMeter
      detect { mvt = KAM,01,04 }
      fields {
        field {
          name = set_date_calc
          quantity = PointInTime
          // No match block — represents a calculator-only field.
        }
      }
    }`;
    const warnings = { ignored: [] };
    const def = convertXmqDriver(parseXmq(src), { warnings });
    expect(def.fields).toHaveLength(0);
    expect(warnings.ignored.length).toBeGreaterThan(0);
  });
});

describe("@name driver fetch in decodeWmbusHex", () => {
  it("fetches an XMQ driver on first use and caches it", async () => {
    const syntheticXmq = `driver {
      name           = synthetic_iperl
      meter_type     = WaterMeter
      default_fields = name,id,total_m3,timestamp
      detect {
        mvt = SEN,68,07
      }
      fields {
        field {
          name = total
          quantity = Volume
          match {
            measurement_type = Instantaneous
            vif_range        = Volume
          }
        }
      }
    }`;

    let fetches = 0;
    const mockFetch = async (url: string) => {
      fetches++;
      expect(url).toBe("https://wmbusmeters.org/drivers/synthetic_iperl.xmq");
      return new Response(syntheticXmq, { status: 200 });
    };

    const hex = "1E44AE4C9956341268077A36001000_2F2F0413181E0000023B00002F2F2F2F";
    const r1 = await decodeWmbusHex(hex, "@synthetic_iperl", "", {
      name: "Test",
      timestampOverride: "1111-11-11T11:11:11Z",
      remoteDriverOptions: { fetchImpl: mockFetch },
    });
    expect(r1.meter).toBe("synthetic_iperl");
    expect(r1.total_m3).toBe(7.704);

    // Second call should skip the network fetch entirely.
    await decodeWmbusHex(hex, "@synthetic_iperl", "", {
      remoteDriverOptions: { fetchImpl: mockFetch },
    });
    expect(fetches).toBe(1);
  });
});
