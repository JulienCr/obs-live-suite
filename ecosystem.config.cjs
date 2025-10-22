/**
 * PM2 ecosystem configuration for OBS Live Suite
 */
const path = require('path');
const APPDATA_DIR = path.join(__dirname, '.appdata');

module.exports = {
  apps: [
    {
      name: 'obs-backend',
      cwd: __dirname,
      script: 'node',
      args: 'node_modules/tsx/dist/cli.mjs server/backend.ts',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        APPDATA: APPDATA_DIR,
      },
      error_file: './.pm2/logs/backend-error.log',
      out_file: './.pm2/logs/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },
    {
      name: 'obs-frontend',
      cwd: __dirname,
      script: 'scripts/start-frontend.mjs',
      args: '',
      interpreter: 'node',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      max_restarts: 3,
      min_uptime: '5s',
      env: {
        // Fallback to dev if no build is present
        NODE_ENV: 'production',
        PORT: 3000,
        APPDATA: APPDATA_DIR,
      },
      error_file: './.pm2/logs/frontend-error.log',
      out_file: './.pm2/logs/frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },
  ],
};

