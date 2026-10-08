'use strict';
const { text } = require('./helpers');
function validateEmail(input) {
  const email = text(input).toLowerCase();
  const valid = email.length <= 254 && /^[a-z\d.!#$%&'*+/=?^_`{|}~-]+@[a-z\d](?:[a-z\d-]*[a-z\d])?(?:\.[a-z\d](?:[a-z\d-]*[a-z\d])?)+$/i.test(email) &&
    !email.startsWith('.') && !email.includes('..') && !email.includes('.@') && email.split('@')[0].length <= 64;
  return { email, valid, verification: valid ? 'SYNTAX_ONLY' : 'INVALID', deliverability: 'UNKNOWN' };
}
module.exports = { validateEmail };
