import crypto from 'crypto';
import speakeasy from 'speakeasy';

import DBAdapter from './database';
let DB = new DBAdapter();

export function verifyAuthEndpoint(access) {
  return async function (req, res, next) {
    try {
      const authToken = req.cookies.auth || '';
      const tokenVerified = await verifyAuthToken(authToken, access);
      if(!tokenVerified) throw { status: 403, text: 'Access Denied' };

      next();
    } catch (err) {
      next(err)
    }
  }
}

export async function verifyAuthToken(token, access) {
  if (!token || !token.length) return false;
  console.log(token, token.length)
  try {
     let results = await DB.databaseGet('authtokens', token);
     if(results.length) {
       let result = results[0];
       //check the TFA
       if (!result.valid) return false;
       if (result.TFA === '') return false;
       if(access === 'poros.user' && result.role) return true;
       else if(access === 'poros.admin' && (result.role === 'poros.admin' || result.role === 'poros.superuser') ) return true;
       else if(access === 'poros.superuser' && result.role === 'poros.superuser') return true;
       else return false;
     } else {
       console.log('no authtokens present');
     }
   } catch(err) {
     console.error(err);
   }
   return false;
}

export function generateAuthToken() {
  return crypto.randomBytes(256).toString('base64');
}

export async function authenticate(username, password) {
  let users = await DB.databaseGet('users', username);
  if (users.length == 0) {
    console.warn(`User not found ${username}`);
    throw 'Access Denied';
    return false;
  }
  let user = users[0];

  const SALT = user.salt;
  const ITERATIONS = user.iterations;
  const auth = passwordHash(password, SALT, ITERATIONS);

  if (auth != user.auth) {
    console.warn('Authentication Error');
    throw 'Access Denied';
    return false;
  }
  return user;
}

export function passwordHash(password, SALT, ITERATIONS) {
  return crypto.pbkdf2Sync(password, SALT, ITERATIONS, 512, 'sha512').toString('base64');
}
