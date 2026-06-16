import { readFileSync } from "fs";
import { findCpmJson } from "../utils/config";

interface HookInput {
  tool_name: string;
}

function block(reason: string): never {
  process.stdout.write(JSON.stringify({ decision: "block", reason }) + "\n");
  process.exit(0);
}

export function mcpGate(): void {
  let input: HookInput;
  try {
    input = JSON.parse(readFileSync(0, "utf8")) as HookInput;
  } catch {
    process.exit(0);
  }

  const { tool_name } = input;

  if (!tool_name?.startsWith("mcp__")) {
    process.exit(0);
  }

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
