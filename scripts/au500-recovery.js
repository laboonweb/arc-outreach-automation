'use strict';
// Pure reconciliation of the new output. Populated rows are never repair targets.
const bootstrap=require('./au500-bootstrap'),{readTable}=require('./sheet-grid'),{sha256}=require('./helpers');
function chunks(metadataRaw,dataset){
 const m=bootstrap.response(metadataRaw),originals=m.sheets?.filter(s=>s.properties.title!=='Arc Research');
 if(m.spreadsheetId!==dataset.spreadsheet_id||originals?.length!==3||!['Summary','500 Sharp ICPs','Method & Compliance'].every(t=>originals.some(s=>s.properties.title===t)))throw Error('AU500_RECOVERY_METADATA');
 const fields='spreadsheetId,properties,sheets(properties,data(startRow,startColumn,rowData(values(formattedValue,userEnteredValue,hyperlink,effectiveFormat(backgroundColor,backgroundColorStyle)))),merges,conditionalFormats,basicFilter,filterViews,protectedRanges)';
 const specs=[];
 for(const s of originals){const p=s.properties,g=p.gridProperties;if(!Number.isInteger(g.rowCount)||g.rowCount>1000||!Number.isInteger(g.columnCount)||g.columnCount>55)throw Error('AU500_RECOVERY_SOURCE_BOUND');for(let start=0;start<g.rowCount;start+=250){const end=Math.min(start+250,g.rowCount),range="'"+p.title+"'!"+(start+1)+':'+end;specs.push({title:p.title,sheetId:p.sheetId,start,end,columns:g.columnCount,url:'https://sheets.googleapis.com/v4/spreadsheets/'+dataset.spreadsheet_id+'?includeGridData=true&prettyPrint=false&fields='+encodeURIComponent(fields)+'&ranges='+encodeURIComponent(range)});}}
 return specs;
}
function assemble(metadataRaw,responses,specs,dataset){
 const m=bootstrap.response(metadataRaw);if(responses.length!==specs.length||JSON.stringify(specs)!==JSON.stringify(chunks(m,dataset)))throw Error('AU500_RECOVERY_CHUNK_COVERAGE');
 const originals=m.sheets.filter(s=>s.properties.title!=='Arc Research'),snapshot={spreadsheetId:m.spreadsheetId,properties:m.properties,sheets:originals.map(s=>({properties:s.properties}))},hashes=[];
 const primary=snapshot.sheets.find(s=>s.properties.title===dataset.primary_sheet),rows=Array.from({length:primary.properties.gridProperties.rowCount},()=>({values:[]}));
 for(let i=0;i<specs.length;i++){
  const spec=specs[i],r=bootstrap.response(responses[i]);if(r.spreadsheetId!==m.spreadsheetId)throw Error('AU500_RECOVERY_CHUNK_ID');
  const sheets=r.sheets.filter(s=>s.properties.title!=='Arc Research'),target=sheets.find(s=>s.properties.sheetId===spec.sheetId&&s.properties.title===spec.title);
  if(!target||sheets.some(s=>s.properties.sheetId!==spec.sheetId&&s.data?.some(b=>b.rowData?.length)))throw Error('AU500_RECOVERY_CHUNK_ASSOCIATION');
  const blocks=target.data||[];if(blocks.length>1)throw Error('AU500_RECOVERY_CHUNK_BLOCKS');
  const block=blocks[0]||{},data=block.rowData||[];if(data.length>spec.end-spec.start||(data.length&&(block.startRow||0)!==spec.start)||(block.startColumn||0)!==0||data.some(row=>(row.values||[]).length>spec.columns))throw Error('AU500_RECOVERY_CHUNK_RANGE');
  hashes.push(sha256(JSON.stringify({spec:{title:spec.title,start:spec.start,end:spec.end,columns:spec.columns},spreadsheetId:r.spreadsheetId,properties:r.properties,sheets})));
  if(spec.title===dataset.primary_sheet)for(let j=0;j<data.length;j++)rows[spec.start+j]={values:(data[j].values||[]).map(cell=>Object.fromEntries(['formattedValue','userEnteredValue','hyperlink'].filter(k=>cell[k]!==undefined).map(k=>[k,cell[k]])))};
 }
 // Initialization needs values/links only; full formatting is preserved in each independent range hash.
 if(dataset.colour_status_column)throw Error('AU500_RECOVERY_COLOUR_POLICY_UNSUPPORTED');
 primary.data=[{rowData:rows}];return {snapshot,coverage_hash:sha256(JSON.stringify(hashes)),chunk_hashes:hashes,source_ranges:specs.length};
}
function reconcile(metadataRaw,sourceRaw,outputRaw,dataset,reviewed,now){
 const metadata=bootstrap.response(metadataRaw),source=bootstrap.response(sourceRaw);
 const output=metadata.sheets?.filter(s=>s.properties.title==='Arc Research')||[];
 if(metadata.spreadsheetId!==dataset.spreadsheet_id||output.length>1||metadata.sheets.length!==3+output.length)throw Error('AU500_RECOVERY_METADATA');
 const originals=source.sheets?.filter(s=>s.properties.title!=='Arc Research');
 if(!originals||originals.length!==3||originals.some(s=>!metadata.sheets.some(m=>m.properties.title===s.properties.title&&m.properties.sheetId===s.properties.sheetId)))throw Error('AU500_RECOVERY_SOURCE_ASSOCIATION');
 const table=readTable(originals.find(s=>s.properties.title===dataset.primary_sheet),5);
 if(JSON.stringify(table.headers)!==JSON.stringify(reviewed.headers)||table.rows.length!==500||table.rows.some((r,i)=>r.values.ID!==reviewed.ids[i]||r.values.Business!==reviewed.businesses[i]))throw Error('AU500_RECOVERY_REVIEWED_SOURCE_CHANGED');
 const plan=bootstrap.plan({...source,sheets:originals},dataset,now),expected=[bootstrap.HEADERS,...plan.batches.slice(1).flatMap(b=>b.expected)];
 let values=[];
 if(output.length){
  const p=output[0].properties;
  if(!Number.isInteger(p.sheetId)||p.gridProperties.rowCount!==501||p.gridProperties.columnCount!==221)throw Error('AU500_RECOVERY_OUTPUT_SHAPE');
  const r=bootstrap.response(outputRaw);
  if(r.range!=="'Arc Research'!A1:HM501"||r.majorDimension!=='ROWS'||(r.values!==undefined&&!Array.isArray(r.values)))throw Error('AU500_RECOVERY_OUTPUT_COVERAGE');
  values=r.values||[];
  if(values.length>501||values.some(v=>!Array.isArray(v)||v.length>221))throw Error('AU500_RECOVERY_EXTRA_DATA');
 }else if(outputRaw!==null)throw Error('AU500_RECOVERY_UNEXPECTED_OUTPUT');
 const missing=[],blank=v=>v.every(x=>x===''||x===null||x===undefined);
 for(let i=0;i<501;i++){
  const actual=values[i]||[];
  if(blank(actual)){missing.push(i);continue;}
  const mismatch=expected[i].findIndex((value,j)=>value!==(actual[j]??''));
  if(mismatch!==-1)throw Error('AU500_RECOVERY_CONFLICT_ROW_'+(i+1)+'_COLUMN_'+(mismatch+1));
 }
 if(missing.includes(0)&&missing.length!==501)throw Error('AU500_RECOVERY_MISSING_HEADER_WITH_DATA');
 const sheetId=output[0]?.properties.sheetId??plan.output_sheet_id,target='https://sheets.googleapis.com/v4/spreadsheets/'+dataset.spreadsheet_id;
 const batches=[];
 if(missing.includes(0))batches.push({url:target+':batchUpdate',body:{requests:[...(!output.length?[plan.batches[0].body.requests[0]]:[]),{updateCells:{start:{sheetId,rowIndex:0,columnIndex:0},rows:[{values:bootstrap.HEADERS.map(bootstrap.cell)}],fields:'userEnteredValue'}}],includeSpreadsheetInResponse:false},row_indexes:[0]});
 const absent=missing.filter(i=>i>0);
 for(let i=0;i<absent.length;i+=25){const indexes=absent.slice(i,i+25);batches.push({url:target+':batchUpdate',body:{requests:indexes.map(rowIndex=>({updateCells:{start:{sheetId,rowIndex,columnIndex:0},rows:[{values:expected[rowIndex].map(bootstrap.cell)}],fields:'userEnteredValue'}})),includeSpreadsheetInResponse:false},row_indexes:indexes});}
 for(const b of batches){b.expected=b.row_indexes.map(i=>expected[i]);b.verify_url=target+'/values:batchGet?valueRenderOption=FORMULA&'+b.row_indexes.map(i=>'ranges='+encodeURIComponent("'Arc Research'!A"+(i+1)+':HM'+(i+1))).join('&');}
 if(batches.length>21||batches.some(b=>Buffer.byteLength(JSON.stringify(b.body))>bootstrap.MAX_WRITE))throw Error('AU500_RECOVERY_WRITE_BOUND');
 return {state:!output.length?'ABSENT':missing.length===501?'EMPTY':missing.length?'PARTIAL':'COMPLETE',records:500-absent.length,missing_rows:absent.map(i=>i+1),missing_header:missing.includes(0),columns:221,source_hash:plan.source_hash,expected_hash:sha256(JSON.stringify(expected)),output_hash:sha256(JSON.stringify(values)),output_sheet_id:output[0]?.properties.sheetId??null,planned_sheet_id:sheetId,batches};
}
function verify(batch,raw){const r=bootstrap.response(raw),id=batch.url.match(/spreadsheets\/([^:]+):/)[1];if(r.spreadsheetId!==id||r.valueRanges?.length!==batch.expected.length)throw Error('AU500_RECOVERY_BATCH_COVERAGE');for(let i=0;i<batch.expected.length;i++){const v=r.valueRanges[i],row=batch.row_indexes[i]+1;if(v.range!=="'Arc Research'!A"+row+':HM'+row||v.values?.length!==1||JSON.stringify(bootstrap.HEADERS.map((_,j)=>v.values[0][j]??''))!==JSON.stringify(batch.expected[i]))throw Error('AU500_RECOVERY_BATCH_PERSISTENCE');}return {verified_rows:batch.row_indexes.length,hash:sha256(JSON.stringify(batch.expected)),row_start:batch.row_indexes[0]+1,row_end:batch.row_indexes.at(-1)+1};}
function receipt(result){const {batches,...safe}=result;return {...safe,missing_batches:batches.length,hold:'MANUAL_ONLY_SOURCE_INTAKE',provider_calls:0,existing_row_writes:0};}
module.exports={chunks,assemble,reconcile,verify,receipt};
