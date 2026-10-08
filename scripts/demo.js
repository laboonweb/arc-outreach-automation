'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { prepareRows, runResearch, sheetRecord, OUTPUT_FIELDS } = require('./research-engine');
const fixtures = require('../tests/fixtures/leads.json');
async function main() {
  const results = [];
  for (const row of prepareRows(fixtures.leads)) {
    const result = await runResearch(row, fixtures.config, async url => {
      if (!fixtures.responses[url]) throw new Error('UNEXPECTED_FIXTURE_REQUEST: ' + url);
      return fixtures.responses[url];
    }, fixtures.now);
    results.push(result);
    console.log(JSON.stringify({ event: 'fixture_result', business: result.business_name, status: result.website_status, contact: result.email_validation, quality: result.lead_quality }));
  }
  const out = path.resolve(__dirname, '../outputs');
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'sample-results.json'), JSON.stringify(results, null, 2) + '\n');
  const quote = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  fs.writeFileSync(path.join(out, 'sample-results.csv'), [OUTPUT_FIELDS.map(quote).join(','), ...results.map(result => {
    const row = sheetRecord(result);
    return OUTPUT_FIELDS.map(field => quote(row[field])).join(',');
  })].join('\n') + '\n');
  console.log('Wrote outputs/sample-results.json and .csv using synthetic fixtures. No network requests or spreadsheet writes.');
}
if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
module.exports = { main };
