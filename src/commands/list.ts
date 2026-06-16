import { existsSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { pluginsDir } from "../utils/paths.js";

interface Plugin {
  name: string;
  version: string;
  description: string;
}

interface Marketplace {
  plugins: Plugin[];
}

export async function listPlugins(): Promise<void> {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const marketplacePath = join(__dirname, "..", ".claude-plugin", "marketplace.json");

  if (!existsSync(marketplacePath)) {
    console.log("No plugins available");
    return;
  }

  const marketplace: Marketplace = JSON.parse(readFileSync(marketplacePath, "utf8"));

  if (marketplace.plugins.length === 0) {
    console.log("No plugins available");
    return;
  }

  console.log("Available plugins:\n");
  for (const plugin of marketplace.plugins) {
    const installed = existsSync(join(pluginsDir(), plugin.name));
    const status = installed ? " (installed)" : "";
    console.log(`  ${plugin.name}@${plugin.version}${status}  —  ${plugin.description}`);
  }
}
