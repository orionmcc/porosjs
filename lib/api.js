
import {verifyAuthEndpoint} from './authentication';
import DBAdapter from './mongo';
let DB = new DBAdapter();

export async function postData(req, res, next) {
  try {
    await verifyAuthEndpoint(req, 'poros.admin');

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
      let SITEDATA = await DB.databaseGet('pages', '_GLOBALS');
      let data = [];

      for (let n in sitedata) {
        data.push({
          key: '_GLOBALS',
          name: n,
          type: sitedata[n],
          value: SITEDATA[0][n] || '',
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
