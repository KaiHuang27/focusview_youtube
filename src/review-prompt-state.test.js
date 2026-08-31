import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

await import("./review-prompt-state.js");

const {
  DEFAULT_REVIEW_PROMPT_SNOOZE_USES,
  DEFAULT_REVIEW_PROMPT_THRESHOLD,
  completeReviewPrompt,
  createReviewPromptState,
  parseReviewPromptState,
  recordReviewPromptUse,
  shouldShowReviewPrompt,
  snoozeReviewPrompt,
} = globalThis.YTVTReviewPrompt;

test("review prompt starts after two Zoom mode activations", () => {
  let state = createReviewPromptState();

  assert.equal(DEFAULT_REVIEW_PROMPT_THRESHOLD, 2);
  assert.equal(shouldShowReviewPrompt(state), false);

  state = recordReviewPromptUse(state);
  assert.equal(state.useCount, 1);
  assert.equal(shouldShowReviewPrompt(state), false);

  state = recordReviewPromptUse(state);
  assert.equal(state.useCount, 2);
  assert.equal(shouldShowReviewPrompt(state), true);
});

test("active states migrate from the old ten-use threshold", () => {
  const migrated = parseReviewPromptState(JSON.stringify({ useCount: 1, nextPromptAt: 10, status: "active" }));
  const snoozed = parseReviewPromptState(JSON.stringify({ useCount: 10, nextPromptAt: 15, status: "active" }));
  const dismissed = parseReviewPromptState(JSON.stringify({ useCount: 1, nextPromptAt: 10, status: "dismissed" }));

  assert.deepEqual(migrated, { useCount: 1, nextPromptAt: 2, status: "active" });
  assert.equal(shouldShowReviewPrompt(recordReviewPromptUse(migrated)), true);
  assert.deepEqual(snoozed, { useCount: 10, nextPromptAt: 15, status: "active" });
  assert.deepEqual(dismissed, { useCount: 1, nextPromptAt: 10, status: "dismissed" });
});

test("Maybe Later snoozes the prompt for five more uses", () => {
  let state = createReviewPromptState();
  for (let use = 0; use < DEFAULT_REVIEW_PROMPT_THRESHOLD; use += 1) {
    state = recordReviewPromptUse(state);
  }

  state = snoozeReviewPrompt(state);
  assert.equal(DEFAULT_REVIEW_PROMPT_SNOOZE_USES, 5);
  assert.equal(state.nextPromptAt, 7);
  assert.equal(shouldShowReviewPrompt(state), false);

  for (let use = 0; use < 5; use += 1) {
    state = recordReviewPromptUse(state);
  }
  assert.equal(shouldShowReviewPrompt(state), true);
});

test("rated and dismissed states never count or prompt again", () => {
  const eligible = { useCount: 2, nextPromptAt: 2, status: "active" };

  for (const status of ["rated", "dismissed"]) {
    const completed = completeReviewPrompt(eligible, status);
    assert.equal(completed.status, status);
    assert.deepEqual(recordReviewPromptUse(completed), completed);
    assert.equal(shouldShowReviewPrompt(completed), false);
  }
});

test("invalid persisted state safely resets to defaults", () => {
  assert.deepEqual(parseReviewPromptState("{bad json"), createReviewPromptState());
  assert.deepEqual(
    parseReviewPromptState(JSON.stringify({ useCount: -1, nextPromptAt: 0, status: "unknown" })),
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
