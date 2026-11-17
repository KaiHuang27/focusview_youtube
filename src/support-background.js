(() => {
  const api = globalThis.browser || globalThis.chrome;
  const key = "supportPrompt";
  let pending = Promise.resolve();

  api.runtime.onMessage.addListener((message, sender, respond) => {
    if (!['support:activate', 'support:stop'].includes(message?.type)
      || sender.id !== api.runtime.id) return;

    // Serialize updates from all YouTube tabs to avoid losing activations.
    pending = pending.then(async () => {
      const saved = (await api.storage.local.get(key))[key];
      if (saved?.stopped) return { show: false };
      if (message.type === 'support:stop') {
        await api.storage.local.set({ [key]: { count: 0, stopped: true } });
        return { show: false };
      }
      const count = Number.isInteger(saved?.count) && saved.count >= 0 && saved.count < 10
        ? saved.count + 1 : 1;
      const show = count === 10;
      await api.storage.local.set({ [key]: { count: show ? 0 : count, stopped: false } });
      return { show };
    }).then(respond, () => respond({ show: false }));
    return true;
  });
})();
