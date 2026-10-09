const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const base = path.resolve(__dirname, '../src/administrator/lib/onboarding');
const load = (name, dependencies = {}) => {
  const code = ts.transpileModule(fs.readFileSync(path.join(base, name + '.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  vm.runInThisContext('(function(require, module, exports){' + code + '\n})', { filename: name })(id => {
    if (Object.hasOwn(dependencies, id)) return dependencies[id];
    throw new Error('Unexpected runtime dependency: ' + id);
  }, module, module.exports);
  return module.exports;
};
const utilities = load('adminOnboardingUtils');
const { filterDirectoryParticipants: filter, paginateDirectory: paginate } = load('participant-directory', { './adminOnboardingUtils': utilities });
const stage = (order, status) => ({ onboardingStageTemplateId: 'stage-' + order, stageOrder: order, status, totalMaterialCount: 1, readMaterialCount: 0 });
const person = (id, name, department, currentStageOrder, statuses, status = 'IN_PROGRESS') => ({ participantId: id, onboardingAssignmentId: id, participantName: name, departmentName: department, currentStageOrder, status, stages: statuses.map((status, index) => stage(index + 1, status)) });
const rows = [
  person('a', 'M. Atalarik Syahri', 'Produksi', 2, ['PASSED', 'READING', 'LOCKED', 'LOCKED']),
  person('b', 'Diki Alpiano', 'Produksi', 4, ['PASSED', 'PASSED', 'PASSED', 'READING']),
  person('c', 'Sari', 'Finance', 2, ['PASSED', 'REMEDIAL', 'LOCKED', 'LOCKED']),
  person('d', 'Budi', null, 2, ['PASSED', 'FAIL_FINAL', 'LOCKED', 'LOCKED'], 'FAIL_FINAL'),
  person('e', 'Rina', 'Finance', 4, ['PASSED', 'PASSED_OVERRIDE', 'COMPLETED', 'PASSED'], 'COMPLETED'),
];
const filters = overrides => ({ name: '', department: '', stageId: '', outcome: 'current', ...overrides });
const ids = items => items.map(row => row.participantId);
test('name search ignores capitalization and surrounding whitespace', () => {
  assert.deepEqual(ids(filter(rows, filters({ name: '  ATALARIK  ' }))), ['a']);
});
test('division is exact and can be combined with name', () => {
  assert.deepEqual(ids(filter(rows, filters({ department: 'Produksi', name: 'Diki' }))), ['b']);
});
test('participants without a division can be found', () => {
  assert.deepEqual(ids(filter(rows, filters({ department: '__UNASSIGNED__' }))), ['d']);
});
test('current stage excludes participants who have advanced or completed', () => {
  assert.deepEqual(ids(filter(rows, filters({ stageId: 'stage-2' }))), ['a', 'c', 'd']);
  assert.deepEqual(ids(filter(rows, filters({ stageId: 'stage-4' }))), ['b']);
});
test('passed stage includes participants who have advanced and HRD overrides', () => {
  assert.deepEqual(ids(filter(rows, filters({ stageId: 'stage-2', outcome: 'passed' }))), ['b', 'e']);
});
test('not passed includes remedial and final failure but excludes locked future stages', () => {
  assert.deepEqual(ids(filter(rows, filters({ stageId: 'stage-2', outcome: 'not_passed' }))), ['c', 'd']);
  assert.deepEqual(ids(filter(rows, filters({ stageId: 'stage-4', outcome: 'not_passed' }))), []);
});
test('division, stage, and outcome work together', () => {
  assert.deepEqual(ids(filter(rows, filters({ department: 'Finance', stageId: 'stage-2', outcome: 'passed' }))), ['e']);
});
test('all statuses and not started are explicit historical stage views', () => {
  assert.equal(filter(rows, filters({ stageId: 'stage-4', outcome: 'all' })).length, 5);
  assert.deepEqual(ids(filter(rows, filters({ stageId: 'stage-4', outcome: 'not_started' }))), ['a', 'c', 'd']);
});
test('missing stage records are excluded rather than guessed', () => {
  assert.deepEqual(filter(rows, filters({ stageId: 'missing', outcome: 'all' })), []);
});
test('pages return exactly the requested slice and the final partial page', () => {
  const items = Array.from({ length: 201 }, (_, index) => index);
  assert.deepEqual(paginate(items, 2, 10).items, items.slice(10, 20));
  const result = paginate(items, 21, 10);
  assert.deepEqual(result.items, [200]); assert.equal(result.pageCount, 21); assert.equal(result.first, 201); assert.equal(result.last, 201);
});
test('out-of-range pages clamp after the result set shrinks', () => {
  assert.equal(paginate(rows, 99, 10).page, 1);
  assert.equal(paginate(rows, -1, 10).page, 1);
  assert.equal(paginate(rows, NaN, 10).page, 1);
});
test('empty results and invalid page sizes are safe', () => {
  assert.deepEqual(paginate([], 4, 7), { items: [], page: 1, pageCount: 1, pageSize: 10, first: 0, last: 0, total: 0 });
});

test('previously passed participants are complete despite locked snapshots', () => {
  const previous = person('previous', 'Legacy', 'Produksi', 1, ['LOCKED', 'LOCKED', 'LOCKED', 'LOCKED'], 'PASSED_PREVIOUSLY');
  assert.deepEqual(ids(filter([previous], filters({ stageId: 'stage-2', outcome: 'passed' }))), ['previous']);
  assert.deepEqual(filter([previous], filters({ stageId: 'stage-1', outcome: 'current' })), []);
  assert.deepEqual(filter([previous], filters({ stageId: 'stage-2', outcome: 'not_started' })), []);
  assert.deepEqual(filter([previous], filters({ stageId: 'stage-2', outcome: 'not_passed' })), []);
});
test('completed participants without stage snapshots still qualify as complete', () => {
  const previous = person('previous', 'Legacy', 'Produksi', null, [], 'PASSED_PREVIOUSLY');
  assert.deepEqual(ids(filter([previous], filters({ stageId: 'stage-4', outcome: 'passed' }))), ['previous']);
});
test('portal pending and attention metrics exclude all completed participants', () => {
  const previous = person('previous', 'Legacy', 'Produksi', 1, ['LOCKED', 'LOCKED', 'LOCKED', 'LOCKED'], 'PASSED_PREVIOUSLY');
  const done = person('done', 'Done', 'Produksi', 2, ['PASSED', 'REMEDIAL', 'LOCKED', 'LOCKED'], 'COMPLETED');
  previous.dueAt = done.dueAt = '2000-01-01T00:00:00Z';
  const portal = { stages: [1, 2, 3, 4].map(order => stage(order, 'LOCKED')), participants: [...rows, previous, done], totalParticipants: 7, activeParticipants: 4, completedParticipants: 3, totalOpenCount: 0, lastReadAt: null };
  const metrics = utilities.getPortalMetrics(portal);
  assert.deepEqual(metrics.pendingByStage, [0, 3, 3, 4]);
  assert.deepEqual(metrics.activeByStage, [0, 3, 0, 1]);
  assert.equal(metrics.needsAttentionCount, 1);
});

test('legacy completions cannot inflate the 201-participant stage backlog', () => {
  const legacy = Array.from({ length: 183 }, (_, i) => person('legacy' + i, 'Legacy', 'Produksi', 1, ['LOCKED', 'LOCKED', 'LOCKED', 'LOCKED'], 'PASSED_PREVIOUSLY'));
  const complete = Array.from({ length: 6 }, (_, i) => person('complete' + i, 'Done', 'Produksi', 4, ['PASSED', 'PASSED', 'PASSED', 'PASSED'], 'COMPLETED'));
  const stageOne = Array.from({ length: 9 }, (_, i) => person('one' + i, 'Active', 'Produksi', 1, ['READING', 'LOCKED', 'LOCKED', 'LOCKED']));
  const stageTwo = Array.from({ length: 3 }, (_, i) => person('two' + i, 'Active', 'Produksi', 2, ['PASSED', 'READING', 'LOCKED', 'LOCKED']));
  const participants = [...legacy, ...complete, ...stageOne, ...stageTwo];
  const portal = { stages: [1, 2, 3, 4].map(order => stage(order, 'LOCKED')), participants, totalParticipants: 201, activeParticipants: 12, completedParticipants: 189, totalOpenCount: 0, lastReadAt: null };
  assert.deepEqual(utilities.getPortalMetrics(portal).pendingByStage, [9, 12, 12, 12]);
  assert.deepEqual(utilities.getPortalMetrics(portal).activeByStage, [9, 3, 0, 0]);
});
