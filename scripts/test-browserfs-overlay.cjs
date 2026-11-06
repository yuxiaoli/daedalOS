const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { readFileSync } = require('node:fs');
const Module = require('node:module');
const { join } = require('node:path');

const bundlePath = join(__dirname, '../public/System/BrowserFS/browserfs.min.js');
const fixedSource = readFileSync(bundlePath, 'utf8').replace(/\r\n/g, '\n');
const before = '-1===s.size&&(s.size=o.length);var c=new kt(i,t,e,s,o)';
const after = 's.size=o.length;var c=new kt(i,t,e,s,o)';
const blob = data => createHash('sha1').update(`blob ${Buffer.byteLength(data)}\0`).update(data).digest('hex');
assert.equal(blob(fixedSource), '69582a65ef843b9ea24fc730326dbd64b8a90098');
assert.equal(fixedSource.split(after).length, 2);
const originalSource = fixedSource.replace(after, before);
assert.equal(blob(originalSource), '8f7c765740c2aa067ff76737b1e758fedbe0db90');
global.window = { fetch: () => { throw Error('fixture not initialized'); } };
function load(source, name) {
  const mod = new Module(join(__dirname, name), module);
  mod.filename = join(__dirname, name);
  mod.paths = module.paths;
  mod._compile(source, mod.filename);
  return mod.exports;
}
const original = load(originalSource, 'browserfs-original.cjs');
const fixed = load(fixedSource, 'browserfs-fixed.cjs');
const configure = bfs => new Promise((resolve, reject) => bfs.configure({ fs: 'OverlayFS', options: { readable: { fs: 'HTTPRequest', options: { index: { 'file.txt': null }, baseUrl: '/' } }, writable: { fs: 'InMemory' } } }, error => error ? reject(error) : resolve(bfs.BFSRequire('fs'))));
const exists = (fs, path) => new Promise(resolve => fs.exists(path, resolve));
const read = (fs, path) => new Promise(resolve => fs.readFile(path, (error, data) => resolve({ error, data })));
const write = (fs, path, data) => new Promise((resolve, reject) => fs.writeFile(path, data, error => error ? reject(error) : resolve()));
async function run(bfs, head, content, overlay) {
  const calls = [];
  global.window.fetch = async (_url, options) => {
    calls.push(options.method || 'GET');
    if (options.method === 'HEAD') return { ok: true, headers: { get: () => head } };
    return { ok: true, arrayBuffer: async () => content.buffer.slice(content.byteOffset, content.byteOffset + content.byteLength) };
  };
  const fs = await configure(bfs);
  if (overlay !== undefined) await write(fs, '/file.txt', overlay);
  assert.equal(await exists(fs, '/file.txt'), true);
  return { ...(await read(fs, '/file.txt')), calls, fs };
}
(async () => {
  const content = Buffer.alloc(525, 65);
  const bad = await run(original, '357', content);
  assert.equal(bad.error.code, 'EIO');
  assert.match(bad.error.message, /Buffer is 525 long.*file is 357 long/);
  assert.deepEqual((await read(bad.fs, '/file.txt')).data, content);
  console.log('PASS original negative control: first read EIO; second succeeds');
  for (const [label, head, value] of [['compressed', '357', content], ['matching', '525', content], ['unknown', null, content], ['shipped empty', '0', Buffer.alloc(0)]]) {
    const result = await run(fixed, head, value);
    assert.ifError(result.error);
    assert.deepEqual(result.data, value);
    console.log(`PASS ${label}`);
  }
  for (const value of [Buffer.alloc(0), Buffer.from('user overlay')]) {
    const result = await run(fixed, '357', content, value);
    assert.ifError(result.error);
    assert.deepEqual(result.data, value);
    console.log(`PASS writable overlay (${value.length} bytes)`);
  }
  global.window.fetch = async (_url, options) => options.method === 'HEAD'
    ? { ok: true, headers: { get: () => '357' } }
    : { ok: false, status: 500 };
  const fs = await configure(fixed);
  assert.equal(await exists(fs, '/file.txt'), true);
  assert.equal((await read(fs, '/file.txt')).error.code, 'EIO');
  assert.equal((await read(fs, '/missing.txt')).error.code, 'ENOENT');
  console.log('PASS failed read and missing file');
})().catch(error => { console.error(error); process.exitCode = 1; });
