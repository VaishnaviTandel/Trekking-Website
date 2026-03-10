const twilio = require("twilio");

const client = new twilio("SID", "TOKEN");

const sendSMS = async (phone, message) => {

  await client.messages.create({
    body: message,
    from: "+123456789",
    to: phone
  });

};

module.exports = sendSMS;