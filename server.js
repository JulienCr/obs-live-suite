/**
 * Next.js HTTPS Server
 *
 * This file runs the Next.js server with HTTPS support.
 * Certificate paths are defined here since this runs directly with Node.js.
 */
import { createServer } from 'https';
import { parse } from 'url';
import next from 'next';
import { getPortConflictReport } from './scripts/port-diagnostics.mjs';
import { getHttpsServerOptions } from './lib/config/tlsContext.mjs';

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0'; // Listen on all network interfaces
const port = parseInt(process.env.APP_PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// HTTPS options with SNI: mkcert for localhost/edison/LAN, Tailscale Let's
// Encrypt cert for *.ts.net (see lib/config/tlsContext.mjs).
const httpsOptions = getHttpsServerOptions();
if (!httpsOptions) {
  throw new Error(
    'No TLS certificates found. Run `node scripts/setup-https.js` (mkcert) ' +
      'and/or `pnpm cert:tailscale` to generate them.'
  );
}

// Exit code that tells PM2 (via `stop_exit_codes`) NOT to restart on port conflict.
const PORT_IN_USE_EXIT_CODE = 100;

app.prepare().then(() => {
  const httpServer = createServer(httpsOptions, async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // If the port is taken, report WHO holds it + how to free it, then exit with
  // PORT_IN_USE_EXIT_CODE so PM2 (via `stop_exit_codes`) does NOT restart in a loop.
  httpServer.once('error', async (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(await getPortConflictReport(port, 'frontend'));
      console.error(`[frontend] PM2 will NOT restart this process (exit ${PORT_IN_USE_EXIT_CODE}).`);
      process.exit(PORT_IN_USE_EXIT_CODE);
    }
    throw err;
  });

  httpServer.listen(port, hostname, (err) => {
    if (err) throw err;
    console.log(`> Ready on https://localhost:${port}`);
    console.log(`> Network: https://192.168.1.10:${port}`);
  });
});
