
import Template from './template';
import {passwordHash, verifyAuthToken} from '../lib/authentication';
import crypto from 'crypto';
import parse from 'csv-parse/lib/sync';

import DBAdapter from './database';
let DB = new DBAdapter();

import EmailAdapter from './email';
let EMAIL = new EmailAdapter();

export async function postData(req, res, next) {
  try {
    let {key, range, name, value} = req.body;
    let data = {};
    data[name] = value;
    data['lastUpdatedAt'] = new Date();

    range = parseInt(range);
    if (isNaN(range)) range = null;
    console.log('range',range, typeof range);

    await DB.databasePut('pages', key, range, data);

    console.log('UPDATE DATA VAR', key, range, data);

    res.sendStatus(200);
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
      console.log('PAGEDATA', PAGEDATA);
      for (let n in TEMPLATES[page.template].vars) {
        data.push({
          key: 'page',
          id: page.range,
          name: n,
          type: TEMPLATES[page.template].vars[n],
          value: PAGEDATA[n] || '',
         });
      }
      res.json(data);
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
  }
}

export function getPages(PAGES) {
  return async function(req, res, next) {
    let data = [];

    console.log('PAGES', PAGES);
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
  }
}

export function getPage(PAGES) {
  return async function(req, res, next) {
  let id = req.params.id;
  if(id) id = Number(id);
  
  for (let i = 0; i < PAGES.length; i++) {
    console.log(PAGES[i]);
    if ( id !== undefined && id === PAGES[i].id ) {
      res.json(PAGES[i]);
      return next();
    }
  }

    res.json({});
  }
}

export function postPage(PAGES){
  return async function(req, res, next) {
    console.log('Posting page', req.body);

    let newId = 0;
    let {slug, template, access, def} = req.body;
    let id = req.params.id;
    if(id !== undefined) id = Number(id);
    if (id === undefined) id = PAGES.length ? (PAGES[PAGES.length - 1].id + 1) : 0;

    // make the first page default by default
    if (PAGES.length === 0) def = 'true';

    //console.log('removing default from', PAGES[i]);
    for (let i = 0; (i < PAGES.length) && def === 'true'; i++) {
      if (PAGES[i].default && id !== PAGES[i].id) {
        //remove the previous default page
        console.log('removing default from', PAGES[i]);
        await DB.databasePut('pages', 'page', PAGES[i].id, { default: false, lastUpdatedAt: new Date() });
        break;
      }
    }

    console.log('Posting page', 'pages', 'page', id, {slug, id, template, access, default: def === 'true'});
    await DB.databasePut('pages', 'page', id, {slug, id, template, access, default: def === 'true', lastUpdatedAt: new Date() });
    res.sendStatus(200);

    next(); //reset server
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

    next(); //reset server
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
  }
}

export function getUser() {
  return async function(req, res, next) {
    let username = req.params.username;
    let USER = await DB.databaseGet('users', username);

    res.json({
      username: USER[0].key,
      role: USER[0].role,
      tfa: USER[0].tfa,
    });
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

      USER.lastUpdatedAt = new Date();

      console.log('USER', username, USER);
      await DB.databasePut('users', username, null, USER);
      res.sendStatus(200);
    } else {
      console.warn('Authentication Error, attempting to change a users role');
      res.sendStatus(401);
    }
  }
}

export function getCollections(COLLECTIONS) {
  return async function(req, res, next) {
    let data = [];

    console.log('COLLECTIONS', COLLECTIONS);
    for (let n in COLLECTIONS) {
      if (!COLLECTIONS[n].template) {
        data.push({
          name: n,
        });
      }
    }

    res.json(data);
  }
}

export function getCollection() {
  return async function(req, res, next) {
    let collectionname = req.params.collection;
    let COLLECTION = await DB.databaseGet('collections', collectionname);
    let data = [];

    for (let n of COLLECTION) {
      data.push({
        name: n.name,
        pid: n.pid,
      });
    }

    res.json(data);
  }
}

function getCollectionFields(COLLECTIONS, collection) {
  const templates = collection.templates || [];
  let fields = collection.fields || {};

  for (let t of templates) {
    if (!COLLECTIONS[t]) continue;
    fields = {...(COLLECTIONS[t].fields || {}), ...fields}
  }

  return fields;
}


function getCollectionFunction(functionName, FX, COLLECTIONS, collection) {
    const templates = collection.templates || [];
    const collectionFunctions = collection.functions || {};
    let collectionFunction = FX[collectionFunctions[functionName]];
    const templateCollectionFunctions = [];

    if (collectionFunction) templateCollectionFunctions.push(collectionFunction);

    for (let t of templates) {
      const tf = COLLECTIONS[t].functions || {};
      let f = FX[tf[functionName]];
      if (f) templateCollectionFunctions.push(f);
    }

    return data => templateCollectionFunctions.reverse().reduce((acc, f) => { return f(acc) }, data)
}

export function getCollectionMeta(COLLECTIONS) {
  return async function(req, res, next) {
    let collectionname = req.params.collection;
    let meta = { id: collectionname };
    meta.fields = [];

    const fields = getCollectionFields(COLLECTIONS, COLLECTIONS[collectionname]);

    for (let f in fields) {
      meta.fields.push({id: f, ...fields[f]});
    }

    res.json(meta);
  }
}

export function getRecord(COLLECTIONS) {
  return async function(req, res, next) {
    let collectionname = req.params.collection;
    let range = req.params.record;

    console.log('RANGE', range)

    let RECORD = await DB.databaseGet('collections', collectionname, range);
    const fields = getCollectionFields(COLLECTIONS, COLLECTIONS[collectionname]);
    let data = {
      pid: RECORD.pid
    };

    for (let n in fields) {
      data[n] = RECORD[n];
    }

    res.json(data);
  }
}

async function writeRecord (COLLECTIONS, collectionname, recordData) {
  if(!recordData.pid) throw "Records require a pid to be written";

  const fields = getCollectionFields(COLLECTIONS, COLLECTIONS[collectionname]);
  let data = {
    pid: recordData.pid
  };

  for (let n in fields) {
    data[n] = recordData[n];
  }

  data['lastUpdatedAt'] = new Date();

  console.log('Write Record', collectionname, recordData.pid, data);
  return await DB.databasePut('collections', collectionname, recordData.pid, data);
}

export function postRecord(COLLECTIONS, FX) {
  return async function(req, res, next) {
    const collectionname = req.params.collection;
    const collection = COLLECTIONS[collectionname];
    const normalizeFunction = getCollectionFunction('normalize', FX, COLLECTIONS, collection); //defaults to a noop
    const beforeWriteFunction = getCollectionFunction('beforeWrite', FX, COLLECTIONS, collection); //defaults to a noop
    const afterWriteFunction = getCollectionFunction('afterWrite', FX, COLLECTIONS, collection); //defaults to a noop
    const recordname = req.params.record;

    const normalizedData = normalizeFunction({ ...req.body, pid: recordname});
    await writeRecord(COLLECTIONS, collectionname, normalizedData);


    res.sendStatus(200);
  }
}

export function importRecords(COLLECTIONS, FX) {
  return async function(req, res, next) {
    const csv = req.file.buffer.toString('utf8');
    const collectionname = req.params.collection;
    const collection = COLLECTIONS[collectionname];
    const importFunction = getCollectionFunction('import', FX, COLLECTIONS, collection); //defaults to a noop
    const normalizeFunction = getCollectionFunction('normalize', FX, COLLECTIONS, collection); //defaults to a noop
    const beforeWriteFunction = getCollectionFunction('beforeWrite', FX, COLLECTIONS, collection); //defaults to a noop
    const afterWriteFunction = getCollectionFunction('afterWrite', FX, COLLECTIONS, collection); //defaults to a noop

    //process the csv
    const records = parse(csv, {
      columns: true,
      skip_empty_lines: true
    });

    //for each row, create a new record
    for (let i in records) {
      let record = records[i];

      const importedData = importFunction(record);

      if (importedData) {
        const normalizedData = normalizeFunction({ ...importedData.data, pid: importedData.pid});
        await writeRecord(COLLECTIONS, collectionname, normalizedData);
      }
      await Promise.resolve();
    }

    res.sendStatus(200);
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
  }
}
