module.exports = {
  apps: [
    {
      name: 'Unpossiblegamelabs Pledge Manager',
      script: 'lib/entry.js',
      instances: 'max',
      exec_mode: 'cluster',
      error: './logs/err.log',
      output: './logs/app.log',
      log: './logs/raw.log',
      merge_logs: false,
      log_type: "json",
      env: {
        NODE_ENV: 'development',
	APP_NAME: 'unpossiblegamelabs'
      },
      env_staging: {
        NODE_ENV: 'staging',
      },
      env_production: {
        NODE_ENV: 'production',
      },
    },
  ],
};