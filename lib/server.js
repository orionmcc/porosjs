import express from 'express';
import path from "path";
import fs from "fs";
import enableDestroy from 'server-destroy';
import jsyaml from 'js-yaml';
import proxy from 'express-http-proxy';

//Express Middleware
import CookieParser from 'cookie-parser';
import BodyParser from 'body-parser';
import sassMiddleware from 'node-sass-middleware';
import session from 'express-session';
import multer from 'multer';

//Portal classes
import Template from './template';
import {handleStaticAssets, handleLib, handlePage, handleAPI,
    authenticateUser, authenticateTFA, generateTFASecret, verifyTFASecret, logout} from './core';
import {postData, getSiteData, getPageData, getTemplates,
    getCollections, getCollection, getCollectionMeta,
    getRecord, postRecord, deleteRecord,
    importRecords, getPages, getPage, postPage, deletePage,
    getUser, getUsers, postUser} from './api';
import {verifyAuthEndpoint} from './authentication';

import DBAdapter from './database';
let DB = new DBAdapter();

import EmailAdapter from './email';
let EMAIL = new EmailAdapter();

import { env, server, services } from '../local';

let app;
let serverHandle;


function DefaultErrorHandler() {
  return function(err, req, res, next) {

    if (!res.headersSent) {
      if (err.status) {
        res.sendStatus(err.status);
      }
      else {
        res.sendStatus(500);
      }
    }

    if (err.status) {
      console.log(err.text);
    } else {
      console.log('Default Error: ', err);
    }
    console.log(err.stack);


    res.end();
  };
};

const clientPath = __dirname + '/../client';
const SITEDIRECTORY = '../';
const TEMPLATEDIRECTORY = 'templates'



async function start(port, siteName)
{
    let site = SITEDIRECTORY + siteName;
    let siterc = `${site}/.siterc`;
    let sitefunctions = __dirname + `/../${site}/functions.js`;
    let sitestrings = `${site}/strings.yml`;

    let storage = multer.memoryStorage()
    let Upload = multer({ storage: storage });

    //Init the database
    await DB.initialize(siteName);



    async function initialize() {
      try {
        console.log('initialize');
        let PAGES = await DB.databaseGet('pages', 'page');
        console.log('PAGES', PAGES);

        //import the site Data
        console.log('siterc', siterc);
        let SITEDATA = JSON.parse(fs.readFileSync(siterc, 'utf8'));
        console.log('SITEDATA', SITEDATA);

        //import site strings
        let STRINGS = jsyaml.load(fs.readFileSync(sitestrings, 'utf8'));
        console.log('STRINGS', STRINGS);

        console.log('pull the site data');
        let globalsUpdated = false;
        let GLOBALS = await DB.databaseGet('pages', '_GLOBALS');
        if (GLOBALS[0] === undefined) {
          GLOBALS[0] = {};
          globalsUpdated = true;
        }
        console.log("GLOBALS", GLOBALS[0]);
        //todo: add defaults support
        for (let key in SITEDATA.site) {
          if (GLOBALS[0][key] !== SITEDATA.site[key]) {
            console.log(`Adding key ${key} as ${SITEDATA.site[key].default}`);
            GLOBALS[0][key] = SITEDATA.site[key].default;
            globalsUpdated = true;
          }
        }
        if (globalsUpdated) await DB.databasePut('pages', '_GLOBALS', null, GLOBALS[0]);

        let FX = new require(sitefunctions);

        return {PAGES, SITEDATA, FX, STRINGS};
      } catch(err) {
        console.error(err);
      }
    }

    function resetServer() {
      if (serverHandle) {
        console.log('Close....');
        serverHandle.destroy(function() {
          console.info('reloading');
          app = null;
          serverHandle = null;
          serverGo();
        });
      }
    }

    function serveSite(PAGES, SITEDATA, FX, STRINGS) {
      //We can override the port for this site to make loads more predictable
      if(SITEDATA.port) {
        port = SITEDATA.port;
        console.log('site.rc override, port set to', port);
      }

      //Set paths
      let PATHS = SITEDATA.paths || {};
      PATHS.scripts = PATHS.scripts || 'scripts';
      PATHS.styles = PATHS.styles || 'styles';
      PATHS.images = PATHS.images || 'img';
      PATHS.fonts = PATHS.fonts || 'fonts';
      console.log('PATHS', PATHS);

      //Site collection templates
      let COLLECTIONS = SITEDATA.collections;
      console.log('COLLECTIONS', COLLECTIONS);

      app = express();

      //Setup the app
      app.use(CookieParser());
      app.use(BodyParser.urlencoded({extended: true}));
      //app.use('/', Session({secret: config.CLIENT_SECRET, resave: false, saveUninitialized: true,
      //    cookie: { path: '/', httpOnly: false, secure: false, maxAge: config.LOGIN_EXPIRES * 1000 } }));
      app.use(BodyParser.json());
      app.use(sassMiddleware({
        /* Options */
        src: __dirname,
        dest: path.join(__dirname, 'public'),
        debug: true,
        outputStyle: 'compressed',
        prefix:  '/prefix'  // Where prefix is at <link rel="stylesheets" href="prefix/style.css"/>
      }));

      app.use(session({
        secret: server.SESSION_SECRET,
        resave: false,
        saveUninitialized: true,
        cookie: { secure: env.production }
      }))
      if (env.production) {
        app.set('trust proxy', 1);
      }



      app.all('/api/*', verifyAuthEndpoint('poros.admin'));
      app.get('/api/site/data', getSiteData(SITEDATA.site));
      app.get('/api/site/templates/', getTemplates(SITEDATA.templates));

      app.get('/api/collections/', getCollections(SITEDATA.collections));
      app.get('/api/collections/:collection', getCollection());
      app.get('/api/collections/:collection/meta', getCollectionMeta(SITEDATA.collections));
      app.post('/api/collections/:collection/import', Upload.single('Records'), importRecords(SITEDATA.collections, FX));
      app.get('/api/collections/:collection/:record', getRecord(SITEDATA.collections));
      app.post('/api/collections/:collection/:record', postRecord(SITEDATA.collections, FX));
      app.delete('/api/collections/:collection/:record', deleteRecord());

      app.get('/api/page/:id/data', getPageData(PAGES, SITEDATA.templates));
      app.get('/api/pages/', getPages(PAGES));
      app.get('/api/page/:id', getPage(PAGES));
      app.post('/api/page/:id?', postPage(PAGES), () => setTimeout(resetServer, 1));
      app.delete('/api/page/:id', deletePage(resetServer));

      app.get('/api/users/', getUsers());
      app.get('/api/user/:username', getUser());
      app.post('/api/user/:username', postUser());
      app.delete('/api/user/:username', verifyAuthEndpoint('poros.superuser'));
      app.get('/api/tfasecret', generateTFASecret());
      app.post('/api/tfaverify', verifyTFASecret());

      app.post('/api/data', postData);

      console.log('ADMIN',`/${PATHS.admin || 'admin'}`)
      app.get(`/${PATHS.admin || 'admin'}`,  handleStaticAssets(__dirname+'/../public/', 'admin'));
      app.post(`/${PATHS.admin || 'admin'}`,  [authenticateUser(), function(req, res, next){ res.redirect('/#!'); next(); }]);
      app.get('/tfalogin',  handleStaticAssets(__dirname+'/../public/'));
      app.post('/tfalogin',  [authenticateTFA(), function(req, res, next){ res.redirect('/#!'); next(); }]);
      app.get('/logout',  [logout(), function(req, res, next){ res.redirect('/'); next(); }]);

      // app.get('/styles/*.css', handleLib(__dirname + `/../${site}/`, SITEDATA.styles));
      // app.get('/lib/*.js', handleLib(__dirname + `/../${site}/`, SITEDATA.libs));
      app.get([
        `/${PATHS.styles}/*`,
        `/${PATHS.scripts}/*`,
        `/${PATHS.fonts}/*`,
        `/${PATHS.images}/*`
      ], handleStaticAssets(__dirname + `/../${site}/`));
      app.get('/lib/*', handleLib(__dirname + `/../${site}/`, SITEDATA.libs));
      app.get('/porosedit.js', handleStaticAssets(__dirname));
      app.get('/porosedit.min.js', handleStaticAssets(__dirname));
      app.get('/porosedit_working.js', handleStaticAssets(__dirname));
      app.get('/porosedit.css', handleStaticAssets(__dirname+'/../public/styles/'));
      app.get(['/editor/*.css', '/editor/*.ttf', '/editor/*.woff', '/skins/*.css'], handleStaticAssets(__dirname+'/../public/styles/'));



      //setup page routes
      for (let page of PAGES) {
        console.log(`Adding route ${page.slug}`, page);
        const templateDef = SITEDATA.templates[page.template];
        const siteVars = SITEDATA.site;

        let handlers = [];
        if (page.access
          && (page.access === 'poros.admin' || page.access === 'poros.superuser')) {
            handlers.push(verifyAuthEndpoint(page.access));
        }
        console.log('STRINGS', STRINGS[page.template]);
        handlers.push(
          handlePage(
            page.id,
            siteVars,
            PATHS,
            FX,
            COLLECTIONS,
            () => new Template(`${site}/${TEMPLATEDIRECTORY}`, templateDef), //Usage of a lanbda makes sure the template is evaluated each time
            STRINGS[page.template] || {}
          ))

        const url = [`/${page.slug}`];
        if (page.default === true) url.push('/');
        app.get(url, handlers);
      }

      //empty default if there are no page
      if (PAGES.length === 0) {
        app.get('/', (req, res, next) => {
          if (req.cookies.auth) {
            let blankTemplate = "<html><head><link rel='stylesheet' href='/porosedit.css'>";
            blankTemplate += "<link rel='stylesheet' href='/editor/skin.min.css'>";
            blankTemplate += "<script async='' src='/porosedit.js'></script></head>";
            blankTemplate += "<body><h1>Start Building Your Website!</h1></body></html>";
            res.send(blankTemplate);
          } else {
            let blankTemplate = "<html><head><link rel='stylesheet' href='/porosedit.css'>";
            blankTemplate += "<link rel='stylesheet' href='/editor/skin.min.css'>";
            blankTemplate += "</head>Run <i>npm run add user USER PASSWORD</i> in the console then <br /><a href='admin'>LOGIN</a>";
            res.send(blankTemplate);
          }
          next(); });
      }

      for (let api of SITEDATA.apis) {
        const METHOD = app[api.method];
        const FUNCTION = api.function;
        const ADMIN = !(!api.admin);

        if (typeof FX[FUNCTION] !== 'function') {
          console.warn(`could not find function ${api.function} for API ${api.route}`);
          continue; //make sure the route function exists
        }
        if (typeof METHOD !== 'function') {
          console.warn(`could not find method ${api.method} for API ${api.route}`);
          continue; //make sure the route function exists
        }

        console.log(`Adding api route ${api.method} /siteapi/${api.route}`, ADMIN ? 'ADMIN ONLY' : '');
        METHOD.call(app, `/siteapi/${api.route}`, ADMIN ? verifyAuthEndpoint('poros.admin') : (req, res, next) => next() , handleAPI(FX[FUNCTION], DB, EMAIL));
      }


      for (let service of services) {
        console.log(`Adding service /service/${service.route} >>> ${service.uri}`, service.admin ? 'ADMIN ONLY' : '');
        app.use(`/service/${service.route}`,
          false ? verifyAuthEndpoint('poros.admin') : (req, res, next) => next(),
          (req, res, next) => {console.log('Forwarding to service', service.route); next() },
          proxy(service.uri))
      }

      //Error handling goes last.  No for reals, this needs to be last
      app.use(DefaultErrorHandler());

      //GO!
      serverHandle = app.listen(port);
      enableDestroy(serverHandle);
      console.info("Listening on port " + port);
    }


    [siterc, sitefunctions, sitestrings].forEach(file => {
      fs.watchFile(file, function (curr, prev) {
        console.log(`${file} changed, reloading....`);
        resetServer();
      });
    });


    //Run the server
    async function serverGo() {
      try {
        const {PAGES, SITEDATA, FX, STRINGS} = await initialize();
        serveSite(PAGES, SITEDATA, FX, STRINGS);
      } catch(err) {
        console.error(err);
      }
    }


    return new Promise((resolve, reject) => {
        serverGo();
    });
}




export default function(port, siteName) {
  start(port, siteName)
  .catch((err) => {
    console.error('[GLOBAL Exception]', err.stack);
  });
};
