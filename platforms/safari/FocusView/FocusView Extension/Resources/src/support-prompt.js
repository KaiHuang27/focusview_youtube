(() => {
  const api = globalThis.browser || globalThis.chrome;
  let activeDialog = null;

  function showPrompt() {
    if (activeDialog) return;
    const previousFocus = document.activeElement;
    const dialog = document.createElement('dialog');
    dialog.className = 'ytvt-support';
    dialog.setAttribute('aria-labelledby', 'ytvt-support-title');
    dialog.setAttribute('aria-describedby', 'ytvt-support-description');
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'ytvt-support-close';
    close.setAttribute('aria-label', 'Close');
    close.textContent = '×';
    close.autofocus = true;
    const header = document.createElement('header');
    header.className = 'ytvt-support-header';
    const logo = document.createElement('img');
    logo.src = api.runtime.getURL('icons/icon-48.png');
    logo.alt = '';
    logo.width = 36;
    logo.height = 36;
    const title = document.createElement('h2');
    title.id = 'ytvt-support-title';
    title.textContent = 'Enjoying FocusView?';
    header.append(logo, title);
    const description = document.createElement('p');
    description.id = 'ytvt-support-description';
    description.textContent = 'Thanks for watching with FocusView! Your support helps me keep making it better.';
    const actions = document.createElement('div');
    actions.className = 'ytvt-support-actions';
    const ratingUrl = api.runtime.getManifest().background?.service_worker
      ? 'https://chromewebstore.google.com/detail/jbdndcjclbghkmbiehjigaapembpbgdb/reviews'
      : 'https://apps.apple.com/us/app/focusview-zoom-for-youtube/id6786108302?action=write-review';
    for (const [label, href] of [['Rate FocusView', ratingUrl], ['Buy me a coffee', 'https://ko-fi.com/kodingai']]) {
      const link = document.createElement('a');
      link.textContent = label;
      link.href = href;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.addEventListener('click', () => {
        void api.runtime.sendMessage({ type: 'support:stop' }).catch(() => {});
        dialog.close();
      });
      actions.append(link);
    }
    const note = document.createElement('button');
    note.type = 'button';
    note.className = 'ytvt-support-later';
    note.textContent = 'Already supported';
    note.title = 'Remind me every 20 zoom mode activations';
    note.addEventListener('click', () => {
      void api.runtime.sendMessage({ type: 'support:later' }).catch(() => {});
      dialog.close();
    });
    dialog.append(close, header, description, actions, note);
    close.addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => {
      dialog.remove();
      activeDialog = null;
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    }, { once: true });
    dialog.addEventListener('keydown', event => {
      if (event.key !== 'Tab') return;
      const first = close;
      const last = note;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
    // Keep YouTube shortcuts and player gestures out of the dialog.
    for (const type of ['click', 'pointerdown', 'keydown', 'keyup', 'wheel']) {
      dialog.addEventListener(type, event => event.stopPropagation());
    }
    (document.fullscreenElement || document.body).append(dialog);
    activeDialog = dialog;
    dialog.showModal();
  }

  globalThis.YTVTSupport = {
    isOpen: () => Boolean(activeDialog),
    async recordActivation() {
      try {
        const result = await api.runtime.sendMessage({ type: 'support:activate' });
        if (result?.show) showPrompt();
      } catch {
        // A disabled extension or unavailable storage must never interrupt zoom.
      }
    },
  };
})();
