const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync(path.resolve(__dirname, '../src/lib/notification-delivery-api.ts'), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const moduleObject = { exports: {} };
vm.runInThisContext('(function(module,exports){' + code + '\n})')(moduleObject, moduleObject.exports);
const { readNotificationDeliveryResponse: read } = moduleObject.exports;
test('missing backend endpoint returns a clear error instead of a JSON syntax error', async () => {
  await assert.rejects(read(new Response('<!DOCTYPE html>Cannot GET', { status: 404, headers: { 'content-type': 'text/html' } }), 'Gagal memuat.'), /Backend perlu diperbarui/);
});
test('HTML returned with HTTP 200 is not treated as successful data', async () => {
  await assert.rejects(read(new Response('<!DOCTYPE html>', { headers: { 'content-type': 'text/html' } }), 'Gagal memuat.'), /tidak memberikan respons data/);
});
test('valid empty list remains distinguishable from a fetch failure', async () => {
  assert.deepEqual(await read(Response.json({ response: [] }), 'Gagal memuat.'), { response: [] });
});
test('JSON authentication errors remain readable', async () => {
  assert.deepEqual(await read(Response.json({ errors: 'Unauthorized' }, { status: 401 }), 'Gagal memuat.'), { errors: 'Unauthorized' });
});
test('malformed JSON becomes a readable error', async () => {
  await assert.rejects(read(new Response('not json', { headers: { 'content-type': 'application/json' } }), 'Gagal memuat.'), /Respons server tidak dapat dibaca/);
});
