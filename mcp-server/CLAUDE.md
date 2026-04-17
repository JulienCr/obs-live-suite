# MCP Server (obs-live-suite-mcp)

Workspace package exposing OBS Live Suite control as MCP tools.

## Run / Test

```bash
pnpm dev:mcp       # From repo root: tsx watch mcp-server/src/index.ts
pnpm test:mcp      # Jest via pnpm --filter obs-live-suite-mcp test
```

## Transports

Two transports served by the same process:
- **stdio** — wired into Claude Code via root `.mcp.json` (see `src/stdio.ts`)
- **Streamable HTTP** — port **3004** (see `src/index.ts`)

The server is **stateless**: each HTTP tool call spins up a fresh MCP Client + Transport; no session persistence.

## Layout

- `src/config.ts` — reads env (`USE_HTTPS`, `MCP_PORT`, etc.); auto-detects mkcert certificates for HTTPS
- `src/httpClient.ts` — shared HTTP client proxying to frontend (`:3000`) and backend (`:3002`)
- `src/index.ts` — HTTP entrypoint; sets `NODE_TLS_REJECT_UNAUTHORIZED=0` for dev
- `src/stdio.ts` — stdio entrypoint
- `src/tools/` — one file per domain (10 domains, **35 tool registrations**):
  `guests`, `posters`, `subvideos`, `lower-third`, `countdown`, `poster-overlay`, `chat`, `clear-all`, `sommaire`, `text-presets`

## Gotchas

- **IPv6**: Node 22 resolves `localhost` → `::1`, but the Next.js / backend servers listen on IPv4. Always use `127.0.0.1` explicitly in config.
- **TLS with mkcert**: `NODE_TLS_REJECT_UNAUTHORIZED=0` is set in `src/index.ts` for dev — required when mkcert certificates are detected.
- **Stateless mode**: Don't rely on server-side session state between tool calls.
- **Tool count is authoritative here, not in root CLAUDE.md** — when adding/removing tools, update the count in `../CLAUDE.md` MCP Server section as well.

## Test Setup

Independent Jest config (`jest.config.cjs` + `jest.transform.cjs`):
- ts-jest + custom transform to rewrite `import.meta.url` (Node ESM → CommonJS test env)
- Tests: `__tests__/config.test.ts`, `__tests__/httpClient.test.ts`, `__tests__/tools/`
