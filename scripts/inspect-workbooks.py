"""Read-only workbook inventory and private Sheets-shaped fixtures; never saves XLSX."""
import sys, json, hashlib, collections, datetime
from pathlib import Path
import openpyxl
import xml.etree.ElementTree as ET

SOURCES = {
    'AUSTRALIA': 'Arc_Web_Works_Australia_250_No_Owned_Website_2026-09-30.xlsx',
    'MANILA_LEGACY': 'Arc_Web_Works_Metro_Manila_Email_Outreach_2026-09-22.xlsx',
    'MANILA_AUDIT_QUEUE': 'Arc_Web_Works_Manila_No_Website_Strict_Audit_2026-10-02.xlsx',
}

def scalar(value):
    if isinstance(value, (datetime.date, datetime.datetime)): return value.isoformat()
    return value if isinstance(value, (str, int, float, bool)) else str(value) if value is not None else ''

def main():
    source = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.home() / 'Downloads'
    dest = Path(__file__).resolve().parent.parent / 'private' / 'workbook-inspection'
    dest.mkdir(parents=True, exist_ok=True)
    inventory = []
    for dataset, filename in SOURCES.items():
        file = source / filename
        before = hashlib.sha256(file.read_bytes()).hexdigest()
        book = openpyxl.load_workbook(file, data_only=False)
        cached = openpyxl.load_workbook(file, data_only=True)
        ns = {'a': 'http://schemas.openxmlformats.org/drawingml/2006/main'}
        theme = ET.fromstring(book.loaded_theme).find('.//a:clrScheme', ns)
        theme_names = ['lt1','dk1','lt2','dk2','accent1','accent2','accent3','accent4','accent5','accent6','hlink','folHlink']
        theme_rgb = []
        for name in theme_names:
            color = theme.find('a:' + name, ns)[0]
            theme_rgb.append(color.attrib.get('lastClr') or color.attrib.get('val'))
        snapshot = {'dataset_id': dataset, 'original_filename': filename, 'sha256': before, 'sheets': []}
        for index, ws in enumerate(book.worksheets):
            rows, fills, patterns = [], collections.Counter(), []
            for row in ws.iter_rows():
                cells = []
                row_fills = []
                for cell in row:
                    value = cell.value
                    if cell.data_type == 'f': value = cached[ws.title][cell.coordinate].value or cell.value
                    data = {'formattedValue': str(scalar(value)), 'userEnteredValue': {'stringValue': str(scalar(value))}}
                    if cell.hyperlink: data['hyperlink'] = cell.hyperlink.target or ''
                    if cell.fill.patternType == 'solid':
                        fg = cell.fill.fgColor
                        code = str(fg.rgb) if fg.type == 'rgb' else f'{fg.type}:{fg.index}:tint:{fg.tint}'
                        fills[code] += 1
                        row_fills.append(code)
                        data['xlsx_fill'] = code
                        if fg.type == 'rgb':
                            rgb = str(fg.rgb)[-6:]
                            data['effectiveFormat'] = {'backgroundColor': {k: int(rgb[n:n+2], 16)/255 for k, n in [('red',0), ('green',2), ('blue',4)]}}
                        elif fg.type == 'theme':
                            rgb = theme_rgb[fg.theme]
                            channels = [int(rgb[n:n+2], 16)/255 for n in [0,2,4]]
                            channels = [c*(1+fg.tint) if fg.tint < 0 else c*(1-fg.tint)+fg.tint for c in channels]
                            data['effectiveFormat'] = {'backgroundColor': dict(zip(['red','green','blue'],channels))}
                    cells.append(data)
                rows.append({'values': cells})
                if row_fills: patterns.append({'row': row[0].row, 'fills': dict(collections.Counter(row_fills))})
            snapshot['sheets'].append({'properties': {'title': ws.title, 'sheetId': index, 'gridProperties': {'rowCount': ws.max_row, 'columnCount': ws.max_column}}, 'data': [{'startRow': 0, 'startColumn': 0, 'rowData': rows}]})
            summary = {'dataset': dataset, 'sheet': ws.title, 'rows': ws.max_row, 'columns': ws.max_column,
                       'first_rows': [[scalar(c.value) for c in r] for r in list(ws.iter_rows(max_row=4))],
                       'fills': dict(fills), 'conditional_formats': len(ws.conditional_formatting)}
            inventory.append(summary)
            print(json.dumps(summary, ensure_ascii=False))
        (dest / f'{dataset}.json').write_text(json.dumps(snapshot, ensure_ascii=False, indent=2), encoding='utf-8')
        assert hashlib.sha256(file.read_bytes()).hexdigest() == before, 'Source file changed'
    (dest / 'inventory.json').write_text(json.dumps(inventory, ensure_ascii=False, indent=2), encoding='utf-8')

if __name__ == '__main__': main()
