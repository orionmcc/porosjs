Restart grafana: pm2 start ecosystem.config.js --env production
Restart prometheus: pm2 start ecosystem.config.js --env production
Restart Mongod: sudo systemctl start mongod
Restart Poros: yarn prod
Restart Scrooge: yarn prod
