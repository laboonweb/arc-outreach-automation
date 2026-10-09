'use strict';
const fs = require('node:fs'), path = require('node:path'), base = require('./build-phase2-cloud'), { bundle } = require('./build-workflows'), grid = require('./source-integrity-grid');
function build(book, webhookCredential, googleCredential = base.GOOGLE) {
  if (!webhookCredential?.id || !googleCredential?.id) throw Error('EXISTING_INTEGRITY_CREDENTIAL_REFERENCES_REQUIRED');
  book = { dataset_id: book.dataset_id, spreadsheet_id: book.spreadsheet_id, primary_sheet: book.primary_sheet, supplemental_sheets: Object.fromEntries(Object.keys(book.supplemental_sheets || {}).map(key => [key, {}])), reference_sheets: book.reference_sheets || [] };
  const intake = { name: 'Authenticated integrity request', type: 'n8n-nodes-base.webhook', typeVersion: 2.1, parameters: { httpMethod: 'GET', path: 'arc-integrity-20261009-319ba8', authentication: 'basicAuth', responseMode: 'responseNode', options: { allowedOrigins: 'https://briann.app.n8n.cloud', ignoreBots: true } }, credentials: { httpBasicAuth: webhookCredential } };
  const get = base.read('Read one bounded workbook', grid.request(book));
  get.credentials = { googleSheetsOAuth2Api: googleCredential };
  get.parameters.options = { timeout: 30000, allowUnauthorizedCerts: false, redirect: { redirect: { followRedirects: false } }, response: { response: { fullResponse: true, neverError: false, responseFormat: 'json' } } };
  get.onError = 'stopWorkflow'; get.retryOnFail = false;
  const compact = base.code('Return only integrity hashes', bundle('source-integrity-grid') + 'try { return [{json:arc.receipt($input.first().json,' + JSON.stringify(book) + ')}]; } catch(error) { return [{json:arc.failure(error)}]; }');
  const respond = { name: 'Private compact integrity receipt', type: 'n8n-nodes-base.respondToWebhook', typeVersion: 1.4, parameters: { respondWith: 'json', responseBody: '={{ JSON.stringify($json) }}', options: { responseCode: '={{ $json.ok === true ? 200 : 422 }}', responseHeaders: { entries: [{ name: 'Cache-Control', value: 'no-store' }, { name: 'Referrer-Policy', value: 'no-referrer' }, { name: 'X-Content-Type-Options', value: 'nosniff' }] } } } };
  const nodes = [intake, get, compact, respond], connections = {};
  nodes.forEach((node, index) => { node.position = [index * 240, 0]; if (index < nodes.length - 1) connections[node.name] = { main: [[{ node: nodes[index + 1].name, type: 'main', index: 0 }]] }; });
  const workflow = { name: 'Arc Operator Smoke 20261008-319ba8 control', active: false, nodes, connections, settings: { ...base.SETTINGS, saveManualExecutions: false, saveDataSuccessExecution: 'none', saveDataErrorExecution: 'none', saveExecutionProgress: false, executionTimeout: 60 } };
  // SDK-only shape hint; compact() replaces node output samples with one shared
  // fixture. This cannot become a baseline or change runtime node parameters.
  const sdk = require('./workflow-sdk-compact').compact(workflow).replace(/^const fixtureOutput=[^\r\n]+;$/m, 'const fixtureOutput=[{"ok":true,"source_writes":0,"research_writes":0,"table_writes":0}];');
  return { workflow, sdk };
}
module.exports = { build };
if (require.main === module) {
  const dir = path.resolve(__dirname, '../private/operator-stage1');
  const books = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../config/datasets.json'))).datasets;
  const index = Number(process.argv[2]);
  if (!Number.isInteger(index) || !books[index]) throw Error('INTEGRITY_BOOK_INDEX_REQUIRED');
  const credentials = JSON.parse(fs.readFileSync(path.join(dir, 'integrity-probe-credentials.json')));
  const result = build(books[index], credentials.webhook, credentials.google);
  fs.writeFileSync(path.join(dir, 'integrity-probe-' + index + '.json'), JSON.stringify(result.workflow, null, 2));
  fs.writeFileSync(path.join(dir, 'integrity-probe-' + index + '.sdk.js'), result.sdk);
  console.log(JSON.stringify({ nodes: result.workflow.nodes.length, sdk_characters: result.sdk.length, cloud_changes: 0, calls: 0 }));
}
