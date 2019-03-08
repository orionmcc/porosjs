
'use strict';
import DBAdapter from '../lib/database';
import {passwordHash} from '../lib/authentication';
import crypto from 'crypto';
let DB = new DBAdapter();

const USER_ID = crypto.randomBytes(16).toString('base64');
const SALT = crypto.randomBytes(16).toString('base64');
const ITERATIONS = 10000;

let role = 'poros.admin';
let database = '';
let user = '';
let password = '';
let project = '';

function printUsage()
{
  console.log('npm run adduser SITE USERNAME PASSWORD [a s u]')
  console.log('    a    grants this user an admin access <default>')
  console.log('    s    grants this user superuser access')
  console.log('    u   grants this user readonly access')
}

async function go() {

  console.log('length ', process.argv.length, process.argv);
  for (let i = 2; i < process.argv.length; i++) {
    let a = process.argv[i];
    if(a === 'help')
    {
      user = '';
      break;
<<<<<<< e3c2ae81660504306447fbe5ebc256616c17bc9f
    } else if (database === '') {
      database = a.toLowerCase();
=======
    } else if (project === '') {
      project = a;
>>>>>>> updates
    } else if (user === '') {
      user = a.toLowerCase();
    } else if (password === '') {
      password = a;
    } else if (a === 'a') {
      role = 'poros.admin';
    } else if (a === 's') {
      role = 'poros.superuser';
    } else if (a === 'u') {
      role = 'poros.user';
    }
    // if (a === '-h' || a === '--help') {
    // 	printUsage();
    // 	break;
    // } else if (a === '-a' || a === '--admin') {
    // 	role = 'poros.admin';
    // } else if (a === '-s' || a === '--superuser') {
    // 	role = 'poros.superuser';
    // } else  if (a === '-u' || a === '--user') {
    // 	role = 'poros.user';
    // } else if (user === '') {
    // 	user = a;
    // } else if (password === '') {
    // 	password = a;
    // }
  }

<<<<<<< e3c2ae81660504306447fbe5ebc256616c17bc9f
  if (database === '' || user === '' || password === '') {
=======
  if (user === '' || password === '' || project === '') {
>>>>>>> updates
    printUsage();
  } else {

    try {
      // fix this
<<<<<<< e3c2ae81660504306447fbe5ebc256616c17bc9f
      await DB.initialize(database);
=======
      await DB.initialize(project);
>>>>>>> updates

      const key = passwordHash(password, SALT, ITERATIONS);
      const USER = {
        auth: key.toString('base64'),
        role,
        salt: SALT,
        iterations: ITERATIONS,
        guid: USER_ID,
        tfa: false,
      }

      console.log(database, USER);
      let existingUser = await DB.databaseGet('users', user, null);
      if(existingUser.length) {
        console.error('Can not modify existing user');
        process.exit(0);
      } else {
        let newUser = await DB.databasePut('users', user, null, USER);
        process.exit(0);
      }
    } catch(err) {
      console.error(err);
    }
  }
}

go();
