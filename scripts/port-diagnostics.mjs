/**
 * Port conflict diagnostics — shared by server.js (frontend) and server/backend.ts.
 *
 * When a server can't bind its port, these helpers identify WHO holds it and
 * print a copy-pasteable remediation, so a port conflict is diagnosed in
 * seconds instead of a guessing game.
 *
 * Crucially, on Windows this covers the "Bound" TCP state (a process that called
 * bind() without listen()). That state is invisible to `netstat` and to
 * `Get-NetTCPConnection -State Listen`, which is exactly how a stray Stream Deck
 * socket on port 3002 once blocked the backend with no visible listener.
 */
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);
const EXEC_TIMEOUT_MS = 4000;

/**
 * @typedef {Object} PortHolder
 * @property {number} pid
 * @property {string} name
 * @property {string} path
 * @property {string} states  Comma-joined TCP states (e.g. "Bound" or "Listen,Established")
 */

/**
 * Best-effort lookup of which processes currently hold a TCP port (any state).
 * Returns [] on any failure — diagnostics must never throw into the caller.
 *
 * @param {number} port
 * @returns {Promise<PortHolder[]>}
 */
export async function findPortHolders(port) {
  try {
    if (process.platform === "win32") {
      // -EncodedCommand avoids all shell-quoting pitfalls.
      const script = `
$ErrorActionPreference = 'SilentlyContinue'
$c = Get-NetTCPConnection -LocalPort ${port}
if ($c) {
  $c | Group-Object OwningProcess | Where-Object { $_.Name -ne '0' } | ForEach-Object {
    $procId = [int]$_.Name
    $p = Get-Process -Id $procId
    [PSCustomObject]@{
      pid    = $procId
      name   = [string]$p.ProcessName
      path   = [string]$p.Path
      states = (($_.Group.State | Sort-Object -Unique) -join ',')
    }
  } | ConvertTo-Json -Compress
}`;
      const encoded = Buffer.from(script, "utf16le").toString("base64");
      const { stdout } = await execAsync(
        `powershell -NoProfile -NonInteractive -EncodedCommand ${encoded}`,
        { timeout: EXEC_TIMEOUT_MS }
      );
      const text = stdout.trim();
      if (!text) return [];
      const parsed = JSON.parse(text);
      return Array.isArray(parsed) ? parsed : [parsed];
    }

    // POSIX (best effort): lsof listeners.
    const { stdout } = await execAsync(`lsof -nP -iTCP:${port} -sTCP:LISTEN`, {
      timeout: EXEC_TIMEOUT_MS,
    });
    return stdout
      .trim()
      .split("\n")
      .slice(1)
      .filter(Boolean)
      .map((line) => {
        const cols = line.split(/\s+/);
        return { pid: Number(cols[1]), name: cols[0], path: "", states: "LISTEN" };
      });
  } catch {
    return [];
  }
}

/**
 * Build a human-readable port-conflict report: who holds the port and how to free it.
 *
 * @param {number} port
 * @param {string} label  Short prefix for log lines, e.g. "frontend" or "backend".
 * @returns {Promise<string>}
 */
export async function getPortConflictReport(port, label) {
  const holders = await findPortHolders(port);
  const lines = [`[${label}] Port ${port} is already in use — refusing to start.`];

  if (holders.length > 0) {
    lines.push(`[${label}] Held by:`);
    for (const h of holders) {
      const where = h.path ? `  (${h.path})` : "";
      lines.push(`[${label}]   • PID ${h.pid} — ${h.name || "unknown"} [${h.states}]${where}`);
    }
    const pids = [...new Set(holders.map((h) => h.pid))].join(",");
    lines.push(
      process.platform === "win32"
        ? `[${label}] → Free it:   Stop-Process -Id ${pids} -Force`
        : `[${label}] → Free it:   kill -9 ${pids}`
    );
  } else {
    lines.push(
      `[${label}] Could not identify the owner — it may hold a "Bound" socket without listening.`
    );
    if (process.platform === "win32") {
      lines.push(
        `[${label}] → Inspect:   Get-NetTCPConnection -LocalPort ${port} | Select LocalAddress,State,OwningProcess`
      );
    }
  }

  if (process.platform === "win32") {
    lines.push(
      `[${label}] → Permanent fix (admin): reserve the port so no app grabs it as a dynamic port:`,
      `[${label}]     netsh int ipv4 add excludedportrange protocol=tcp startport=${port} numberofports=1`,
      `[${label}]     netsh int ipv6 add excludedportrange protocol=tcp startport=${port} numberofports=1`
    );
  }

  return lines.join("\n");
}
