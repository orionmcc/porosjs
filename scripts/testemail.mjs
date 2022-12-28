
'use strict';

import email from '../lib/email.js';
import local from "../local/local.js";
const serverSettings = local.server;
const emailSettings = local.email;
const EmailAdapter = email.default;

let EMAIL = new EmailAdapter();
console.log('Sending with API key', emailSettings.APIKEY)
EMAIL.send("info@unpossiblegamelabs.com", { from: 'info@unpossibleworks.com', template: 'd-91855398cd1d4310bd5f4582b9b6d062', variables: { Server: serverSettings.host } });
