import fs from "fs";
import path from "path";
import Handlebars from "handlebars";
import speakeasy from 'speakeasy';

import DBAdapter from './database';
import {verifyAuthToken, authenticate, generateAuthToken} from './authentication';
import PorosAPIContext from './context';
let DB = new DBAdapter();

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

export async function getCollection(name) {
  let result = await DB.databaseGet('collections', name);
  return result;
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
      await DB.databasePut('authtokens', TOKEN, null, {username:username, role: user.role, TFA: user.tfa === false ? false : ''});
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
            await DB.databasePut('authtokens', authTokenId, null, authToken);
            next();
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
    res.cookie('auth', '', { httpOnly: false });

    next();
  };
}

export function handleStaticAssets(site) {
  return function(req, res, next) {
    console.info(path.join(site+req.originalUrl));
    try {
        let data = fs.readFileSync(path.join(site+req.originalUrl));
        res.write(data);
    } catch(err) {
      console.error(err);
    }
    res.end();

    next();
  };
}

export function handleLib(site, libs) {
  return function(req, res, next) {
    console.log("Lib compose", req.originalUrl, path.extname(req.originalUrl));
    let basename = path.basename(req.originalUrl, path.extname(req.originalUrl));
    let lib = libs[basename];
    console.log('handleLib', basename, lib);
    for (let file of libs[basename]) {
      let data = fs.readFileSync(path.join(site+file), 'utf8') + '\n';
      res.write(data);
    }
    res.end();

    next();
  }
};

export function handlePage(pageId, siteVars, paths, getTemplate, getData) {
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

      //Pull the global data
      let SITEDATA = await DB.databaseGet('pages', '_GLOBALS');
      console.log('SITEDATA', SITEDATA );

      //Style Injection
      for (let style of Template.getStyles()) {
        styles += `<link rel='stylesheet' href='/${paths.styles}/${style}'>`;
      }

      //Script Injection
      for (let script of Template.getScripts()) {
        scripts += `<script async="" src="/${paths.scripts}/${script}"></script>`;
      }

      //Js injection (this gets expanded and served by the router)
      for (let lib of Template.getLibs()) {
        console.log("injecting lib", lib);
        scripts += `<script async="" src="/lib/${lib}.js"></script>`;
      }

      //Attach page vars
      let Page = {};
      let PAGEDATA = await DB.databaseGet('pages', 'page', pageId);

      //Page styles Injection
      if (PAGEDATA.cssinjection) {
        styles += `<style>${PAGEDATA.cssinjection}</style`;
      }


      //Attach imported data
      let imports = {};
      for (let name in Template.getImports()) {
        imports[name] = await getData.call(new PorosAPIContext(req, res), Template.getImports(name));
      }

      //Attach collections
      let collections = {};
      for (let name of Template.getCollections()) {
        // Get the data for that collection from the DB.
        collections[name] = await DB.databaseGet('collections', name);
        console.log('collections name', name, collections[name]);
      }

      console.log('siteVars', siteVars,'pageVars', pageVars );

      //fill in with defaults based on type
      for (let n in pageVars) {
        if ( n == '_id' || n == 'key' ) continue;
        console.log("pageVars", n, pageVars[n]);
        const type = pageVars[n].type;
        const name = n[0] == '_' ? n.substr(1) : n
        if(!PAGEDATA[0][n]) {
          PAGEDATA[0][name] = pageVars[n].default || GetDefaults(type);
        } else if(n[0] == '_') {
          PAGEDATA[0][name] = PAGEDATA[0][n];
        }

        if (editable
          && type != 'img'
          && n[0] != '_') {
            console.log('editable', n[0], type);
          PAGEDATA[0][name] = `<span class='editable' data-key='page' data-id='${pageId}' data-name='${name}'>`+PAGEDATA[0][name]+"</span>";
        }
      }

      //Inject editing code
      for (let n in SITEDATA[0]) {
        if ( n == '_id' || n == 'key' ) continue;
        console.log("siteVars", n, SITEDATA[0][n]);
        const type = siteVars[n].type;
        const name = n[0] == '_' ? n.substr(1) : n
        if(!SITEDATA[0][n]) {
          SITEDATA[0][name] = siteVars[n].default || GetDefaults(type);
        } else if(n[0] == '_') {
          SITEDATA[0][name] = SITEDATA[0][n];
        }

        if (editable
          && type != 'img'
          && n[0] != '_') {
            SITEDATA[0][name] = `<span class='editable' data-key='_GLOBALS' data-name='${name}'>`+SITEDATA[0][n]+"</span>";
        }
      }

      if (editable) {
        styles += "<link rel='stylesheet' href='/porosedit.css'>";
        styles += "<link rel='stylesheet' href='/editor/skin.min.css'>";
        scripts += "<script>var _PAGE_ID = "+pageId+"</script>";//magical var for the pageID
        if (process.env.NODE_ENV == 'production') scripts += "<script async='' src='/porosedit.min.js'></script>";
        else scripts += "<script async='' src='/porosedit.js'></script>";
      }


      //Look for templates + concat
      let composedTemplate = `<!DOCTYPE html><html><head>${styles}${scripts}${Template.getMeta()}</head><body>${Template.getBody()}</body></html>`;

      //Render the final page
      let model = {
        ...SITEDATA[0],
        ...PAGEDATA[0],
        ...imports,
        ...collections
      };
      console.log("model", model);
      let output = Handlebars.compile(composedTemplate, { noEscape: true })(model);
      res.send(output);
    } catch(ex) {
      console.error(ex);
    }
    next();
  };
}

export function handleAPI(func, DB) {
  return async function(req, res, next) {
    let status = 500;
    let response = null;
    try {
      response = await func.call(new PorosAPIContext(req, res, DB), req.body);
    } catch(err) {
      return next(new Error(err));
    }

    if (response.json) res.json(response.json);
    else res.sendStatus(response.status);

    console.log(func, 'responded with', response);

    next();
  }
}
