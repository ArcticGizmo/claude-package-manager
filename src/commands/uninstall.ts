import { existsSync, readFileSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
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

interface Settings {
  hooks?: Record<string, HookEntry[]>;
  [key: string]: unknown;
}

export function uninstallPlugin(pluginName: string): void {
  const targetDir = join(pluginsDir(), pluginName);

  if (!existsSync(targetDir)) {
    console.error(styleText("yellow", `Plugin "${pluginName}" is not installed.`));
    process.exit(1);
  }

  const settingsPath = join(claudeDir(), "settings.json");
  if (existsSync(settingsPath)) {
    try {
      const settings = JSON.parse(readFileSync(settingsPath, "utf8")) as Settings;
      if (settings.hooks) {
        for (const event of Object.keys(settings.hooks)) {
          settings.hooks[event] = settings.hooks[event].filter(
            (entry) => !entry.hooks.some((h) => h.command?.includes(targetDir))
          );
          if (settings.hooks[event].length === 0) delete settings.hooks[event];
        }
        if (Object.keys(settings.hooks).length === 0) delete settings.hooks;
        writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n", "utf8");
      }
    } catch {
      console.error(styleText("yellow", `Warning: could not update ${settingsPath} — hooks may need manual cleanup.`));
    }
  }

  rmSync(targetDir, { recursive: true, force: true });
  console.log(styleText("green", "Uninstalled") + ` ${pluginName}.`);
}
