import { readFileSync, writeFileSync } from "fs";
import { styleText } from "node:util";
import checkbox, { Separator } from "@inquirer/checkbox";
import { findCpmJson } from "../utils/config";
import { discoverMcpServers } from "../utils/mcp";

// ── Hook gate (non-interactive, stdin is piped) ───────────────────────────────

interface HookInput {
  tool_name: string;
}

function block(reason: string): never {
  process.stdout.write(JSON.stringify({ decision: "block", reason }) + "\n");
  process.exit(0);
}

function runHookGate(): void {
  let input: HookInput;
  try {
    input = JSON.parse(readFileSync(0, "utf8")) as HookInput;
  } catch {
    process.exit(0);
  }

  const { tool_name } = input;

  if (!tool_name?.startsWith("mcp__")) process.exit(0);

  const serverName = tool_name.split("__")[1];
  const found = findCpmJson(process.cwd());

  if (!found) process.exit(0);

  const { config, configPath } = found;
  const allowed = config.allowedMcpServers;

  if (!allowed || allowed.length === 0) process.exit(0);

  if (!allowed.includes(serverName)) {
    block(
      `MCP server "${serverName}" is not allowed in this project.\n` +
        `Allowed servers: ${allowed.join(", ")}\n` +
        `Defined in: ${configPath}`
    );
  }

  process.exit(0);
}

// ── Interactive manager (stdin is a TTY) ─────────────────────────────────────

async function runInteractive(): Promise<void> {
  const found = findCpmJson(process.cwd());

  if (!found) {
    console.error(
      styleText("red", "No cpm.json found.") +
        " Run " +
        styleText("cyan", "cpm init") +
        " first."
    );
    process.exit(1);
  }

  const { config, configPath } = found;
  const currentAllowed = new Set(config.allowedMcpServers ?? []);
  const discovered = discoverMcpServers();
  const discoveredNames = new Set(discovered.map((s) => s.name));

  // Servers currently in cpm.json that we couldn't find in any config source
  const orphaned = [...currentAllowed].filter((n) => !discoveredNames.has(n));

  type Choice =
    | InstanceType<typeof Separator>
    | { name: string; value: string; checked: boolean };

  const choices: Choice[] = discovered.map((server) => ({
    name: server.displayName,
    value: server.name,
    checked: currentAllowed.has(server.name),
  }));

  if (orphaned.length > 0) {
    choices.push(
      new Separator(
        styleText("dim", "─── in cpm.json but not currently connected ───")
      )
    );
    for (const name of orphaned) {
      choices.push({
        name:
          styleText("dim", name) +
          "  " +
          styleText("yellow", "(not accessible — server may be disconnected)"),
        value: name,
        checked: true,
      });
    }
  }

  if (choices.filter((c) => !(c instanceof Separator)).length === 0) {
    console.log(
      styleText("yellow", "No MCP servers discovered.") +
        " Check your Claude Code configuration."
    );
    process.exit(0);
  }

  console.log(styleText("dim", `\n  ${configPath}\n`));

  const selected = await checkbox({
    message: "Select MCP servers to allow in this project",
    instructions: styleText(
      "dim",
      "(space to toggle · a to toggle all · enter to save · empty selection = allow all)"
    ),
    choices,
    pageSize: 16,
  });

  const updatedConfig = { ...config };

  if (selected.length === 0) {
    delete updatedConfig.allowedMcpServers;
    console.log(
      "\n  " +
        styleText("dim", "No restrictions — all MCP servers are allowed in this project.")
    );
  } else {
    updatedConfig.allowedMcpServers = selected;
    console.log(
      "\n  " +
        styleText("green", `Saved. ${selected.length} server(s) allowed: `) +
        styleText("cyan", selected.join(", "))
    );
  }

  writeFileSync(configPath, JSON.stringify(updatedConfig, null, 2) + "\n", "utf8");
}

// ── Entry point ───────────────────────────────────────────────────────────────

export function mcpGate(): void {
  if (process.stdin.isTTY) {
    runInteractive().catch((err: unknown) => {
      // User pressed Ctrl+C — exit cleanly without a stack trace
      if (err instanceof Error && err.name === "ExitPromptError") process.exit(0);
      console.error(styleText("red", String(err)));
      process.exit(1);
    });
  } else {
    runHookGate();
  }
}
