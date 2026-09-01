(function (root) {
  "use strict";

  const DEFAULT_REVIEW_PROMPT_THRESHOLD = 3;

  function createReviewPromptState() {
    return { meaningfulUseCount: 0, status: "active" };
  }

  function normalizeReviewPromptState(value) {
    if (!value || typeof value !== "object") {
      return createReviewPromptState();
    }

    const meaningfulUseCount = Number.isInteger(value.meaningfulUseCount) && value.meaningfulUseCount >= 0
      ? value.meaningfulUseCount
      : 0;
    const status = ["active", "prompted", "rated", "dismissed"].includes(value.status)
      ? value.status
      : "active";
    return { meaningfulUseCount, status };
  }

  function parseReviewPromptState(serialized) {
    if (!serialized) {
      return createReviewPromptState();
    }
    try {
      return normalizeReviewPromptState(JSON.parse(serialized));
    } catch {
      return createReviewPromptState();
    }
  }

  function recordMeaningfulReviewUse(state) {
    const current = normalizeReviewPromptState(state);
    return current.status === "active"
      ? { ...current, meaningfulUseCount: current.meaningfulUseCount + 1 }
      : current;
  }

  function shouldShowReviewPrompt(state) {
    const current = normalizeReviewPromptState(state);
    return current.status === "active" && current.meaningfulUseCount >= DEFAULT_REVIEW_PROMPT_THRESHOLD;
  }

  function markReviewPromptShown(state) {
    const current = normalizeReviewPromptState(state);
    return shouldShowReviewPrompt(current) ? { ...current, status: "prompted" } : current;
  }

  function completeReviewPrompt(state, status) {
    const current = normalizeReviewPromptState(state);
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

    function clearPageState() {
      try {
        pageStorage?.removeItem?.(key);
      } catch {
        // Legacy page storage is best-effort migration input only.
      }
    }

    async function write(state, { shouldClearPageState = false } = {}) {
      fallbackState = normalizeReviewPromptState(state);
      if (activeStorageArea?.set) {
        try {
          await activeStorageArea.set({ [key]: fallbackState });
          if (shouldClearPageState) {
            clearPageState();
          }
        } catch {
          activeStorageArea = null;
        }
      }
      return fallbackState;
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

      const pageState = readPageState();
      if (pageState) {
        return write(pageState, { shouldClearPageState: true });
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
    DEFAULT_REVIEW_PROMPT_THRESHOLD,
    completeReviewPrompt,
    createReviewPromptStore,
    createReviewPromptState,
    markReviewPromptShown,
    normalizeReviewPromptState,
    parseReviewPromptState,
    recordMeaningfulReviewUse,
    shouldShowReviewPrompt,
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
