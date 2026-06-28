/**
 * Dev-only router: simulate Twitch viewer events via the Twitch CLI.
 *
 * Flow:
 *   1. Browser clicks a button → POST /dev/simulate
 *   2. Backend opens an ephemeral PLAIN-HTTP listener on 127.0.0.1:<random>
 *   3. Backend spawns: twitch event trigger <type> -F http://127.0.0.1:<random>
 *   4. Twitch CLI POSTs an EventSub payload to that listener
 *   5. Listener converts EventSub → ChatMessage → StreamerbotGateway.injectTestEvent()
 *   6. Listener is torn down once the CLI exits
 *
 * The ephemeral listener is plain HTTP on purpose: the main backend may serve
 * HTTPS (mkcert / Tailscale cert) and the Twitch CLI's Go client can neither
 * speak plain HTTP to a TLS port nor validate that cert against 127.0.0.1.
 * Forwarding to a throwaway HTTP port sidesteps the scheme entirely.
 *
 * Registered at /dev only when NODE_ENV !== 'production' (see backend.ts).
 *
 * Prerequisites:
 *   - Twitch CLI installed and in PATH: https://dev.twitch.tv/docs/cli
 */
import { Router } from "express";
import { spawn } from "child_process";
import http from "http";
import { StreamerbotGateway } from "../../lib/adapters/streamerbot/StreamerbotGateway";
import type { ChatMessage } from "../../lib/models/StreamerbotChat";

const router = Router();

// ---------------------------------------------------------------------------
// Mapping: our UI eventType → Twitch CLI event name
// ---------------------------------------------------------------------------
const CLI_EVENT_TYPES: Record<string, string> = {
  follow:   "channel.follow",
  sub:      "channel.subscribe",
  resub:    "channel.subscription.message",
  giftsub:  "channel.subscription.gift",
  raid:     "channel.raid",
  cheer:    "channel.cheer",
};

// ---------------------------------------------------------------------------
// POST /dev/simulate
// Called by the HTML page. Triggers the Twitch CLI and captures the event it
// forwards to a throwaway listener, then injects it into the gateway.
// ---------------------------------------------------------------------------
router.post("/simulate", async (req, res) => {
  const {
    eventType,
    viewers = 42,
    subTier = 1000,
  } = req.body as Record<string, string | number>;

  const cliEvent = CLI_EVENT_TYPES[String(eventType)];
  if (!cliEvent) {
    return res.status(400).json({ error: `Unknown eventType: ${eventType}` });
  }

  const extraArgs: string[] = [];
  // Raid: set viewer count via -C (cost).
  if (eventType === "raid") extraArgs.push("-C", String(viewers));
  // Sub / ReSub / GiftSub: set tier.
  if (["sub", "resub", "giftsub"].includes(String(eventType))) {
    extraArgs.push("--tier", String(subTier));
  }

  try {
    const { output, received } = await triggerAndCapture(cliEvent, extraArgs);
    return res.json({ ok: true, received, output });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ ok: false, error: msg });
  }
});

/**
 * Open a throwaway plain-HTTP listener, point the Twitch CLI at it, and inject
 * the forwarded EventSub payload into the gateway. The listener is closed once
 * the CLI exits (which only happens after it has received our 200 response, so
 * the inject is guaranteed to have run by then).
 */
function triggerAndCapture(
  cliEvent: string,
  extraArgs: string[],
): Promise<{ output: string; received: boolean }> {
  return new Promise((resolve, reject) => {
    let received = false;

    const server = http.createServer((sreq, sres) => {
      if (sreq.method !== "POST") {
        sres.writeHead(405);
        return sres.end();
      }
      let body = "";
      sreq.on("data", (chunk: Buffer) => { body += chunk.toString(); });
      sreq.on("end", () => {
        try {
          const { subscription, event } = JSON.parse(body || "{}");
          const message = buildChatMessage(subscription?.type ?? "", event ?? {});
          if (message) {
            StreamerbotGateway.getInstance().injectTestEvent(message);
            received = true;
          }
          sres.writeHead(200, { "Content-Type": "application/json" });
          sres.end(JSON.stringify({ ok: received }));
        } catch {
          sres.writeHead(400);
          sres.end();
        }
      });
    });

    server.on("error", reject);
    server.listen(0, "127.0.0.1", async () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      const forwardUrl = `http://127.0.0.1:${port}/`;
      try {
        const output = await runCli(["event", "trigger", cliEvent, "-F", forwardUrl, ...extraArgs]);
        server.close();
        resolve({ output, received });
      } catch (err) {
        server.close();
        reject(err);
      }
    });
  });
}

function runCli(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn("twitch", args, { shell: true });
    let out = "";
    proc.stdout.on("data", (d: Buffer) => { out += d.toString(); });
    proc.stderr.on("data", (d: Buffer) => { out += d.toString(); });
    proc.on("close", (code) => {
      if (code === 0) resolve(out.trim());
      else reject(new Error(out.trim() || `twitch CLI exited with code ${code}`));
    });
    proc.on("error", (e) => reject(new Error(`twitch CLI not found in PATH: ${e.message}`)));
  });
}

function str(v: unknown): string { return String(v ?? ""); }
function num(v: unknown): number { return Number(v) || 0; }

function buildChatMessage(type: string, ev: Record<string, unknown>): ChatMessage | null {
  const now = Date.now();

  switch (type) {
    case "channel.follow": {
      const login = str(ev.user_login);
      const name  = str(ev.user_name) || login;
      return {
        id: `follow-dev-${now}`,
        timestamp: now, platform: "twitch", eventType: "follow",
        username: login, displayName: name,
        message: `${name} just followed!`,
        rawPayload: ev,
      };
    }
    case "channel.subscribe": {
      const login = str(ev.user_login);
      const name  = str(ev.user_name) || login;
      return {
        id: `sub-dev-${now}`,
        timestamp: now, platform: "twitch", eventType: "sub",
        username: login, displayName: name,
        message: `${name} subscribed!`,
        metadata: { subscriptionTier: str(ev.tier) as "1000" | "2000" | "3000" },
        rawPayload: ev,
      };
    }
    case "channel.subscription.message": {
      const login  = str(ev.user_login);
      const name   = str(ev.user_name) || login;
      const months = num(ev.cumulative_months);
      return {
        id: `resub-dev-${now}`,
        timestamp: now, platform: "twitch", eventType: "resub",
        username: login, displayName: name,
        message: `${name} resubscribed for ${months} months!`,
        metadata: {
          subscriptionTier: str(ev.tier) as "1000" | "2000" | "3000",
          monthsSubscribed: months,
        },
        rawPayload: ev,
      };
    }
    case "channel.subscription.gift": {
      const login  = str(ev.user_login);
      const name   = str(ev.user_name) || login;
      const recip  = str(ev.recipient_user_name || ev.recipient_user_login);
      const anon   = Boolean(ev.is_anonymous);
      return {
        id: `giftsub-dev-${now}`,
        timestamp: now, platform: "twitch", eventType: "giftsub",
        username: anon ? "anonymous" : login,
        displayName: anon ? "Anonymous" : name,
        message: `${anon ? "Anonymous" : name} gifted a sub to ${recip}!`,
        metadata: {
          subscriptionTier: str(ev.tier) as "1000" | "2000" | "3000",
          eventData: { recipient: recip },
        },
        rawPayload: ev,
      };
    }
    case "channel.raid": {
      const login    = str(ev.from_broadcaster_user_login);
      const name     = str(ev.from_broadcaster_user_name) || login;
      const viewers  = num(ev.viewers);
      return {
        id: `raid-dev-${now}`,
        timestamp: now, platform: "twitch", eventType: "raid",
        username: login, displayName: name,
        message: `${name} is raiding with ${viewers} viewers!`,
        metadata: { eventData: { viewers } },
        rawPayload: ev,
      };
    }
    case "channel.cheer": {
      const login = str(ev.user_login);
      const name  = str(ev.user_name) || login;
      const bits  = num(ev.bits);
      return {
        id: `cheer-dev-${now}`,
        timestamp: now, platform: "twitch", eventType: "cheer",
        username: login, displayName: name,
        message: `${name} cheered ${bits} bits!`,
        metadata: { eventData: { bits } },
        rawPayload: ev,
      };
    }
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// GET /dev  — serve the test UI
// ---------------------------------------------------------------------------
router.get("/", (_req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(UI_HTML);
});

// ---------------------------------------------------------------------------
// HTML UI
// ---------------------------------------------------------------------------
const UI_HTML = /* html */ `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Twitch Event Tester</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #0e0e10; --surface: #18181b; --border: #2f2f35;
    --accent: #9147ff; --green: #00b894; --red: #e84393;
    --text: #efeff1; --muted: #adadb8;
    --follow: #00b894; --sub: #9147ff; --resub: #6441a5;
    --giftsub: #e84393; --raid: #f7931e; --cheer: #f1c40f;
  }
  body { background: var(--bg); color: var(--text); font-family: system-ui, sans-serif;
         font-size: 14px; min-height: 100vh; padding: 24px; max-width: 600px; margin: 0 auto; }
  h1 { font-size: 18px; font-weight: 700; margin-bottom: 4px;
       display: flex; align-items: center; gap: 8px; }
  h1 span { color: var(--accent); }
  .subtitle { color: var(--muted); font-size: 12px; margin-bottom: 20px; font-family: monospace; }

  .card { background: var(--surface); border: 1px solid var(--border);
          border-radius: 8px; padding: 16px; margin-bottom: 16px; }
  label { display: flex; flex-direction: column; gap: 4px; color: var(--muted); font-size: 12px; }
  input[type=text], input[type=number] {
    background: var(--bg); border: 1px solid var(--border); border-radius: 6px;
    color: var(--text); padding: 6px 10px; font-size: 14px; width: 100%;
    transition: border-color .15s;
  }
  input:focus { outline: none; border-color: var(--accent); }
  .fields { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .fields.three { grid-template-columns: 1fr 1fr 1fr; }

  .events { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  .btn {
    border: none; border-radius: 8px; padding: 12px 8px; cursor: pointer;
    font-size: 13px; font-weight: 600; display: flex; flex-direction: column;
    align-items: center; gap: 4px; transition: transform .1s, opacity .15s;
    color: #fff; position: relative;
  }
  .btn:hover { opacity: .85; transform: translateY(-1px); }
  .btn:active { transform: translateY(0); }
  .btn:disabled { opacity: .4; cursor: not-allowed; transform: none; }
  .btn .icon { font-size: 22px; }
  .btn-follow  { background: var(--follow); }
  .btn-sub     { background: var(--sub); }
  .btn-resub   { background: var(--resub); }
  .btn-giftsub { background: var(--giftsub); }
  .btn-raid    { background: var(--raid); color: #111; }
  .btn-cheer   { background: var(--cheer); color: #111; }

  .log-title { font-size: 12px; color: var(--muted); text-transform: uppercase;
               letter-spacing: .06em; margin-bottom: 8px; }
  #log { max-height: 300px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; }
  .log-entry {
    background: var(--bg); border: 1px solid var(--border); border-radius: 6px;
    padding: 8px 12px; font-size: 12px; display: grid;
    grid-template-columns: 60px 1fr; gap: 8px; align-items: start;
  }
  .log-entry.ok  { border-left: 3px solid var(--green); }
  .log-entry.err { border-left: 3px solid var(--red); }
  .log-badge { font-weight: 700; font-size: 11px; padding: 2px 6px;
               border-radius: 4px; text-align: center; }
  .log-badge.ok  { background: #00b89422; color: var(--green); }
  .log-badge.err { background: #e8439322; color: var(--red); }
  .log-msg { color: var(--text); font-family: monospace; white-space: pre-wrap; word-break: break-all; }
  .log-sub { color: var(--muted); font-size: 11px; }
</style>
</head>
<body>
<h1>🎮 <span>Twitch Event Tester</span></h1>
<p class="subtitle">Twitch CLI → EventSub → gateway (DB + WS + cue presenter)</p>

<div class="card">
  <div class="fields">
    <label>Viewers (raid)
      <input type="number" id="viewers" value="42" min="1">
    </label>
    <label>Sub Tier (1000 / 2000 / 3000)
      <input type="number" id="subTier" value="1000" min="1000" max="3000" step="1000">
    </label>
  </div>
  <p style="margin-top:10px;font-size:11px;color:var(--muted)">
    Les noms de viewers sont générés aléatoirement par la CLI Twitch.
  </p>
</div>

<div class="card">
  <div class="events">
    <button class="btn btn-follow"  id="btn-follow"  onclick="fire('follow')">
      <span class="icon">👤</span>Follow
    </button>
    <button class="btn btn-sub"     id="btn-sub"     onclick="fire('sub')">
      <span class="icon">👑</span>Sub
    </button>
    <button class="btn btn-resub"   id="btn-resub"   onclick="fire('resub')">
      <span class="icon">🔄</span>ReSub
    </button>
    <button class="btn btn-giftsub" id="btn-giftsub" onclick="fire('giftsub')">
      <span class="icon">🎁</span>Gift Sub
    </button>
    <button class="btn btn-raid"    id="btn-raid"    onclick="fire('raid')">
      <span class="icon">⚡</span>Raid
    </button>
    <button class="btn btn-cheer"   id="btn-cheer"   onclick="fire('cheer')">
      <span class="icon">💰</span>Cheer
    </button>
  </div>
</div>

<div class="card">
  <div class="log-title">Log CLI</div>
  <div id="log"><div class="log-sub" style="padding:4px 0">Aucun event envoyé.</div></div>
</div>

<script>
const ALL_BTNS = ['follow','sub','resub','giftsub','raid','cheer'];

function setLoading(loading) {
  ALL_BTNS.forEach(t => {
    document.getElementById('btn-' + t).disabled = loading;
  });
}

async function fire(eventType) {
  setLoading(true);
  const body = {
    eventType,
    viewers: Number(document.getElementById('viewers').value) || 42,
    subTier: Number(document.getElementById('subTier').value) || 1000,
  };
  try {
    const r = await fetch('/dev/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await r.json();
    // ok = CLI ran; received = event actually reached the gateway.
    const success = r.ok && data.received !== false;
    const detail = data.received === false
      ? "CLI a tourné mais aucun event reçu (type non géré ?)"
      : (data.output || data.error || '');
    addLog(success, eventType, detail);
  } catch (e) {
    addLog(false, eventType, String(e));
  } finally {
    setLoading(false);
  }
}

function addLog(ok, eventType, detail) {
  const log = document.getElementById('log');
  const placeholder = log.querySelector('.log-sub');
  if (placeholder) placeholder.remove();

  const entry = document.createElement('div');
  entry.className = 'log-entry ' + (ok ? 'ok' : 'err');
  entry.innerHTML =
    '<span class="log-badge ' + (ok ? 'ok' : 'err') + '">' + (ok ? '✓ OK' : '✗ ERR') + '</span>' +
    '<span class="log-msg">' + escHtml(eventType) +
    (detail ? '\\n<span class=\\"log-sub\\">' + escHtml(detail) + '</span>' : '') +
    '</span>';
  log.insertBefore(entry, log.firstChild);
}

function escHtml(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c] || c));
}
</script>
</body>
</html>`;

export default router;
