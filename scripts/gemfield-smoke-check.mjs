#!/usr/bin/env node
// Gemfield Bridge end-to-end smoke check. Runs the client + staff flows and the security matrix
// against a RUNNING, gemfield-SEEDED environment (see backend `npm run seed:gemfield`). Verifies:
//   - website progress read + entitlement deny-matrix (404 for non-entitled/cross-org, no leak)
//   - wizard ticket submission -> dev pipeline
//   - staff-only control panel (403 for clients)
//   - internal notes never leak to the client (asserted on the live API response)
//
// Usage:
//   GEMFIELD_SMOKE_BASE=http://localhost:4000 GEMFIELD_SMOKE_PASSWORD=Deskii-Local-2026 \
//   node scripts/gemfield-smoke-check.mjs
// Exit code is non-zero if any check fails.

const BASE = (process.env.GEMFIELD_SMOKE_BASE || 'http://localhost:4000').replace(/\/$/, '');
const PW = process.env.GEMFIELD_SMOKE_PASSWORD || 'Deskii-Local-2026';
let pass = 0, fail = 0;
function check(name, cond, detail = '') {
  if (cond) { pass++; console.log('  ✓', name); }
  else { fail++; console.log('  ✗ FAIL:', name, detail); }
}
async function login(email) {
  const r = await fetch(`${BASE}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: PW }) });
  const j = await r.json().catch(() => null);
  return j?.tokens?.accessToken ?? j?.accessToken;
}
async function api(path, token, method = 'GET', data) {
  const r = await fetch(`${BASE}${path}`, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(data ? { body: JSON.stringify(data) } : {}) });
  let body = null; try { body = await r.json(); } catch {}
  return { status: r.status, body };
}

(async () => {
  const gc = await login('client.gemfield@example.test');
  const pc = await login('client.plain@example.test');
  const dev = await login('gemfield.dev@example.test');
  if (!gc || !pc || !dev) { console.error('Login failed - is the environment seeded (npm run seed:gemfield)?'); process.exit(1); }
  const gemOrg = ((await api('/api/clients/organizations', gc)).body || []).find((o) => o.gemfieldClient);
  const plainOrg = ((await api('/api/clients/organizations', pc)).body || [])[0];

  console.log('[A] Website progress + entitlement deny-matrix');
  const prog = await api(`/api/gemfield/organizations/${gemOrg.id}/progress`, gc);
  check('gemfield client reads progress (200, has project)', prog.status === 200 && prog.body?.projects?.length > 0);
  check('plain client -> gemfield org = 404', (await api(`/api/gemfield/organizations/${gemOrg.id}/progress`, pc)).status === 404);
  check('plain client -> own non-entitled org = 404', (await api(`/api/gemfield/organizations/${plainOrg.id}/progress`, pc)).status === 404);
  check('unauthenticated -> 401', (await api(`/api/gemfield/organizations/${gemOrg.id}/progress`, null)).status === 401);
  const denyBody = (await api(`/api/gemfield/organizations/${gemOrg.id}/progress`, pc)).body;
  check('deny body exposes only {error}', JSON.stringify(Object.keys(denyBody || {})) === '["error"]');

  console.log('[B] Wizard submission');
  const tk = await api(`/api/gemfield/organizations/${gemOrg.id}/tickets`, gc, 'POST', { category: 'website_change', description: 'smoke-check request', wizardVersion: 'v2', wizardAnswers: { page: 'home' } });
  check('wizard ticket created (201, TK ref)', tk.status === 201 && /^TK-/.test(tk.body?.reference || ''));

  console.log('[C] Staff-only control panel');
  check('gemfield dev -> pipeline 200', (await api('/api/gemfield/admin/pipeline', dev)).status === 200);
  check('gemfield CLIENT -> pipeline 403', (await api('/api/gemfield/admin/pipeline', gc)).status === 403);
  check('plain client -> pipeline 403', (await api('/api/gemfield/admin/pipeline', pc)).status === 403);
  check('client -> set entitlement 403', (await api(`/api/gemfield/admin/organizations/${gemOrg.id}/entitlement`, gc, 'PATCH', { gemfieldClient: true })).status === 403);

  console.log('[D] Internal note never leaks to the client');
  const clientResp = await api('/api/clients/tickets/seed-gf-tk-progress/comments', gc, 'POST', { body: 'smoke client note', visibility: 'client' });
  const cJson = JSON.stringify(clientResp.body);
  check('client response does not contain the internal note', !cJson.includes('INTERNAL:'), 'LEAK');
  check('client response has no internalNotes field', !cJson.includes('"internalNotes"'));
  check('client response includes the client comment', cJson.includes('smoke client note'));

  console.log(`\n=== Gemfield smoke check: ${pass} passed, ${fail} failed ===`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('smoke check error:', e); process.exit(1); });
