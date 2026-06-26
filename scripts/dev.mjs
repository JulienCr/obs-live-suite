import { spawn } from "child_process";

const isWindows = process.platform === "win32";

const E = "\x1b"; // ESC — ANSI escape introducer (explicit so edits can't strip the raw byte)
const RESET = `${E}[0m`;
const GREY = `${E}[38;5;244m`;

const procs = [
  { name: "BACKEND", color: `${E}[34m`, script: "dev:backend" },
  { name: "NEXT",    color: `${E}[32m`, script: "dev:frontend" },
  { name: "MCP",     color: `${E}[35m`, script: "dev:mcp" },
  { name: "STT",     color: `${E}[36m`, script: "dev:stt", optional: true },
];

const pad = (n) => String(n).padStart(2, "0");
const ts = () => {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};
const prefix = (p) => `${GREY}${ts()}${RESET} ${p.color}[${p.name}]${RESET} `;

let shuttingDown = false;

function killTree(pid) {
  if (!pid) return;
  if (isWindows) {
    spawn("taskkill", ["/pid", String(pid), "/T", "/F"], { stdio: "ignore" });
  } else {
    try { process.kill(pid, "SIGTERM"); } catch { /* already gone */ }
  }
}

const children = procs.map((p) => {
  const child = spawn("pnpm", [p.script], {
    shell: true,
    stdio: ["ignore", "pipe", "pipe"],
  });

  const pipe = (stream, target) => {
    let buf = "";
    stream.on("data", (chunk) => {
      buf += chunk.toString();
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        target.write(prefix(p) + line.replace(/\r$/, "") + "\n");
      }
    });
    stream.on("end", () => {
      if (buf.length) target.write(prefix(p) + buf + "\n");
    });
  };

  pipe(child.stdout, process.stdout);
  pipe(child.stderr, process.stderr);

  child.on("exit", (code) => {
    process.stdout.write(prefix(p) + `exited (code=${code})\n`);
    // Optional services (STT needs a Python venv + GPU) must not bring down the
    // whole dev stack when they fail to start or crash.
    if (p.optional) return;
    if (!shuttingDown) {
      shuttingDown = true;
      for (const c of children) {
        if (c !== child && c.exitCode === null) killTree(c.pid);
      }
      setTimeout(() => process.exit(code ?? 0), 200);
    }
  });

  return child;
});

const onSignal = () => {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const c of children) killTree(c.pid);
};
process.on("SIGINT", onSignal);
process.on("SIGTERM", onSignal);
