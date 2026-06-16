import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { styleText } from "node:util";
import { sessionsDir } from "../utils/paths";

interface SessionData {
  pid: number;
  sessionId: string;
  cwd: string;
  startedAt: number;
  version: string;
  status: "busy" | "idle" | string;
  updatedAt: number;
  kind: string;
  entrypoint: string;
}

function readMode(sessionId: string): string {
  try {
    return readFileSync(join(sessionsDir(), `${sessionId}.mode`), "utf8").trim();
  } catch {
    return "default";
  }
}

function formatAge(ms: number): string {
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function statusLabel(status: string): string {
  const padded = status.padEnd(6);
  if (status === "busy") return styleText("yellow", padded);
  if (status === "idle") return styleText("green", padded);
  return styleText("dim", padded);
}

export function listSessions(): void {
  const dir = sessionsDir();
  let files: string[];

  try {
    files = readdirSync(dir).filter((f) => f.endsWith(".json"));
  } catch {
    console.error(styleText("red", `Cannot read sessions directory: ${dir}`));
    process.exit(1);
  }

  if (files.length === 0) {
    console.log(styleText("dim", "No active sessions found."));
    return;
  }

  const sessions: (SessionData & { mode: string })[] = [];

  for (const file of files) {
    try {
      const raw = readFileSync(join(dir, file), "utf8");
      const data = JSON.parse(raw) as SessionData;
      sessions.push({ ...data, mode: readMode(data.sessionId) });
    } catch {
      // skip malformed files
    }
  }

  sessions.sort((a, b) => b.updatedAt - a.updatedAt);

  console.log(styleText("bold", `\n  Claude Sessions (${sessions.length})\n`));

  for (const s of sessions) {
    const shortId = s.sessionId.slice(0, 8);
    const project = s.cwd.split(/[\\/]/).slice(-2).join("/");
    console.log(
      `  ${styleText("cyan", shortId)}  ${statusLabel(s.status)}  ${styleText("white", project)}`
    );
    console.log(`           ${styleText("dim", s.cwd)}`);
    console.log(
      `           v${s.version}  ·  mode: ${styleText("magenta", s.mode)}  ·  pid: ${s.pid}  ·  started ${formatAge(s.startedAt)}`
    );
    console.log();
  }
}
