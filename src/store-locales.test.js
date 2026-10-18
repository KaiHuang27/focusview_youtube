import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import test from 'node:test';

const root = new URL('../', import.meta.url);
test('Chrome listing locales resolve metadata and ship in the release archive', async () => {
  const manifest = JSON.parse(await readFile(new URL('manifest.json', root), 'utf8'));
  assert.equal(manifest.default_locale, 'en');
  assert.equal(manifest.description, '__MSG_extensionDescription__');
  const locales = ['en', 'ja', 'ko', 'zh_CN', 'zh_TW'];
  assert.deepEqual((await readdir(new URL('_locales/', root))).sort(), locales);
  execFileSync('sh', ['scripts/build-release.sh'], { cwd: root });
  const files = execFileSync('unzip', ['-Z1', `dist/focusview-${manifest.version}.zip`], { cwd: root, encoding: 'utf8' }).split('\n');
  for (const locale of locales) {
    const path = `_locales/${locale}/messages.json`;
    const messages = JSON.parse(await readFile(new URL(path, root), 'utf8'));
    assert.ok(messages.extensionDescription.message.trim());
    assert.ok(messages.extensionDescription.message.length <= 132);
    assert.ok(files.includes(path), `${locale} metadata must be packaged`);
    const description = await readFile(new URL(`docs/store-listing/${locale.replace('_', '-')}.txt`, root), 'utf8');
    for (const feature of ['Alt + Shift + Z', '100%', '500%', '90°', '180°', '270°']) assert.ok(description.includes(feature));
  }
  assert.ok(files.every(file => !file.startsWith('docs/')));
});
