import fs from "fs";
import path from "path";
import _ from "underscore";
import speakeasy from 'speakeasy';

import { env, server } from '../local/local';
import DBAdapter from './database';
import {verifyAuthToken, authenticate, generateAuthToken} from './authentication';
import PorosAPIContext from './context';
let DB = new DBAdapter();
let compiledTemplates = {};

function GetDefaults(type) {
  switch(type) {
    case 'text':
      return "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Cras ut mauris dui. Vestibulum in tortor molestie, dictum velit ut, finibus leo. Aenean vitae quam non nisi tristique facilisis eget nec dui. Donec leo odio, euismod ut mi a, pellentesque iaculis tortor. Aliquam leo velit, sodales blandit lectus eu, feugiat varius purus. Integer sed velit at felis ultrices luctus. Nullam sapien risus, tincidunt vitae pellentesque nec, vestibulum nec massa. Aenean laoreet et magna eu volutpat. Quisque scelerisque ligula in dapibus hendrerit. Nam vel condimentum sem. Nulla facilisi. Nullam nec ipsum nunc.";
    case 'img':
      return 'http://lorempixel.com/640/480/';
    case 'date':
      return '01/01/1970';
    case 'number':
      return Date.now().toString(10);
    default:
      return "Lorem ipsum dolor sit amet";
  }
}

function getEditorHeaders(pageId) {
  let styles = "";
  let scripts = "";

  styles += "<link rel='stylesheet' href='/porosedit.css'>";
  styles += "<link rel='stylesheet' href='/editor/skin.min.css'>";
  scripts += "<script>var _PAGE_ID = "+pageId+"</script>";//magical var for the pageID
  if (env.production) scripts += "<script async='' src='/porosedit.min.js'></script>";
  else scripts += "<script async='' src='/porosedit.js'></script>";

  return { styles, scripts };
}

export function fileRead(filePath) {
  return fs.readFileSync(filePath, 'utf8')
}


export function authenticateUser() {
  return async function(req, res, next) {
    const username = req.body.username.trim().toLowerCase();
    const password = req.body.password.trim();

    //kill the previous cookie
    res.cookie('auth', '', { httpOnly: false });

    try {
      let user = await authenticate(username, password);
      if (user === false) throw "Access Denied";

      console.log('login TFA', user.tfa);
      const TOKEN = generateAuthToken();
      await DB.databasePut('authtokens', TOKEN, null, {username:username, role: user.role, TFA: user.tfa === false ? false : '', valid: true, lastUpdatedAt: new Date()});
      res.cookie('auth', TOKEN, { maxAge: 3600000 * 24 * 7, httpOnly: false });

      if (user.tfa) {
        return res.redirect('/tfalogin');
      }
    } catch(err) {
      res.sendStatus(401);
      return next(err);
    }

    next();
  };
}

export function authenticateTFA() {
  return async function(req, res, next) {
    try {
      const authTokenId = req.cookies.auth;
      const token = req.body.tfatoken;

      console.log('authTFA', token, authTokenId);
      let authToken = await DB.databaseGet('authtokens', authTokenId);
      console.log(authToken);
      if (authToken.length) {
        console.log('authenticateTFA', authToken[0].role, 'TFA', authToken[0].TFA);
        authToken = authToken[0];
        let user = await DB.databaseGet('users', authToken.username);
        if (user.length) {
          user = user[0];
          const secret = user.tfasecret;
          console.log('verifyTFASecret', token, secret);
          let verified = speakeasy.totp.verify({ secret, token, encoding: 'base32' });

          if (verified) {
            authToken.TFA = user.tfasecret;
            authToken.lastUpdatedAt = new Date();
            await DB.databasePut('authtokens', authTokenId, null, authToken);
            return;
          }
        }
      }
    } catch(err) {
      res.sendStatus(401);
      return next(err);
    }

    res.sendStatus(401);
    return next(err);
  };
}


export function generateTFASecret() {
  return function(req, res, next) {
    const TFASecret = speakeasy.generateSecret();
    console.log('TFASecret', TFASecret);
    res.cookie('temp_tfa_Secret', TFASecret.base32, { expires: 0, httpOnly: false });

    res.json(TFASecret);
    next();
  }
}

export function verifyTFASecret() {
  return function(req, res, next) {
    const token = req.body.token;
    const secret = req.cookies.temp_tfa_Secret;

    console.log('verifyTFASecret', token, secret);
    let verified = speakeasy.totp.verify({ secret, token, encoding: 'base32' });
    console.log({verified});
    if(verified) {
      res.cookie('tfaverify', secret, { expires: 0, httpOnly: false });
      res.sendStatus(200);
    } else {
      res.sendStatus(401);
    }

    next();
  }
}

export function logout() {
  return async function(req, res, next) {
    console.log('logout');
    if (req.cookies.auth) {
      res.cookie('auth', '', { httpOnly: false });
      await DB.databasePut('authtokens', req.cookies.auth, null, {valid: false, lastUpdatedAt: new Date(-36000) });
    }

    next();
  };
}

export function handleStaticAssets(site, assetUrlOverride = null) {
  return function(req, res, next) {
    const assetUrl = site + (assetUrlOverride || req.originalUrl)
    try {
        let data = fs.readFileSync(path.join(assetUrl));
        res.write(data);
    } catch(err) {
      console.error(err);
    }
    res.end();

    //next();
  };
}

export function handleLib(site, libs, scriptPath) {
  return function(req, res, next) {
    console.log("Lib compose", req.originalUrl, path.extname(req.originalUrl));
    let basename = path.basename(req.originalUrl, path.extname(req.originalUrl));
    let lib = libs[basename];
    console.log('handleLib', basename, lib);
    for (let file of libs[basename]) {
      console.log('FILE PATH SYNC', site, scriptPath, file)
      let data = fs.readFileSync(path.join(site+scriptPath+file), 'utf8') + '\n';
      res.write(data);
    }
    res.end();

    //next();
  }
};

export function handlePage(pageId, siteVars, paths, FX, COLLECTIONS, getTemplate, pageStrings) {
  return async function(req, res, next) {
    try {
      console.log("Render Page", pageId);

      const authToken = req.cookies.auth;
      const userMode = req.cookies.userMode || false;
      const tokenVerified = await verifyAuthToken(authToken, 'poros.admin');
      const editable = tokenVerified && !userMode;

      let styles = '';
      let scripts = '';

      let Template = getTemplate()
      const pageVars = getTemplate().getVars();
      console.log('Template', Template );

      //Pull the global data
      let SITEDATA = (await DB.databaseGet('pages', '_GLOBALS'))[0];
      console.log('SITEDATA', SITEDATA );

      //Style Injection
      for (let style of Template.getStyles()) {
        styles += `<link rel='stylesheet' href='/${paths.styles}/${style}'>`;
      }

      //Script Injection
      for (let script of Template.getScripts()) {
        scripts += `<script src="/${paths.scripts}/${script}"></script>`;
      }

      //Js injection (this gets expanded and served by the router)
      for (let lib of Template.getLibs()) {
        console.log("injecting lib", lib);
        scripts += `<script src="/lib/${lib}.js"></script>`;
      }

      //Attach page vars
      let Page = {};
      let PAGEDATA = (await DB.databaseGet('pages', 'page', pageId));
      let JSDATA = {}; //Data to be exported into javascript
      let hasJSData = false;

      //Page styles Injection
      if (PAGEDATA.cssInjection) {
        styles += `<style>${PAGEDATA.cssInjection}</style`;
      }
      
      //Attach collections
      let collections = {};
      for (let name of Template.getCollections()) {
        console.log("Attach collection", name, typeof name)
        if (typeof name === "object") {
          const collectionDef = name;
          const collectionName = collectionDef["as"] || collectionDef["table"];

          if (!collectionName) {
            console.error("missing collection name for definition", collectionDef)
            continue;
          }

          collections[collectionName] = await DB.databaseGet('collections', collectionDef["table"]);
          if (collectionDef["format"]) {
            if (collectionDef["format"] == "array") {
              // do nothing, we're already an array
            } else if (collectionDef["format"] == "hash") {
              // do nothing, we're already an array
              const index = collectionDef["index"] || "pid";
              collections[collectionName] = collections[collectionName].reduce((acc, item) => { acc[item[index]] = item; return acc; }, {})
            } else {
              console.error("unknown collection format", collectionDef["format"])
            }
          }
        } else {
          collections[name] = await DB.databaseGet('collections', name);
        }
      }

      console.log('siteVars', siteVars, 'pageVars', pageVars );

      //fill in with defaults based on type
      for (let n in pageVars) {
        if ( n == '_id' || n == 'key' ) continue;
        console.log("pageVars", n, pageVars[n]);
        const type = pageVars[n].type;
        const name = n[0] == '_' ? n.substr(1) : n
        const exportLocations = pageVars[n].export || ['page'];

        function insertData(location) {
          if(!location[n]) {
            location[name] = pageVars[n].default || pageStrings[name] || GetDefaults(type);
          } else if(n[0] == '_') {
            location[name] = pageVars[n].default || pageStrings[n] || location[n];
          }

          if (editable
            && type != 'img'
            && n[0] != '_') {
            location[name] = `<span class='editable' data-key='page' data-id='${pageId}' data-name='${name}'>`+location[name]+"</span>";
          }
        }

        if (exportLocations.includes('page')) {
          insertData(PAGEDATA);
        }

        if (exportLocations.includes('js')) {
          hasJSData = true;
          insertData(JSDATA);
        }
      }

      // Inject the variables exported to JS
      if (hasJSData) {
        scripts += '<script>\nvar STRINGS = {';
          for (let s in JSDATA) {
            scripts += `${s}: "${JSDATA[s]}",`;
          }
        scripts += '}\n</script>';
      }

      //Inject editing code
      for (let n in SITEDATA) {
        if ( n == '_id' || n == 'key' || n == 'lastUpdatedAt' ) continue;
        console.log("siteVars", n, SITEDATA[n]);
        const type = siteVars[n].type;
        const name = n[0] == '_' ? n.substr(1) : n
        if(!SITEDATA[n]) {
          SITEDATA[name] = siteVars[n].default || GetDefaults(type);
        } else if(n[0] == '_') {
          SITEDATA[name] = SITEDATA[n];
        }

        if (editable
          && type != 'img'
          && n[0] != '_') {
            SITEDATA[name] = `<span class='editable' data-key='_GLOBALS' data-name='${name}'>`+SITEDATA[n]+"</span>";
        }
      }

      const editorHeaders = editable ? getEditorHeaders(pageId) : null;
      if (editorHeaders) {
        styles += editorHeaders.styles;
        scripts += editorHeaders.scripts;
      }


      //Look for templates + concat
      let composedTemplate = `<!DOCTYPE html><html><head>${styles}${scripts}${Template.getMeta()}</head><body>${Template.getBody()}</body></html>`;

      //Render the final page
      let model = {
        ...SITEDATA,
        ...PAGEDATA,
        ...collections,
        FX,
        STRINGS: {
          ...pageStrings
        },
        SYSTEM: {
          HOST: server.host,
          ADMIN: tokenVerified,
          LOGGEDIN: !!authToken,
          EDITING: editable
        },
        PATHS: {
          IMAGES: paths.images,
          SCRIPTS: paths.scripts,
          STYLES: paths.styles,
        }
      };

      let compiledTemplate = compiledTemplates[pageId];
      if (!compiledTemplate) {
        compiledTemplate = _.template(composedTemplate);
        compiledTemplates[pageId] = compiledTemplate;
      }

      try {
        const output = _.template(composedTemplate)(model);
        return res.send(output);
      } catch(exception) {
        //move this into a function maybe
        return res.send(`<HTML><HEAD><STYLES>${editorHeaders ? editorHeaders.styles : ''}</STYLES><SCRIPTS>${editorHeaders ? editorHeaders.scripts : ''}</SCRIPTS></HEAD><h1>${exception}</h1></HTML>`);
      }
    } catch(ex) {
      console.error(ex);
    }
    //next();
  };
}

export function handleAPI(func, DB, EMAIL, COLLECTIONS, FX) {
  return async function(req, res, next) {
    let status = 500;
    let response = null;
    try {
      console.log('Calling api', func.name);
      response = await func.call(new PorosAPIContext(req, res, DB, EMAIL, COLLECTIONS, FX), req.body, req.params);

      if (response === null) return;
      if (response === undefined) res.sendStatus(200);
      else if (response.json) res.json(response.json);
      else if (response.redirect) res.redirect(response.redirect);
      else res.sendStatus(response.status);
    } catch(err) {
      return next(new Error(err));
    }

    console.log(func, 'responded with', response);
  }
}

export async function runInitializer(func, DB, EMAIL, COLLECTIONS, FX) {
    try {
      await func.call(new PorosAPIContext(null, null, DB, EMAIL, COLLECTIONS, FX));
    } catch(err) {
      console.log(err)
      return Promise.resolve();
    }
}
