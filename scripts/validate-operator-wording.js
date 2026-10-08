'use strict';
// Local characterization only. All observations, routes and permissions here
// are synthetic scenarios. No connector, fetch, provider, or source write.
const q=require('./phase2-cloud-queue'),panel=require('./phase2-panel'),inbox=require('./phase2-inbox'),copy=require('./outreach-copy'),{sha256}=require('./helpers');
const NOW='2026-10-08T04:00:00.000Z',SECRET='wording-validation-fixture-'.repeat(3),URL='https://www.facebook.com/arc-wording-fixture',EMAIL='wording-fixture@example.org',NAME='Observation Wording Fixture';
function fixture(observation,website,leadId='arc_'+sha256('operator-wording-fixture')){
 if(!/^arc_[a-f0-9]{64}$/.test(leadId))throw Error('WORDING_FIXTURE_ID_REQUIRED');
 const recipient=website?'wording-fixture@fixturepool.com.au':EMAIL;
 const source={lead_id:leadId,dataset_id:'MANILA_AUDIT_QUEUE',business_name:NAME,country:'Philippines',timezone:'Asia/Manila',arc_status:'NEEDS_RESEARCH',tier:'TIER_C_NEEDS_RESEARCH',compliance_status:'REVIEW_REQUIRED',evidence_json:'[]'};
 const d=require('./phase2-draft-metadata').metadata(source,NOW,q.CAMPAIGN);Object.assign(d,{dataset_id:source.dataset_id,cloud_source_snapshot_hash:q.sourceHash(source),draft_body:'',subject:''});
 const state={research:[source],queue:[q.pack(d)],locks:[]};
 for(const [type,excerpt,extra] of [
  ['identity',NAME+' is the identified business.',{}],
  ['activity',NAME+' published dated completed service work.',{}],
  ['opportunity','Service information is spread across separate posts.',{}],
  ['service',observation,{}],
  ['contact','Published business email '+recipient+'.',{channel:'EMAIL',recipient}],
  ['permission','This synthetic recipient expressly requested the service proposal.',{channel:'EMAIL',recipient,value:'EXPRESS_CONSENT'}]
 ]){
  const result=act(state,'SAVE_REEVALUATE',{evidence:JSON.stringify({type,excerpt,...extra,source_url:URL,observed_at:NOW,fact_date:NOW,association_basis:'The synthetic business identity and branch match this fixture.',verified:true})});
  if(result.errors.length)throw Error('WORDING_FIXTURE_INVALID:'+JSON.stringify(result.errors));
 }
 if(website)for(const [type,excerpt] of [['association','The synthetic business name and published email match this exact website.'],['gap',website]]){
  const result=act(state,'SAVE_REEVALUATE',{evidence:JSON.stringify({type,excerpt,...(type==='gap'?{website_status:'PARKED',parking_provider:'GoDaddy'}:{}),source_url:'https://fixturepool.com.au/',observed_at:NOW,fact_date:NOW,association_basis:'The exact synthetic business name and branch match the destination.',verified:true})});
  if(result.errors.length)throw Error('WORDING_WEBSITE_FIXTURE_INVALID:'+JSON.stringify(result.errors));
 }
 return state;
}
function act(s,action,extra={}){
 const row={...inbox.project(s.queue[0],NOW),id:1},link={queue_key:s.queue[0].queue_key,inbox_id:1,snapshot:JSON.stringify(inbox.project(s.queue[0],NOW)),backend_hash:inbox.digest(s.queue[0])};
 const body={id:'1',token:panel.tokenFor(row,link,SECRET,Date.parse(NOW)),lifecycle:'1',reviewer:'Synthetic Wording Reviewer',action,subject:row.subject,draft:row.draft,notes:'Local wording characterization only.',compliance:row.compliance,...extra};
 const result=panel.process(body,s.research,s.queue,s.locks,[row],[link],{operator_lifecycle_required:true},SECRET,NOW);
 if(result.writes.length)s.queue=[result.writes[0]];
 return result;
}
const pool='Pool service information is spread across separate posts.';
const cases=[
 {id:'pool_observation',observation:pool,statement:pool,proposal:'I could build a website with pool service information and a simple enquiry form.',cta:'Worth showing you?',policy:'ALLOW'},
 {id:'lesson_observation',observation:'The lesson page asks people to call or text for availability.',statement:'The lesson page asks people to call or text for availability.',proposal:'I could build a website with lesson information and an enquiry form.',cta:'Would you like to see a concept?',policy:'ALLOW'},
 {id:'kitchen_observation',observation:'Kitchen project examples are spread across separate posts.',statement:'Kitchen project examples are spread across separate posts.',proposal:'I could build a website with kitchen project information and a contact form.',cta:'Would it be alright if I put one together and send it over in the next couple of days?',policy:'ALLOW'},
 {id:'parked_domain_observation',observation:pool,website:'I noticed the domain tied to your business email, fixturepool.com.au, currently lands on a parked GoDaddy page.',statement:'I noticed the domain tied to your business email, fixturepool.com.au, currently lands on a parked GoDaddy page.',proposal:'I could build a website with pool service information and a simple enquiry form.',cta:'Worth showing you?',policy:'ALLOW'},
 {id:'natural_observation_prefix',observation:pool,statement:pool,opening:'I noticed '+pool[0].toLowerCase()+pool.slice(1),proposal:'I could build a website with pool service information and a simple enquiry form.',cta:'Worth showing you?',policy:'ALLOW'},
 {id:'natural_founder_cta',observation:pool,statement:pool,proposal:'I could build a website with pool service information and a simple enquiry form.',cta:"I've got an idea for this. Worth showing you?",policy:'ALLOW'},
 {id:'unsupported_recent_work',observation:pool,statement:'Your recent pool projects are on Facebook.',proposal:'I could build a website with pool service information and an enquiry form.',cta:'Worth showing you?',policy:'BLOCK'},
 {id:'invented_lost_revenue',observation:pool,statement:pool,proposal:'I could build a website with pool information and an enquiry form.',addition:'You are losing revenue.',cta:'Worth showing you?',policy:'BLOCK'},
 {id:'research_url_in_copy',observation:pool,statement:pool,proposal:'I could build a website with pool information and an enquiry form.',addition:URL,cta:'Worth showing you?',policy:'BLOCK'},
 {id:'unsupported_booking_outcome',observation:pool,statement:pool,proposal:'I could build a website that doubles your bookings with an enquiry form.',cta:'Worth showing you?',policy:'BLOCK'},
 {id:'invented_proof_capability',observation:pool,statement:pool,proposal:'I could build a website with customer feedback and a simple enquiry form.',cta:'Worth showing you?',policy:'BLOCK'},
 {id:'invented_reviews_capability',observation:pool,statement:pool,proposal:'I could build a website with reviews and a simple enquiry form.',cta:'Worth showing you?',policy:'BLOCK'}
];
function run(leadId){return cases.map(c=>{
 const s=fixture(c.observation,c.website,leadId),sourceBefore=JSON.stringify(s.research),d=JSON.parse(s.queue[0].payload),f=d.operator_workspace.evidence.find(f=>f.type===(c.website?'gap':'service'));
 const body=['Hi '+NAME+' team,','Briann here from Arc Web Works.',c.opening||c.statement,c.proposal,c.addition,c.cta].filter(Boolean).join('\n\n');
 const out=act(s,'SAVE_REEVALUATE',{subject:NAME+': a clearer enquiry path',draft:body,copy_claims:JSON.stringify([{statement:c.statement,evidence_id:f.observation_id}])});
 const saved=JSON.parse(s.queue[0].payload),approval=act(s,'APPROVE');
 if(sourceBefore!==JSON.stringify(s.research))throw Error('WORDING_SOURCE_CHANGED');
 return {id:c.id,synthetic_only:true,policy:c.policy,copy_eligible:saved.operator_workspace.evaluation.status==='DRAFT_READY',issues:saved.operator_workspace.evaluation.copy_issues,save_errors:out.errors.map(x=>x.error),saved_working_copy:copy.core(saved.draft_body)===body,approval_allowed:approval.errors.length===0,approval_errors:approval.errors.map(x=>x.error),body};
 });}
module.exports={run,cases,fixture,act,NOW,NAME,URL};
if(require.main===module){const rows=run();console.log(JSON.stringify({cloud_writes:0,provider_calls:0,rows},null,2));}
