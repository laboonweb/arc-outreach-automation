'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), grid = require('../scripts/source-integrity-grid'), probe = require('../scripts/build-source-integrity-probe');
const book = { dataset_id: 'SYNTHETIC', spreadsheet_id: 'synthetic-book', primary_sheet: 'Synthetic leads', supplemental_sheets: {}, reference_sheets: [] };
function response() { return { statusCode: 200, body: { spreadsheetId: book.spreadsheet_id, properties: { title: 'Synthetic workbook' }, sheets: grid.titles(book).map((title, index) => ({ properties: { title, sheetId: index, sheetType: 'GRID', gridProperties: { rowCount: 10, columnCount: 4 } }, data: [{ startRow: 0, startColumn: 0, rowData: [{ values: [{ userEnteredValue: { formulaValue: '=1+1' }, userEnteredFormat: { backgroundColor: { red: 1 } }, note: 'Synthetic history' }] }] }] })) } }; }
test('source API request is one fixed HTTPS GET URL with complete bounded tab ranges and factual source fields', () => { const url = new URL(grid.request(book)); assert.equal(url.origin, 'https://sheets.googleapis.com'); assert.equal(url.pathname, '/v4/spreadsheets/synthetic-book'); assert.equal(url.searchParams.getAll('ranges').length, 2); assert.ok(url.searchParams.getAll('ranges').every(range => range.endsWith('!' + grid.RANGE))); assert.equal(grid.RANGE, 'A1:IV5000'); assert.equal(grid.MAX_COLUMNS, 256); const fields = url.searchParams.get('fields'); for (const key of ['userEnteredValue', 'userEnteredFormat', 'note', 'protectedRanges', 'conditionalFormats']) assert.ok(fields.includes(key)); assert.ok(!fields.includes('effectiveValue')); assert.throws(() => grid.request({ ...book, spreadsheet_id: 'bad/id' }), /BOOK_ID/); });
test('integrity receipt exposes hashes and coverage without source cell contents; formulas, history and colors affect hashes', () => { const original = response(), before = JSON.stringify(original), receipt = grid.receipt(original, book); assert.equal(JSON.stringify(original), before); assert.ok(!JSON.stringify(receipt).includes('Synthetic history')); assert.ok(!JSON.stringify(receipt).includes('formulaValue')); for (const mutate of [x => x.body.sheets[0].data[0].rowData[0].values[0].note = 'Changed history', x => x.body.sheets[0].data[0].rowData[0].values[0].userEnteredValue.formulaValue = '=1+2', x => x.body.sheets[0].data[0].rowData[0].values[0].userEnteredFormat.backgroundColor.red = 0]) { const altered = response(); mutate(altered); assert.notEqual(grid.receipt(altered, book).content_sha256, receipt.content_sha256); } });
test('partial grids, unregistered tabs, wrong workbooks, HTTP errors and oversized bodies cannot establish integrity', () => { for (const mutate of [x => x.statusCode = 307, x => x.body.spreadsheetId = 'wrong-book', x => x.body.sheets.pop(), x => x.body.sheets[0].properties.gridProperties.rowCount = 5001, x => x.body.sheets[0].data[0].startRow = 1, x => x.body.sheets[0].data = [], x => x.body.sheets[0].data[0].rowData[0].values[0].note = 'x'.repeat(grid.MAX_BYTES)]) { const value = response(); mutate(value); assert.throws(() => grid.receipt(value, book), /INTEGRITY_NATIVE/); } });
test('prepared native probe preserves authentication, disables retention and sending, and contains one nonretrying source GET with zero writes', () => { const result = probe.build({ ...book, private_config_field: 'must not enter Cloud' }, { id: 'synthetic-existing-webhook', name: 'Synthetic existing auth' }, { id: 'synthetic-existing-google', name: 'Synthetic existing Google' }); const w = result.workflow; assert.equal(w.active, false); assert.equal(w.nodes.length, 4); assert.equal(w.nodes.filter(node => node.type.includes('httpRequest')).length, 1); assert.equal(w.nodes.filter(node => node.type.includes('dataTable')).length, 0); assert.equal(w.nodes[0].parameters.authentication, 'basicAuth'); assert.equal(w.nodes[1].parameters.method, 'GET'); assert.equal(w.nodes[1].retryOnFail, false); assert.equal(w.nodes[1].parameters.options.redirect.redirect.followRedirects, false); assert.equal(w.settings.saveManualExecutions, false); assert.equal(w.settings.saveDataSuccessExecution, 'none'); assert.equal(w.settings.saveDataErrorExecution, 'none'); assert.ok(!JSON.stringify(w).includes('must not enter Cloud')); assert.ok(result.sdk.length < 300000); assert.throws(() => probe.build(book, {}), /CREDENTIAL_REFERENCES/); });
test('generated native Code returns the expected compact receipt on actual synthetic input', async () => { const result = probe.build(book, { id: 'synthetic-existing-webhook', name: 'Synthetic auth' }); const code = result.workflow.nodes.find(node => node.type === 'n8n-nodes-base.code').parameters.jsCode; const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor, run = new AsyncFunction('$input', 'require', code); const input = response(), actual = await run({ first: () => ({ json: input }) }, require); assert.deepEqual(actual, [{ json: grid.receipt(input, book) }]); input.statusCode = 401; assert.deepEqual(await run({ first: () => ({ json: input }) }, require), [{ json: grid.failure(new Error('INTEGRITY_NATIVE_HTTP_STOP')) }]); assert.equal(result.workflow.nodes.at(-1).parameters.options.responseCode, '={{ $json.ok === true ? 200 : 422 }}'); });
test('integrity bounds cover the actual research schema and reject a single uncovered column', () => {
  const headers = require('../scripts/dataset-output').ALL_HEADERS;
  assert.equal(headers.length, 208); assert.ok(headers.length <= grid.MAX_COLUMNS);
  const input = response(), sheet = input.body.sheets.find(s => s.properties.title === 'Arc Research');
  sheet.properties.gridProperties.columnCount = headers.length;
  sheet.data[0].rowData[0].values = headers.map(header => ({ userEnteredValue: { stringValue: header } }));
  const first = grid.receipt(input, book); assert.equal(first.ok, true);
  sheet.data[0].rowData[0].values.at(-1).note = 'Synthetic change in column 208';
  assert.notEqual(grid.receipt(input, book).content_sha256, first.content_sha256);
  sheet.properties.gridProperties.columnCount = grid.MAX_COLUMNS;
  assert.equal(grid.receipt(input, book).ok, true);
  sheet.properties.gridProperties.columnCount++;
  assert.throws(() => grid.receipt(input, book), /GRID_COVERAGE_LIMIT/);
});
test('compact failure receipts cannot leak source data or certify a failed check', async () => {
  const failure = grid.failure(new Error('Synthetic confidential cell contents'));
  assert.equal(failure.ok, false); assert.equal(failure.error, 'INTEGRITY_NATIVE_HASH_RUNTIME_FAILED');
  assert.ok(!JSON.stringify(failure).includes('confidential')); assert.ok(!('content_sha256' in failure));
  const w = probe.build(book, { id: 'synthetic-auth', name: 'Synthetic auth' }).workflow;
  const run = new (Object.getPrototypeOf(async function () {}).constructor)('$input', 'require', w.nodes[2].parameters.jsCode);
  const input = response(); input.body.sheets[0].properties.gridProperties.columnCount = 257;
  assert.deepEqual(await run({ first: () => ({ json: input }) }, require), [{ json: grid.failure(new Error('INTEGRITY_NATIVE_GRID_COVERAGE_LIMIT')) }]);
  assert.deepEqual(await run({ first: () => { throw new Error('Synthetic private contents'); } }, require), [{ json: failure }]);
});
test('SDK output hints include the receipt gate while reconstructing exact runtime parameters', () => {
  const { workflow: w, sdk } = probe.build(book, { id: 'synthetic-auth', name: 'Synthetic auth' }), configs = [];
  const node = c => { configs.push(c); return { name: c.config.name, output: () => ({ to: () => ({}) }) }; };
  const workflow = { add() { return this; }, group() { return this; } };
  require('node:vm').runInNewContext(sdk.replace(/^import .*?;\n/m, '').replace('export default workflow(', 'workflow('), { node, trigger: node, workflow: () => workflow, expr: x => '=' + x });
  assert.equal(configs.length, 4);
  configs.forEach((config, index) => { assert.deepEqual(JSON.parse(JSON.stringify(config.config.parameters)), w.nodes[index].parameters); assert.equal(config.output[0].ok, true); assert.ok(!('content_sha256' in config.output[0])); });
});
