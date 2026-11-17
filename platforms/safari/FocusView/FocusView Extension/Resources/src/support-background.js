(() => {
  const api = globalThis.browser || globalThis.chrome;
  const key = "supportPrompt";
  let pending = Promise.resolve();

  api.runtime.onMessage.addListener((message, sender, respond) => {
    if (!['support:activate', 'support:reset', 'support:later'].includes(message?.type)
      || sender.id !== api.runtime.id) return;

    // Serialize updates from all YouTube tabs to avoid losing activations.
    pending = pending.then(async () => {
      const saved = (await api.storage.local.get(key))[key];
      // Preserve footer presses even when a rating/support click resets the interval.
      const laterCount = [0, 1, 2].includes(saved?.laterCount) ? saved.laterCount
        : saved?.interval === 30 ? 2 : [15, 20].includes(saved?.interval) ? 1 : 0;
      if (message.type === 'support:reset') {
        await api.storage.local.set({ [key]: { count: 0, interval: 10, laterCount } });
        return { show: false };
      }
      if (message.type === 'support:later') {
        const nextLaterCount = Math.min(laterCount + 1, 2);
        await api.storage.local.set({ [key]: {
          count: 0, interval: nextLaterCount === 1 ? 15 : 30, laterCount: nextLaterCount,
        } });
        return { show: false };
      }
      // Legacy 20-use reminders become the first 15-use tier; stopped flags expire.
      const interval = saved?.stopped ? 10
        : [15, 30].includes(saved?.interval) ? saved.interval : saved?.interval === 20 ? 15 : 10;
      const count = Number.isInteger(saved?.count) && saved.count >= 0 && saved.count < interval
        ? saved.count + 1 : 1;
      const show = count === interval;
      await api.storage.local.set({ [key]: { count: show ? 0 : count, interval, laterCount } });
      return { show };
    }).then(respond, () => respond({ show: false }));
    return true;
  });
})();
