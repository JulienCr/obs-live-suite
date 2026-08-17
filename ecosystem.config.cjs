/**
 * PM2 ecosystem configuration for OBS Live Suite
 */
module.exports = {
  apps: [
    {
      name: 'obs-backend',
      cwd: __dirname,
      script: 'node',
      // `--import tsx` loads the loader in-process. Going through tsx's CLI
      // instead makes it re-spawn a second node, and PM2 runs its apps without a
      // console, so that grandchild gets a brand-new console -> a stray terminal
      // window on Windows. windowsHide below only covers the child PM2 spawns.
      args: '--import tsx server/backend.ts',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      max_restarts: 3,
      min_uptime: '5s',
      // Exit code 100 = port already in use -> do not restart (avoid spawn loop)
      stop_exit_codes: [100],
      windowsHide: true,
      env: {
        NODE_ENV: 'production',
        PORT: 3003,
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
      // Exit code 100 = port already in use -> do not restart (avoid spawn loop)
      stop_exit_codes: [100],
      windowsHide: true,
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOSTNAME: '0.0.0.0',
      },
      error_file: './.pm2/logs/frontend-error.log',
      out_file: './.pm2/logs/frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },
    {
      name: 'obs-mcp',
      cwd: __dirname + '/mcp-server',
      script: 'node',
      // In-process loader, no tsx CLI re-spawn - see the obs-backend note above.
      args: '--import tsx src/index.ts',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '150M',
      max_restarts: 3,
      min_uptime: '5s',
      windowsHide: true,
      env: {
        NODE_ENV: 'production',
      },
      error_file: './.pm2/logs/mcp-error.log',
      out_file: './.pm2/logs/mcp-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },
    {
      name: 'obs-stt',
      cwd: __dirname + '/realtime-stt',
      // Run through the Node bootstrap (same as `pnpm dev:stt`) so production uses
      // the .venv that has the STT deps installed — not the system `python`, which
      // lacks faster-whisper/sounddevice/etc and would ModuleNotFoundError on boot.
      script: 'run.mjs',
      interpreter: 'node',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1500M',
      max_restarts: 3,
      min_uptime: '5s',
      windowsHide: true,
      error_file: './.pm2/logs/stt-error.log',
      out_file: './.pm2/logs/stt-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },
  ],
};

