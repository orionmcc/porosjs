import sgMail from "@sendgrid/mail";
import { email as settings } from "../local/local";

export default class SendGridEmailAdapter {
  constructor() {
    console.log('Initialize Email', settings.APIKEY);
    sgMail.setApiKey(settings.APIKEY);
  }

  async send(recipient, { subject = "", text = null, from = null, template = null, variables = null }) {
    let devEmails = settings.DEVEMAILS && settings.DEVEMAILS.length > 0;
    console.log('devEmails', devEmails);
    if (!devEmails || devEmails && settings.DEVEMAILS.indexOf(recipient) != -1) {
      let data = {
        from: from || settings.FROM,
      	to: recipient,
      	subject: subject,
      };

      if (text) data['text'] = text;
      if (template) data['template_id'] = template;
      if (variables) data[`dynamic_template_data`] = variables;

      console.log('data', data);
      try {
        const response = await sgMail.send(data);
        console.log("SendGrid Response", response);
      } catch (e) {
        console.error('Send Grid send failed', e);
      }
      return true;

    } else {
      console.log('DEVELOPMENT MODE EMAIL', recipient, subject, text, from, "Email not sent");
      return Promise.resolve(true);
    }
  }
};
