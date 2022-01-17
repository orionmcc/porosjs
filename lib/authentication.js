import Crypto from 'crypto';
import BasicAuth from 'basic-auth';


import DBAdapter from './database';
let DB = new DBAdapter();


export function generateAuthToken() {
  return Crypto.randomBytes(256).toString('base64');
}

export function passwordHash(password, SALT, ITERATIONS) {
  return Crypto.pbkdf2Sync(password, SALT, ITERATIONS, 512, 'sha512').toString('base64');
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

async function verifyBasicAuth(req, access) {
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

       //verify access level
       if(access === 'poros.user' && result.role) return true;
       else if(access === 'poros.admin' && (result.role === 'poros.admin' || result.role === 'poros.superuser') ) return true;
       else if(access === 'poros.superuser' && result.role === 'poros.superuser') return true;
     } else {
       console.log('no authtokens present');
     }
   } catch(err) {
     console.error(err);
   }
   return false;
}

export function verifyAuthEndpoint(access) {
  return async function (req, res, next) {
    try {
      console.log("req.headers['authorization']", req.headers['authorization']);
      if (req.headers['authorization']) {
        if (verifyBasicAuth(req, access)) return next();
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


export function authenticateUser() {
  return async function(req, res, next) {
    const username = req.body.username.trim().toLowerCase();
    const password = req.body.password;

    //kill the previous cookie
    res.cookie('auth', '', { httpOnly: false });

    try {
      let user = await authenticate(username, password);
      if (user === false) throw "Access Denied";

      console.log('login TFA', user.tfa);
      const TOKEN = generateAuthToken();
      await DB.databasePut('authtokens', TOKEN, null, {username:username, role: user.role, TFA: user.tfa === false ? false : '', valid: true, lastUpdatedAt: new Date()});
      res.cookie('auth', TOKEN, { maxAge: 3600000 * 24 * 7, httpOnly: false });

      if (user.tfa) {
        return res.redirect('/tfalogin');
      }
    } catch(err) {
      res.sendStatus(401);
      return next(err);
    }

    next();
  };
}

export function authenticateTFA() {
  return async function(req, res, next) {
    try {
      const authTokenId = req.cookies.auth;
      const token = req.body.tfatoken;

      console.log('authTFA', token, authTokenId);
      let authToken = await DB.databaseGet('authtokens', authTokenId);
      console.log(authToken);
      if (authToken.length) {
        console.log('authenticateTFA', authToken[0].role, 'TFA', authToken[0].TFA);
        authToken = authToken[0];
        let user = await DB.databaseGet('users', authToken.username);
        if (user.length) {
          user = user[0];
          const secret = user.tfasecret;
          console.log('verifyTFASecret', token, secret);
          let verified = speakeasy.totp.verify({ secret, token, encoding: 'base32' });

          if (verified) {
            //authToken.TFA = user.tfasecret;
            authToken.TFA = token;
            authToken.lastUpdatedAt = new Date();
            await DB.databasePut('authtokens', authTokenId, null, authToken);
            return next();
          }
        }
      }
    } catch(err) {
      res.sendStatus(401);
      return next(err);
    }

    res.sendStatus(401);
    return next(err);
  };
}


export function generateTFASecret() {
  return function(req, res, next) {
    const TFASecret = speakeasy.generateSecret();
    console.log('TFASecret', TFASecret);
    res.cookie('temp_tfa_Secret', TFASecret.base32, { expires: 0, httpOnly: false });

    res.json(TFASecret);
    next();
  }
}

export function verifyTFASecret() {
  return function(req, res, next) {
    const token = req.body.token;
    const secret = req.cookies.temp_tfa_Secret;

    console.log('verifyTFASecret', token, secret);
    let verified = speakeasy.totp.verify({ secret, token, encoding: 'base32' });
    console.log({verified});
    if(verified) {
      res.cookie('tfaverify', secret, { expires: 0, httpOnly: false });
      res.sendStatus(200);
    } else {
      res.sendStatus(401);
    }

    next();
  }
}

export function logout() {
  return async function(req, res, next) {
    console.log('logout');
    if (req.cookies.auth) {
      res.cookie('auth', '', { httpOnly: false });
      await DB.databasePut('authtokens', req.cookies.auth, null, {valid: false, lastUpdatedAt: new Date(-36000) });
    }

    next();
  };
}