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
      if  (range === null ) {
        ret = await col.find({key}).toArray();
      } else if (range && rangeEnd === null || range === rangeEnd) {
        ret = await col.find({key, range}).toArray();;
      } else {
        //query a range
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
      range = range || null;
      if (range === null) {
        ret = await col.updateOne({key}, {$set: {key, ...attributes}}, {upsert:true});
      } else {
        ret = await col.updateOne({key, range}, {$set: {key, range, ...attributes}}, {upsert:true});
      }
    } catch(err) {
      throw err;
    }
  }

}
