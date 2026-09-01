import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

await import("./review-prompt-state.js");

const {
  DEFAULT_REVIEW_PROMPT_THRESHOLD,
  completeReviewPrompt,
  createReviewPromptStore,
  createReviewPromptState,
  markReviewPromptShown,
  parseReviewPromptState,
  recordMeaningfulReviewUse,
  shouldShowReviewPrompt,
} = globalThis.YTVTReviewPrompt;

test("review prompt becomes eligible after three meaningful uses", () => {
  let state = createReviewPromptState();

  assert.equal(DEFAULT_REVIEW_PROMPT_THRESHOLD, 3);
  for (let use = 1; use <= DEFAULT_REVIEW_PROMPT_THRESHOLD; use += 1) {
    state = recordMeaningfulReviewUse(state);
    assert.equal(state.meaningfulUseCount, use);
    assert.equal(shouldShowReviewPrompt(state), use === DEFAULT_REVIEW_PROMPT_THRESHOLD);
  }
});

test("legacy activation counts reset while terminal decisions are preserved", () => {
  assert.deepEqual(
    parseReviewPromptState(JSON.stringify({ useCount: 10, nextPromptAt: 10, status: "active" })),
    createReviewPromptState()
  );
  assert.deepEqual(
    parseReviewPromptState(JSON.stringify({ useCount: 1, nextPromptAt: 1, status: "rated" })),
    { meaningfulUseCount: 0, status: "rated" }
  );
});

test("review store migrates page state once and writes only extension storage", async () => {
  const key = "review-state";
  const extensionData = {};
  const pageData = new Map([[key, JSON.stringify({ meaningfulUseCount: 2, status: "active" })]]);
  const store = createReviewPromptStore({
    key,
    storageArea: {
      async get(requestedKey) {
        return requestedKey in extensionData ? { [requestedKey]: extensionData[requestedKey] } : {};
      },
      async set(entries) {
        Object.assign(extensionData, entries);
      },
    },
    pageStorage: {
      getItem: (requestedKey) => pageData.get(requestedKey) || null,
      removeItem: (requestedKey) => pageData.delete(requestedKey),
    },
  });

  const nextState = await store.update(recordMeaningfulReviewUse);

  assert.deepEqual(nextState, { meaningfulUseCount: 3, status: "active" });
  assert.deepEqual(extensionData[key], nextState);
  assert.equal(pageData.has(key), false);
});

test("review store serializes updates with unavailable browser storage", async () => {
  const unavailableStorage = {
    getItem() {
      throw new Error("unavailable");
    },
    setItem() {
      throw new Error("unavailable");
    },
  };
  const store = createReviewPromptStore({
    key: "review-state",
    storageArea: {
      async get() {
        throw new Error("unavailable");
      },
      async set() {
        throw new Error("unavailable");
      },
    },
    pageStorage: unavailableStorage,
  });

  const [firstState, secondState] = await Promise.all([
    store.update(recordMeaningfulReviewUse),
    store.update(recordMeaningfulReviewUse),
  ]);

  assert.equal(firstState.meaningfulUseCount, 1);
  assert.equal(shouldShowReviewPrompt(firstState), false);
  assert.equal(secondState.meaningfulUseCount, 2);
  assert.equal(shouldShowReviewPrompt(secondState), false);
});

test("legacy page state remains recoverable when extension migration fails", async () => {
  const key = "review-state";
  const serialized = JSON.stringify({ meaningfulUseCount: 2, status: "active" });
  const pageData = new Map([[key, serialized]]);
  const store = createReviewPromptStore({
    key,
    storageArea: {
      async get() {
        return {};
      },
      async set() {
        throw new Error("unavailable");
      },
    },
    pageStorage: {
      getItem: (requestedKey) => pageData.get(requestedKey) || null,
      removeItem: (requestedKey) => pageData.delete(requestedKey),
    },
  });

  assert.deepEqual(await store.read(), { meaningfulUseCount: 2, status: "active" });
  assert.equal(pageData.get(key), serialized);
});

test("shown, rated, and dismissed states never count or prompt again", () => {
  let state = createReviewPromptState();
  for (let use = 0; use < DEFAULT_REVIEW_PROMPT_THRESHOLD; use += 1) {
    state = recordMeaningfulReviewUse(state);
  }

  state = markReviewPromptShown(state);
  assert.equal(state.status, "prompted");
  assert.equal(shouldShowReviewPrompt(state), false);
  assert.deepEqual(recordMeaningfulReviewUse(state), state);

  for (const status of ["rated", "dismissed"]) {
    const completed = completeReviewPrompt(state, status);
    assert.equal(completed.status, status);
    assert.deepEqual(recordMeaningfulReviewUse(completed), completed);
    assert.equal(shouldShowReviewPrompt(completed), false);
  }
});

test("invalid persisted state safely resets to defaults", () => {
  assert.deepEqual(parseReviewPromptState("{bad json"), createReviewPromptState());
  assert.deepEqual(
    parseReviewPromptState(JSON.stringify({ meaningfulUseCount: -1, status: "unknown" })),
    createReviewPromptState()
  );
});

test("Chrome and Safari ship the same review state logic", async () => {
  const chromeSource = await readFile(new URL("./review-prompt-state.js", import.meta.url), "utf8");
  const safariSource = await readFile(
    new URL("../platforms/safari/FocusView/FocusView Extension/Resources/src/review-prompt-state.js", import.meta.url),
    "utf8"
  );

  assert.equal(safariSource, chromeSource);
});
