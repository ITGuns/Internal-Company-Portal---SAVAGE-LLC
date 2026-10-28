import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { loadTsModule, plain } from './helpers/load-ts.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The payroll calendar's API helpers with apiFetch stubbed (2026-10-28).
function jsonResponse(body, status = 200) {
  return { status, ok: status >= 200 && status < 300, json: async () => body };
}

function loadWithApi(relativePath, apiFetch) {
  return loadTsModule(path.resolve(__dirname, relativePath), { stubs: { './api': { apiFetch } }, globals: { URLSearchParams } });
}

test('event dates read as Manila days and are stored at Manila noon', async () => {
  const sent = [];
  const apiFetch = async (url, options = {}) => {
    sent.push({ url, method: options.method ?? 'GET', body: options.body ? JSON.parse(options.body) : null });
    if (options.method === 'POST') return jsonResponse({ id: 'e1', title: 'Payday', date: '2026-10-29T04:00:00.000Z', type: 'payday' }, 201);
    return jsonResponse([
      // Saved before 2026-10-28 at UTC midnight, and at Manila midnight: both are Oct 28 in Manila.
      { id: 'old', title: 'Old', date: '2026-10-28T00:00:00.000Z', type: 'holiday' },
      { id: 'mnl', title: 'Manila', date: '2026-10-27T16:00:00.000Z', type: 'deadline' },
    ]);
  };
  const { eventDayFromApi, eventDateForApi, fetchPayrollEvents, createPayrollEvent } = loadWithApi('../src/lib/payroll-events.ts', apiFetch);

  assert.equal(eventDayFromApi('2026-10-28T00:00:00.000Z'), '2026-10-28');
  assert.equal(eventDayFromApi('2026-10-27T16:00:00.000Z'), '2026-10-28');
  assert.equal(eventDayFromApi('2026-10-28'), '2026-10-28');
  assert.equal(eventDateForApi('2026-10-29'), '2026-10-29T04:00:00.000Z');

  const events = await fetchPayrollEvents();
  assert.deepEqual(plain(events).map((event) => event.date), ['2026-10-28', '2026-10-28']);

  const created = await createPayrollEvent({ title: 'Payday', date: '2026-10-29', type: 'payday', description: 'x' });
  assert.equal(sent.at(-1).body.date, '2026-10-29T04:00:00.000Z', 'POST carries Manila noon of the chosen day');
  assert.equal(created.date, '2026-10-29');
});

test('fetchPayrollEvents throws instead of returning an empty list', async () => {
  const failing = loadWithApi('../src/lib/payroll-events.ts', async () => {
    throw new Error('Failed to fetch events');
  });
  await assert.rejects(() => failing.fetchPayrollEvents(), /Failed to fetch events/);
  const odd = loadWithApi('../src/lib/payroll-events.ts', async () => jsonResponse({ nope: true }));
  await assert.rejects(() => odd.fetchPayrollEvents(), /unexpected response/);
});

test('fetchTimeEntriesOrThrow throws on failure; fetchTimeEntries stays lenient', async () => {
  const urls = [];
  const ok = loadWithApi('../src/lib/time-entries.ts', async (url) => {
    urls.push(url);
    return jsonResponse([
      { id: 'a', userId: 'u', start: '2026-10-28T01:00:00.000Z', end: '2026-10-28T09:00:00.000Z', duration: 480 },
      { id: 'bad', start: 'not a date' },
    ]);
  });
  const entries = await ok.fetchTimeEntriesOrThrow('2026-10-27T16:00:00.000Z', '2026-10-28T15:59:59.999Z', 'u');
  assert.deepEqual(plain(entries), [{ id: 'a', userId: 'u', start: '2026-10-28T01:00:00.000Z', end: '2026-10-28T09:00:00.000Z', durationMin: 480 }]);
  assert.match(urls[0], /start=2026-10-27T16%3A00%3A00.000Z&end=2026-10-28T15%3A59%3A59.999Z&userId=u/);

  const failing = loadWithApi('../src/lib/time-entries.ts', async () => {
    throw new Error('Failed to fetch entries');
  });
  await assert.rejects(() => failing.fetchTimeEntriesOrThrow(), /Failed to fetch entries/);
  const originalError = console.error;
  console.error = () => {};
  try {
    assert.deepEqual(plain(await failing.fetchTimeEntries()), []);
  } finally {
    console.error = originalError;
  }
});
