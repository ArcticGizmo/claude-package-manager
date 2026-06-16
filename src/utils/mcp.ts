import { existsSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { homedir } from "os";
import { claudeDir } from "./paths";

export interface McpServer {
  name: string;
  displayName: string;
}

// These claude.ai servers are always available and don't appear in any local config file.
const ALWAYS_ON_SERVERS: McpServer[] = [
  { name: "claude_ai_Atlassian", displayName: "claude.ai Atlassian" },
  { name: "claude_ai_Figma", displayName: "claude.ai Figma" },
  { name: "claude_ai_Mermaid_Chart", displayName: "claude.ai Mermaid Chart" },
  { name: "claude_ai_Microsoft_Learn", displayName: "claude.ai Microsoft Learn" },
];

export function discoverMcpServers(): McpServer[] {
  const servers: McpServer[] = [];
  const seen = new Set<string>();

  function add(name: string, displayName: string) {
    if (!seen.has(name)) {
      seen.add(name);
      servers.push({ name, displayName });
    }
  }

  for (const s of ALWAYS_ON_SERVERS) {
    add(s.name, s.displayName);
  }

  // ~/.claude/settings.json mcpServers
  try {
    const settings = JSON.parse(readFileSync(join(claudeDir(), "settings.json"), "utf8")) as {
      mcpServers?: Record<string, unknown>;
    };
    for (const key of Object.keys(settings.mcpServers ?? {})) {
      add(key, key);
    }
  } catch {}

  // .mcp.json files walking up from CWD (stop before home)
  const home = homedir();
  let current = process.cwd();
  while (current !== home) {
    const mcpFile = join(current, ".mcp.json");
    if (existsSync(mcpFile)) {
      try {
        const config = JSON.parse(readFileSync(mcpFile, "utf8")) as Record<string, unknown>;
        for (const key of Object.keys(config)) {
          add(key, key);
        }
      } catch {}
    }
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }

  // mcp-needs-auth-cache.json — recently used claude.ai OAuth servers
  // Keys are display names like "claude.ai Slack"; internal names replace . and spaces with _
  try {
    const cache = JSON.parse(
      readFileSync(join(claudeDir(), "mcp-needs-auth-cache.json"), "utf8")
    ) as Record<string, unknown>;
    for (const displayName of Object.keys(cache)) {
      const internalName = displayName.replace(/\./g, "_").replace(/\s+/g, "_");
      add(internalName, displayName);
    }
  } catch {}

  return servers;
}
