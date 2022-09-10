import express from 'express';
import path from "path";
import fs from "fs";
import enableDestroy from 'server-destroy';
import jsyaml from 'js-yaml';
import proxy from 'express-http-proxy';

//Express Middleware
import CookieParser from 'cookie-parser';
import BodyParser from 'body-parser';
//import sassMiddleware from 'node-sass-middleware';
import session from 'express-session';
import multer from 'multer';

//Portal classes
import Template from './template';
import {handleStaticAssets, handleLib, handlePage, handleAPI, runInitializer} from './core';
import {postData, getSiteData, getPageData, getTemplates,
    getCollections, getCollection, getCollectionMeta,
    getRevisions, restoreRevision,
    getRecord, postRecord, deleteRecord,
    importRecords, exportRecords,
    getPages, getPage, postPage, deletePage,
    getUser, getUsers, postUser} from './api';
import {verifyAuthEndpoint, verifyAuthToken, 
        authenticateUser, authenticateTFA, 
        generateTFASecret, verifyTFASecret, 
        logout} from './authentication';

import DBAdapter from './database';
let DB = new DBAdapter();

import EmailAdapter from './email';
let EMAIL = new EmailAdapter();

import { env, server, services } from '../local/local';

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
    let siteyml = `${site}/site.yml`;
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
        let SITEDATA = jsyaml.load(fs.readFileSync(siteyml, 'utf8'));//JSON.parse(fs.readFileSync(siterc, 'utf8'));
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

        GLOBALS[0]['lastUpdatedAt'] = new Date();
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
      console.log('server', server);
      app.use(CookieParser(server.SESSION_SECRET));
      app.use(BodyParser.urlencoded({extended: true}));
      app.use(BodyParser.json());
      // app.use(sassMiddleware({
      //   /* Options */
      //   src: __dirname,
      //   dest: path.join(__dirname, 'public'),
      //   debug: true,
      //   outputStyle: 'compressed',
      //   prefix:  '/prefix'  // Where prefix is at <link rel="stylesheets" href="prefix/style.css"/>
      // }));

      app.use(session({
        secret: server.SESSION_SECRET,
        resave: false,
        saveUninitialized: true,
        cookie: { secure: env.production }
      }))
      if (env.production) {
        app.set('trust proxy', 1);
      }

      //process templateDefs
      const templateDefs = {};
      console.log("Processing Page Templates...");

      function safe_array(obj) {
        return obj || [];
      }

      function safe_hash(obj) {
        return obj || {};
      }

      function processTemplate(templateName, template, templateDefs) {
        if (templateDefs[templateName]) return;
        if (!SITEDATA.templates[templateName]) throw "Template processing error, unknown template "+templateName;
        if (template) {
          //process all template def includes
          let include = template.includes || [];

          while (include.length) {
            const current = include.shift();

            if (!templateDefs[current]) {
              processTemplate(current, { ...SITEDATA.templates[current] }, templateDefs);
            }

            function reduce_unique (items, item) {
              if (items.includes(item)) return items
              return [...items, item];
            }

            template = {
              libs: [...safe_array(templateDefs[current].libs), ...safe_array(template.libs) ].reduce(reduce_unique, []),
              scripts: [...safe_array(templateDefs[current].scripts), ...safe_array(template.scripts) ].reduce(reduce_unique, []),
              styles: [...safe_array(templateDefs[current].styles), ...safe_array(template.styles) ].reduce(reduce_unique, []),
              collections: [...safe_array(templateDefs[current].collections), ...safe_array(template.collections) ].reduce(reduce_unique, []),
              vars: { ...safe_hash(templateDefs[current].vars), ...safe_hash(template.vars) },
              sections: {
                meta: [...safe_array(safe_hash(templateDefs[current].sections).meta), ...safe_array(safe_hash(template.sections).meta) ].reduce(reduce_unique, []),
                body: [...safe_array(safe_hash(templateDefs[current].sections).body), ...safe_array(safe_hash(template.sections).body) ].reduce(reduce_unique, [])
              },
            };
          }
          templateDefs[templateName] = template;
        }
      }

      for (let current in SITEDATA.templates) {
        processTemplate(current, {...SITEDATA.templates[current]}, templateDefs);
      }
      console.log(templateDefs);


      //health
      app.all('/pulse', (req, res, next) => { res.sendStatus(200); });

      app.all('/api/*', verifyAuthEndpoint('poros.admin'));
      app.get('/api/site/data', getSiteData(SITEDATA.site));
      app.get('/api/site/templates/', getTemplates(templateDefs));

      app.get('/api/collections/', getCollections(SITEDATA.collections));
      app.get('/api/collections/:collection', getCollection());
      app.get('/api/collections/:collection/meta', getCollectionMeta(SITEDATA.collections));
      app.post('/api/collections/:collection/import', Upload.single('Records'), importRecords(SITEDATA.collections, FX));
      app.get('/api/collections/:collection/export', exportRecords(SITEDATA.collections, FX));
      app.get('/api/collections/:collection/:record', getRecord(SITEDATA.collections));
      app.get('/api/collections/:collection/:record/revisions', getRevisions(SITEDATA.collections));
      app.post('/api/collections/:collection/:record/revisions', restoreRevision(SITEDATA.collections, FX));
      app.post('/api/collections/:collection/:record', postRecord(SITEDATA.collections, FX));
      app.delete('/api/collections/:collection/:record', deleteRecord());

      app.get('/api/page/:id/data', getPageData(PAGES, templateDefs));
      app.get('/api/pages/', getPages(PAGES));
      app.get('/api/page/:id', getPage(PAGES));
      app.post('/api/page/:id?', postPage(PAGES), () => setTimeout(resetServer, 1));
      app.delete('/api/page/:id', deletePage(), () => setTimeout(resetServer, 1));

      app.get('/api/users/', getUsers());
      app.get('/api/user/:username', getUser());
      app.post('/api/user/:username', postUser());
      app.delete('/api/user/:username', verifyAuthEndpoint('poros.superuser'));
      app.get('/api/tfasecret', generateTFASecret());
      app.post('/api/tfaverify', verifyTFASecret());

      app.post('/api/data', postData);

      console.log('ADMIN',`/${PATHS.admin || 'admin'}`)
      const SYSTEM_PATHS = PATHS.system || {};
      const ADMIN_PATH = PATHS.admin || 'admin';
      const STATIC_PATH = PATHS.static  || 'static';
      const SCRIPTS_PATH = PATHS.scripts || 'scripts';
      app.get(`/${ADMIN_PATH}`,  SYSTEM_PATHS.login ? handleStaticAssets(__dirname + `/../${site}/`, SYSTEM_PATHS.login) : handleStaticAssets(__dirname+'/../public/', 'admin.html'));
      app.post(`/${ADMIN_PATH}`,  [authenticateUser(), function(req, res, next){ res.redirect('/#!'); }]);
      app.get('/tfalogin',  SYSTEM_PATHS.tfalogin ? handleStaticAssets(__dirname + `/../${site}/`, SYSTEM_PATHS.tfalogin) : handleStaticAssets(__dirname+'/../public/', 'tfalogin.html'));
      app.post('/tfalogin',  [authenticateTFA(), function(req, res, next){ res.redirect('/#!'); }]);
      app.get('/logout',  [logout(), function(req, res, next){ res.redirect('/'); }]);

      
      app.get([
        `/${STATIC_PATH}/*`,
        `/${PATHS.styles  || 'styles'}/*`,
        `/${SCRIPTS_PATH}/*`,
        `/${PATHS.fonts   || 'fonts'}/*`,
        `/${PATHS.images  || 'images'}/*`
      ], handleStaticAssets(__dirname + `/../${site}/`));
      app.get('/lib/*', handleLib(__dirname + `/../${site}/`, SITEDATA.libs, `${SCRIPTS_PATH}/`));
      app.get('/porosedit.js', handleStaticAssets(__dirname));
      app.get('/porosedit.min.js', handleStaticAssets(__dirname));
      app.get('/porosedit_working.js', handleStaticAssets(__dirname));
      app.get('/porosedit.css', handleStaticAssets(__dirname+'/../public/styles/'));
      app.get(['/editor/*.css', '/editor/*.ttf', '/editor/*.woff', '/skins/*.css'], handleStaticAssets(__dirname+'/../public/styles/'));
      app.get(['/editor/*.js'], handleStaticAssets(__dirname+'/../public/js/'));


      //setup page routes
      for (let page of PAGES) {
        const templateDef = templateDefs[page.template];
        const siteVars = SITEDATA.site;
        //const url = templateDef.resource ? [`/${page.slug}/:${templateDef.resource.name}`] : [`/${page.slug}`];
        const url = [`/${page.slug}`];
        const unauthorizedRedirect = siteVars ? siteVars.redirect : null;
        let handlers = [];

        console.log(`Adding route ${url}`, page);

        if (page.access
          && (page.access === 'poros.user' || page.access === 'poros.admin' || page.access === 'poros.superuser')) {
            handlers.push(verifyAuthEndpoint(page.access, unauthorizedRedirect/*Consider accepting a page.errorRedirect here*/));
        }

        if (page.access
          && (page.access === 'poros.maintenance')) {
            handlers.push(async function(req, res, next) {
              const authToken = req.cookies.auth || '';
              const tokenVerified = await verifyAuthToken(authToken, 'poros.admin');
              if (tokenVerified) {
                next();
              } else {
                res.status(200).sendFile(path.join(__dirname, '/../', site, STATIC_PATH, '/maintenance.html'));
              }
            });
        }

        if (!templateDef) {
          handlers.push(async function(req, res, next) {
            const authToken = req.cookies.auth || '';
            const tokenVerified = await verifyAuthToken(authToken, 'poros.admin');
            if (tokenVerified) {
              next();
            } else {
              res.status(200).sendFile(path.join(__dirname, '/../', site, STATIC_PATH, '/maintenance.html'));
            }
          });
          handlers.push(async function(req, res, next) {
            let blankTemplate = "<html><head><link rel='stylesheet' href='/porosedit.css'>";
            blankTemplate += "<link rel='stylesheet' href='/editor/skin.min.css'>";
            blankTemplate += "<script async='' src='/porosedit.js'></script></head>";
            blankTemplate += `</head><h1>Template definition \"${page.template}\" is not available, please pick another one for page \"${page.slug}\"</h1>`;
            blankTemplate += `<br /><a href='${ADMIN_PATH}'>LOGIN</a>`;
            res.send(blankTemplate);
          });
        } else {
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
        }

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
            blankTemplate += `</head>Run <i>yarn add:user SITE USERNAME PASSWORD [a s u]</i> in the console then <br /><a href='${ADMIN_PATH}'>LOGIN</a>`;
            res.send(blankTemplate);
          }
        });
      }

      const apis = SITEDATA.apis || [];
      for (let api of apis) {
        const METHOD = app[api.method];
        const FUNCTION = api.function;
        const ADMIN = !(!api.admin);
        const ROOT = api.root || '/siteapi/';
        const PATH = `${ROOT}${api.route}`;

        if (typeof FX[FUNCTION] !== 'function') {
          console.warn(`could not find function ${api.function} for API ${api.route}`);
          continue; //make sure the route function exists
        }
        if (typeof METHOD !== 'function') {
          console.warn(`could not find method ${api.method} for API ${api.route}`);
          continue; //make sure the route function exists
        }

        console.log(`Adding api route ${api.method}`, PATH, ADMIN ? 'ADMIN ONLY' : '');
        METHOD.call(app, PATH, ADMIN ? verifyAuthEndpoint('poros.admin') : (req, res, next) => next() , handleAPI(FX[FUNCTION], DB, EMAIL, COLLECTIONS, FX));
      }


      for (let service of services) {
        console.log(`Adding service /service/${service.route} >>> ${service.uri}`, service.admin ? 'ADMIN ONLY' : '');
        app.use(`/service/${service.route}`,
          false ? verifyAuthEndpoint('poros.admin') : (req, res, next) => next(),
          (req, res, next) => { console.log('Forwarding to service', service.route); next() },
          proxy(service.uri))
      }

      app.use(function(req, res, next){
        res.status(404);

        // respond with html page
        if (req.accepts('html')) {
          res.status(404).sendFile(path.join(__dirname, '/../', site, STATIC_PATH, '/404.html'));
          return;
        }

        // respond with json
        if (req.accepts('json')) {
          res.send({ error: 'Not found' });
          return;
        }

        // default to plain-text. send()
        res.type('txt').send('Not found');
      });

      const initializers = SITEDATA.initializers || [];
      for (let initializer of initializers) {
        console.log(`Running initializer`, initializer);
        if (FX[initializer]) runInitializer(FX[initializer], DB, EMAIL, COLLECTIONS, FX);
        else console.error("Can not find initializer function,", initializer, ", in FX")
      }

      //Error handling goes last.  No for reals, this needs to be last
      app.use(DefaultErrorHandler());

      //GO!
      serverHandle = app.listen(port);
      enableDestroy(serverHandle);
      console.info("Listening on port " + port, env.production ? "PRODUCTION" : "DEVELOPMENT");
    }


    [siteyml, sitefunctions, sitestrings].forEach(file => {
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
