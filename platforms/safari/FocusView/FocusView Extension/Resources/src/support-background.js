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
      const laterCount = [0, 1, 2, 3].includes(saved?.laterCount) ? saved.laterCount : 0;
      const supported = saved?.supported === true;
      if (laterCount === 3 && supported) return { show: false };
      if (message.type === 'support:reset') {
        await api.storage.local.set({ [key]: { count: 0, interval: 10, laterCount, supported: true } });
        return { show: false };
      }
      if (message.type === 'support:later') {
        const nextLaterCount = Math.min(laterCount + 1, 3);
        await api.storage.local.set({ [key]: {
          count: 0, interval: nextLaterCount === 1 ? 60 : 100, laterCount: nextLaterCount, supported,
        } });
        return { show: false };
      }
      const interval = [10, 20, 60, 100].includes(saved?.interval) ? saved.interval : 20;
      const count = Number.isInteger(saved?.count) && saved.count >= 0 && saved.count < interval
        ? saved.count + 1 : 1;
      const show = count === interval;
      await api.storage.local.set({ [key]: { count: show ? 0 : count, interval, laterCount, supported } });
      return { show };
    }).then(respond, () => respond({ show: false }));
    return true;
  });
})();
