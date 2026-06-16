import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { homedir } from "os";
import { styleText } from "node:util";

function findDotClaude(startDir: string): string | null {
  const home = homedir();
  let current = startDir;
  while (current !== home) {
    const candidate = join(current, ".claude");
    if (existsSync(candidate)) return candidate;
    const parent = dirname(current);
    if (parent === current) return null;
    current = parent;
  }
  return null;
}

export function init(options: { createDotClaude: boolean }): void {
  const cwd = process.cwd();
  let dotClaude = findDotClaude(cwd);

  if (!dotClaude) {
    if (!options.createDotClaude) {
      console.error(
        styleText("red", "No .claude folder found in this directory tree.") +
          `\nRun with ${styleText("cyan", "--create-dot-claude")} (or ${styleText("cyan", "-c")}) to create one in the current directory.`
      );
      process.exit(1);
    }
    dotClaude = join(cwd, ".claude");
    mkdirSync(dotClaude);
    console.log(styleText("dim", `Created ${dotClaude}`));
  }

  const cmpJson = join(dotClaude, "cmp.json");
  if (existsSync(cmpJson)) {
    console.error(styleText("yellow", `cmp.json already exists: ${cmpJson}`));
    process.exit(1);
  }

  writeFileSync(cmpJson, "{}\n", "utf8");
  console.log(styleText("green", `Initialized ${cmpJson}`));
}
