/**
 * PM2 ecosystem configuration for OBS Live Suite
 */
module.exports = {
  apps: [
    {
      name: 'obs-live-suite',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: './.pm2/logs/error.log',
      out_file: './.pm2/logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },
  ],
};

