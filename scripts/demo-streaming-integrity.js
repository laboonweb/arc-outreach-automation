'use strict';
// Offline representative-size demonstration. Synthetic streams, no network.
const fs = require('node:fs'), path = require('node:path');
const { performance } = require('node:perf_hooks');
const v = require('./verify-source-integrity-streaming'), headers = require('./dataset-output').ALL_HEADERS;
const book = { dataset_id: 'SYNTHETIC_DEMO', spreadsheet_id: 'synthetic-demo-book', primary_sheet: 'Synthetic source', supplemental_sheets: {}, reference_sheets: [] };
function metadata(rows) { return { spreadsheetId: book.spreadsheet_id, spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/synthetic-demo-book/edit', commentsViewMode: 'COMMENTS_VIEW_MODE_INCLUDED', properties: { title: 'SYNTHETIC size demonstration' }, sheets: ['Synthetic source', 'Arc Research'].map((title, sheetId) => ({ properties: { title, sheetId, sheetType: 'GRID', gridProperties: { rowCount: rows, columnCount: 208 } } })) }; }
function* stream(rows, columns = 208, heavy = true) {
  const props = metadata(rows).sheets[1].properties;
  yield Buffer.from('{"spreadsheetId":' + JSON.stringify(book.spreadsheet_id) + ',"sheets":[{"properties":' + JSON.stringify(props) + ',"data":[{"rowData":[');
  const header = { values: headers.map(h => ({ userEnteredValue: { stringValue: h } })) };
  yield Buffer.from(JSON.stringify(header));
  const value = heavy ? 'SYNTHETIC factual observation; no real business or contact data.' : 'SYNTHETIC';
  const cell = { userEnteredValue: { stringValue: value }, effectiveValue: { stringValue: value }, formattedValue: value, ...(heavy ? { userEnteredFormat: { backgroundColorStyle: { rgbColor: { red: 1 } }, wrapStrategy: 'WRAP' }, effectiveFormat: { numberFormat: { type: 'TEXT' } }, note: 'SYNTHETIC only' } : {}) };
  const row = Buffer.from(',' + JSON.stringify({ values: Array.from({ length: columns }, () => cell) }));
  for (let i = 1; i < rows; i++) yield row;
  yield Buffer.from(']}]}]}');
}
function measure(rows, heavy) {
  if (global.gc) global.gc();
  const start = performance.now(), consumer = v.gridConsumer(v.metadata(metadata(rows), book), book, 'Arc Research');
  let bytes = 0, peakHeap = 0, peakRss = 0;
  const populatedColumns = heavy ? 208 : 52;
  for (const chunk of stream(rows, populatedColumns, heavy)) {
    for (let i = 0; i < chunk.length; i += 16384) {
      const part = chunk.subarray(i, i + 16384); bytes += part.length;
      if (bytes > v.GRID_BYTES) throw Error('INTEGRITY_EXTERNAL_BODY_LIMIT');
      const usage = process.memoryUsage(); peakHeap = Math.max(peakHeap, usage.heapUsed); peakRss = Math.max(peakRss, usage.rss);
      if (peakHeap > v.MAX_HEAP_BYTES || peakRss > v.MAX_RSS_BYTES) throw Error('INTEGRITY_EXTERNAL_MEMORY_LIMIT');
      consumer.write(part);
    }
  }
  const result = consumer.finish();
  return { rows, columns: 208, populated_data_columns: populatedColumns, profile: heavy ? 'dense original/calculated/display values, note and formats' : 'sparse short original/calculated/display values', decoded_bytes: bytes, elapsed_ms: Math.round(performance.now() - start), peak_heap_bytes: peakHeap, peak_rss_bytes: peakRss, parser: result.parser, complete_grid: result.complete_grid, required_research_columns: result.required_research_columns, sha256: result.sha256 };
}
function demonstrate() {
  const examples = [measure(400, true), measure(700, true), measure(5000, false)];
  const result = { synthetic_only: true, google_requests: 0, cloud_executions: 0, source_writes: 0, actual_schema_columns: headers.length, native_limit_unchanged: 8 * 1024 * 1024, external_limits: { stream_bytes_per_sheet: v.GRID_BYTES, metadata_bytes: v.META_BYTES, token_bytes: v.TOKEN_BYTES, heap_bytes: v.MAX_HEAP_BYTES, rss_bytes: v.MAX_RSS_BYTES }, examples };
  return result;
}
module.exports = { book, metadata, stream, measure, demonstrate };
if (require.main === module) {
  const result = demonstrate(), file = path.resolve(__dirname, '../private/operator-stage1/external-stream-local-demo-complete-20261009.json');
  fs.writeFileSync(file, JSON.stringify(result, null, 2)); console.log(JSON.stringify(result, null, 2));
}
