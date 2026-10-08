'use strict';
const { norm, text } = require('./helpers');
function timezoneFor(row) {
  if (text(row.timezone_override)) {
    try { new Intl.DateTimeFormat('en', { timeZone: row.timezone_override }).format(); return { timezone: row.timezone_override, source: 'MANUAL_OVERRIDE' }; } catch { return { timezone: '', source: 'INVALID_OVERRIDE' }; }
  }
  if (norm(row.country) === 'philippines') return { timezone: 'Asia/Manila', source: 'COUNTRY' };
  if (norm(row.country) !== 'australia') return { timezone: '', source: 'REVIEW_REQUIRED' };
  const cities = { sydney: 'Australia/Sydney', melbourne: 'Australia/Melbourne', brisbane: 'Australia/Brisbane', perth: 'Australia/Perth', adelaide: 'Australia/Adelaide', hobart: 'Australia/Hobart', darwin: 'Australia/Darwin', canberra: 'Australia/Sydney', 'broken hill': 'Australia/Broken_Hill', eucla: 'Australia/Eucla', 'lord howe island': 'Australia/Lord_Howe' };
  const combined = norm([row.city, row.location, row.address].join(' '));
  for (const city of ['broken hill', 'eucla', 'lord howe island']) if (combined.includes(city)) return { timezone: cities[city], source: 'CITY_EXCEPTION' };
  if (cities[norm(row.city)]) return { timezone: cities[norm(row.city)], source: 'CITY_LOOKUP' };
  const state = text(row.state).toUpperCase();
  const zones = { NSW: 'Australia/Sydney', VIC: 'Australia/Melbourne', QLD: 'Australia/Brisbane', WA: 'Australia/Perth', SA: 'Australia/Adelaide', TAS: 'Australia/Hobart', NT: 'Australia/Darwin', ACT: 'Australia/Sydney' };
  if (zones[state] && text(row.city) && norm(row.city) !== 'unknown') return { timezone: zones[state], source: 'STATE_DEFAULT_REVIEW_BEFORE_SCHEDULING' };
  return { timezone: '', source: 'REVIEW_REQUIRED' };
}
module.exports = { timezoneFor };
