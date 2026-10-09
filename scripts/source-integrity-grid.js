'use strict';
const crypto = require('crypto');
// Arc Research currently has 208 columns. IV covers 256, with room for the
// existing schema while still rejecting any grid outside the requested range.
const MAX_BYTES = 8 * 1024 * 1024, MAX_ROWS = 5000, MAX_COLUMNS = 256, MAX_TABS = 10;
const RANGE = 'A1:IV5000';
const FIELDS = 'spreadsheetId,properties,namedRanges,developerMetadata,sheets(properties,data(startRow,startColumn,rowData(values(userEnteredValue,userEnteredFormat,note,dataValidation,textFormatRuns)),rowMetadata,columnMetadata),merges,conditionalFormats,filterViews,protectedRanges,basicFilter,charts,bandedRanges,developerMetadata,rowGroups,columnGroups,slicers,tables)';
const canonical = value => JSON.stringify(value, (key, item) => item && typeof item === 'object' && !Array.isArray(item) ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) : item);
const digest = value => crypto.createHash('sha256').update(canonical(value)).digest('hex');
function titles(book) { return [...new Set([book.primary_sheet, ...Object.keys(book.supplemental_sheets || {}), ...(book.reference_sheets || []), 'Arc Research'])]; }
function request(book) {
  if (!/^[a-zA-Z0-9_-]{5,100}$/.test(book.spreadsheet_id)) throw Error('INTEGRITY_BOOK_ID_REQUIRED');
  const tabs = titles(book);
  if (tabs.length > MAX_TABS || tabs.some(x => typeof x !== 'string' || !x.trim())) throw Error('INTEGRITY_TAB_LIMIT');
  return 'https://sheets.googleapis.com/v4/spreadsheets/' + book.spreadsheet_id + '?fields=' + encodeURIComponent(FIELDS) + '&' + tabs.map(x => 'ranges=' + encodeURIComponent("'" + x.replace(/'/g, "''") + "'!" + RANGE)).join('&');
}
function receipt(response, book) {
  if (response.statusCode !== 200 || !response.body || response.body.error) throw Error('INTEGRITY_NATIVE_HTTP_STOP');
  const body = response.body, bytes = Buffer.byteLength(JSON.stringify(body), 'utf8');
  if (bytes > MAX_BYTES) throw Error('INTEGRITY_NATIVE_BODY_LIMIT');
  if (body.spreadsheetId !== book.spreadsheet_id || !Array.isArray(body.sheets) || !body.sheets.length || body.sheets.length > MAX_TABS) throw Error('INTEGRITY_NATIVE_ID_OR_TABS');
  const actual = body.sheets.map(x => x.properties?.title), expected = titles(book);
  if (new Set(actual).size !== actual.length || canonical(actual.slice().sort()) !== canonical(expected.slice().sort())) throw Error('INTEGRITY_NATIVE_TAB_COVERAGE');
  for (const sheet of body.sheets) {
    const p = sheet.properties, grid = p.gridProperties;
    if ((p.sheetType && p.sheetType !== 'GRID') || !grid || !Number.isInteger(grid.rowCount) || !Number.isInteger(grid.columnCount) || grid.rowCount < 1 || grid.columnCount < 1 || grid.rowCount > MAX_ROWS || grid.columnCount > MAX_COLUMNS) throw Error('INTEGRITY_NATIVE_GRID_COVERAGE_LIMIT');
    if (!Array.isArray(sheet.data) || sheet.data.length !== 1 || (sheet.data[0].startRow || 0) !== 0 || (sheet.data[0].startColumn || 0) !== 0) throw Error('INTEGRITY_NATIVE_GRID_START_REQUIRED');
    const rows = sheet.data[0].rowData || [];
    if (rows.length > grid.rowCount || rows.some(row => (row.values || []).length > grid.columnCount)) throw Error('INTEGRITY_NATIVE_GRID_DIMENSION_MISMATCH');
  }
  return { ok: true, dataset: book.dataset_id, body_bytes: bytes, content_sha256: digest(body), tabs: body.sheets.map(sheet => ({ title: sheet.properties.title, rows: sheet.properties.gridProperties.rowCount, columns: sheet.properties.gridProperties.columnCount, sha256: digest(sheet) })), source_writes: 0, research_writes: 0, table_writes: 0 };
}
function failure(error) {
  // Do not echo arbitrary exception text: it can contain source cell contents.
  const allowed = new Set(['INTEGRITY_NATIVE_HTTP_STOP', 'INTEGRITY_NATIVE_BODY_LIMIT', 'INTEGRITY_NATIVE_ID_OR_TABS', 'INTEGRITY_NATIVE_TAB_COVERAGE', 'INTEGRITY_NATIVE_GRID_COVERAGE_LIMIT', 'INTEGRITY_NATIVE_GRID_START_REQUIRED', 'INTEGRITY_NATIVE_GRID_DIMENSION_MISMATCH']);
  return { ok: false, error: allowed.has(error?.message) ? error.message : 'INTEGRITY_NATIVE_HASH_RUNTIME_FAILED', source_writes: 0, research_writes: 0, table_writes: 0 };
}
module.exports = { MAX_BYTES, MAX_ROWS, MAX_COLUMNS, MAX_TABS, RANGE, FIELDS, canonical, digest, titles, request, receipt, failure };
