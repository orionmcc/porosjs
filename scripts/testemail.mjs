
'use strict';

import email from '../lib/email.js';
import local from "../local/local.js";
const serverSettings = local.server;
const EmailAdapter = email.default;

let EMAIL = new EmailAdapter();
EMAIL.send("info@unpossiblegamelabs.com", { from: 'info@unpossibleworks.com', template: 'd-91855398cd1d4310bd5f4582b9b6d062', variables: { Server: serverSettings.host } });
