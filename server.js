/**
 * Next.js HTTPS Server
 *
 * This file runs the Next.js server with HTTPS support.
 * Certificate paths are defined here since this runs directly with Node.js.
 */
import { createServer } from 'https';
import { parse } from 'url';
import next from 'next';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Certificate paths (same as lib/config/certificates.ts)
const CERT_PATH = path.join(__dirname, 'localhost+4.pem');
const KEY_PATH = path.join(__dirname, 'localhost+4-key.pem');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0'; // Listen on all network interfaces
const port = parseInt(process.env.APP_PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const httpsOptions = {
  key: fs.readFileSync(KEY_PATH),
  cert: fs.readFileSync(CERT_PATH),
};

app.prepare().then(() => {
  createServer(httpsOptions, async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  }).listen(port, hostname, (err) => {
    if (err) throw err;
    console.log(`> Ready on https://localhost:${port}`);
    console.log(`> Network: https://192.168.1.10:${port}`);
  });
});
