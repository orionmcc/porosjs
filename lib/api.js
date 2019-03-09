
import Template from './template';
import {handlePage} from './core';
import {passwordHash, verifyAuthToken} from '../lib/authentication';
import crypto from 'crypto';

import DBAdapter from './database';
let DB = new DBAdapter();

export async function postData(req, res, next) {
  try {
    let {key, range, name, value} = req.body;
    let data = {};
    data[name] = value;
    range = parseInt(range);
    if (isNaN(range)) range = null;
    console.log('range',range, typeof range);

    await DB.databasePut('pages', key, range, data);

    console.log('UPDATE DATA VAR', key, range, data);

    res.sendStatus(200);
    next();

  } catch (err) {
    return next(err);
  }
}


export function getSiteData(sitedata) {
  return async function(req, res, next) {
    try {
      let GLOBALS = await DB.databaseGet('pages', '_GLOBALS');
      let data = [];

      for (let n in sitedata) {
        data.push({
          key: '_GLOBALS',
          name: n,
          type: sitedata[n], //change this to sitedata[n].type
          value: GLOBALS[0][n] || '',
         });
      }
      res.json(data);
      next();
    } catch (err) {
      return next(err);
    }
  }
}


export function getPageData(PAGES, TEMPLATES) {
  return async function(req, res, next) {
    try {
      let page;
      let data = [];

      for (let n of PAGES ) {
        if(n.id == req.params.id) {
          page = n;
          break;
        }
      }

      let PAGEDATA = await DB.databaseGet('pages', 'page', page.id);
      for (let n in TEMPLATES[page.template].vars) {
        data.push({
          key: 'page',
          id: page.range,
          name: n,
          type: TEMPLATES[page.template].vars[n],
          value: PAGEDATA[0][n] || '',
         });
      }
      res.json(data);
      next();
    } catch (err) {
      return next(err);
    }
  }
}

export function getTemplates(TEMPLATES) {
  return async function(req, res, next) {
    let data = [];

    console.log('TEMPLATES', TEMPLATES);
    for (let n in TEMPLATES) {
      data.push({
        value: n,
        text: n,
      });
    }

    res.json(data);
    next();
  }
}

export function getPages(PAGES) {
  return async function(req, res, next) {
    let data = [];

    for (let n of PAGES) {
      data.push({
        id: n.id,
        slug: n.slug,
        template: n.template,
        access: n.access,
        default: n.default,
      });
    }

    res.json(data);
    next();
  }
}

export function getPage(PAGES) {
  return async function(req, res, next) {
  let id = req.params.id;
  if(id) id = Number(id);

  console.log('getPage', id);
  for (let i = 0; i < PAGES.length; i++) {
    console.log(PAGES[i]);
    if ( id !== undefined && id === PAGES[i].id ) {
      res.json(PAGES[i]);
      return next();
    }
  }

    res.json({});
    next();
  }
}

export function postPage(PAGES, reset){
  return async function(req, res, next) {

    let newId = 0;
    let {slug, template, access, def} = req.body;
    let id = req.params.id;
    if(id !== undefined) id = Number(id);
    for (let i = 0; i < PAGES.length; i++) {
      if (PAGES[i].default && id !== PAGES[i].id) {
        //remove the previous default page
        await DB.databasePut('pages', 'page', PAGES[i].id, { default: false });
        break;
      }
    }

    if (id === undefined) id = PAGES.length ? (PAGES[PAGES.length - 1].id + 1) : 0;
    // make the first page default by default
    if (PAGES.length === 0) def = 'true';

    await DB.databasePut('pages', 'page', id, {slug, id, template, access, default: def === 'true'});
    res.sendStatus(200);
    next();
    return reset();
  }
}

export function deletePage(reset) {
  return async function(req, res, next) {
    let id = req.params.id;
    if(id) {
      console.log('Deleting page', id);
      id = Number(id);
      let ret = await DB.databaseDelete('pages', 'page', id);
    }

    res.sendStatus(200);
    next();

    return reset();
  }
}

export function getUsers() {
  return async function(req, res, next) {
    let data = [];
    let USERS = await DB.databaseGet('users');

    console.log(USERS);
    for (let n of USERS) {
      data.push({
        username: n.key,
        role: n.role,
        tfa: n.tfa,
      });
    }

    res.json(data);
    next();
  }
}

export function getUser() {
  return async function(req, res, next) {
    let username = req.params.username;
    let USER = await DB.databaseGet('users', username, null);

    console.log(USER);
    res.json({
      username: USER[0].key,
      role: USER[0].role,
      tfa: USER[0].tfa,
    });
    next();
  }
}

export function postUser(){
  return async function(req, res, next) {
    let {role, newPassword, oldPassword, tfa, tfasecret} = req.body;
    let username = req.params.username;

    let USER = {
      role
    }

    let auth = await verifyAuthToken(req.cookies.auth, role);

    if ( auth ) {
      console.log('PUT', newPassword);
      if (newPassword) {
        const USER_ID = crypto.randomBytes(16).toString('base64');
        const SALT = crypto.randomBytes(16).toString('base64');
        const ITERATIONS = 10000;
        console.log('HERE >', USER_ID, SALT, ITERATIONS, newPassword);

        const key = passwordHash(newPassword, SALT, ITERATIONS);
        console.log('key', key);
        USER.auth = key.toString('base64');
        USER.salt = SALT;
        USER.iterations = ITERATIONS;
        USER.guid = USER_ID;
        console.log('USER', USER);
      }

      console.log('TFA', tfa, tfasecret, req.cookies.tfaverify);
      if (tfa && tfasecret && req.cookies.tfaverify === tfasecret) {
        USER.tfa = tfa === 'true';
        USER.tfasecret = tfasecret;
      } else if (tfa === 'false') {
        console.log('CLEAR TFA');
        USER.tfa = false;
        USER.tfasecret = '';
      }

      console.log('USER', username, USER);
      await DB.databasePut('users', username, null, USER);
      console.log('DONE!');
      res.sendStatus(200);
    } else {
      console.warn('Authentication Error, attempting to change a users role');
      res.sendStatus(401);
    }
    next();
  }
}

export function getCollections(COLLECTIONS) {
  return async function(req, res, next) {
    let data = [];

    console.log('COLLECTIONS', COLLECTIONS);
    for (let n in COLLECTIONS) {
      data.push({
        name: n,
      });
    }

    res.json(data);
    next();
  }
}

export function getCollection() {
  return async function(req, res, next) {
    let collectionname = req.params.collection;
    let COLLECTION = await DB.databaseGet('collections', collectionname, null);
    let data = [];

    console.log('collectionname', collectionname, 'COLLECTION', COLLECTION);
    for (let n of COLLECTION) {
      console.log(n);
      data.push({
        name: n.name,
        pid: n.pid,
      });
    }

    res.json(data);
    next();
  }
}

export function getCollectionMeta(COLLECTIONS) {
  return async function(req, res, next) {
    let collectionname = req.params.collection;
    console.log('COLLECTIONS', COLLECTIONS, collectionname, COLLECTIONS[collectionname]);
    let meta = { id: collectionname };
    let fields = COLLECTIONS[collectionname].fields;
    meta.fields = [];

    for (let f in fields) {
      meta.fields.push({id: f, ...fields[f]});
    }

    res.json(meta);
    next();
  }
}

export function getRecord(COLLECTIONS) {
  return async function(req, res, next) {
    let collectionname = req.params.collection;
    let range = req.params.record;

    let RECORD = await DB.databaseGet('collections', collectionname, range);
    let meta = {...COLLECTIONS[collectionname].fields};
    let data = {
      pid: RECORD[0].pid
    };

    for (let n in meta) {
      data[n] = RECORD[0][n];
    }

    res.json(data);
    next();
  }
}

export function postRecord(COLLECTIONS) {
  return async function(req, res, next) {
    let collectionname = req.params.collection;
    let recordname = req.params.record;

    console.log('body', req.body);

    let meta = {...COLLECTIONS[collectionname].fields};
    let data = {
      pid: recordname
    };
    for (let n in meta) {
      data[n] = req.body[n];
    }

    console.log('collections', collectionname, recordname, data);
    await DB.databasePut('collections', collectionname, recordname, data);
    res.sendStatus(200);
    next();
  }
}

export function deleteRecord() {
  return async function(req, res, next) {
    let collectionname = req.params.collection;
    let recordname = req.params.record;
    if(collectionname && recordname) {
      console.log('Deleting record', collectionname, recordname);
      let ret = await DB.databaseDelete('collections', collectionname, recordname);
    }

    res.sendStatus(200);
    next();
  }
}
