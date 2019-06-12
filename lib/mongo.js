import mongo from 'mongodb';
import assert from 'assert';

let db = null;
export default class MongoDBAdapter {
  constructor() {
  }

  initialize(database) {
    //const url = 'mongodb://localhost:27017/poros';
    console.log('loading database', database);
    const url = `mongodb://localhost:27017/poros_${database}`;
    return mongo.MongoClient.connect(url)
    .then((data)=>{
      console.log("Connected to Mongo @ "+url);
      db = data;
    })
  }

  async databaseGet(table, key, range, rangeEnd) {
    assert(table == 'pages' || table == 'collections' || table == 'users' || table == 'authtokens');
    try {
      let col = db.collection(table);
      let ret = null;
      range = range || null;
      rangeEnd = rangeEnd || null;
      key = key || null;

      if (key === null) {
        ret = await col.find({}).toArray();
      } else if  (range === null ) {
        ret = await col.find({key}).toArray();
      } else if (range && rangeEnd === null || range === rangeEnd) {
        //console.log('mongo', {key, range})
        ret = await col.findOne({key, range});
      } else {
        //query a range
        console.log('Query range is not yet implemented');
        ret = [];
      }

      return ret;
    } catch(err) {
      throw err;
    }
  }

  async databasePut(table, key, range, attributes) {
    assert(table == 'pages' || table == 'collections' || table == 'users' || table == 'authtokens');
    try {
      let col = db.collection(table);
      let ret = null;
      if (range === undefined) range = null;
      if (range === null) {
        ret = await col.updateOne({key}, {$set: {key, ...attributes}}, {upsert:true});
      } else {
        ret = await col.updateOne({key, range}, {$set: {key, range, ...attributes}}, {upsert:true});
      }
    } catch(err) {
      throw err;
    }
  }

  async databaseDelete(table, key, range) {
    assert(table == 'pages' || table == 'collections' || table == 'users' || table == 'authtokens');
    try {
      let col = db.collection(table);
      let ret = null;
      range = range || null;
      if (range === null) {
        ret = await col.remove({key});
      } else {
        console.log('remove', {key, range})
        ret = await col.remove({key, range});
      }
    } catch(err) {
      throw err;
    }
  }

}
