import express from 'express';
import path from "path";
import fs from "fs";
import enableDestroy from 'server-destroy';

//Express Middleware
import CookieParser from 'cookie-parser';
import BodyParser from 'body-parser';
import sassMiddleware from 'node-sass-middleware';

//Portal classes
import Template from './template';
import {handleStaticAssets, handleLib, handlePage, handleAPI, authenticateUser, logout} from './core';
import {postData, getSiteData, getPageData, getTemplates,
    getPages, getPage, postPage, deletePage,
    getUser, getUsers, postUser} from './api';
import {verifyAuthEndpoint} from './authentication';

import DBAdapter from './mongo';
let DB = new DBAdapter();

let app;
let serverHandle;;


function DefaultErrorHandler() {
  return function(err, req, res, next) {
    console.log('Default Error: ', err);
    console.log(err.stack);

    if (!res.headersSent) {
      res.sendStatus(500);
    }

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
    let sitefunctions = __dirname + `/../${site}/functions`;

    //Init the database
    await DB.initialize(siteName);



    async function initialize() {
      try {
        console.log('initialize');
        let PAGES = await DB.databaseGet('pages', 'page');
        console.log('PAGES', PAGES);

        //import the site Data
        console.log(siterc);
        let SITEDATA = JSON.parse(fs.readFileSync(siterc, 'utf8'));

        let FX = new require(sitefunctions);

        return {PAGES, SITEDATA, FX};
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

    function serveSite(PAGES, SITEDATA, FX) {
      //We can override the port for this site to make loads more predictable
      if(SITEDATA.port) {
        port = SITEDATA.port;
        console.log('site.rc override, port set to', port);
      }

      app = express();

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



      app.all('/api/*', verifyAuthEndpoint('poros.admin'));
      app.get('/api/site/data', getSiteData(SITEDATA.site));
      app.get('/api/site/templates/', getTemplates(SITEDATA.templates));
      app.get('/api/page/:id/data', getPageData(PAGES, SITEDATA.templates));

      app.get('/api/pages/', getPages(PAGES));
      app.get('/api/page/:id', getPage(PAGES));
      app.post('/api/page/:id', postPage(app, SITEDATA.site, SITEDATA.templates, FX, PAGES, resetServer));
      app.delete('/api/page/:id', deletePage(resetServer));

      app.get('/api/users/', getUsers());
      app.get('/api/user/:username', getUser());
      app.post('/api/user/:username', postUser());
      app.delete('/api/user/:username', verifyAuthEndpoint('poros.superuser'));

      app.post('/api/data', postData);


      app.get('/admin',  handleStaticAssets(__dirname+'/../public/'));
      app.post('/admin',  [authenticateUser(), function(req, res, next){ res.redirect('/#!'); next(); }]);
      app.get('/logout',  [logout(), function(req, res, next){ res.redirect('/'); next(); }]);

      app.get('/styles/*.css', handleLib(__dirname + `/../${site}/`, SITEDATA.libs));
      app.get('/lib/*.js', handleLib(__dirname + `/../${site}/`, SITEDATA.libs));
      app.get('/font/*', handleStaticAssets(__dirname + `/../${site}`));
      app.get('/img/*', handleStaticAssets(__dirname + `/../${site}`));
      app.get('/porosedit.js', handleStaticAssets(__dirname));
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
            handlers.push(verifyAuthEndpoint('poros.admin'));
        }
        handlers.push(
          handlePage(
            page.id,
            siteVars,
            () => new Template(`${site}/${TEMPLATEDIRECTORY}`, templateDef), //Usage of a lanbda makes sure the template is evaluated each time
            FX.getData
          ))

        const url = [`/${page.slug}`];
        if (page.default) url.push('/');
        app.get(url, handlers);
      }

      //empty default if there are no page
      if (PAGES.length === 0) {
        app.get('/', (req, res, next) => { req.send("<h1>HELLO POROS WORLD</h1>"); next(); });
      }

      for (let api in SITEDATA.apis) {
        const API_DEF = SITEDATA.apis[api];
        const METHOD = app[API_DEF.method];
        const FUNCTION = API_DEF.function;

        if (typeof FX[FUNCTION] !== 'function') {
          console.warn(`could not find function ${API_DEF.function} for API ${api}`);
          continue; //make sure the route function exists
        }
        if (typeof METHOD !== 'function') {
          console.warn(`could not find method ${API_DEF.method} for API ${api}`);
          continue; //make sure the route function exists
        }

        console.log(`Adding api route ${api}`, API_DEF);
        METHOD.call(app, `/${api}`, handleAPI(FX[FUNCTION]));
      }

      //Error handling goes last.  No for reals, this needs to be last
      app.use(DefaultErrorHandler());

      //GO!
      serverHandle = app.listen(port);
      enableDestroy(serverHandle);
      console.info("Listening on port " + port);
    }


    fs.watchFile(siterc, function (curr, prev) {
      console.log('siterc changed, reloading....');
      resetServer();
    });


    //Run the server
    async function serverGo() {
      try {
        const {PAGES, SITEDATA, FX} = await initialize();
        serveSite(PAGES, SITEDATA, FX);
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
