import mailgun from "mailgun-js";
import { email as settings } from "./local.js";

export default class MailGunEmailAdapter {
  constructor() {
    this.mg = mailgun({apiKey: settings.APIKEY, domain: settings.DOMAIN});
  }

  initialize(database) {
  }

  send(recipient, subject, text, from = null) {
    console.log(settings.DEVEMAILS, settings.DEVEMAILS.indexOf(recipient) != -1)
    let devEmails = settings.DEVEMAILS && settings.DEVEMAILS.length > 0;
    console.log('devEmails', devEmails);
    if (!devEmails || devEmails && settings.DEVEMAILS.indexOf(recipient) != -1) {
      this. mg.messages().send({
        from: from || settings.FROM,
      	to: recipient,
      	subject: subject,
      	text: text
      }, function (error, body) {
      	console.log(body);
      });
    } else {
      console.log('DEVELOPMENT MODE EMAIL', recipient, subject, text, from, "Email not sent");
    }
  }
};
