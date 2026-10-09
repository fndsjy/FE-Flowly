const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync(path.resolve(__dirname, '../src/features/onboarding/exam-approval-delivery.ts'), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const moduleObject = { exports: {} };
vm.runInThisContext('(function(module,exports){' + code + '\n})')(moduleObject, moduleObject.exports);
const { examApprovalDeliveryError: error } = moduleObject.exports;
test('pending sends show no premature failure', () => assert.equal(error('PENDING'), null));
test('countdown expiry describes ongoing processing without declaring failure', () => assert.match(error('PENDING', true), /masih diproses/));
test('confirmed send clears an earlier uncertain delivery message', () => {
  assert.match(error('UNCERTAIN'), /belum dapat dikonfirmasi/);
  assert.equal(error('SENT'), null);
});
test('confirmed send stays clear after countdown expiry', () => assert.equal(error('SENT', true), null));
test('definite failure enables the retry explanation', () => assert.match(error('FAILED'), /coba kembali/));
