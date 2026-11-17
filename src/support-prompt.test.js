import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';

const source = await readFile(new URL('./support-background.js', import.meta.url), 'utf8');
function background(storage = {}, { failRead = false, failWrite = false } = {}) {
  let listener;
  const api = {
    runtime: { id: 'focusview', onMessage: { addListener(fn) { listener = fn; } } },
    storage: { local: {
      async get() {
        if (failRead) { failRead = false; throw new Error('Storage unavailable'); }
        return structuredClone(storage);
      },
      async set(value) {
        if (failWrite) { failWrite = false; throw new Error('Storage unavailable'); }
        Object.assign(storage, structuredClone(value));
      },
    } },
  };
  vm.runInNewContext(source, { chrome: api });
  return {
    storage,
    send(type = 'support:activate') {
      return new Promise(resolve => listener({ type }, { id: 'focusview' }, resolve));
    },
    listener,
  };
}

test('show on every twentieth activation, including after a background restart', async () => {
  let worker = background();
  for (let i = 1; i <= 60; i++) {
    if (i === 7) worker = background(worker.storage);
    assert.equal((await worker.send()).show, i % 20 === 0, `activation ${i}`);
  }
});

test('concurrent tabs share one counter without losing increments', async () => {
  const worker = background();
  const results = await Promise.all(Array.from({ length: 67 }, () => worker.send()));
  assert.equal(results.filter(result => result.show).length, 3);
  assert.equal(worker.storage.supportPrompt.count, 7);
});

test('rating or support resets every reminder tier to twenty across restarts', async () => {
  for (const interval of [10, 20, 60, 100]) {
    let worker = background({ supportPrompt: { count: interval - 1, interval, laterCount: 2 } });
    assert.equal((await worker.send('support:reset')).show, false);
    assert.equal(worker.storage.supportPrompt.count, 0);
    assert.equal(worker.storage.supportPrompt.interval, 20);
    worker = background(worker.storage);
    for (let i = 1; i <= 40; i++) assert.equal((await worker.send()).show, i % 20 === 0);
    assert.equal(worker.storage.supportPrompt.laterCount, 2);
    assert.equal(worker.storage.supportPrompt.supported, true);
  }
});

for (const failure of ['failRead', 'failWrite']) {
  test(`${failure} does not show a prompt or break subsequent activations`, async () => {
    const worker = background({}, { [failure]: true });
    assert.equal((await worker.send()).show, false);
    assert.equal((await worker.send()).show, false);
    assert.equal(worker.storage.supportPrompt.count, 1);
  });
}

test('unknown messages and foreign senders cannot change the counter', () => {
  const worker = background();
  const fail = () => assert.fail('Should not respond');
  assert.equal(worker.listener({ type: 'unknown' }, { id: 'focusview' }, fail), undefined);
  assert.equal(worker.listener({ type: 'support:activate' }, { id: 'other' }, fail), undefined);
  assert.deepEqual(worker.storage, {});
});

test('invalid counters restart safely', async () => {
  for (const count of [-1, 20, '19', null, 1.5]) {
    const worker = background({ supportPrompt: { count } });
    assert.equal((await worker.send()).show, false);
    assert.equal(worker.storage.supportPrompt.count, 1);
  }
});

test('Chrome and Safari ship identical support logic and styling', async () => {
  for (const file of ['support-prompt.js', 'support-background.js', 'overlay.css', 'content.js', 'LUCIDE-LICENSE.txt']) {
    assert.equal(
      await readFile(new URL(`./${file}`, import.meta.url), 'utf8'),
      await readFile(new URL(`../platforms/safari/FocusView/FocusView Extension/Resources/src/${file}`, import.meta.url), 'utf8'),
    );
  }
});

test('support card renders bundled branding, concise copy, and explicit actions', async () => {
  const children = [];
  const messages = [];
  const document = {
    activeElement: null,
    body: { append(node) { children.push(node); } },
    createElement(tagName) {
      return {
        tagName, children: [], attributes: {}, listeners: {},
        append(...nodes) { this.children.push(...nodes); },
        prepend(...nodes) { this.children.unshift(...nodes); },
        setAttribute(key, value) { this.attributes[key] = value; },
        addEventListener(type, listener) { this.listeners[type] = listener; },
        close() { this.open = false; },
        showModal() { this.open = true; },
      };
    },
  };
  document.createElementNS = (_, tag) => document.createElement(tag);
  const context = vm.createContext({ document, chrome: { runtime: {
    getURL: path => `chrome-extension://focusview/${path}`,
    getManifest: () => ({ background: { service_worker: 'src/support-background.js' } }),
    sendMessage: async message => { messages.push(message.type); return { show: true }; },
  } } });
  vm.runInContext(await readFile(new URL('./support-prompt.js', import.meta.url), 'utf8'), context);
  await context.YTVTSupport.recordActivation();
  const [dialog] = children;
  assert.equal(dialog.open, true);
  const [close, header, description, actions, footer] = dialog.children;
  const [supported, note] = footer.children;
  const [logo, title] = header.children;
  assert.equal(close.attributes['aria-label'], 'Close');
  assert.equal(logo.src, 'chrome-extension://focusview/icons/icon-48.png');
  assert.equal(logo.alt, '');
  assert.equal(logo.width, 36);
  assert.equal(dialog.attributes['aria-labelledby'], title.id);
  assert.equal(dialog.attributes['aria-describedby'], description.id);
  assert.equal(title.textContent, 'Enjoying FocusView?');
  assert.equal(description.textContent, 'Thanks for watching with FocusView! Your support helps me keep making it better.');
  assert.equal(actions.children[0].textContent, 'Rate FocusView');
  assert.equal(actions.children[1].textContent, 'Buy me a coffee');
  for (const action of actions.children) {
    const [icon] = action.children;
    assert.equal(icon.tagName, 'svg');
    assert.equal(icon.attributes['aria-hidden'], 'true');
    assert.equal(icon.attributes.focusable, 'false');
    assert.equal(icon.attributes.width, '16');
    assert.equal(icon.attributes.height, '16');
    assert.equal(icon.attributes.stroke, 'currentColor');
    assert.ok(icon.children.length > 0);
  }
  assert.notEqual(actions.children[0].children[0].children[0].attributes.d, actions.children[1].children[0].children[0].attributes.d);
  assert.equal(note.tagName, 'button');
  assert.equal(supported.textContent, 'Already supported?');
  assert.equal(note.textContent, 'Don’t remind me again');
  // Repeated responses must not create duplicate dialogs.
  await context.YTVTSupport.recordActivation();
  assert.equal(children.length, 1);
  for (const action of actions.children) {
    action.listeners.click();
    assert.equal(messages.at(-1), 'support:reset');
    assert.equal(dialog.open, false);
  }
  note.listeners.click();
  assert.equal(messages.at(-1), 'support:later');
  assert.equal(dialog.open, false);
});

test('footer progresses from sixty to one hundred and stays one hundred across restarts', async () => {
  let worker = background({ supportPrompt: { count: 7 } });
  for (const interval of [60, 100, 100, 100]) {
    assert.equal((await worker.send('support:later')).show, false);
    assert.equal(worker.storage.supportPrompt.count, 0);
    assert.equal(worker.storage.supportPrompt.interval, interval);
    for (let i = 1; i <= interval * 2 + 3; i++) {
      if (i === 7) worker = background(worker.storage);
      assert.equal((await worker.send()).show, i % interval === 0, `interval ${interval}, activation ${i}`);
    }
  }
  assert.equal(worker.storage.supportPrompt.laterCount, 3);
  assert.equal(worker.storage.supportPrompt.supported, false);
  await worker.send('support:reset');
  worker = background(worker.storage);
  for (let i = 0; i < 120; i++) assert.equal((await worker.send()).show, false);
});

test('sixty and one hundred activation reminders serialize concurrent tabs', async () => {
  const worker = background();
  for (const interval of [60, 100]) {
    await worker.send('support:later');
    const results = await Promise.all(Array.from({ length: interval * 2 + 3 }, () => worker.send()));
    assert.equal(results.filter(result => result.show).length, 2);
    assert.equal(worker.storage.supportPrompt.count, 3);
  }
});

test('rating resets frequency without forgetting the first footer press', async () => {
  let worker = background();
  await worker.send('support:later');
  await worker.send('support:reset');
  worker = background(worker.storage);
  await worker.send('support:later');
  assert.equal(worker.storage.supportPrompt.interval, 100);
});

test('invalid preferences fall back without inferring footer or support clicks', async () => {
  for (const saved of [
    { count: 0, interval: 10 },
    { count: 0, interval: 15 },
    { count: 0, interval: 30 },
    { count: 0, interval: 99, laterCount: -1, supported: 'true' },
    { count: 0, stopped: true },
  ]) {
    const worker = background({ supportPrompt: saved });
    await worker.send();
    assert.equal(worker.storage.supportPrompt.interval, 20);
    assert.equal(worker.storage.supportPrompt.laterCount, 0);
    assert.equal(worker.storage.supportPrompt.supported, false);
  }
});

test('concurrent footer and rating actions retain message order', async () => {
  const worker = background();
  await Promise.all([
    worker.send('support:later'), worker.send('support:reset'), worker.send('support:later'),
  ]);
  assert.equal(worker.storage.supportPrompt.count, 0);
  assert.equal(worker.storage.supportPrompt.interval, 100);
  assert.equal(worker.storage.supportPrompt.laterCount, 2);
});

for (const linkFirst of [true, false]) {
  test(`permanent suppression survives restarts with linkFirst=${linkFirst}`, async () => {
    let worker = background();
    if (linkFirst) await worker.send('support:reset');
    for (let i = 1; i <= 3; i++) {
      await worker.send('support:later');
      worker = background(worker.storage);
      if (i < 3 || !linkFirst) {
        const interval = i === 1 ? 60 : 100;
        for (let j = 1; j <= interval; j++) assert.equal((await worker.send()).show, j === interval);
      }
    }
    if (!linkFirst) await worker.send('support:reset');
    assert.equal(worker.storage.supportPrompt.count, 0);
    assert.equal(worker.storage.supportPrompt.laterCount, 3);
    assert.equal(worker.storage.supportPrompt.supported, true);
    const stopped = structuredClone(worker.storage);
    worker = background(worker.storage);
    for (let i = 0; i < 120; i++) assert.equal((await worker.send()).show, false);
    await worker.send('support:reset');
    await worker.send('support:later');
    assert.deepEqual(worker.storage, stopped);
  });
}

test('concurrent actions reaching both suppression conditions permanently stop reminders', async () => {
  for (const actions of [
    ['support:later', 'support:reset'], ['support:reset', 'support:later'],
  ]) {
    const worker = background({ supportPrompt: { count: 99, interval: 100, laterCount: 2 } });
    await Promise.all(actions.map(action => worker.send(action)));
    for (let i = 0; i < 120; i++) assert.equal((await worker.send()).show, false);
    assert.equal(worker.storage.supportPrompt.count, 0);
    assert.equal(worker.storage.supportPrompt.laterCount, 3);
    assert.equal(worker.storage.supportPrompt.supported, true);
  }
});
