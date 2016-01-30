//encapsulates a class which exposes core poros apis to the site


import DBAdapter from './database';
import {verifyAuthToken} from './authentication';
import {getCollection} from './core';
let DB = new DBAdapter();

export default class PorosContext {
	constructor (req, res) {
		this.req = req;
		this.res = res;
	}
	getCollection (collectionName) {
		return getCollection(collectionName);
	}

	isLoggedIn = async () => {
		const authToken = this.req.cookies.auth;
		console.log('auth', authToken);
		const tokenVerified = await verifyAuthToken(authToken, 'poros.user');
		console.log('tokenVerified', tokenVerified);
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
}
