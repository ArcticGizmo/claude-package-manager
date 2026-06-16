import { existsSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { homedir } from "os";

export interface CpmConfig {
  allowedMcpServers?: string[];
  plugins?: Record<string, Record<string, unknown>>;
}

export interface CpmConfigResult {
  config: CpmConfig;
  configPath: string;
}

export function findCpmJson(startDir: string): CpmConfigResult | null {
  const home = homedir();
  let current = startDir;
  while (current !== home) {
    const candidate = join(current, ".claude", "cpm.json");
    if (existsSync(candidate)) {
      try {
        const raw = readFileSync(candidate, "utf8").replace(/^﻿/, "");
        return {
          config: JSON.parse(raw) as CpmConfig,
          configPath: candidate,
        };
      } catch {
        return null;
      }
    }
    const parent = dirname(current);
    if (parent === current) return null;
    current = parent;
  }
  return null;
}
