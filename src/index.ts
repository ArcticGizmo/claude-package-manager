import { Command } from "commander";
import { listSessions } from "./commands/sessions";
import { init } from "./commands/init";
import { mcpGate } from "./commands/mcp-gate";
import { listPlugins } from "./commands/list";
import { installPlugin } from "./commands/install";
import { uninstallPlugin } from "./commands/uninstall";

const program = new Command();

program
  .name("cpm")
  .description("Claude Package Manager — manage Claude Code plugins, hooks, and extensions")
  .version("0.1.0");

program
  .command("sessions")
  .description("List active Claude Code sessions")
  .action(listSessions);

program
  .command("init")
  .description("Initialize cpm.json in the project .claude folder")
  .option("-f, --force", "create .claude folder in the current directory if it doesn't exist")
  .action((options) => init(options));

program
  .command("mcp-gate")
  .description("PreToolUse hook — blocks MCP servers not listed in .claude/cpm.json allowedMcpServers")
  .action(mcpGate);

program
  .command("list")
  .description("List available plugins in the cpm marketplace")
  .action(listPlugins);

program
  .command("install <plugin>")
  .description("Install a plugin and register its hooks in ~/.claude/settings.json")
  .action(installPlugin);

program
  .command("uninstall <plugin>")
  .description("Uninstall a plugin and remove its hooks from ~/.claude/settings.json")
  .action(uninstallPlugin);

program.parse();
