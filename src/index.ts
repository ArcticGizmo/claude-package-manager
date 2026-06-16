import { Command } from "commander";
import { listSessions } from "./commands/sessions";

const program = new Command();

program
  .name("cpm")
  .description("Claude Package Manager — manage Claude Code plugins, hooks, and extensions")
  .version("0.1.0");

program
  .command("sessions")
  .description("List active Claude Code sessions")
  .action(listSessions);

program.parse();
