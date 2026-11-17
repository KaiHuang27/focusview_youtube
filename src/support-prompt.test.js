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

test('show on every tenth activation, including after a background restart', async () => {
  let worker = background();
  for (let i = 1; i <= 30; i++) {
    if (i === 7) worker = background(worker.storage);
    assert.equal((await worker.send()).show, i % 10 === 0, `activation ${i}`);
  }
});

test('concurrent tabs share one counter without losing increments', async () => {
  const worker = background();
  const results = await Promise.all(Array.from({ length: 37 }, () => worker.send()));
  assert.equal(results.filter(result => result.show).length, 3);
  assert.equal(worker.storage.supportPrompt.count, 7);
});

test('rating or support permanently stops prompts across restarts', async () => {
  let worker = background({ supportPrompt: { count: 9, stopped: false } });
  await worker.send('support:stop');
  worker = background(worker.storage);
  for (let i = 0; i < 25; i++) assert.equal((await worker.send()).show, false);
  assert.equal(worker.storage.supportPrompt.stopped, true);
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
  for (const count of [-1, 10, '9', null, 1.5]) {
    const worker = background({ supportPrompt: { count } });
    assert.equal((await worker.send()).show, false);
    assert.equal(worker.storage.supportPrompt.count, 1);
  }
});

test('Chrome and Safari ship identical support logic and styling', async () => {
  for (const file of ['support-prompt.js', 'support-background.js', 'overlay.css', 'content.js']) {
    assert.equal(
      await readFile(new URL(`./${file}`, import.meta.url), 'utf8'),
      await readFile(new URL(`../platforms/safari/FocusView/FocusView Extension/Resources/src/${file}`, import.meta.url), 'utf8'),
    );
  }
});
