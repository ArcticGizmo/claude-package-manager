import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { homedir } from "os";
import { createInterface } from "readline";
import { styleText } from "node:util";

function findDotClaude(startDir: string): { path: string; depth: number } | null {
  const home = homedir();
  let current = startDir;
  let depth = 0;
  while (current !== home) {
    const candidate = join(current, ".claude");
    if (existsSync(candidate)) return { path: candidate, depth };
    const parent = dirname(current);
    if (parent === current) return null;
    current = parent;
    depth++;
  }
  return null;
}

function confirm(question: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      const trimmed = answer.trim().toLowerCase();
      resolve(trimmed === "y" || trimmed === "yes");
    });
  });
}

export async function init(options: { force: boolean }): Promise<void> {
  const cwd = process.cwd();
  let dotClaude: string;

  if (options.force) {
    dotClaude = join(cwd, ".claude");
    if (!existsSync(dotClaude)) {
      mkdirSync(dotClaude);
      console.log(styleText("dim", `Created ${dotClaude}`));
    }
  } else {
    const found = findDotClaude(cwd);
    if (!found) {
      console.error(
        styleText("red", "No .claude folder found in this directory tree.") +
          `\nRun with ${styleText("cyan", "--force")} (or ${styleText("cyan", "-f")}) to create one in the current directory.`
      );
      process.exit(1);
    }
    if (found.depth > 0) {
      const ok = await confirm(
        `Found .claude ${found.depth} levels up at ${styleText("cyan", found.path)}\nContinue? [y/N] `
      );
      if (!ok) process.exit(0);
    }
    dotClaude = found.path;
  }

  const cpmJson = join(dotClaude, "cpm.json");
  if (existsSync(cpmJson)) {
    console.error(styleText("yellow", `cpm.json already exists: ${cpmJson}`));
    process.exit(1);
  }

  writeFileSync(cpmJson, "{}\n", "utf8");
  console.log(styleText("green", `Initialized ${cpmJson}`));
}
