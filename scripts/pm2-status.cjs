/**
 * Print one line per PM2 app: "<name>=<status>:<restarts>".
 *
 * Called by scripts/pm2-boot.ps1 to record the stack's real state in the boot
 * log, since "App [x] launched" only means PM2 spawned the process.
 *
 * Reads through PM2's API rather than `pm2 jlist`: that JSON embeds each
 * process environment, which on Windows carries both `username` and `USERNAME`,
 * and PowerShell 5.1's ConvertFrom-Json compares keys case-insensitively and so
 * rejects the whole document as containing duplicates.
 *
 * Usage: node scripts/pm2-status.cjs <path-to-pm2-module>
 * The path is passed in because PM2 is installed globally, next to node.exe,
 * and is not resolvable from this project's node_modules.
 */
const pm2ModulePath = process.argv[2];

if (!pm2ModulePath) {
  console.error('usage: node pm2-status.cjs <path-to-pm2-module>');
  process.exit(2);
}

let pm2;
try {
  pm2 = require(pm2ModulePath);
} catch (err) {
  console.error('cannot load pm2 from ' + pm2ModulePath + ': ' + err.message);
  process.exit(2);
}

pm2.list((err, list) => {
  if (err) {
    console.error(String(err));
    process.exit(1);
  }
  for (const app of list) {
    const env = app.pm2_env || {};
    console.log(app.name + '=' + (env.status || 'unknown') + ':' + (env.restart_time || 0));
  }
  pm2.disconnect();
  process.exit(0);
});
