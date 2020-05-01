
'use strict';

import EmailAdapter from '../lib/email';
import { server as serverSettings } from "../local/local";

let EMAIL = new EmailAdapter();
EMAIL.send("info@unpossiblegamelabs.com", { from: 'info@unpossibleworks.com', template: 'd-91855398cd1d4310bd5f4582b9b6d062', variables: { Server: serverSettings.host } });
