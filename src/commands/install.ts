import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { styleText } from "node:util";
import { claudeDir, pluginsDir } from "../utils/paths";

interface PluginHook {
  type: string;
  command: string;
}

interface HookEntry {
  matcher: string;
  hooks: PluginHook[];
}

interface HooksJson {
  hooks: Record<string, HookEntry[]>;
}

interface Settings {
  hooks?: Record<string, HookEntry[]>;
  [key: string]: unknown;
}

function getMarketplacePluginsDir(): string {
  const distDir = dirname(fileURLToPath(import.meta.url));
  return join(distDir, "..", "plugins");
}

export function installPlugin(pluginName: string): void {
  const marketplaceDir = getMarketplacePluginsDir();
  const pluginSource = join(marketplaceDir, pluginName);

  if (!existsSync(pluginSource)) {
    console.error(
      styleText("red", `Plugin "${pluginName}" not found.`) +
        "\nRun " +
        styleText("cyan", "cpm list") +
        " to see available plugins."
    );
    process.exit(1);
  }

  const targetDir = join(pluginsDir(), pluginName);
  const alreadyInstalled = existsSync(targetDir);

  if (!existsSync(pluginsDir())) mkdirSync(pluginsDir(), { recursive: true });

  cpSync(pluginSource, targetDir, { recursive: true });

  const hooksJsonPath = join(pluginSource, "hooks", "hooks.json");
  if (!existsSync(hooksJsonPath)) {
    console.log(
      styleText("green", alreadyInstalled ? "Reinstalled" : "Installed") +
        ` ${pluginName} (no hooks to register).`
    );
    return;
  }

  const hooksJson = JSON.parse(readFileSync(hooksJsonPath, "utf8")) as HooksJson;
  const settingsPath = join(claudeDir(), "settings.json");

  let settings: Settings = {};
  if (existsSync(settingsPath)) {
    try {
      settings = JSON.parse(readFileSync(settingsPath, "utf8")) as Settings;
    } catch {
      console.error(styleText("yellow", `Warning: could not parse ${settingsPath} — skipping hook registration.`));
      return;
    }
  }

  settings.hooks ??= {};

  for (const [event, entries] of Object.entries(hooksJson.hooks)) {
    settings.hooks[event] ??= [];
    for (const entry of entries) {
      const resolvedHooks = entry.hooks.map((h) => ({
        ...h,
        command: h.command.replace("${CLAUDE_PLUGIN_ROOT}", targetDir),
      }));

      const alreadyRegistered = (settings.hooks![event] as HookEntry[]).some((existing) =>
        existing.hooks.some((h) => h.command?.includes(targetDir))
      );

      if (!alreadyRegistered) {
        (settings.hooks![event] as HookEntry[]).push({ matcher: entry.matcher, hooks: resolvedHooks });
      }
    }
  }

  writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n", "utf8");
  console.log(
    styleText("green", alreadyInstalled ? "Reinstalled" : "Installed") +
      ` ${pluginName} → hooks registered in ${settingsPath}`
  );
}
