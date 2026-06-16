import { existsSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { styleText } from "node:util";
import { pluginsDir } from "../utils/paths";

interface MarketplacePlugin {
  name: string;
  source: string;
  version: string;
  description: string;
  keywords?: string[];
}

interface MarketplaceJson {
  name: string;
  version: string;
  description: string;
  plugins: MarketplacePlugin[];
}

function getMarketplaceJsonPath(): string {
  const distDir = dirname(fileURLToPath(import.meta.url));
  return join(distDir, "..", ".claude-plugin", "marketplace.json");
}

export function listPlugins(): void {
  const marketplacePath = getMarketplaceJsonPath();

  if (!existsSync(marketplacePath)) {
    console.error(styleText("red", "Marketplace index not found."));
    process.exit(1);
  }

  const marketplace = JSON.parse(readFileSync(marketplacePath, "utf8")) as MarketplaceJson;
  const installedRoot = pluginsDir();

  console.log(
    "\n  " +
      styleText("bold", marketplace.name) +
      " — " +
      styleText("dim", marketplace.description) +
      "\n"
  );

  for (const plugin of marketplace.plugins) {
    const isInstalled = existsSync(join(installedRoot, plugin.name));
    const badge = isInstalled ? "  " + styleText("green", "installed") : "";
    console.log(
      "  " +
        styleText("cyan", plugin.name) +
        styleText("dim", `@${plugin.version}`) +
        badge
    );
    console.log("    " + plugin.description);
    if (plugin.keywords?.length) {
      console.log("    " + styleText("dim", plugin.keywords.join(", ")));
    }
    console.log();
  }
}
