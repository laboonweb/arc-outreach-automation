'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const fixtures = require('./fixtures/leads.json');
const { parsePublicUrl, allowedUrl, leadId, normalizeRow, sheetSafe } = require('../scripts/helpers');
const { classifyWebsite } = require('../scripts/website-check');
const { extractContacts } = require('../scripts/contact-extractor');
const { validateEmail } = require('../scripts/email-validator');
const { classifyActivity } = require('../scripts/activity-classifier');
const { scoreLead } = require('../scripts/lead-score');
const { timezoneFor } = require('../scripts/timezone');
const { dispatchKey, messageHash, sendBlockReason } = require('../scripts/idempotency');
const { isPublicIPv4 } = require('../scripts/safe-http');
const { runResearch, prepareRows, sheetRecord, OUTPUT_FIELDS } = require('../scripts/research-engine');
const { makeCloudParent: makeParent, makeWorker } = require('../scripts/build-workflows');
const row = fixtures.leads[0];
const response = (body, statusCode = 200) => ({ statusCode, headers: { 'content-type': 'text/html' }, body });
const longBody = '<title>Simple business website</title><p>Local business services, appointments and contact information for prospective clients. This plain website contains enough useful information for a basic HTTP check.</p>';
const run = (lead, responses = fixtures.responses, config = fixtures.config) => runResearch(lead, config, async url => {
  if (!responses[url]) throw new Error('Missing fixture ' + url);
  return responses[url];
}, fixtures.now);

test('stable identity ignores enrichment, normalizes aliases and keeps a persisted ID', () => {
  assert.equal(leadId(row), leadId({ ...row, website_url: 'https://changed.example.org', existing_email: 'changed@example.org' }));
  assert.equal(leadId(row), leadId({ ...row, business_name: ' TEST HARBOUR   SKIN ' }));
  assert.equal(normalizeRow({ 'Business name': 'Test', 'Website URL': 'example.org', Country: 'AU' }).country, 'Australia');
  assert.equal(leadId({ ...row, lead_id: leadId(row), business_name: 'Renamed' }), leadId(row));
  assert.notEqual(leadId(row), leadId({ ...row, source_record_id: 'another-branch' }));
  assert.throws(() => prepareRows([row, row]), /DUPLICATE/);
  assert.throws(() => leadId({ business_name: 'Anonymous' }), /IDENTITY_REQUIRED/);
});

test('public URL gate rejects private, credentials, unusual ports and hostile syntax', () => {
  for (const url of ['http://127.0.0.1', 'http://2130706433', 'http://[::1]', 'http://localhost', 'http://metadata.google.internal', 'file:///etc/passwd', 'https://user:pass@example.org', 'https://example.org:3000', 'https://example.org\\@localhost', 'https://example.org%2f@localhost', 'https://internal.local']) {
    assert.throws(() => parsePublicUrl(url), url);
  }
  assert.equal(parsePublicUrl('../contact', 'https://www.example.org/about/team').url, 'https://www.example.org/contact');
  assert.throws(() => allowedUrl('https://www.example.org', ['example.org']), /HOST_NOT_APPROVED/);
  assert.equal(allowedUrl('https://www.example.org', ['www.example.org']).host, 'www.example.org');
  for (const ip of ['127.0.0.1', '10.0.0.1', '169.254.169.254', '192.168.1.1', '172.31.1.1', '100.64.0.1', '198.18.0.1', '0.0.0.0', '224.1.1.1']) assert.equal(isPublicIPv4(ip), false, ip);
  assert.equal(isPublicIPv4('93.184.215.14'), true);
});

test('website statuses distinguish transport errors, access blocks and observed defects', () => {
  const cases = [
    [{ error: { code: 'ENOTFOUND' } }, 'DNS_ERROR'],
    [{ error: { code: 'EAI_AGAIN' } }, 'UNKNOWN'],
    [{ error: { code: 'CERT_HAS_EXPIRED' } }, 'SSL_ERROR'],
    [{ error: { code: 'ETIMEDOUT' } }, 'UNKNOWN'],
    [response('', 404), '404'], [response('', 410), '404'], [response('', 503), 'BROKEN'],
    [response('', 403), 'UNKNOWN'], [response('', 429), 'UNKNOWN'], [response('', 301), 'REDIRECT'],
    [response('<title>Domain expired</title><p>This domain has expired</p>'), 'EXPIRED_DOMAIN'],
    [response('<title>Domain parking</title><p>This domain is for sale</p>'), 'PARKED'],
    [response('<title>Wix</title><p>This domain is not connected to a site</p>'), 'DISCONNECTED_DOMAIN'],
    [response(longBody), 'LIVE'], [response('<title>Just a moment</title>'), 'UNKNOWN'],
    [response('<script>document.write("A real site")</script>'), 'UNKNOWN'],
  ];
  for (const [input, expected] of cases) assert.equal(classifyWebsite(input).status, expected);
  assert.equal(classifyWebsite(response(longBody + '<p>'.repeat(30) + 'An article about domain parking. '.repeat(100))).status, 'LIVE');
  assert.equal(classifyWebsite(response('x'.repeat(1_000_001))).status, 'UNKNOWN');
});

test('contact extraction uses visible text/mailto, ignores code and image-like addresses', () => {
  const html = `<p>hello&#64;shop.example.org</p><a href="mailto:team%40shop.example.org?subject=Hi">Email</a>
    <script>const x='secret@shop.example.org'</script><!-- hidden@shop.example.org -->
    <img src='logo@2x.png'><p>no-reply@shop.example.org</p><a href='/contact'>Contact</a>`;
  const result = extractContacts(html, 'https://shop.example.org/');
  assert.deepEqual(result.emails, ['hello@shop.example.org', 'team@shop.example.org']);
  assert.equal(result.links[0], 'https://shop.example.org/contact');
  assert.equal(validateEmail('hello..world@example.org').valid, false);
  assert.equal(validateEmail('hello@example.org').verification, 'SYNTAX_ONLY');
});

test('five fixture leads produce the expected research outcomes without fabricated facts', async () => {
  const results = await Promise.all(fixtures.leads.map(lead => run(lead)));
  assert.deepEqual(results.map(x => x.website_status), ['LIVE', 'DISCONNECTED_DOMAIN', '404', 'NO_WEBSITE', 'LIVE']);
  assert.equal(results[0].public_email, 'hello@clinic.example.org');
  assert.equal(results[0].email_source_url, 'https://clinic.example.org/contact');
  assert.equal(results[0].acma_status, 'QUESTIONABLE');
  assert.equal(results[1].pain_verified, false);
  assert.equal(results[3].public_email, '');
  assert.equal(results[3].instagram_status, 'UNVERIFIED');
  assert.equal(results[4].website_final_url, 'https://studio.example.org/');
  assert.equal(results[4].website_redirect_target, 'https://studio.example.org/');
  assert.equal(results[4].pain_point, '');
  for (const result of results) {
    assert.equal(result.business_status, 'UNCERTAIN');
    assert.equal(result.buying_trigger, '');
    assert.equal(result.email_draft, '');
    assert.equal(result.research_required, true);
    assert.ok(['PARK', 'LOW'].includes(result.lead_quality));
    assert.ok(JSON.parse(result.evidence_json).every(x => x.source_url && x.observed_at));
  }
});

test('website ownership review is independent of request allowlisting', async () => {
  const result = await run({ ...row, website_ownership_verified: 'NO' });
  assert.equal(result.public_email, '');
  assert.equal(result.recommended_channel, 'PARK');
});

test('external designer and free-mail addresses require ownership review', async () => {
  const result = await run(row, { 'https://clinic.example.org/': response(longBody + '<p>Designed by designer@agency.example.org. Reception business@gmail.com.</p>') });
  assert.equal(result.public_email, '');
  assert.equal(result.recommended_channel, 'PARK');
  const candidates = JSON.parse(result.evidence_json).filter(x => x.type === 'email_candidate_needs_ownership_review');
  assert.equal(candidates.length, 2);
});

test('rerun results clear previously detected pain and email when the website changes', async () => {
  const first = await run(row);
  assert.ok(first.public_email);
  const second = await run(row, { 'https://clinic.example.org/': response(longBody) });
  assert.equal(second.public_email, '');
  const repaired = await run(fixtures.leads[1], { 'https://trades.example.org/': response(longBody) });
  assert.equal(repaired.pain_point, '');
  assert.equal(repaired.website_status, 'LIVE');
});

test('blocked host, blocked redirect and redirect loops produce review output with bounded requests', async () => {
  let calls = 0;
  const blocked = await runResearch(row, { allowed_hosts: [] }, () => { calls++; }, fixtures.now);
  assert.equal(calls, 0);
  assert.match(blocked.errors_json, /HOST_NOT_APPROVED/);
  const unsafe = await run(row, { 'https://clinic.example.org/': { statusCode: 302, headers: { location: 'http://169.254.169.254/latest/meta-data' } } });
  assert.equal(unsafe.website_status, 'REDIRECT');
  assert.match(unsafe.errors_json, /NON_PUBLIC_HOST/);
  const loop = await run(row, { 'https://clinic.example.org/': { statusCode: 301, headers: { location: '/' } } });
  assert.match(loop.errors_json, /REDIRECT_OR_LINK_LOOP/);
});

test('contact-page failure does not replace the homepage result', async () => {
  const result = await run(row, { ...fixtures.responses, 'https://clinic.example.org/contact': response('', 404) });
  assert.equal(result.website_status, 'LIVE');
  assert.equal(result.public_email, '');
  assert.equal(result.pain_point, '');
});

function reviewed(prefix, evidenceText = 'Synthetic human-reviewed fact') {
  return { [prefix + '_verified']: 'YES', [prefix + '_evidence']: evidenceText, [prefix + '_source_url']: 'https://clinic.example.org/', [prefix + '_date']: '2026-10-01' };
}
test('activity requires current reviewed evidence; old/future claims do not qualify', () => {
  const active = { ...row, ...reviewed('activity'), activity_status: 'ACTIVE' };
  assert.equal(classifyActivity(active, fixtures.now).status, 'ACTIVE');
  assert.equal(classifyActivity({ ...active, activity_date: '2020-01-01' }, fixtures.now).status, 'UNCERTAIN');
  assert.equal(classifyActivity({ ...active, activity_date: '2030-01-01' }, fixtures.now).status, 'UNCERTAIN');
  assert.equal(classifyActivity({ ...active, activity_source_url: '' }, fixtures.now).status, 'UNCERTAIN');
});

test('qualification has hard evidence gates and never rewards size alone', () => {
  const strong = { activity: 'ACTIVE', gap: true, trigger: true, contact: true, proof: true, legitimate: true, businessCase: true };
  assert.equal(scoreLead(strong).quality, 'HIGH');
  assert.equal(scoreLead({ ...strong, trigger: false, decisionMaker: false }).quality, 'HIGH');
  assert.equal(scoreLead({ ...strong, gap: false }).quality, 'MEDIUM');
  assert.equal(scoreLead({ ...strong, gap: false }).basis, 'PROVISIONAL_POTENTIAL_GAP_NOT_ESTABLISHED');
  assert.equal(scoreLead({ ...strong, contact: false }).quality, 'HIGH');
  assert.equal(scoreLead({ ...strong, activity: 'INACTIVE' }).quality, 'DISQUALIFY');
});

test('documented consent enables review only; suppression overrides all route choices', async () => {
  const reviewedRow = { ...row, ...reviewed('consent'), consent_recipient: 'hello@clinic.example.org', role_relevance_verified: 'YES', no_solicitation_checked: 'YES' };
  assert.equal((await run(reviewedRow)).acma_status, 'SAFE_TO_REVIEW');
  assert.equal((await run({ ...reviewedRow, consent_recipient: 'old@clinic.example.org' })).acma_status, 'QUESTIONABLE');
  const suppressed = await run({ ...reviewedRow, suppressed: 'YES' });
  assert.equal(suppressed.acma_status, 'DO_NOT_EMAIL');
  assert.equal(suppressed.recommended_channel, 'PARK');
  assert.equal(suppressed.outreach_readiness, 'BLOCKED');
  assert.equal(suppressed.compliance_status, 'DO_NOT_EMAIL');
  const noSpam = await run(row, { 'https://clinic.example.org/': response(longBody + '<p>No unsolicited marketing emails. hello@clinic.example.org</p>') });
  assert.equal(noSpam.acma_status, 'DO_NOT_EMAIL');
  assert.equal(noSpam.recommended_channel, 'PARK');
});

test('a dead-site lead can use a reviewed directory contact and unresolved-gap evidence', async () => {
  const lead = { ...fixtures.leads[1], ...reviewed('activity'), activity_status: 'ACTIVE',
    ...reviewed('gap', 'Synthetic publicly linked domain is disconnected.'), gap_unresolved_verified: 'YES',
    ...reviewed('buying_trigger', 'Synthetic second showroom opening.'), ...reviewed('proof'), ...reviewed('legitimacy'), ...reviewed('business_case'),
    ...reviewed('contact'), contact_email: 'team@trades.example.org', contact_source_type: 'PROFESSIONAL_DIRECTORY' };
  const result = await run(lead);
  assert.equal(result.public_email, 'team@trades.example.org');
  assert.equal(result.pain_verified, true);
  assert.equal(result.lead_quality, 'HIGH');
  assert.equal(result.acma_status, 'QUESTIONABLE');
  const missingGap=await run({ ...lead, gap_unresolved_verified: 'NO' });
  assert.equal(missingGap.lead_quality, 'MEDIUM');
  assert.equal(missingGap.research_required,true);
  assert.match(missingGap.critical_uncertainties_json,/GAP_UNVERIFIED/);
});

test('timezone uses IANA names and flags ambiguous Australian locations', () => {
  assert.equal(timezoneFor({ country: 'Philippines' }).timezone, 'Asia/Manila');
  assert.equal(timezoneFor({ country: 'Australia', city: 'Broken Hill' }).timezone, 'Australia/Broken_Hill');
  assert.equal(timezoneFor({ country: 'Australia', city: 'Unknown', state: 'NSW' }).timezone, '');
  const zone = timezoneFor(row).timezone;
  const offset = date => new Intl.DateTimeFormat('en', { timeZone: zone, timeZoneName: 'shortOffset' }).format(new Date(date));
  assert.match(offset('2026-07-01'), /GMT\+10/);
  assert.match(offset('2026-12-01'), /GMT\+11/);
});

test('research writes exclude protected state and neutralize spreadsheet formulas', async () => {
  const before = JSON.stringify(row);
  const result = sheetRecord(await run({ ...row, business_name: '=IMPORTXML("https://bad.example.org")' }));
  for (const protectedField of ['approved', 'outreach_status', 'suppressed', 'sent_at', 'message_id', 'last_contacted_at', 'next_followup_at', 'message_hash']) assert.equal(protectedField in result, false);
  assert.ok(result.business_name.startsWith("'="));
  assert.equal(sheetSafe(' +cmd'), "' +cmd");
  assert.equal(JSON.stringify(row), before);
});

test('dispatch identity cannot be bypassed by edited copy; V1 blocks every send', () => {
  const message = { campaign_id: 'launch', recipient: 'HELLO@example.org', step: 'initial', subject: 'Hello', body: 'A' };
  assert.equal(dispatchKey(message), dispatchKey({ ...message, body: 'B', lead_id: 'another', recipient: 'hello@example.org' }));
  assert.notEqual(messageHash(message), messageHash({ ...message, body: 'B' }));
  assert.equal(sendBlockReason({ approved: 'YES', outreach_status: 'SENT' }), 'ALREADY_SENT');
  assert.equal(sendBlockReason({ approved: 'YES', outreach_status: 'UNKNOWN_DELIVERY' }), 'RECONCILIATION_REQUIRED');
  assert.equal(sendBlockReason({ approved: 'YES' }), 'SENDING_NOT_IMPLEMENTED');
});

// This harness executes the exported Code-node programs and graph routing with mock I/O.
// It is not an n8n runtime and cannot validate OAuth, node schemas or n8n item linking.
async function simulate(workflow, initial, io, start) {
  const previous = new Map();
  const batches = new Map();
  let current = start || workflow.nodes[0].name;
  let items = initial;
  let turns = 0;
  while (current) {
    if (++turns > 250) throw new Error('Workflow did not terminate');
    const node = workflow.nodes.find(n => n.name === current);
    let branch = 0;
    if (node.type.endsWith('.code')) {
      const context = { require: name => { assert.equal(name, 'crypto'); return require('node:crypto'); }, console: { log() {}, error() {} },
        $input: { first: () => items[0], all: () => items },
        $: name => ({ first: () => previous.get(name)[0], item: previous.get(name)?.[0] }) };
      items = new vm.Script('(function(){\n' + node.parameters.jsCode + '\n})()').runInNewContext(context, { timeout: 2000 });
      items = JSON.parse(JSON.stringify(items));
    } else if (node.type.endsWith('.if')) branch = items[0].json.pending ? 0 : 1;
    else if (node.type.endsWith('.httpRequest')) items = [{ json: await io.http(items[0].json.pending.url) }];
    else if (node.type.endsWith('.googleSheets')) items = await io.sheets(node, items);
    else if (node.type.endsWith('.executeWorkflow')) items = await simulate(makeWorker(), items, io);
    else if (node.type.endsWith('.splitInBatches')) {
      if (!batches.has(node.name)) batches.set(node.name, { todo: [...items], done: [] });
      else batches.get(node.name).done.push(...items);
      const state = batches.get(node.name);
      if (state.todo.length) { branch = 1; items = [state.todo.shift()]; }
      else { branch = 0; items = state.done; }
    } else if (!/\.(manualTrigger|executeWorkflowTrigger|wait)$/.test(node.type)) throw new Error('Unhandled node ' + node.type);
    previous.set(node.name, items);
    current = workflow.connections[node.name]?.main[branch]?.[0]?.node;
  }
  return items;
}

test('exported worker programs preserve row association for five leads on two runs', async () => {
  const workflow = makeWorker();
  const sheet = new Map();
  const inputBefore = JSON.stringify(fixtures.leads);
  let writes = 0;
  const io = {
    http: async url => { assert.ok(fixtures.responses[url], url); return fixtures.responses[url]; },
    sheets: async (node, items) => {
      if (node.name === 'Read Leads') return fixtures.leads.map(json => ({ json }));
      for (const item of items) { writes++; sheet.set(item.json.lead_id, item.json); }
      return items;
    },
  };
  for (let i = 0; i < 2; i++) {
    for (const lead of fixtures.leads) {
      const output = await simulate(workflow, [{json:{lead,config:fixtures.config}}], io);
      assert.equal(output[0].json.lead_id, leadId(lead));
      writes++; sheet.set(output[0].json.lead_id,output[0].json);
    }
  }
  assert.equal(writes, 10);
  assert.equal(sheet.size, 5);
  assert.equal(sheet.get(leadId(fixtures.leads[0])).public_email, 'hello@clinic.example.org');
  assert.equal(sheet.get(leadId(fixtures.leads[1])).public_email, '');
  assert.equal(sheet.get(leadId(fixtures.leads[1])).website_status, 'DISCONNECTED_DOMAIN');
  assert.equal(JSON.stringify(fixtures.leads), inputBefore);
});

test('workflow exports equal generated source, connect valid nodes and contain no send capability', () => {
  const files = ['lead-research.json', 'research-one-lead.json'];
  const expected = [makeParent(), makeWorker()];
  files.forEach((name, index) => {
    const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../workflows', name), 'utf8'));
    assert.deepEqual(data, expected[index]);
    assert.equal(data.active, false);
    const names = new Set(data.nodes.map(node => node.name));
    for (const edges of Object.values(data.connections)) for (const branch of edges.main) for (const edge of branch) assert.ok(names.has(edge.node));
    for (const node of data.nodes) assert.ok(!/gmail|sendEmail|smtp|facebook|instagram/i.test(node.type));
  });
  const http = expected[1].nodes.find(x => x.type.endsWith('.httpRequest'));
  assert.equal(http.parameters.options.redirect.redirect.followRedirects, false);
  assert.equal(http.parameters.options.allowUnauthorizedCerts, false);
  const sheet = expected[0].nodes.find(x => x.name === 'Write Arc Research');
  assert.equal(sheet.parameters.method, 'POST');
  assert.equal(sheet.parameters.nodeCredentialType, 'googleSheetsOAuth2Api');
});

test('result conforms to the generated schema field types and enums', async () => {
  const schema = require('../schemas/research-result.schema.json');
  for (const lead of fixtures.leads) {
    const result = await run(lead);
    assert.deepEqual(Object.keys(result).sort(), [...schema.required].sort());
    for (const [key, definition] of Object.entries(schema.properties)) {
      const allowedTypes = [].concat(definition.type);
      assert.ok(allowedTypes.includes(typeof result[key]), key);
      if (definition.enum) assert.ok(definition.enum.includes(result[key]), key);
      if (definition.pattern) assert.match(result[key], new RegExp(definition.pattern));
    }
  }
});
