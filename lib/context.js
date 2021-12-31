//encapsulates a class which exposes core poros apis to the site

import {server} from '../local/local';
import {verifyAuthToken, generateAuthToken} from './authentication';
import { writeRecord } from './api';

import DBAdapter from './database';
let DB = new DBAdapter();

// class DBContext {
// 	constructor (tableName) {
// 		this.tableName = tableName;
// 	}
//
// 	async all() {
// 		return DB.databaseGet(tableName);
// 	}
//
// 	async get(recordName) {
// 		const result = await DB.databaseGet(tableName, recordName);
// 		return result && result[0];
// 	}
//
// 	async put(recordName, data) {
// 	}
//
// 	// write(recordName, data) {
// 	// 	return setCollectionRecord(this.collectionName, recordName, data);
// 	// }
// }

class CollectionContext {
	constructor (collectionName, DB, COLLECTIONS, FX) {
		this.write = async (recordName, data, options) => {
			const currentData = await DB.databaseGet('collections', collectionName, recordName);
			writeRecord(COLLECTIONS, FX, collectionName, recordName, {...currentData, ...data}, options)
		};
		this.find = async (recordName) => DB.databaseGet('collections', collectionName, recordName);
		this.all = async () => {
			const allItems = await DB.databaseGet('collections', collectionName)
			allItems.hash = () => allItems.reduce((acc, item) => { acc[item.pid] = item; return acc }, {});
			return allItems
		};
	}

	async all() {
		assert(false);
		// const allItems = (await this.all()).map(one => { delete one._id; return one; } );
		// console.log('allItems', allItems)
		// if (allItems) {
		// 	allItems.hash = async () => {
		// 		console.log('hash this', this)
		// 	}
		// }
		// return allItems;
	}

	async find(recordName) {
		assert(false);
		// const record = await this.find(recordName);
		// delete record._id;
		// return record;
	}

	async write(recordName, data, options={}) {
		assert(false);
		// return this.write(recordName, data, options)
	}
}


export default class PorosContext {
	constructor (req, res, DB, EMAIL, COLLECTIONS, FX) {
		this.req = req;
		this.res = res;
		this.DB = DB;
		this.EMAIL = EMAIL;
		this.COLLECTIONS = COLLECTIONS;
		this.FX = FX;
	}

	getCollection (collectionName) {
		return new CollectionContext(collectionName,  this.DB, this.COLLECTIONS, this.FX);
	}

	// getUsers () {
	// 	return new DBContext('users');
	// }

	host () {
		return server.host;
	}

	app () {
		return server.app;
	}

	isLoggedIn = async (role = 'poros.user') => {
		const authToken = this.req.cookies.auth;
		const tokenVerified = await verifyAuthToken(authToken, role);
		return tokenVerified === true;
	};

	isAdmin = async () => {
		const authToken = this.req.cookies.auth;
		const tokenVerified = await verifyAuthToken(authToken, 'poros.admin');
		return tokenVerified === true;
	}

	isSuperUser = async () => {
		const authToken = this.req.cookies.auth;
		const tokenVerified = await verifyAuthToken(authToken, 'poros.superuser');
		return tokenVerified === true;
	}

	authenticateSession = async () => {
		const TOKEN = generateAuthToken();
		this.req.cookies.auth = TOKEN;
		return TOKEN;
	}
}
