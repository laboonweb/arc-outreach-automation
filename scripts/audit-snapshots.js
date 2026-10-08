'use strict';
// Offline validation only. Real snapshots stay under ignored private/.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {normalizeSnapshots} = require('./dataset-intake');
const {planOutputWrites} = require('./dataset-output');
const {runResearch} = require('./research-engine');
const config = require('../config/datasets.json');
async function main() {
  const snapshots = config.datasets.map(d=>JSON.parse(fs.readFileSync(path.join(__dirname,'../private/workbook-inspection',d.dataset_id+'.json'),'utf8')));
  const before = JSON.stringify(snapshots);
  const intake = normalizeSnapshots(snapshots,config,'2026-10-03T03:00:00Z');
  assert.deepEqual(config.datasets.map(d=>intake.leads.filter(l=>l.dataset_id===d.dataset_id).length),[250,55,384]);
  const results=[];
  for(const row of intake.leads) results.push(await runResearch(row,{allowed_hosts:[]},()=>{throw Error('Offline audit must not fetch');},'2026-10-03T03:00:00Z'));
  const plans=planOutputWrites(results,intake,{...config,dry_run:true});
  assert.equal(plans.length,3);
  assert.equal(JSON.stringify(snapshots),before);
  const counts = config.datasets.map(d=>{
    const rows=intake.leads.filter(l=>l.dataset_id===d.dataset_id);
    return {dataset_id:d.dataset_id,rows:rows.length,statuses:rows.reduce((a,l)=>(a[l.arc_status]=(a[l.arc_status]||0)+1,a),{}),contact_history:rows.filter(l=>l.initial_contact_recorded).length,duplicate_review:rows.filter(l=>l.duplicate_review_required).length,history_join_review:rows.filter(l=>l.legacy_join_review_required).length};
  });
  assert.deepEqual(counts[0].statuses,{DISQUALIFIED:27,SENT:18,PARKED:8,NEEDS_RESEARCH:197});
  for(const row of results) {
    if(['SENT','REPLIED','FOLLOW_UP_DUE','DISQUALIFIED','PARKED','DO_NOT_CONTACT'].includes(row.arc_status)) assert.equal(row.initial_outreach_blocked,true);
    assert.ok(row.source_spreadsheet_id&&row.dataset_id&&row.source_sheet&&row.source_row&&row.source_original_id);
    assert.equal(row.email_draft,'');
  }
  console.log(JSON.stringify({mode:'OFFLINE_NO_NETWORK_NO_WRITES',processed:results.length,counts},null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
