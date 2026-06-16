import { readFileSync, appendFileSync, existsSync } from "fs";
import { join } from "path";
import { pathToFileURL } from "url";
import { claudeDir, pluginsDir } from "../utils/paths.js";
import { findCpmJson, type CpmConfig } from "../utils/config.js";

type HookResult =
  | { decision: "block"; reason: string }
  | { decision: "allow" }
  | undefined;

type HookHandler = (
  payload: unknown,
  config: CpmConfig
) => Promise<HookResult> | HookResult;

async function loadHandler(
  pluginName: string,
  hookName: string
): Promise<HookHandler | null> {
  const installPath = join(pluginsDir(), pluginName);
  const pluginJsonPath = join(installPath, ".claude-plugin", "plugin.json");

  if (!existsSync(pluginJsonPath)) return null;

  let pluginJson: { handlers?: Record<string, string> };
  try {
    pluginJson = JSON.parse(readFileSync(pluginJsonPath, "utf8"));
  } catch {
    return null;
  }

  const handlerRelPath = pluginJson.handlers?.[hookName];
  if (!handlerRelPath) return null;

  const resolvedPath = join(installPath, handlerRelPath);
  if (!existsSync(resolvedPath)) return null;

  try {
    const mod = await import(pathToFileURL(resolvedPath).href);
    const fn = (mod.default ?? mod) as unknown;
    if (typeof fn !== "function") return null;
    return fn as HookHandler;
  } catch {
    return null;
  }
}

function log(hookName: string, payload: unknown): void {
  const entry =
    new Date().toISOString() +
    "  " +
    hookName.padEnd(14) +
    JSON.stringify(payload) +
    "\n";
  try {
    appendFileSync(join(claudeDir(), "cpm-handle.log"), entry, "utf8");
  } catch {
    // best-effort — never let logging break hook dispatch
  }
}

export async function handleHook(hookName: string): Promise<void> {
  let raw = "";
  try {
    raw = readFileSync(0, "utf8");
  } catch {
    // no stdin — proceed with empty payload
  }

  let payload: unknown = {};
  if (raw.trim()) {
    try {
      payload = JSON.parse(raw.replace(/^﻿/, ""));
    } catch {
      // malformed input — proceed with empty payload
    }
  }

  log(hookName, payload);

  const cpmResult = findCpmJson(process.cwd());
  if (!cpmResult) {
    process.exit(0);
  }

  const { config } = cpmResult;
  const enabledPlugins = Object.keys(config.plugins ?? {});

  if (enabledPlugins.length === 0) {
    process.exit(0);
  }

  for (const pluginName of enabledPlugins) {
    const handler = await loadHandler(pluginName, hookName);
    if (!handler) continue;

    let result: HookResult;
    try {
      result = await handler(payload, config);
    } catch {
      continue;
    }

    if (result?.decision === "block") {
      process.stdout.write(
        JSON.stringify({ decision: "block", reason: result.reason }) + "\n"
      );
      process.exit(0);
    }
  }

  process.exit(0);
}
