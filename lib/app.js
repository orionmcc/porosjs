import server_run from './server';
let PORT = 3000;
let SITE = 'poros-site';

//TODO, associate a site with a port and spin up a new server for each site we want to host

//Proccess command line args
for (let i = 2; i < process.argv.length; i++) {
	SITE = process.argv[i];
	console.info(`Running ${SITE} on ${PORT}`);
	server_run(PORT, SITE);
	PORT++;
}
