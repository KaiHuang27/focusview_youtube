(function (root) {
  "use strict";

  const DEFAULT_REVIEW_PROMPT_THRESHOLD = 1;
  const LEGACY_REVIEW_PROMPT_THRESHOLD = 10;
  const PREVIOUS_REVIEW_PROMPT_THRESHOLD = 2;
  const DEFAULT_REVIEW_PROMPT_SNOOZE_USES = 5;

  function createReviewPromptState(threshold = DEFAULT_REVIEW_PROMPT_THRESHOLD) {
    return { useCount: 0, nextPromptAt: threshold, status: "active" };
  }

  function normalizeReviewPromptState(value, threshold = DEFAULT_REVIEW_PROMPT_THRESHOLD) {
    if (!value || typeof value !== "object") {
      return createReviewPromptState(threshold);
    }

    const useCount = Number.isInteger(value.useCount) && value.useCount >= 0 ? value.useCount : 0;
    const storedNextPromptAt = Number.isInteger(value.nextPromptAt) && value.nextPromptAt > 0 ? value.nextPromptAt : threshold;
    const status = ["active", "rated", "dismissed"].includes(value.status) ? value.status : "active";
    const shouldMigrateThreshold = storedNextPromptAt === LEGACY_REVIEW_PROMPT_THRESHOLD
      || storedNextPromptAt === PREVIOUS_REVIEW_PROMPT_THRESHOLD;
    const nextPromptAt = status === "active"
      && shouldMigrateThreshold
      && useCount < LEGACY_REVIEW_PROMPT_THRESHOLD
      ? threshold
      : storedNextPromptAt;
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

  function createReviewPromptStore({ key, storageArea = null, pageStorage = null } = {}) {
    let activeStorageArea = storageArea;
    let fallbackState = createReviewPromptState();
    let updateQueue = Promise.resolve();

    function readPageState() {
      try {
        const serialized = pageStorage?.getItem?.(key);
        return serialized ? parseReviewPromptState(serialized) : null;
      } catch {
        return null;
      }
    }

    async function read() {
      if (activeStorageArea?.get) {
        try {
          const stored = await activeStorageArea.get(key);
          const value = stored?.[key];
          if (value !== undefined && value !== null) {
            fallbackState = typeof value === "string"
              ? parseReviewPromptState(value)
              : normalizeReviewPromptState(value);
            return fallbackState;
          }
        } catch {
          activeStorageArea = null;
        }
      }

      fallbackState = readPageState() || fallbackState;
      return fallbackState;
    }

    async function write(state) {
      fallbackState = normalizeReviewPromptState(state);
      const serialized = JSON.stringify(fallbackState);
      try {
        pageStorage?.setItem?.(key, serialized);
      } catch {
        // The in-memory state remains available for this page.
      }
      if (activeStorageArea?.set) {
        try {
          await activeStorageArea.set({ [key]: serialized });
        } catch {
          activeStorageArea = null;
        }
      }
      return fallbackState;
    }

    function update(transform) {
      const operation = updateQueue.then(async () => write(transform(await read())));
      updateQueue = operation.catch(() => fallbackState);
      return operation;
    }

    return { read, update, write };
  }

  root.YTVTReviewPrompt = {
    DEFAULT_REVIEW_PROMPT_SNOOZE_USES,
    DEFAULT_REVIEW_PROMPT_THRESHOLD,
    completeReviewPrompt,
    createReviewPromptStore,
    createReviewPromptState,
    normalizeReviewPromptState,
    parseReviewPromptState,
    recordReviewPromptUse,
    shouldShowReviewPrompt,
    snoozeReviewPrompt,
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
