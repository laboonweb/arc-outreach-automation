'use strict';
const { sha256, yes } = require('./helpers');
const { readTable } = require('./sheet-grid');
function summarizeRun(intake, plans, dryRun) {
  return { status: 'RESEARCH_ONLY_COMPLETE', datasets: intake.contexts.length, dry_run: Boolean(dryRun), sending_enabled: false,
    intake_summary: intake.contexts.map(context => {
      const { dataset, snapshot } = context;
      const leads = intake.leads.filter(l => l.dataset_id === dataset.dataset_id);
      const counts = field => leads.reduce((acc,l) => {const key=String(l[field] || '');acc[key]=(acc[key]||0)+1;return acc;},{});
      const output = snapshot.sheets.find(s => s.properties.title === dataset.output_sheet);
      const outputRows = output?.data?.some(d => d.rowData?.some(r => r.values?.some(c => c.formattedValue || c.userEnteredValue))) ? readTable(output,1).rows : [];
      return { dataset_id: dataset.dataset_id, source_rows: leads.length, status_counts: counts('arc_status'), colour_counts: counts('legacy_colour'),
        previously_contacted: leads.filter(l=>l.initial_contact_recorded).length,
        initial_outreach_blocked: leads.filter(l=>l.initial_outreach_blocked).length,
        duplicate_review: leads.filter(l=>l.duplicate_review_required).length,
        source_hash: sha256(JSON.stringify(snapshot.sheets.filter(s=>s.properties.title!==dataset.output_sheet))),
        planned_rows: plans.find(p=>p.dataset_id===dataset.dataset_id)?.rows || 0,
        output_rows_before_write: outputRows.length,
        output_state_before_write: outputRows.map(r=>({lead_id:r.values.lead_id,arc_status:r.values.arc_status,
          initial_contact_recorded:yes(r.values.initial_contact_recorded),initial_outreach_blocked:yes(r.values.initial_outreach_blocked)})) };
    }) };
}
module.exports = { summarizeRun };
