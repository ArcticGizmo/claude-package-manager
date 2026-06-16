import { existsSync, mkdirSync, cpSync, readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { pluginsDir, claudeDir } from "../utils/paths.js";

interface HookEntry {
  type: string;
  command: string;
}

interface HookMatcher {
  matcher?: string;
  hooks: HookEntry[];
}

interface HooksJson {
  hooks: Record<string, HookMatcher[]>;
}

interface SettingsJson {
  hooks?: Record<string, HookMatcher[]>;
  [key: string]: unknown;
}

function packagePluginsDir(): string {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  return join(__dirname, "..", "plugins");
}

export async function installPlugin(name: string): Promise<void> {
  const sourceDir = join(packagePluginsDir(), name);

  if (!existsSync(sourceDir)) {
    console.error(`Plugin "${name}" not found`);
    process.exit(1);
  }

  const installPath = join(pluginsDir(), name);

  if (existsSync(installPath)) {
    console.error(`Plugin "${name}" is already installed. Run "cpm uninstall ${name}" first.`);
    process.exit(1);
  }

  mkdirSync(installPath, { recursive: true });
  cpSync(sourceDir, installPath, { recursive: true });

  const hooksJsonPath = join(installPath, "hooks", "hooks.json");
  if (!existsSync(hooksJsonPath)) {
    console.log(`Installed "${name}"`);
    return;
  }

  const hooksJson: HooksJson = JSON.parse(readFileSync(hooksJsonPath, "utf8"));

  const settingsPath = join(claudeDir(), "settings.json");
  let settings: SettingsJson = {};
  if (existsSync(settingsPath)) {
    try {
      settings = JSON.parse(readFileSync(settingsPath, "utf8"));
    } catch {
      settings = {};
    }
  }
  if (!settings.hooks) settings.hooks = {};

  for (const [event, matchers] of Object.entries(hooksJson.hooks)) {
    if (!settings.hooks[event]) settings.hooks[event] = [];
    for (const matcher of matchers) {
      const resolved: HookMatcher = {
        ...matcher,
        hooks: matcher.hooks.map((h) => ({
          ...h,
          command: h.command.replace(/\$\{CLAUDE_PLUGIN_ROOT\}/g, installPath),
        })),
      };
      settings.hooks[event].push(resolved);
    }
  }

  writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
  console.log(`Installed "${name}" and registered hooks in ~/.claude/settings.json`);
}
