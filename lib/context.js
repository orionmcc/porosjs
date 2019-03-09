//encapsulates a class which exposes core poros apis to the site


import {verifyAuthToken} from './authentication';
import {getCollection} from './core';

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

	//Send json
	//Set cookie
	//Read collections
	//Write to collection
}
