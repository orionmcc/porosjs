
import Template from './template';
import {handlePage} from './core';

import DBAdapter from './mongo';
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

export function getTemplates(TEMPLATES) {
  return async function(req, res, next) {
    let data = [];

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
      });
    }

    res.json(data);
    next();
  }
}

export function postPage(app, SITEVARS, TEMPLATES, FX, PAGES, reset){
  return async function(req, res, next) {
    let newId = 0;
    let {slug, template} = req.body;
    let id = req.params.id;
    if(id) id = Number(id);

    for (let i = 0; i < PAGES.length; i++) {
      if ( id && id == PAGES[i].id ) {
        console.log('updating page',id, 'with', slug, template);
        PAGES[i].slug = slug;
        PAGES[i].template = template;
        await DB.databasePut('pages', 'page', id, {slug, id, template});
        res.sendStatus(200);
        next();
        console.log('RESETTING');
        return reset();
      } else if ( PAGES[i].id >= newId ) {
        newId = PAGES[i].id + 1;
      }
    }

    console.log('creating page', newId, slug, template);
    await DB.databasePut('pages', 'page', newId, {slug, id:newId, template});
    res.sendStatus(200);
    next();
    console.log('RESETTING');
    return reset();
  }
}
