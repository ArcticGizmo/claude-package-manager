import { homedir } from "os";
import { join } from "path";

export const claudeDir = () => join(homedir(), ".claude");
export const sessionsDir = () => join(claudeDir(), "sessions");
export const pluginsDir = () => join(claudeDir(), "plugins");
