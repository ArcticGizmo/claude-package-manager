import { existsSync, readFileSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import { pluginsDir, claudeDir } from "../utils/paths.js";

interface HookEntry {
  type: string;
  command: string;
}

interface HookMatcher {
  matcher?: string;
  hooks: HookEntry[];
}

interface SettingsJson {
  hooks?: Record<string, HookMatcher[]>;
  [key: string]: unknown;
}

export async function uninstallPlugin(name: string): Promise<void> {
  const installPath = join(pluginsDir(), name);

  if (!existsSync(installPath)) {
    console.error(`Plugin "${name}" is not installed`);
    process.exit(1);
  }

  const hooksJsonPath = join(installPath, "hooks", "hooks.json");
  const settingsPath = join(claudeDir(), "settings.json");

  if (existsSync(hooksJsonPath) && existsSync(settingsPath)) {
    const hooksJson = JSON.parse(readFileSync(hooksJsonPath, "utf8")) as {
      hooks: Record<string, HookMatcher[]>;
    };
    const settings = JSON.parse(readFileSync(settingsPath, "utf8")) as SettingsJson;

    if (settings.hooks) {
      for (const [event, matchers] of Object.entries(hooksJson.hooks)) {
        if (!settings.hooks[event]) continue;

        const pluginCommands = new Set(
          matchers.flatMap((m) =>
            m.hooks.map((h) =>
              h.command.replace(/\$\{CLAUDE_PLUGIN_ROOT\}/g, installPath)
            )
          )
        );

        settings.hooks[event] = settings.hooks[event].filter(
          (m) => !m.hooks.some((h) => pluginCommands.has(h.command))
        );

        if (settings.hooks[event].length === 0) {
          delete settings.hooks[event];
        }
      }

      writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    }
  }

  rmSync(installPath, { recursive: true });
  console.log(`Uninstalled "${name}"`);
}
