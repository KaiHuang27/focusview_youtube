import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import test from 'node:test';

const root = new URL('../', import.meta.url);
test('Chrome listing locales resolve metadata and ship in the release archive', async () => {
  const manifest = JSON.parse(await readFile(new URL('manifest.json', root), 'utf8'));
  assert.equal(manifest.default_locale, 'en');
  assert.equal(manifest.description, '__MSG_extensionDescription__');
  const locales = 'am ar bg bn ca cs da de el en en_AU en_GB en_US es es_419 et fa fi fil fr gu he hi hr hu id it ja kn ko lt lv ml mr ms nl no pl pt_BR pt_PT ro ru sk sl sr sv sw ta te th tr uk vi zh_CN zh_TW'.split(' ');
  assert.equal(locales.length, 55);
  assert.deepEqual((await readdir(new URL('_locales/', root))).sort(), locales);
  execFileSync('sh', ['scripts/build-release.sh'], { cwd: root });
  const files = execFileSync('unzip', ['-Z1', `dist/focusview-${manifest.version}.zip`], { cwd: root, encoding: 'utf8' }).split('\n');
  for (const locale of locales) {
    const path = `_locales/${locale}/messages.json`;
    const messages = JSON.parse(await readFile(new URL(path, root), 'utf8'));
    assert.deepEqual(Object.keys(messages), ['extensionDescription']);
    assert.ok(messages.extensionDescription.message.trim());
    assert.ok(!/__MSG_|TODO|PLACEHOLDER/.test(messages.extensionDescription.message));
    assert.ok(messages.extensionDescription.message.length <= 132);
    assert.ok(files.includes(path), `${locale} metadata must be packaged`);
    const description = await readFile(new URL(`docs/store-listing/${locale.replace('_', '-')}.txt`, root), 'utf8');
    assert.ok(description.includes('FocusView'), `${locale} must retain the product name`);
    assert.ok(description.includes('YouTube'), `${locale} must retain the platform name`);
    assert.ok(description.length >= 200 && description.length <= 16000, `${locale} must have a complete listing within the store limit`);
    assert.ok(!/TODO|PLACEHOLDER/.test(description));
    if (!locale.startsWith('en')) {
      assert.notEqual(description, await readFile(new URL('docs/store-listing/en.txt', root), 'utf8'), `${locale} must be translated`);
    }
    for (const feature of ['Alt + Shift + Z', '100%', '500%', '90°', '180°', '270°']) assert.ok(description.includes(feature));
  }
  assert.ok(files.every(file => !file.startsWith('docs/')));
});
