import { Command } from "commander";
import { listSessions } from "./commands/sessions";
import { init } from "./commands/init";

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
  .description("Initialize cmp.json in the project .claude folder")
  .option("-c, --create-dot-claude", "create .claude folder if it doesn't exist")
  .action((options) => init(options));

program.parse();
