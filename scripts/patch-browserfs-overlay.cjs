// Apply the documented OverlayFS fix to the exact vendored artifact.
const { createHash } = require('node:crypto');
const { readFileSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');
const file = join(__dirname, '../public/System/BrowserFS/browserfs.min.js');
const original = '8f7c765740c2aa067ff76737b1e758fedbe0db90';
const patched = '69582a65ef843b9ea24fc730326dbd64b8a90098';
const before = '-1===s.size&&(s.size=o.length);var c=new kt(i,t,e,s,o)';
const after = 's.size=o.length;var c=new kt(i,t,e,s,o)';
const blob = data => {
  const canonical = Buffer.from(data.toString('utf8').replace(/\r\n/g, '\n'));
  return createHash('sha1').update(`blob ${canonical.length}\0`).update(canonical).digest('hex');
};
const data = readFileSync(file);
if (blob(data) === patched) {
  console.log('BrowserFS patch already applied');
} else {
  if (blob(data) !== original) throw Error('Unexpected BrowserFS blob; review before patching');
  const source = data.toString('utf8');
  if (source.split(before).length !== 2) throw Error('Expected exactly one OverlayFS match');
  const result = Buffer.from(source.replace(before, after));
  if (blob(result) !== patched) throw Error('Unexpected patched BrowserFS blob');
  writeFileSync(file, result);
  console.log('Applied BrowserFS OverlayFS patch');
}
