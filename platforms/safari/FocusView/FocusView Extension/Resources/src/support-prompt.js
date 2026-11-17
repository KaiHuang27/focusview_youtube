(() => {
  const api = globalThis.browser || globalThis.chrome;
  let activeDialog = null;
  // Lucide icons (ISC); see LUCIDE-LICENSE.txt.
  const actionIcons = {
    "star": [
      "M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"
    ],
    "coffee": [
      "M10 2v2",
      "M14 2v2",
      "M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1",
      "M6 2v2"
    ]
  };

  function createActionIcon(paths) {
    const namespace = 'http://www.w3.org/2000/svg';
    const icon = document.createElementNS(namespace, 'svg');
    for (const [name, value] of Object.entries({
      width: '16', height: '16', viewBox: '0 0 24 24', fill: 'none',
      stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round',
      'stroke-linejoin': 'round', 'aria-hidden': 'true', focusable: 'false',
    })) icon.setAttribute(name, value);
    for (const d of paths) {
      const path = document.createElementNS(namespace, 'path');
      path.setAttribute('d', d);
      icon.append(path);
    }
    return icon;
  }

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
    for (const [label, href, icon] of [['Rate FocusView', ratingUrl, 'star'], ['Buy me a coffee', 'https://ko-fi.com/kodingai', 'coffee']]) {
      const link = document.createElement('a');
      link.textContent = label;
      link.prepend(createActionIcon(actionIcons[icon]));
      link.href = href;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.addEventListener('click', () => {
        void api.runtime.sendMessage({ type: 'support:reset' }).catch(() => {});
        dialog.close();
      });
      actions.append(link);
    }
    const footer = document.createElement('div');
    footer.className = 'ytvt-support-footer';
    const supported = document.createElement('span');
    supported.textContent = 'Already supported?';
    const note = document.createElement('button');
    note.type = 'button';
    note.className = 'ytvt-support-later';
    note.textContent = 'Don’t remind me again';
    note.title = 'Remind me every 60 activations, then every 100. Reminders stop after three clicks and a rating or support link click.';
    note.addEventListener('click', () => {
      void api.runtime.sendMessage({ type: 'support:later' }).catch(() => {});
      dialog.close();
    });
    footer.append(supported, note);
    dialog.append(close, header, description, actions, footer);
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
