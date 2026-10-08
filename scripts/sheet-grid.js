'use strict';
const { text } = require('./helpers');
function cellText(cell = {}) {
  return text(cell.formattedValue ?? cell.effectiveValue?.stringValue ?? cell.effectiveValue?.numberValue ??
    cell.userEnteredValue?.stringValue ?? cell.userEnteredValue?.numberValue ?? cell.userEnteredValue?.boolValue);
}
function gridRows(sheet) {
  const rows = [];
  for (const block of sheet.data || []) {
    for (const [i, row] of (block.rowData || []).entries()) {
      const index = (block.startRow || 0) + i;
      rows[index] ||= [];
      for (const [j, cell] of (row.values || []).entries()) rows[index][(block.startColumn || 0) + j] = cell;
    }
  }
  return rows;
}
function readTable(sheet, headerRow) {
  const grid = gridRows(sheet);
  const headers = (grid[headerRow - 1] || []).map(cellText);
  if (!headers.some(Boolean)) throw new Error('MISSING_HEADER: ' + sheet.properties.title);
  const named = headers.filter(Boolean);
  if (new Set(named).size !== named.length) throw new Error('DUPLICATE_COLUMN: ' + sheet.properties.title);
  const rows = [];
  for (let i = headerRow; i < grid.length; i++) {
    const cells = grid[i] || [];
    if (!cells.some(cell => cellText(cell))) continue;
    const values = {}, links = {};
    headers.forEach((header, column) => {
      if (!header) return;
      values[header] = cellText(cells[column]);
      const cell = cells[column] || {};
      const found = [cell.hyperlink, ...(cell.textFormatRuns || []).map(r => r.format?.link?.uri)].filter(Boolean);
      const formula = cell.userEnteredValue?.formulaValue || '';
      const match = /^=HYPERLINK\("([^"]+)"/i.exec(formula);
      if (match) found.push(match[1]);
      if (found.length) links[header] = [...new Set(found)];
    });
    rows.push({ values, links, cells, source_row: i + 1 });
  }
  return { headers, rows };
}
function colourHex(cell = {}, theme = {}) {
  const format = cell.effectiveFormat || cell.userEnteredFormat || {};
  const style = format.backgroundColorStyle || {};
  let rgb = style.rgbColor || format.backgroundColor;
  if (!rgb && style.themeColor) {
    const entry = (theme.themeColors || []).find(x => x.colorType === style.themeColor);
    rgb = entry?.color?.rgbColor;
  }
  if (!rgb) return style.themeColor ? 'UNRESOLVED_THEME:' + style.themeColor : '';
  return ['red', 'green', 'blue'].map(key => Math.round(Math.max(0, Math.min(1, rgb[key] || 0)) * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
}
function sourceURL(spreadsheetId, sheetId, row) {
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${sheetId}&range=${row}:${row}`;
}
module.exports = { cellText, gridRows, readTable, colourHex, sourceURL };
