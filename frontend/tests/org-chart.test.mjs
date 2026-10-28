import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Compile the org chart helper alone; './api' is only used by the fetchers, so a stub is enough.
function loadOrgChart() {
  const helperPath = path.resolve(__dirname, '../src/lib/org-chart.ts');
  const { outputText } = ts.transpileModule(fs.readFileSync(helperPath, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const compiledModule = { exports: {} };
  vm.runInNewContext(outputText, {
    module: compiledModule,
    exports: compiledModule.exports,
    require: (name) => {
      if (name === './api') return { apiFetch: async () => { throw new Error('not in tests'); } };
      throw new Error(`Unexpected import in org-chart: ${name}`);
    },
  }, { filename: helperPath });
  return compiledModule.exports;
}

const orgChart = loadOrgChart();

function member(id, extra = {}) {
  return {
    id,
    name: extra.name ?? id,
    email: `${id}@example.test`,
    avatar: null,
    roleLabel: extra.roleLabel ?? 'Inventory VA',
    departmentName: extra.departmentName === undefined ? 'Operations' : extra.departmentName,
    managerId: extra.managerId ?? null,
    directReportCount: 0,
    isSupervisor: extra.isSupervisor ?? false,
  };
}

// Values built inside the VM have another realm's prototypes; compare plain copies.
const plain = (value) => JSON.parse(JSON.stringify(value));
const ids = (nodes) => plain(nodes.map((node) => node.member.id));

test('roots are members without a manager on the chart; reports sit under their manager', () => {
  const members = [
    member('boss', { name: 'Boss' }),
    member('zed', { name: 'Zed', managerId: 'boss' }),
    member('amy', { name: 'Amy', managerId: 'boss' }),
    member('orphan', { name: 'Orphan', managerId: 'inactive-manager' }),
  ];
  const roots = orgChart.buildOrgChartTree(members);
  assert.deepEqual(ids(roots), ['boss', 'orphan'], 'a manager who is not on the chart makes a root');
  assert.deepEqual(ids(roots[0].reports), ['amy', 'zed'], 'reports are sorted by name');
});

test('a reporting loop cannot hang the tree and shows every member once', () => {
  const members = [
    member('a', { managerId: 'b' }),
    member('b', { managerId: 'a' }),
    member('c', { managerId: 'c' }),
  ];
  const roots = orgChart.buildOrgChartTree(members);
  const seen = [];
  const walk = (nodes) => nodes.forEach((node) => { seen.push(node.member.id); walk(node.reports); });
  walk(roots);
  assert.deepEqual(seen.sort(), ['a', 'b', 'c']);
  assert.ok(roots.some((node) => node.member.id === 'c'), 'reporting to yourself makes a root');
});

test('roots are grouped by department in the given order with No department last', () => {
  const members = [
    member('ops-lead', { departmentName: 'Operations' }),
    member('ops-va', { departmentName: 'Payroll / Finance', managerId: 'ops-lead' }),
    member('founder', { departmentName: 'Owners / Founders' }),
    member('drifter', { departmentName: null }),
    member('analyst', { departmentName: 'Analytics / Data' }),
  ];
  const groups = orgChart.groupOrgChartByDepartment(
    orgChart.buildOrgChartTree(members),
    ['Owners / Founders', 'Operations'],
  );
  assert.deepEqual(plain(groups.map((group) => group.name)), ['Owners / Founders', 'Operations', 'Analytics / Data', 'No department']);
  const operations = groups.find((group) => group.name === 'Operations');
  assert.equal(operations.size, 2, 'a report from another department stays under their manager');
  assert.deepEqual(ids(operations.roots), ['ops-lead']);
});

test('search matches name, email, role and department; ancestors expand', () => {
  const members = [
    member('ceo', { name: 'Dana' }),
    member('mgr', { name: 'Morgan', managerId: 'ceo', roleLabel: 'Operations Manager' }),
    member('w1', { name: 'worker one', managerId: 'mgr' }),
  ];
  assert.deepEqual([...orgChart.findMatchingMemberIds(members, 'WORKER')], ['w1']);
  assert.deepEqual([...orgChart.findMatchingMemberIds(members, 'operations manager')], ['mgr']);
  assert.deepEqual([...orgChart.findMatchingMemberIds(members, '  ')], []);
  assert.deepEqual([...orgChart.collectAncestorIds(['w1'], members)].sort(), ['ceo', 'mgr']);
  const looped = [member('x', { managerId: 'y' }), member('y', { managerId: 'x' })];
  assert.deepEqual([...orgChart.collectAncestorIds(['x'], looped)], ['y'], 'loop-safe');
});

test('manager candidates leave out the member and everyone below them', () => {
  const members = [
    member('ceo'),
    member('mgr', { managerId: 'ceo' }),
    member('w1', { managerId: 'mgr' }),
    member('w2', { managerId: 'w1' }),
    member('peer'),
  ];
  assert.deepEqual([...orgChart.collectDescendantIds('mgr', members)].sort(), ['w1', 'w2']);
  assert.deepEqual(plain(orgChart.getManagerCandidates('mgr', members).map((entry) => entry.id)), ['ceo', 'peer']);
});

test('contact and concern recipients follow the supervisor rule', () => {
  const boss = member('boss', { isSupervisor: true });
  const me = member('me', { isSupervisor: true });
  const peer = member('peer');
  assert.equal(orgChart.canContactMember(boss, 'me'), true);
  assert.equal(orgChart.canContactMember(me, 'me'), false, 'never on your own card');
  assert.equal(orgChart.canContactMember(peer, 'me'), false);
  const members = [boss, me, peer];
  assert.deepEqual(plain(orgChart.getConcernRecipients(members, { id: 'me', isFullAccess: false }).map((entry) => entry.id)), ['boss']);
  assert.deepEqual(plain(orgChart.getConcernRecipients(members, { id: 'me', isFullAccess: true }).map((entry) => entry.id)), ['boss', 'peer']);
  assert.deepEqual(
    plain(orgChart.getConcernRecipients(members, { id: 'me', isFullAccess: true }, ['boss'], false)),
    [],
    'reassign keeps the supervisor rule even for admins',
  );
});

test('display names and initials fall back to the email', () => {
  assert.equal(orgChart.getMemberDisplayName({ name: '  ', email: 'ops@example.test' }), 'ops@example.test');
  assert.equal(orgChart.getMemberInitials({ name: 'worker one', email: 'w@example.test' }), 'WO');
  assert.equal(orgChart.getMemberInitials({ name: null, email: 'ops.manager@example.test' }), 'OM');
});
