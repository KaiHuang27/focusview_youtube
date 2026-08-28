(function (root) {
  "use strict";

  const DEFAULT_REVIEW_PROMPT_THRESHOLD = 5;
  const DEFAULT_REVIEW_PROMPT_SNOOZE_USES = 5;
  const DEFAULT_REVIEW_PROMPT_MIN_USE_MS = 3000;

  function createReviewPromptState(threshold = DEFAULT_REVIEW_PROMPT_THRESHOLD) {
    return { useCount: 0, nextPromptAt: threshold, status: "active" };
  }

  function normalizeReviewPromptState(value, threshold = DEFAULT_REVIEW_PROMPT_THRESHOLD) {
    if (!value || typeof value !== "object") {
      return createReviewPromptState(threshold);
    }

    const useCount = Number.isInteger(value.useCount) && value.useCount >= 0 ? value.useCount : 0;
    const nextPromptAt = Number.isInteger(value.nextPromptAt) && value.nextPromptAt > 0 ? value.nextPromptAt : threshold;
    const status = ["active", "rated", "dismissed"].includes(value.status) ? value.status : "active";
    return { useCount, nextPromptAt, status };
  }

  function parseReviewPromptState(serialized, threshold = DEFAULT_REVIEW_PROMPT_THRESHOLD) {
    if (!serialized) {
      return createReviewPromptState(threshold);
    }
    try {
      return normalizeReviewPromptState(JSON.parse(serialized), threshold);
    } catch {
      return createReviewPromptState(threshold);
    }
  }

  function recordReviewPromptUse(state, threshold = DEFAULT_REVIEW_PROMPT_THRESHOLD) {
    const current = normalizeReviewPromptState(state, threshold);
    return current.status === "active" ? { ...current, useCount: current.useCount + 1 } : current;
  }

  function shouldRecordReviewPromptUse({ startedAt, endedAt, playbackTime }, minimumUseMs = DEFAULT_REVIEW_PROMPT_MIN_USE_MS) {
    return Number.isFinite(startedAt)
      && Number.isFinite(endedAt)
      && endedAt - startedAt >= minimumUseMs
      && Number.isFinite(playbackTime)
      && playbackTime > 0;
  }

  function shouldShowReviewPrompt(state, threshold = DEFAULT_REVIEW_PROMPT_THRESHOLD) {
    const current = normalizeReviewPromptState(state, threshold);
    return current.status === "active" && current.useCount >= current.nextPromptAt;
  }

  function snoozeReviewPrompt(state, snoozeUses = DEFAULT_REVIEW_PROMPT_SNOOZE_USES, threshold = DEFAULT_REVIEW_PROMPT_THRESHOLD) {
    const current = normalizeReviewPromptState(state, threshold);
    const safeSnoozeUses = Number.isInteger(snoozeUses) && snoozeUses > 0 ? snoozeUses : DEFAULT_REVIEW_PROMPT_SNOOZE_USES;
    return { ...current, nextPromptAt: current.useCount + safeSnoozeUses, status: "active" };
  }

  function completeReviewPrompt(state, status, threshold = DEFAULT_REVIEW_PROMPT_THRESHOLD) {
    const current = normalizeReviewPromptState(state, threshold);
    return { ...current, status: status === "rated" ? "rated" : "dismissed" };
  }

  root.YTVTReviewPrompt = {
    DEFAULT_REVIEW_PROMPT_MIN_USE_MS,
    DEFAULT_REVIEW_PROMPT_SNOOZE_USES,
    DEFAULT_REVIEW_PROMPT_THRESHOLD,
    completeReviewPrompt,
    createReviewPromptState,
    normalizeReviewPromptState,
    parseReviewPromptState,
    recordReviewPromptUse,
    shouldRecordReviewPromptUse,
    shouldShowReviewPrompt,
    snoozeReviewPrompt,
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
