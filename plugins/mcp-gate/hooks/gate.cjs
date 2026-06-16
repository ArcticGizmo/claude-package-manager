const { existsSync, readFileSync } = require("fs");
const { join, dirname } = require("path");
const { homedir } = require("os");

let input;
try {
  input = JSON.parse(readFileSync(0, "utf8"));
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

if (allowed.includes(serverName)) process.exit(0);

const reason =
  `MCP server "${serverName}" is blocked in this project.\n\n` +
  `Allowed: ${allowed.join(", ")}\n\n` +
  `To update the allowlist:\n  cpm mcp-gate\n\n` +
  `Config: ${configPath}`;

process.stdout.write(JSON.stringify({ decision: "block", reason }) + "\n");
process.exit(0);

function findCpmJson(startDir) {
  const home = homedir();
  let current = startDir;
  while (current !== home) {
    const candidate = join(current, ".claude", "cpm.json");
    if (existsSync(candidate)) {
      try {
        return {
          config: JSON.parse(readFileSync(candidate, "utf8")),
          configPath: candidate,
        };
      } catch {
        return null;
      }
    }
    const parent = dirname(current);
    if (parent === current) return null;
    current = parent;
  }
  return null;
}
