(() => {
  const api = globalThis.browser || globalThis.chrome;
  const key = "supportPrompt";
  let pending = Promise.resolve();

  api.runtime.onMessage.addListener((message, sender, respond) => {
    if (!['support:activate', 'support:stop', 'support:later'].includes(message?.type)
      || sender.id !== api.runtime.id) return;

    // Serialize updates from all YouTube tabs to avoid losing activations.
    pending = pending.then(async () => {
      const saved = (await api.storage.local.get(key))[key];
      if (saved?.stopped) return { show: false };
      if (message.type === 'support:stop') {
        await api.storage.local.set({ [key]: { count: 0, stopped: true } });
        return { show: false };
      }
      if (message.type === 'support:later') {
        await api.storage.local.set({ [key]: { count: 0, stopped: false, interval: 20 } });
        return { show: false };
      }
      const interval = saved?.interval === 20 ? 20 : 10;
      const count = Number.isInteger(saved?.count) && saved.count >= 0 && saved.count < interval
        ? saved.count + 1 : 1;
      const show = count === interval;
      await api.storage.local.set({ [key]: { count: show ? 0 : count, stopped: false, interval } });
      return { show };
    }).then(respond, () => respond({ show: false }));
    return true;
  });
})();
