'use strict';
const { OUTPUT_FIELDS, sheetRecord } = require('./research-engine');
const { REVIEW_FIELDS } = require('./dataset-intake');
const { readTable, gridRows } = require('./sheet-grid');
const { text } = require('./helpers');
const { DIMENSION_FIELDS } = require('./qualification');
const PROTECTED_FIELDS=new Set(require('./research-history').PROTECTED_FIELDS);
const V2_FIELDS = OUTPUT_FIELDS.slice(0, OUTPUT_FIELDS.length - DIMENSION_FIELDS.length);
const ALL_HEADERS = [...OUTPUT_FIELDS, ...REVIEW_FIELDS.filter(f => !OUTPUT_FIELDS.includes(f))];
function cell(value) {
  if (typeof value === 'boolean') return { userEnteredValue: { boolValue: value } };
  if (typeof value === 'number' && Number.isFinite(value)) return { userEnteredValue: { numberValue: value } };
  const s = String(value ?? '');
  if (s.length > 45000) throw new Error('OUTPUT_CELL_TOO_LARGE');
  // stringValue is literal, so incoming =HYPERLINK or =IMPORTXML never executes.
  return { userEnteredValue: { stringValue: s } };
}
function planOutputWrites(results, intake, config) {
  const requests = [];
  const ids = new Set();
  for (const result of results) {
    if (ids.has(result.lead_id)) throw new Error('DUPLICATE_RESULT_ID');
    ids.add(result.lead_id);
    if (!intake.leads.some(l => l.lead_id === result.lead_id && l.dataset_id === result.dataset_id && l.source_spreadsheet_id === result.source_spreadsheet_id)) throw new Error('UNKNOWN_RESULT_ID');
  }
  for (const context of intake.contexts) {
    const { dataset, snapshot } = context;
    const output = results.filter(r => r.dataset_id === dataset.dataset_id);
    if (!output.length) continue;
    if (dataset.output_sheet !== 'Arc Research') throw new Error('UNSAFE_OUTPUT_TAB');
    const sheets = snapshot.sheets || [];
    const existing = sheets.find(s => s.properties.title === dataset.output_sheet);
    const allSheetMetadata = snapshot._metadata?.sheets || sheets;
    const sheetId = existing ? existing.properties.sheetId : Math.max(-1, ...allSheetMetadata.map(s => s.properties.sheetId)) + 1;
    if (!Number.isInteger(sheetId) || sheetId < 0 || sheetId >= 2147483647) throw new Error('INVALID_OUTPUT_SHEET_ID');
    const writes = [];
    const grid = existing ? gridRows(existing) : [];
    const hasData = grid.some(row => row?.some(c => text(c.formattedValue ?? c.userEnteredValue?.stringValue)));
    if (!existing) writes.push({ addSheet: { properties: { sheetId, title: 'Arc Research', gridProperties: { rowCount: 1000, columnCount: ALL_HEADERS.length } } } });
    let nextRow = 1;
    const rowIndex = new Map(), priorRows = new Map();
    if (hasData) {
      const table = readTable(existing, 1);
      const current = OUTPUT_FIELDS.every((h, i) => table.headers[i] === h);
      const legacy = V2_FIELDS.every((h, i) => table.headers[i] === h) && table.headers[V2_FIELDS.length] === 'manual_status_override';
      if (!current && !legacy) throw new Error('OUTPUT_SCHEMA_MISMATCH: ' + dataset.dataset_id + '; do not reorder machine-owned columns');
      if (legacy) {
        // Insert the new machine columns before reviewer controls. Existing controls
        // move together with their values/formulas/formatting, including unknown columns.
        writes.push({insertDimension:{range:{sheetId,dimension:'COLUMNS',startIndex:V2_FIELDS.length,endIndex:OUTPUT_FIELDS.length},inheritFromBefore:true}});
        writes.push({updateCells:{start:{sheetId,rowIndex:0,columnIndex:V2_FIELDS.length},rows:[{values:DIMENSION_FIELDS.map(cell)}],fields:'userEnteredValue'}});
      }
      const missingControls = REVIEW_FIELDS.filter(f=>!OUTPUT_FIELDS.includes(f)&&!table.headers.includes(f));
      if(missingControls.length) writes.push({updateCells:{start:{sheetId,rowIndex:0,columnIndex:table.headers.length+(legacy?DIMENSION_FIELDS.length:0)},rows:[{values:missingControls.map(cell)}],fields:'userEnteredValue'}});
      for (const record of table.rows) {
        if (!record.values.lead_id || rowIndex.has(record.values.lead_id)) throw new Error('DUPLICATE_OR_EMPTY_OUTPUT_ID');
        rowIndex.set(record.values.lead_id, record.source_row - 1);
        priorRows.set(record.values.lead_id, record.values);
        nextRow = Math.max(nextRow, record.source_row);
      }
    } else {
      writes.push({ updateCells: { start: { sheetId, rowIndex: 0, columnIndex: 0 }, rows: [{ values: ALL_HEADERS.map(cell) }], fields: 'userEnteredValue' } });
    }
    const plannedRows = output.map(result => {
      const index = rowIndex.has(result.lead_id) ? rowIndex.get(result.lead_id) : nextRow++;
      return { index, result: require('./research-history').mergeRows(priorRows.get(result.lead_id)||{},result) };
    });
    if (existing) {
      const rowsNeeded = Math.max(2, nextRow), colsNeeded = ALL_HEADERS.length;
      const dims = existing.properties.gridProperties || {};
      const insertedColumns = writes.reduce((n,r)=>n+(r.insertDimension?r.insertDimension.range.endIndex-r.insertDimension.range.startIndex:0),0);
      if ((dims.columnCount || 0) + insertedColumns < colsNeeded) writes.unshift({ appendDimension: { sheetId, dimension: 'COLUMNS', length: colsNeeded - (dims.columnCount || 0) - insertedColumns } });
      if ((dims.rowCount || 0) < rowsNeeded) writes.unshift({ appendDimension: { sheetId, dimension: 'ROWS', length: rowsNeeded - (dims.rowCount || 0) } });
    }
    for (const { index, result } of plannedRows) {
      const safe = sheetRecord(result);
      if(priorRows.has(result.lead_id))for(const [columnIndex,f]of OUTPUT_FIELDS.entries()){if(PROTECTED_FIELDS.has(f))continue;writes.push({updateCells:{start:{sheetId,rowIndex:index,columnIndex},rows:[{values:[cell(safe[f])]}],fields:'userEnteredValue'}});}
      else writes.push({ updateCells: { start: { sheetId, rowIndex: index, columnIndex: 0 }, rows: [{ values: OUTPUT_FIELDS.map(f => cell(safe[f])) }], fields: 'userEnteredValue' } });
    }
    // Every mutation must be anchored to the dedicated output sheet. No source formatting writes.
    for (const request of writes) {
      const target = request.updateCells?.start.sheetId ?? request.addSheet?.properties.sheetId ?? request.appendDimension?.sheetId ?? request.insertDimension?.range.sheetId;
      if (target !== sheetId || request.updateCells && request.updateCells.fields !== 'userEnteredValue') throw new Error('SOURCE_WRITE_BLOCKED');
    }
    requests.push({ dataset_id: dataset.dataset_id, dry_run: config.dry_run !== false, rows: output.length, output_sheet_id: sheetId,
      source_spreadsheet_id: output[0].source_spreadsheet_id,
      url: `https://sheets.googleapis.com/v4/spreadsheets/${output[0].source_spreadsheet_id}:batchUpdate`,
      body: { requests: writes, includeSpreadsheetInResponse: false } });
  }
  return requests;
}
module.exports = { ALL_HEADERS, planOutputWrites };
