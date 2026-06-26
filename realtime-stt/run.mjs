#!/usr/bin/env node
// Bootstrap for the real-time STT service:
//   1. create .venv if missing
//   2. install requirements.txt if it changed since the last install (hash stamp)
//   3. run main.py with the venv's python (no manual "activate" needed)
//
// Used by `pnpm dev:stt`. Idempotent: after the first run the venv + deps are
// reused, so subsequent launches start immediately.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const here = dirname(fileURLToPath(import.meta.url));
const isWin = process.platform === "win32";
const venvDir = join(here, ".venv");
const venvPy = isWin
  ? join(venvDir, "Scripts", "python.exe")
  : join(venvDir, "bin", "python");
const reqFile = join(here, "requirements.txt");
const stampFile = join(venvDir, ".req-stamp");

const log = (msg) => console.log(`[stt] ${msg}`);
const fail = (msg) => {
  console.error(`[stt] ${msg}`);
  process.exit(1);
};

function findBasePython() {
  const candidates = isWin ? ["python", "py", "python3"] : ["python3", "python"];
  for (const cmd of candidates) {
    if (spawnSync(cmd, ["--version"], { stdio: "ignore" }).status === 0) return cmd;
  }
  fail("No Python found on PATH. Install Python 3.10+ and retry.");
}

// 1. venv
if (!existsSync(venvPy)) {
  const base = findBasePython();
  log(`creating virtual env (.venv) with ${base} …`);
  if (spawnSync(base, ["-m", "venv", venvDir], { stdio: "inherit" }).status !== 0) {
    fail("venv creation failed.");
  }
}

// 2. requirements (reinstall only when requirements.txt changed)
const reqHash = createHash("sha256").update(readFileSync(reqFile)).digest("hex");
const upToDate =
  existsSync(stampFile) && readFileSync(stampFile, "utf8").trim() === reqHash;
if (!upToDate) {
  log("installing requirements (first run or requirements.txt changed) — this can take a while…");
  spawnSync(venvPy, ["-m", "pip", "install", "--upgrade", "pip", "--quiet"], { stdio: "inherit" });
  if (spawnSync(venvPy, ["-m", "pip", "install", "-r", reqFile], { stdio: "inherit" }).status !== 0) {
    fail("pip install failed. Check the output above (e.g. CUDA/torch wheels).");
  }
  writeFileSync(stampFile, reqHash);
  log("requirements installed.");
}

// 3. run main.py with the venv python, forwarding signals + exit code
const child = spawn(venvPy, ["main.py"], { cwd: here, stdio: "inherit" });
child.on("exit", (code) => process.exit(code ?? 0));
for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => child.kill(sig));
}
