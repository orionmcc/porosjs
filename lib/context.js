//encapsulates a class which exposes core poros apis to the site

import {server} from '../local/local';
import {verifyAuthToken, generateAuthToken} from './authentication';
import {getCollection, getCollectionRecord, setCollectionRecord} from './core';

import DBAdapter from './database';
let DB = new DBAdapter();

class DBContext {
	constructor (tableName) {
		this.tableName = tableName;
	}

	async all() {
		return DB.databaseGet(tableName);
	}

	async find(recordName) {
		const result = await DB.databaseGet(tableName, recordName);
		return result && result[0];
	}

	// write(recordName, data) {
	// 	return setCollectionRecord(this.collectionName, recordName, data);
	// }
}

class CollectionContext {
	constructor (collectionName) {
		this.collectionName = collectionName;
	}

	async all() {
		return (await getCollection(this.collectionName)).map(one => { delete one._id; return one; } );
	}

	async find(recordName) {
		const record = await getCollectionRecord(this.collectionName, recordName);
		delete record._id;
		return record;
	}

	async write(recordName, data) {
		return setCollectionRecord(this.collectionName, recordName, data);
	}
}


export default class PorosContext {
	constructor (req, res, DB, EMAIL) {
		this.req = req;
		this.res = res;
		this.DB = DB;
		this.EMAIL = EMAIL;
	}

	getCollection (collectionName) {
		return new CollectionContext(collectionName);
	}

	getUsers () {
		return new DBContext('users');
	}

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

	//Send json
	//Set cookie
	//Read collections
	//Write to collection
}
