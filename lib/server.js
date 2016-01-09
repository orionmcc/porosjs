import express from 'express';
import path from "path";
import fs from "fs";

//Express Middleware
import CookieParser from 'cookie-parser';
import BodyParser from 'body-parser';
import sassMiddleware from 'node-sass-middleware';

//Portal classes
import Template from './template';
import {handleStaticAssets, handleLib, handlePage} from './core';
import {postData} from './api';

import DBAdapter from './mongo';
let DB = new DBAdapter();

let app = express();
let router = express.Router();


function DefaultErrorHandler() {
	return function(err, req, res, next) {
		console.log('Default Error: ', err);

		if (res.headersSent) {
			return next(err);
		}

		res.end();
	};
};

const clientPath = __dirname + '/../client';
const SITEDIRECTORY = '../';
const TEMPLATEDIRECTORY = 'templates'


//STATIC DATA, we'll get an editor someday
// let Data = {
// 	Site: {
// 		Title: "POROS",
// 		Description: "a test of my sweet site builder",
// 		UserEmail: "orion.mcclelland@outlook.com",
// 		CopyrightYear: 2015,
// 		Address: "Never on the internet"
// 	},
// 	Pages: [
// 		{
// 			id: 1,
// 			slug: "welcome",
// 			template: "welcome",
// 			TagLine: "Where the awesome is",
// 			default: true
// 		},
// 		{
// 			id: 2,
// 			slug: "mylife",
// 			template: "blog"
// 		}
// 	],
// }

async function start(port, site)
{
		if (!port) {
			port = 3000;
		}
		if (!site) {
			site = 'poros-site';
		}
		site = SITEDIRECTORY + site;
		let siterc = `${site}/.siterc`;
		let sitefunctions = __dirname + `/../${site}/functions`;
		let siteData = null;
		let Fx = null;
		let PAGES = null;

		try {
			//Init the database
			await DB.initialize();
			PAGES = await DB.databaseGet('pages', 'page');

			//TODO: Take this out, this is test population of data
			// await DB.databasePut('pages', '_GLOBALS', null, Data.Site);
			// await DB.databasePut('pages', 'page', 1, Data.Pages[0]);
			// await DB.databasePut('pages', 'page', 2, Data.Pages[1]);

			//import the site Data
			console.log(siterc);
			siteData = JSON.parse(fs.readFileSync(siterc, 'utf8'));
			fs.watchFile(siterc, function (curr, prev) {
				console.log('siterc changed, reload required.');
			});

			Fx = new require(sitefunctions);
		} catch(err) {
			throw err;
		}

		return new Promise((resolve, reject) => {
			//Setup the app
			app.use('/', CookieParser());
			app.use('/', BodyParser.urlencoded({extended: true}));
			//app.use('/', Session({secret: config.CLIENT_SECRET, resave: false, saveUninitialized: true,
			//    cookie: { path: '/', httpOnly: false, secure: false, maxAge: config.LOGIN_EXPIRES * 1000 } }));
			app.use('/', BodyParser.json());
			app.use(sassMiddleware({
				/* Options */
				src: __dirname,
				dest: path.join(__dirname, 'public'),
				debug: true,
				outputStyle: 'compressed',
				prefix:  '/prefix'  // Where prefix is at <link rel="stylesheets" href="prefix/style.css"/>
			}));



			app.post('/api/data', postData);

			app.get('/styles/*.css', handleLib(__dirname + `/../${site}/`, siteData.libs));
			app.get('/lib/*.js', handleLib(__dirname + `/../${site}/`, siteData.libs));
			app.get('/font/*', handleStaticAssets(__dirname + `/../${site}`));
			app.get('/img/*', handleStaticAssets(__dirname + `/../${site}`));
			app.get('/porosedit.js', handleStaticAssets(__dirname));
			app.get('/porosedit.css', handleStaticAssets(__dirname+'/../styles/'));
			app.get(['/editor/*.css', '/editor/*.ttf', '/editor/*.woff', '/snins/*.css'], handleStaticAssets(__dirname+'/../styles/'));

			//setup page routes
			for (let page of PAGES) {
				console.log(`Adding route ${page.slug}`, page);
				const templateDef = siteData.templates[page.template];
				const siteVars = siteData.site;

				app.get(`/${page.slug}`,
					handlePage(
						page.id,
						siteVars,
						() => new Template(`${site}/${TEMPLATEDIRECTORY}`, templateDef), //Usage of a lanbda makes sure the template is evaluated each time
						Fx.getData
					));
				if (page.default) {
					app.get(`/`,
						handlePage(
							page.id,
							siteVars,
							() => new Template(`${site}/${TEMPLATEDIRECTORY}`, templateDef),
							Fx.getData
						));
				}
			}

			//Error handling goes last.  No for reals, this needs to be last
			app.use(DefaultErrorHandler());

			//GO!
			app.listen(port);
			console.info("Listening on port " + port);
		});
}




export default function(port) {
	start(port)
	.catch((err) => {
		console.error('[GLOBAL Exception]', err.stack);
	});
};
