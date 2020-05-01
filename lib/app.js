import server_run from './server';
import { server } from '../local/local';

console.info(`Running ${server.app} on ${server.port}`);
server_run(server.port, server.app);
