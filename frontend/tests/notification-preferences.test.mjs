import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadNotificationPreferences() {
  const helperPath = path.resolve(__dirname, '../src/lib/notification-preferences.ts');
  const source = fs.readFileSync(helperPath, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  });

  const compiledModule = { exports: {} };
  vm.runInNewContext(outputText, {
    module: compiledModule,
    exports: compiledModule.exports,
    console,
    Set,
    Array,
    JSON,
  }, { filename: helperPath });

  return compiledModule.exports;
}

function createStorage(seed = {}) {
  const data = new Map(Object.entries(seed));

  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
    removeItem: (key) => data.delete(key),
    dump: () => Object.fromEntries(data.entries()),
  };
}

function createNotificationTarget(initialPermission = 'default', requestedPermission = 'granted') {
  const created = [];

  class FakeNotification {
    static permission = initialPermission;
    static requestPermission = async () => {
      FakeNotification.permission = requestedPermission;
      return requestedPermission;
    };

    constructor(title, options) {
      created.push({ title, options });
    }
  }

  return { target: { Notification: FakeNotification }, created };
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

test('normalizes stored notification preferences safely', () => {
  const {
    normalizeNotificationPreferences,
    updateNotificationPreferences,
  } = loadNotificationPreferences();

  assert.deepEqual(
    plain(normalizeNotificationPreferences({
      browserAlerts: true,
      mutedTypes: ['warning', 'warning', 'unknown', 'error'],
    })),
    { browserAlerts: true, mutedTypes: ['warning', 'error'] },
  );

  assert.deepEqual(
    plain(updateNotificationPreferences(
      { browserAlerts: true, mutedTypes: ['info'] },
      { mutedTypes: ['success'] },
    )),
    { browserAlerts: true, mutedTypes: ['success'] },
  );
});

test('persists preferences per user key', () => {
  const {
    getNotificationPreferencesStorageKey,
    readNotificationPreferences,
    writeNotificationPreferences,
  } = loadNotificationPreferences();

  const storage = createStorage();
  writeNotificationPreferences('user-7', { browserAlerts: true, mutedTypes: ['error'] }, storage);

  assert.equal(getNotificationPreferencesStorageKey('user-7'), 'notification_preferences:user-7');
  assert.deepEqual(
    plain(readNotificationPreferences('user-7', storage)),
    { browserAlerts: true, mutedTypes: ['error'] },
  );
  assert.deepEqual(
    plain(readNotificationPreferences('missing-user', storage)),
    { browserAlerts: false, mutedTypes: [] },
  );
});

test('checks delivery preferences and browser permission states', async () => {
  const {
    createBrowserNotification,
    getBrowserNotificationPermission,
    requestBrowserNotificationPermission,
    shouldShowNotification,
  } = loadNotificationPreferences();

  assert.equal(getBrowserNotificationPermission(undefined), 'unsupported');
  assert.equal(
    shouldShowNotification({ type: 'warning' }, { browserAlerts: true, mutedTypes: ['warning'] }),
    false,
  );

  const granted = createNotificationTarget('granted');
  assert.equal(getBrowserNotificationPermission(granted.target), 'granted');
  assert.equal(
    createBrowserNotification({ type: 'info', title: 'New update', message: 'Payroll export finished' }, granted.target),
    true,
  );
  assert.deepEqual(plain(granted.created), [
    {
      title: 'New update',
      options: { body: 'Payroll export finished', tag: 'info:New update' },
    },
  ]);

  const denied = createNotificationTarget('default', 'denied');
  assert.equal(await requestBrowserNotificationPermission(denied.target), 'denied');
  assert.equal(createBrowserNotification({ type: 'error', title: 'Blocked', message: 'No alert' }, denied.target), false);
});
