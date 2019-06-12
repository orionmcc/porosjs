//encapsulates a class which exposes core poros apis to the site

import {server} from '../local';
import {verifyAuthToken, generateAuthToken} from './authentication';
import {getCollection, getCollectionRecord, setCollectionRecord} from './core';

class CollectionContext {
	constructor (collectionName) {
		this.collectionName = collectionName;
	}

	all() {
		return getCollection(this.collectionName);
	}

	find(recordName) {
		return getCollectionRecord(this.collectionName, recordName);
	}

	write(recordName, data) {
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
