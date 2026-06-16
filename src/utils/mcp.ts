import { existsSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { homedir } from "os";
import { spawnSync } from "child_process";
import { claudeDir } from "./paths";

export type McpServerStatus = "connected" | "needs-auth" | "unknown";

export interface McpServer {
  name: string;
  displayName: string;
  status: McpServerStatus;
}

function parseStatus(raw: string): McpServerStatus {
  if (raw.includes("Connected")) return "connected";
  if (raw.includes("Needs authentication")) return "needs-auth";
  return "unknown";
}

function fromClaudeMcpList(): McpServer[] {
  const result = spawnSync("claude", ["mcp", "list"], {
    encoding: "utf8",
    timeout: 15_000,
  });

  if (result.status !== 0 || !result.stdout) return [];

  const servers: McpServer[] = [];

  for (const line of result.stdout.split("\n")) {
    // Format: "claude.ai Figma: https://mcp.figma.com/mcp - ✔ Connected"
    const match = line.match(/^(.+?):\s+https?:\/\/\S+\s+-\s+(.+)$/);
    if (!match) continue;

    const displayName = match[1].trim();
    const status = parseStatus(match[2].trim());
    const name = displayName.replace(/\./g, "_").replace(/\s+/g, "_");
    servers.push({ name, displayName, status });
  }

  return servers;
}

export function discoverMcpServers(): McpServer[] {
  const seen = new Set<string>();
  const servers: McpServer[] = [];

  function add(server: McpServer) {
    if (!seen.has(server.name)) {
      seen.add(server.name);
      servers.push(server);
    }
  }

  for (const s of fromClaudeMcpList()) {
    add(s);
  }

  // Locally configured servers from ~/.claude/settings.json and .mcp.json files.
  // These may not appear in `claude mcp list` (e.g. stdio servers); status is unknown.
  try {
    const settings = JSON.parse(readFileSync(join(claudeDir(), "settings.json"), "utf8")) as {
      mcpServers?: Record<string, unknown>;
    };
    for (const key of Object.keys(settings.mcpServers ?? {})) {
      add({ name: key, displayName: key, status: "unknown" });
    }
  } catch {}

  const home = homedir();
  let current = process.cwd();
  while (current !== home) {
    const mcpFile = join(current, ".mcp.json");
    if (existsSync(mcpFile)) {
      try {
        const config = JSON.parse(readFileSync(mcpFile, "utf8")) as Record<string, unknown>;
        for (const key of Object.keys(config)) {
          add({ name: key, displayName: key, status: "unknown" });
        }
      } catch {}
    }
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }

  return servers;
}
