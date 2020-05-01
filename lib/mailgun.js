import mailgun from "mailgun-js";
import { email as settings } from "../local/local";

export default class MailGunEmailAdapter {
  constructor() {
    this.mg = mailgun({apiKey: settings.APIKEY, domain: settings.DOMAIN});
  }

  initialize(database) {
  }

  async send(recipient, subject, { text = null, from = null, template = null, variables = null }) {
    let devEmails = settings.DEVEMAILS && settings.DEVEMAILS.length > 0;
    console.log('devEmails', devEmails);
    if (!devEmails || devEmails && settings.DEVEMAILS.indexOf(recipient) != -1) {
      let data = {
        from: from || settings.FROM,
      	to: recipient,
      	subject: subject,
      };

      if (text) data['text'] = text;
      if (template) data['template'] = template;

      if (variables) {
        for(let v in variables) {
          data[`v:${v}`] = variables[v];
        }
      }

      console.log('data', data);
      const response = await this.mg.messages().send(data);
      console.log("MG Response", response);
      return true;

    } else {
      console.log('DEVELOPMENT MODE EMAIL', recipient, subject, text, from, "Email not sent");
      return Promise.resolve(true);
    }
  }
};
