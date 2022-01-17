import Crypto from 'crypto';
import BasicAuth from 'basic-auth';


import DBAdapter from './database';
let DB = new DBAdapter();

export function verifyAuthEndpoint(access) {
  return async function (req, res, next) {
    try {
      console.log("req.headers['authorization']", req.headers['authorization:'], req.headers);
      if (req.headers['authorization']) {
        if (verifyBasicAuth(req)) return next();
        // var basicUser = BasicAuth(req);
        // const user = await authenticate(basicUser.name, basicUser.pass);
        // let canAccess = false;

        // if (user) {
        //   if(access === 'poros.user' && user.role) canAccess = true;
        //   else if(access === 'poros.admin' && (user.role === 'poros.admin' || user.role === 'poros.superuser') ) canAccess = true;
        //   else if(access === 'poros.superuser' && user.role === 'poros.superuser') canAccess = true;

        //   if (canAccess) return next();
        //   else throw { status: 403, text: 'Access Denied' };
        // }
      }

      const authToken = req.cookies.auth || '';
      const tokenVerified = await verifyAuthToken(authToken, access);
      if(tokenVerified) {
        req.session['verifiedAdmin'] = true;
        return next();
      }

      throw { status: 403, text: 'Access Denied' };
    } catch (err) {
      next(err)
    }
  }
}

async function verifyBasicAuth(req) {
  var basicUser = BasicAuth(req);
  const user = await authenticate(basicUser.name, basicUser.pass);
  let canAccess = false;

  if (user) {
    if(access === 'poros.user' && user.role) canAccess = true;
    else if(access === 'poros.admin' && (user.role === 'poros.admin' || user.role === 'poros.superuser') ) canAccess = true;
    else if(access === 'poros.superuser' && user.role === 'poros.superuser') canAccess = true;

    if (canAccess) return true;
  }

  return false;
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
  return Crypto.randomBytes(256).toString('base64');
}

export async function authenticate(username, password) {
  let users = await DB.databaseGet('users', username);
  if (users.length == 0) {
    console.warn(`User not found ${username}`);
    throw { status: 403, text: 'Access Denied' };
    return false;
  }
  let user = users[0];

  const SALT = user.salt;
  const ITERATIONS = user.iterations;
  const auth = passwordHash(password, SALT, ITERATIONS);

  if (auth != user.auth) {
    console.warn('Authentication Error');
    throw { status: 403, text: 'Access Denied' };
    return false;
  }
  return user;
}

export function passwordHash(password, SALT, ITERATIONS) {
  return Crypto.pbkdf2Sync(password, SALT, ITERATIONS, 512, 'sha512').toString('base64');
}
