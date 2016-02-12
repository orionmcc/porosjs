
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
