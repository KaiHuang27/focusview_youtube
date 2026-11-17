import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import test from 'node:test';

const root = new URL('../', import.meta.url);
test('listing descriptions preserve paragraph layout and matching feature and use-case lists', async () => {
  const english = await readFile(new URL('docs/store-listing/en.txt', root), 'utf8');
  for (const file of (await readdir(new URL('docs/store-listing/', root))).filter(file => file.endsWith('.txt'))) {
    const description = await readFile(new URL(`docs/store-listing/${file}`, root), 'utf8');
    const sections = description.trim().split('\n\n');
    assert.equal(sections.length, 4, `${file}: introduction, features, use cases, privacy`);
    assert.equal(sections[0].split('\n').length, 1, `${file}: one introduction paragraph`);
    for (const [index, count] of [[1, 4], [2, 5]]) {
      const [heading, ...items] = sections[index].split('\n');
      assert.ok(heading && !heading.startsWith('• '), `${file}: section heading`);
      assert.equal(items.length, count, `${file}: list length`);
      assert.ok(items.every(item => item.startsWith('• ') && item.length > 2), `${file}: bullet format`);
    }
    assert.ok(sections[1].split('\n')[4].includes('Option + Shift + Z'), `${file}: Mac shortcut last`);
    assert.equal(sections[3].split('\n').length, 2, `${file}: privacy heading and paragraph`);
    assert.ok(description.endsWith('\n') && !description.endsWith('\n\n'), `${file}: one final newline`);
    assert.ok(!/[\t\r]| +$/m.test(description), `${file}: clean plain text`);
    if (file.startsWith('en-')) assert.equal(description, english, `${file}: shared English copy`);
  }
});

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
  for (const file of ['src/support-background.js', 'src/support-prompt.js', 'src/LUCIDE-LICENSE.txt']) assert.ok(files.includes(file), `${file} must be packaged`);
  assert.ok(files.every(file => !file.startsWith('docs/')));
});
