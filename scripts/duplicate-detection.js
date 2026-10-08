'use strict';
const { norm, text, parsePublicUrl, sha256, yes } = require('./helpers');
function businessKey(value) { return norm(value).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, ''); }
function phoneKey(value, country = '') {
  let digits = text(value).replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 15) return '';
  if (digits.startsWith('0')) digits = (country === 'Australia' ? '61' : country === 'Philippines' ? '63' : '') + digits.slice(1);
  return digits;
}
function domainKey(value) {
  try { const host = parsePublicUrl(value).host.replace(/^www\./, '');
    return /(^|\.)(facebook|instagram|linkedin|google|linktr|booking|fresha|wixsite)\./.test(host) ? '' : host;
  } catch { return ''; }
}
function socialKey(value) {
  try {
    const u = parsePublicUrl(value);
    if (u.path === '/') return '';
    const facebook = /^(?:(?:www|m|web|mbasic|mobile)\.)?(?:facebook\.com|fb\.com)$/.test(u.host);
    if (facebook && u.path.replace(/\/$/, '').toLowerCase() === '/profile.php') {
      const ids = [...new Set((u.url.split('?')[1] || '').split('&').filter(p=>p.split('=')[0]==='id').map(p=>decodeURIComponent(p.slice(3))))];
      // An absent/ambiguous ID is not a shared Facebook identity.
      return ids.length===1 && /^\d+$/.test(ids[0]) ? 'facebook.com/profile.php?id='+ids[0] : '';
    }
    return (facebook ? 'facebook.com' : u.host.replace(/^www\./, '')) + u.path.replace(/\/$/, '').toLowerCase();
  } catch { return ''; }
}
function falseFacebookMatch(lead,match,byId){
  if(!Array.isArray(match.shared)||match.shared.length!==1||match.shared[0]!=='facebook')return false;
  const other=byId.get(match.lead_id),a=socialKey(lead.facebook_url||lead.previous_result?.facebook_url),b=other&&socialKey(other.facebook_url||other.previous_result?.facebook_url);
  return !!a&&!!b&&a.startsWith('facebook.com/profile.php?id=')&&b.startsWith('facebook.com/profile.php?id=')&&a!==b;
}
function parseMatches(value){try{const list=JSON.parse(value||'[]');return Array.isArray(list)?list:[];}catch{return [];}}
function recalculateMachineDuplicates(leads){
  const byId=new Map(leads.map(l=>[l.lead_id,l]));
  const cleaned=leads.map(lead=>{
    function clearBugOnly(record){const matches=parseMatches(record.duplicate_matches_json),removed=matches.filter(m=>falseFacebookMatch(lead,m,byId)),retained=matches.filter(m=>!falseFacebookMatch(lead,m,byId));
      const solelyBug=yes(record.duplicate_review_required)&&matches.length>0&&retained.length===0&&removed.length===matches.length;
      return {...record,duplicate_matches_json:JSON.stringify(retained),duplicate_review_required:solelyBug?false:yes(record.duplicate_review_required),initial_outreach_blocked:solelyBug?false:yes(record.initial_outreach_blocked)};
    }
    const current=clearBugOnly(lead),prior=clearBugOnly(lead.previous_result||{});
    // Source/manual protection is separate from a machine duplicate lock.
    current.initial_outreach_blocked ||= yes(lead.initial_contact_recorded)||yes(lead.legacy_join_review_required)||['SENT','REPLIED','FOLLOW_UP_DUE','PARKED','DISQUALIFIED','DO_NOT_CONTACT'].includes(lead.arc_status);
    prior.initial_outreach_blocked ||= yes(prior.initial_contact_recorded)||['SENT','REPLIED','FOLLOW_UP_DUE','PARKED','DISQUALIFIED','DO_NOT_CONTACT'].includes(prior.arc_status)||['SENT','REPLIED','PARKED','DISQUALIFIED','DO_NOT_CONTACT'].includes(prior.manual_status_override);
    return {...current,previous_result:prior,duplicate_recalculated:true};
  });
  const detected=detectDuplicates(cleaned);
  return detected.map((row,i)=>{
    const retained=[...parseMatches(cleaned[i].duplicate_matches_json),...parseMatches(cleaned[i].previous_result.duplicate_matches_json),...parseMatches(row.duplicate_matches_json)];
    const matches=[...new Map(retained.map(m=>[m.lead_id,m])).values()];
    const warning=matches.length>0||yes(cleaned[i].duplicate_review_required)||yes(cleaned[i].previous_result.duplicate_review_required)||yes(row.manual_duplicate_review_required)||yes(row.previous_result.manual_duplicate_review_required);
    return {...row,duplicate_review_required:warning,duplicate_matches_json:JSON.stringify(matches),initial_outreach_blocked:yes(row.initial_outreach_blocked)||warning};
  });
}
function keys(row) {
  return { name: businessKey(row.business_name), phone: phoneKey(row.phone, row.country), domain: domainKey(row.website_url),
    maps: /^0x[\da-f]+:0x[\da-f]+$/i.test(row.source_original_id || '') ? row.source_original_id.toLowerCase() : (text(row.maps_url).match(/[?&](?:place_id|query_place_id|cid)=([^&#]+)/)?.[1] || ''),
    address: businessKey(row.address), facebook: socialKey(row.facebook_url), instagram: socialKey(row.instagram_url), linkedin: socialKey(row.linkedin_url) };
}
function detectDuplicates(leads) {
  const normalized = leads.map(keys);
  const matches = leads.map(() => []);
  for (let i = 0; i < leads.length; i++) for (let j = i + 1; j < leads.length; j++) {
    if (leads[i].country !== leads[j].country) continue;
    const shared = Object.keys(normalized[i]).filter(k => normalized[i][k] && normalized[i][k] === normalized[j][k]);
    if (!shared.length || (shared.length === 1 && shared[0] === 'address')) continue;
    const confidence = shared.includes('maps') || shared.includes('name') && shared.some(k => k !== 'name') ? 'STRONG_MATCH_REVIEW' : 'POSSIBLE_MATCH_REVIEW';
    matches[i].push({ lead_id: leads[j].lead_id, dataset_id: leads[j].dataset_id, shared, confidence, contact_history: yes(leads[j].initial_contact_recorded), source_url: leads[j].source_url });
    matches[j].push({ lead_id: leads[i].lead_id, dataset_id: leads[i].dataset_id, shared, confidence, contact_history: yes(leads[i].initial_contact_recorded), source_url: leads[i].source_url });
  }
  return leads.map((lead, index) => ({ ...lead, duplicate_review_required: matches[index].length > 0,
    duplicate_matches_json: JSON.stringify(matches[index]),
    duplicate_group_key: matches[index].length ? sha256([lead.lead_id, ...matches[index].map(x => x.lead_id)].sort().join('|')) : '',
    initial_outreach_blocked: yes(lead.initial_outreach_blocked) || yes(lead.initial_contact_recorded) || matches[index].length > 0 }));
}
module.exports = { businessKey, phoneKey, domainKey, socialKey, detectDuplicates, recalculateMachineDuplicates };
