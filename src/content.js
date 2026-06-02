const ROTATIONS = [0, 90, 180, 270];
const TOOLBAR_SELECTOR = '[data-ytvt-toolbar="true"]';
const TRANSFORM_STYLE_ID = "ytvt-transform-style";
const TRANSFORM_SELECTOR = "video.html5-main-video";
const {
  applyZoomDelta,
  clampPanStateToViewport,
  createViewportIndicator,
  createViewportCenteredZoomState,
  createViewportOverlayLayout,
  createViewportMapSize,
  createTransformMenuTop,
  createDefaultState,
  createImportantTransformCssText,
  formatZoomPercent,
  getViewportControlsActivityAfterPanToggle,
  getZoomFromPointerPosition,
  parseZoomPercentInput,
  shouldBlockYouTubeShortcutForZoomInput,
  shouldInterceptPanWheel,
  shouldRenderMenuOnToolbarEnsure,
  shouldRenderToolbarOnEnsure,
  shouldReapplyTransformAfterMutation,
  shouldResetForVideoKey,
  shouldStartPanDrag,
  shouldShowZoomTriggerActive,
  shouldShowZoomTriggerText,
  shouldShowTransientViewportControls,
  shouldSuppressClickAfterPanEnd,
  shouldTogglePanShortcut,
  toggleMirrorState,
} = globalThis.YTVTTransform;
const VIEWPORT_CONTROLS_HIDE_DELAY_MS = 3000;
const PAN_LONG_PRESS_MS = 220;
const PAN_MOVE_THRESHOLD_PX = 6;

let state = createDefaultState();
let video = null;
let player = null;
let wheelTarget = null;
let toolbar = null;
let viewportMap = null;
let settingsButton = null;
let transformMenu = null;
let resizeObserver = null;
let videoStyleObserver = null;
let reapplyFrame = 0;
let currentVideoKey = "";
let dragStart = null;
let panLongPressTimer = 0;
let suppressNextVideoClick = false;
let suppressVideoClickTimer = 0;
let viewportControlsLastActivityAt = 0;
let viewportControlsHideTimer = 0;
let isMenuOpen = false;
let lastTransformCssText = "";

function getTransformStyleElement() {
  let styleElement = document.getElementById(TRANSFORM_STYLE_ID);
  if (!styleElement) {
    styleElement = document.createElement("style");
    styleElement.id = TRANSFORM_STYLE_ID;
    document.documentElement.append(styleElement);
  }

  return styleElement;
}

function updateTransformRule() {
  if (!video) {
    return;
  }

  let cssText = "";
  if (shouldReapplyTransformAfterMutation(state)) {
    const { sourceWidth, sourceHeight, viewportWidth, viewportHeight } = getViewportGeometry();
    cssText = `${TRANSFORM_SELECTOR} { ${createImportantTransformCssText(state, sourceWidth, sourceHeight, viewportWidth, viewportHeight)} }`;
  }

  if (cssText === lastTransformCssText) {
    return;
  }

  if (cssText) {
    getTransformStyleElement().textContent = cssText;
  } else {
    clearTransformRule();
  }
  lastTransformCssText = cssText;
}

function clearTransformRule() {
  const styleElement = document.getElementById(TRANSFORM_STYLE_ID);
  if (styleElement?.textContent) {
    styleElement.textContent = "";
  }
  lastTransformCssText = "";
}

function resetState() {
  state = createDefaultState();
  isMenuOpen = false;
  renderToolbar();
  applyTransform();
}

function getVideoKey() {
  return new URLSearchParams(window.location.search).get("v") || window.location.pathname;
}

function isWatchPage() {
  return window.location.pathname === "/watch";
}

function findPlayer() {
  return findVideo()?.closest(".html5-video-player") || document.querySelector(".html5-video-player");
}

function findVideo() {
  return document.querySelector("video.html5-main-video");
}

function findControlsHost() {
  return player?.querySelector(".ytp-right-controls") || null;
}

function getViewportGeometry() {
  return {
    sourceWidth: video?.videoWidth || video?.clientWidth || 0,
    sourceHeight: video?.videoHeight || video?.clientHeight || 0,
    viewportWidth: player?.clientWidth || video?.clientWidth || 0,
    viewportHeight: player?.clientHeight || video?.clientHeight || 0,
  };
}

function clampCurrentPanState() {
  const { sourceWidth, sourceHeight, viewportWidth, viewportHeight } = getViewportGeometry();
  state = clampPanStateToViewport(state, sourceWidth, sourceHeight, viewportWidth, viewportHeight);
}

function blockYouTubeWheel(event) {
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation?.();
}

function applyTransform() {
  if (!video) {
    return;
  }

  clampCurrentPanState();
  updateTransformRule();
  const cursor = state.panMode ? "grab" : "";
  if (video.style.cursor !== cursor) {
    video.style.cursor = cursor;
  }
  renderViewportMap();
}

function scheduleTransformReapply(frames = 6) {
  if (!shouldReapplyTransformAfterMutation(state) || reapplyFrame) {
    return;
  }

  sync();
  let remainingFrames = frames;
  const reapply = () => {
    reapplyFrame = 0;
    applyTransform();
    remainingFrames -= 1;
    if (remainingFrames > 0) {
      reapplyFrame = requestAnimationFrame(reapply);
    }
  };

  reapplyFrame = requestAnimationFrame(reapply);
}

function clearTransform() {
  if (video) {
    clearTransformRule();
    video.style.transform = "";
    video.style.transformOrigin = "";
    video.style.cursor = "";
  }

  clearOverlayElements();
  cancelPanGesture();
  clearClickSuppression();
}

function clearOverlayElements() {
  viewportMap?.remove();
  viewportMap = null;
  settingsButton?.remove();
  settingsButton = null;
  transformMenu?.remove();
  transformMenu = null;
  clearTimeout(viewportControlsHideTimer);
  viewportControlsHideTimer = 0;
  viewportControlsLastActivityAt = 0;
}

function clearClickSuppression() {
  clearTimeout(suppressVideoClickTimer);
  suppressVideoClickTimer = 0;
  suppressNextVideoClick = false;
}

function areViewportControlsVisible() {
  return shouldShowTransientViewportControls({
    isPanMode: state.panMode,
    isMenuOpen,
    isDragging: Boolean(dragStart?.isDragging),
    lastActivityAt: viewportControlsLastActivityAt,
    now: Date.now(),
    delayMs: VIEWPORT_CONTROLS_HIDE_DELAY_MS,
  });
}

function clearPanLongPressTimer() {
  clearTimeout(panLongPressTimer);
  panLongPressTimer = 0;
}

function cancelPanGesture() {
  clearPanLongPressTimer();
  dragStart = null;
}

function suppressUpcomingVideoClick() {
  suppressNextVideoClick = true;
  clearTimeout(suppressVideoClickTimer);
  suppressVideoClickTimer = setTimeout(() => {
    suppressNextVideoClick = false;
    suppressVideoClickTimer = 0;
  }, 500);
}

function scheduleViewportControlsHide() {
  clearTimeout(viewportControlsHideTimer);
  viewportControlsHideTimer = setTimeout(() => {
    viewportControlsHideTimer = 0;
    renderViewportMap();
  }, VIEWPORT_CONTROLS_HIDE_DELAY_MS);
}

function markViewportControlsActivity() {
  viewportControlsLastActivityAt = Date.now();
  renderViewportMap();
  scheduleViewportControlsHide();
}

function startPanDrag() {
  if (!dragStart?.video) {
    return;
  }

  dragStart.isDragging = true;
  if (!dragStart.video.hasPointerCapture?.(dragStart.pointerId)) {
    dragStart.video.setPointerCapture(dragStart.pointerId);
  }
  dragStart.video.style.cursor = "grabbing";
  markViewportControlsActivity();
}

function renderViewportMap() {
  if (!player || !video) {
    return;
  }

  const shouldShowControls = areViewportControlsVisible();
  if (!shouldShowControls) {
    if (viewportMap) {
      viewportMap.hidden = true;
    }
    if (settingsButton) {
      settingsButton.hidden = true;
    }
    return;
  }

  if (!viewportMap) {
    viewportMap = document.createElement("div");
    viewportMap.className = "ytvt-map";
    viewportMap.setAttribute("aria-label", "Source map and viewport indicator");
    viewportMap.innerHTML = '<div class="ytvt-viewport-indicator"></div>';
    player.append(viewportMap);
  } else if (viewportMap.parentElement !== player) {
    player.append(viewportMap);
  }

  if (!settingsButton) {
    settingsButton = document.createElement("button");
    settingsButton.type = "button";
    settingsButton.className = "ytvt-settings";
    settingsButton.title = "Zoom settings";
    settingsButton.setAttribute("aria-label", "Zoom settings");
    settingsButton.innerHTML = `
      <svg class="ytvt-settings-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M19.4 13.5c.1-.5.1-1 .1-1.5s0-1-.1-1.5l2-1.5-2-3.4-2.4 1a7.4 7.4 0 0 0-2.6-1.5L14 2.5h-4l-.4 2.6A7.4 7.4 0 0 0 7 6.6l-2.4-1-2 3.4 2 1.5A8.8 8.8 0 0 0 4.5 12c0 .5 0 1 .1 1.5l-2 1.5 2 3.4 2.4-1a7.4 7.4 0 0 0 2.6 1.5l.4 2.6h4l.4-2.6a7.4 7.4 0 0 0 2.6-1.5l2.4 1 2-3.4-2-1.5Z"></path>
        <circle cx="12" cy="12" r="3.2"></circle>
      </svg>
    `;
    settingsButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      isMenuOpen = !isMenuOpen;
      viewportControlsLastActivityAt = Date.now();
      scheduleViewportControlsHide();
      renderToolbar();
      renderViewportMap();
    });
    player.append(settingsButton);
  } else if (settingsButton.parentElement !== player) {
    player.append(settingsButton);
  }

  settingsButton.classList.toggle("is-active", isMenuOpen);
  settingsButton.setAttribute("aria-expanded", String(isMenuOpen));

  const { sourceWidth, sourceHeight, viewportWidth, viewportHeight } = getViewportGeometry();
  const mapSize = createViewportMapSize(sourceWidth, sourceHeight, state.rotation);
  const indicator = createViewportIndicator(state, sourceWidth, sourceHeight, viewportWidth, viewportHeight);
  const anchorIndicator = createViewportIndicator(
    { ...state, zoom: 100, panX: 0, panY: 0 },
    sourceWidth,
    sourceHeight,
    viewportWidth,
    viewportHeight
  );
  const overlayLayout = createViewportOverlayLayout({ mapSize, indicator, anchorIndicator });
  const indicatorElement = viewportMap.querySelector(".ytvt-viewport-indicator");
  viewportMap.style.top = `${overlayLayout.mapTop}px`;
  viewportMap.style.right = `${overlayLayout.mapRight}px`;
  viewportMap.style.width = `${mapSize.width}px`;
  viewportMap.style.height = `${mapSize.height}px`;
  settingsButton.style.top = `${overlayLayout.settingsTop}px`;
  settingsButton.style.right = `${overlayLayout.settingsRight}px`;
  positionTransformMenu();
  indicatorElement.style.left = `${indicator.x * 100}%`;
  indicatorElement.style.top = `${indicator.y * 100}%`;
  indicatorElement.style.width = `${indicator.width * 100}%`;
  indicatorElement.style.height = `${indicator.height * 100}%`;
  viewportMap.hidden = !shouldShowControls;
  settingsButton.hidden = !shouldShowControls;
}

function positionTransformMenu() {
  if (!player || !settingsButton || !transformMenu) {
    return;
  }

  const menuTop = createTransformMenuTop({
    settingsTop: settingsButton.offsetTop,
    settingsButtonHeight: settingsButton.offsetHeight,
  });
  transformMenu.style.top = `${menuTop}px`;
}

function syncSettingsButtonState() {
  if (!settingsButton) {
    return;
  }

  settingsButton.classList.toggle("is-active", isMenuOpen);
  settingsButton.setAttribute("aria-expanded", String(isMenuOpen));
}

function blockMenuEvent(event) {
  event.stopPropagation();
}

function createButton(label, title, active, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = active ? "ytvt-button is-active" : "ytvt-button";
  button.textContent = label;
  button.title = title;
  button.addEventListener("click", onClick);
  return button;
}

function createSegment(value) {
  return createButton(
    `${value}`,
    `Rotate ${value} degrees`,
    state.rotation === value,
    () => {
      state.rotation = value;
      renderToolbar();
      applyTransform();
    }
  );
}

function getSliderProgress() {
  return `${((state.zoom - 100) / 400) * 100}%`;
}

function setZoom(zoom, shouldRender = true) {
  if (!video) {
    return;
  }

  state = createViewportCenteredZoomState(state, zoom);
  clampCurrentPanState();
  if (shouldRender) {
    renderToolbar();
  }
  applyTransform();
}

function createZoomPanel() {
  const panel = document.createElement("div");
  panel.className = "ytvt-zoom-panel";
  let isSliderDragging = false;
  let activeSliderPointerId = null;
  let ignoreSliderMouseUpUntil = 0;

  const value = document.createElement("input");
  value.className = "ytvt-zoom-value";
  value.type = "text";
  value.inputMode = "numeric";
  value.autocomplete = "off";
  value.spellcheck = false;
  value.value = formatZoomPercent(state.zoom);
  value.setAttribute("aria-label", "Zoom percentage");

  const syncZoomControls = () => {
    const progress = getSliderProgress();
    sliderFill.style.width = progress;
    sliderThumb.style.left = progress;
    sliderHitArea.setAttribute("aria-valuenow", String(state.zoom));
    sliderHitArea.setAttribute("aria-valuetext", formatZoomPercent(state.zoom));
    if (document.activeElement !== value) {
      value.value = formatZoomPercent(state.zoom);
    }

    const triggerLabel = toolbar.querySelector(".ytvt-trigger-label");
    if (triggerLabel) {
      triggerLabel.textContent = `${state.zoom}%`;
    }
  };

  const commitZoomInput = () => {
    setZoom(parseZoomPercentInput(value.value, state.zoom), false);
    value.value = formatZoomPercent(state.zoom);
    syncZoomControls();
  };

  value.addEventListener("change", commitZoomInput);
  value.addEventListener("blur", commitZoomInput);
  value.addEventListener("keydown", (event) => {
    event.stopPropagation();
    if (event.key === "Enter") {
      event.preventDefault();
      commitZoomInput();
      value.blur();
    }
  });
  value.addEventListener("pointerdown", (event) => event.stopPropagation());
  value.addEventListener("click", (event) => {
    event.stopPropagation();
    value.select();
  });

  const controls = document.createElement("div");
  controls.className = "ytvt-zoom-controls";

  const zoomOut = document.createElement("button");
  zoomOut.type = "button";
  zoomOut.className = "ytvt-zoom-step";
  zoomOut.textContent = "-";
  zoomOut.title = "Zoom out";
  zoomOut.setAttribute("aria-label", "Zoom out");
  zoomOut.addEventListener("click", () => setZoom(state.zoom - 5));

  const sliderHitArea = document.createElement("div");
  sliderHitArea.className = "ytvt-slider-hit-area";
  sliderHitArea.setAttribute("role", "slider");
  sliderHitArea.setAttribute("aria-label", "Zoom");
  sliderHitArea.setAttribute("aria-valuemin", "100");
  sliderHitArea.setAttribute("aria-valuemax", "500");

  const sliderTrack = document.createElement("div");
  sliderTrack.className = "ytvt-slider-track";

  const sliderFill = document.createElement("div");
  sliderFill.className = "ytvt-slider-fill";
  sliderFill.style.width = getSliderProgress();

  const sliderThumb = document.createElement("div");
  sliderThumb.className = "ytvt-slider-thumb";
  sliderThumb.style.left = getSliderProgress();

  sliderTrack.append(sliderFill, sliderThumb);
  sliderHitArea.append(sliderTrack);

  const updateZoomFromPointer = (event) => {
    setZoom(getZoomFromPointerPosition(sliderHitArea.getBoundingClientRect(), event.clientX, state.zoom), false);
    syncZoomControls();
  };

  const onSliderMouseMove = (event) => {
    if (!isSliderDragging || activeSliderPointerId !== null) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    updateZoomFromPointer(event);
  };

  const onSliderPointerMove = (event) => {
    if (!isSliderDragging || event.pointerId !== activeSliderPointerId) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    updateZoomFromPointer(event);
  };

  const stopSliderDrag = (event) => {
    if (!isSliderDragging) {
      return;
    }

    if (event.type === "mouseup" && Date.now() < ignoreSliderMouseUpUntil) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    isSliderDragging = false;
    activeSliderPointerId = null;
    document.removeEventListener("pointermove", onSliderPointerMove, true);
    document.removeEventListener("pointerup", stopSliderDrag, true);
    document.removeEventListener("pointercancel", onSliderPointerCancel, true);
    document.removeEventListener("mousemove", onSliderMouseMove, true);
    document.removeEventListener("mouseup", stopSliderDrag, true);
    document.removeEventListener("selectstart", blockSliderGesture, true);
    document.removeEventListener("dragstart", blockSliderGesture, true);
    document.removeEventListener("contextmenu", blockSliderGesture, true);
    syncZoomControls();
  };

  const onSliderPointerCancel = (event) => {
    if (!isSliderDragging || event.pointerId !== activeSliderPointerId) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    activeSliderPointerId = null;
    ignoreSliderMouseUpUntil = Date.now() + 200;
    document.removeEventListener("pointermove", onSliderPointerMove, true);
    document.removeEventListener("pointerup", stopSliderDrag, true);
    document.removeEventListener("pointercancel", onSliderPointerCancel, true);
    document.addEventListener("mousemove", onSliderMouseMove, true);
    document.addEventListener("mouseup", stopSliderDrag, true);
  };

  const blockSliderGesture = (event) => {
    if (!isSliderDragging) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
  };

  sliderHitArea.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || isSliderDragging) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    isSliderDragging = true;
    activeSliderPointerId = event.pointerId;
    document.addEventListener("pointermove", onSliderPointerMove, true);
    document.addEventListener("pointerup", stopSliderDrag, true);
    document.addEventListener("pointercancel", onSliderPointerCancel, true);
    document.addEventListener("selectstart", blockSliderGesture, true);
    document.addEventListener("dragstart", blockSliderGesture, true);
    document.addEventListener("contextmenu", blockSliderGesture, true);
    updateZoomFromPointer(event);
  });

  sliderHitArea.addEventListener("mousedown", (event) => {
    if (event.button !== 0 || isSliderDragging) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    isSliderDragging = true;
    document.addEventListener("mousemove", onSliderMouseMove, true);
    document.addEventListener("mouseup", stopSliderDrag, true);
    document.addEventListener("selectstart", blockSliderGesture, true);
    document.addEventListener("dragstart", blockSliderGesture, true);
    document.addEventListener("contextmenu", blockSliderGesture, true);
    updateZoomFromPointer(event);
  });

  const zoomIn = document.createElement("button");
  zoomIn.type = "button";
  zoomIn.className = "ytvt-zoom-step";
  zoomIn.textContent = "+";
  zoomIn.title = "Zoom in";
  zoomIn.setAttribute("aria-label", "Zoom in");
  zoomIn.addEventListener("click", () => setZoom(state.zoom + 5));

  controls.append(zoomOut, sliderHitArea, zoomIn);
  syncZoomControls();
  panel.append(value, controls);
  return panel;
}

function createMenuRow(label, control, value = "") {
  const row = document.createElement("div");
  row.className = "ytvt-menu-row";

  const labelElement = document.createElement("span");
  labelElement.className = "ytvt-menu-label";
  labelElement.textContent = label;

  const valueElement = document.createElement("span");
  valueElement.className = "ytvt-menu-value";
  valueElement.textContent = value;

  const controlWrap = document.createElement("div");
  controlWrap.className = "ytvt-menu-control";
  controlWrap.append(control);

  row.append(labelElement, valueElement, controlWrap);
  return row;
}

function createClickableMenuRow(label, control, onClick) {
  const row = createMenuRow(label, control);
  row.classList.add("is-clickable");
  row.addEventListener("click", onClick);
  return row;
}

function createToggle(label, active, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = active ? "ytvt-toggle is-active" : "ytvt-toggle";
  button.setAttribute("aria-label", label);
  button.setAttribute("aria-pressed", String(active));
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    onClick();
  });
  button.append(document.createElement("span"));
  return button;
}

function toggleMirror() {
  state = toggleMirrorState(state);
  renderToolbar();
  applyTransform();
}

function togglePanMode() {
  state.panMode = !state.panMode;
  viewportControlsLastActivityAt = getViewportControlsActivityAfterPanToggle({
    isPanMode: state.panMode,
    now: Date.now(),
  });

  if (!state.panMode) {
    cancelPanGesture();
    clearTimeout(viewportControlsHideTimer);
    viewportControlsHideTimer = 0;
    isMenuOpen = false;
  } else {
    scheduleViewportControlsHide();
  }
  renderToolbar();
  applyTransform();
}

function resetZoomOnly() {
  state.zoom = 100;
  state.panX = 0;
  state.panY = 0;
  renderToolbar();
  applyTransform();
}

function getTriggerTitle() {
  if (state.zoom !== 100) {
    return `Zoom: ${state.zoom}% · Double-click to reset`;
  }

  return state.panMode ? "Pan mode on" : "Pan mode off";
}

function renderToolbar({ shouldRenderMenu = true } = {}) {
  if (!toolbar) {
    return;
  }

  syncSettingsButtonState();
  toolbar.replaceChildren();

  const trigger = document.createElement("button");
  const shouldShowText = shouldShowZoomTriggerText(state);
  const shouldShowActive = shouldShowZoomTriggerActive(state);
  trigger.type = "button";
  trigger.className = shouldShowActive ? "ytvt-trigger ytp-button is-active" : "ytvt-trigger ytp-button";
  trigger.classList.toggle("is-text", shouldShowText);
  trigger.setAttribute("aria-pressed", String(state.panMode));
  trigger.setAttribute("aria-label", getTriggerTitle());
  trigger.title = getTriggerTitle();

  const triggerBackground = document.createElement("span");
  triggerBackground.className = "ytvt-trigger-bg";
  triggerBackground.setAttribute("aria-hidden", "true");
  trigger.append(triggerBackground);

  if (shouldShowText) {
    const label = document.createElement("span");
    label.className = "ytvt-trigger-label";
    label.textContent = `${state.zoom}%`;
    trigger.append(label);
  } else {
    const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.classList.add("ytvt-trigger-icon");
    icon.setAttribute("viewBox", "0 0 36 36");
    icon.setAttribute("aria-hidden", "true");
    icon.innerHTML = `
      <circle cx="15" cy="15" r="8"></circle>
      <path d="M21 21 29 29"></path>
      <path d="M15 10.8v8.4"></path>
      <path d="M10.8 15h8.4"></path>
    `;
    trigger.append(icon);
  }

  trigger.addEventListener("click", () => {
    togglePanMode();
  });
  trigger.addEventListener("dblclick", (event) => {
    event.preventDefault();
    event.stopPropagation();
    resetZoomOnly();
  });

  toolbar.append(trigger);
  if (shouldRenderMenu) {
    renderMenu();
  }
}

function renderMenu() {
  if (!isMenuOpen) {
    transformMenu?.remove();
    transformMenu = null;
    return;
  }

  if (!player) {
    return;
  }

  if (!transformMenu) {
    transformMenu = document.createElement("div");
    transformMenu.className = "ytvt-menu";
    transformMenu.setAttribute("role", "menu");
    transformMenu.addEventListener("click", blockMenuEvent);
    transformMenu.addEventListener("pointerdown", blockMenuEvent);
    transformMenu.addEventListener("wheel", (event) => {
      event.preventDefault();
      event.stopPropagation();
    }, { passive: false });
    player.append(transformMenu);
  } else if (transformMenu.parentElement !== player) {
    player.append(transformMenu);
  }

  const reset = document.createElement("button");
  reset.type = "button";
  reset.className = "ytvt-menu-reset";
  reset.textContent = "Reset";
  reset.title = "Reset video transform";
  reset.addEventListener("click", resetState);

  const rotationGroup = document.createElement("div");
  rotationGroup.className = "ytvt-segment";
  ROTATIONS.forEach((rotation) => rotationGroup.append(createSegment(rotation)));

  transformMenu.replaceChildren(
    reset,
    createZoomPanel(),
    createMenuRow("Rotation", rotationGroup),
    createClickableMenuRow("Mirror", createToggle("Mirror horizontally", state.flipX, toggleMirror), toggleMirror)
  );
  positionTransformMenu();
}

function closeMenuOnOutsidePointer(event) {
  if (
    !isMenuOpen ||
    !toolbar ||
    toolbar.contains(event.target) ||
    settingsButton?.contains(event.target) ||
    transformMenu?.contains(event.target)
  ) {
    return;
  }

  isMenuOpen = false;
  renderToolbar();
  renderViewportMap();
}

function closeMenuOnEscape(event) {
  if (!isMenuOpen || event.key !== "Escape") {
    return;
  }

  isMenuOpen = false;
  renderToolbar();
  renderViewportMap();
}

function onShortcutKeyDown(event) {
  if (!video || !isWatchPage() || !shouldTogglePanShortcut(event)) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation?.();
  togglePanMode();
}

function blockYouTubeShortcutFromZoomInput(event) {
  if (!shouldBlockYouTubeShortcutForZoomInput({ target: event.target, activeElement: document.activeElement })) {
    return;
  }

  event.stopImmediatePropagation();
  if (event.type === "keydown" && event.key === "Enter") {
    event.preventDefault();
    event.target.blur();
  }
}

function ensureToolbar() {
  if (!player) {
    return;
  }

  const controlsHost = findControlsHost();
  const toolbarHost = controlsHost || player;
  const existing = document.querySelector(TOOLBAR_SELECTOR);
  const shouldRenderToolbar = shouldRenderToolbarOnEnsure({ hasExistingToolbar: Boolean(existing) });
  const shouldRenderMenu = shouldRenderMenuOnToolbarEnsure({ hasExistingMenu: Boolean(transformMenu) });
  toolbar = existing || document.createElement("div");
  toolbar.dataset.ytvtToolbar = "true";
  toolbar.className = controlsHost ? "ytvt-toolbar is-native" : "ytvt-toolbar is-floating";
  toolbar.setAttribute("aria-label", "YouTube video transform controls");

  if (!existing) {
    toolbar.addEventListener("click", (event) => event.stopPropagation());
    toolbar.addEventListener("pointerdown", (event) => event.stopPropagation());
    toolbar.addEventListener("wheel", (event) => {
      event.preventDefault();
      event.stopPropagation();
    }, { passive: false });
  }

  document.querySelectorAll(TOOLBAR_SELECTOR).forEach((element) => {
    if (element !== toolbar) {
      element.remove();
    }
  });

  if (controlsHost) {
    if (toolbar.parentElement !== controlsHost || toolbar !== controlsHost.firstElementChild) {
      controlsHost.prepend(toolbar);
    }
  } else if (toolbar.parentElement !== toolbarHost) {
    toolbarHost.append(toolbar);
  }

  if (shouldRenderToolbar) {
    renderToolbar({ shouldRenderMenu });
  }
}

function onPointerDown(event) {
  if (!state.panMode || event.button !== 0) {
    return;
  }

  clearPanLongPressTimer();
  dragStart = {
    pointerId: event.pointerId,
    x: event.clientX,
    y: event.clientY,
    panX: state.panX,
    panY: state.panY,
    startedAt: Date.now(),
    isDragging: false,
    video,
  };
  video.setPointerCapture(event.pointerId);
  panLongPressTimer = setTimeout(startPanDrag, PAN_LONG_PRESS_MS);
}

function onPointerMove(event) {
  if (!dragStart || event.pointerId !== dragStart.pointerId) {
    return;
  }

  const deltaX = event.clientX - dragStart.x;
  const deltaY = event.clientY - dragStart.y;
  const distancePx = Math.hypot(deltaX, deltaY);
  if (!dragStart.isDragging) {
    if (!shouldStartPanDrag({
      elapsedMs: Date.now() - dragStart.startedAt,
      distancePx,
      longPressMs: PAN_LONG_PRESS_MS,
      moveThresholdPx: PAN_MOVE_THRESHOLD_PX,
    })) {
      return;
    }

    clearPanLongPressTimer();
    startPanDrag();
  }

  state.panX = Math.round(dragStart.panX + event.clientX - dragStart.x);
  state.panY = Math.round(dragStart.panY + event.clientY - dragStart.y);
  clampCurrentPanState();
  viewportControlsLastActivityAt = Date.now();
  applyTransform();
  event.preventDefault();
}

function onPlayerPointerMove() {
  if (!state.panMode || !areViewportControlsVisible()) {
    return;
  }

  markViewportControlsActivity();
}

function onWheel(event) {
  if (!shouldInterceptPanWheel(state) || !video) {
    return;
  }

  if (toolbar?.contains(event.target)) {
    blockYouTubeWheel(event);
    return;
  }

  if (transformMenu?.contains(event.target)) {
    blockYouTubeWheel(event);
    return;
  }

  blockYouTubeWheel(event);
  const direction = event.deltaY < 0 ? 1 : -1;
  markViewportControlsActivity();
  setZoom(applyZoomDelta(state.zoom, direction));
}

function endDrag(event) {
  if (!dragStart || event.pointerId !== dragStart.pointerId) {
    return;
  }

  clearPanLongPressTimer();
  const wasDragging = dragStart.isDragging;
  dragStart = null;
  if (video.hasPointerCapture?.(event.pointerId)) {
    video.releasePointerCapture(event.pointerId);
  }
  video.style.cursor = state.panMode ? "grab" : "";
  if (shouldSuppressClickAfterPanEnd({ wasDragging })) {
    suppressUpcomingVideoClick();
    markViewportControlsActivity();
  }
}

function onVideoClick(event) {
  if (!suppressNextVideoClick) {
    return;
  }

  suppressNextVideoClick = false;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation?.();
  clearTimeout(suppressVideoClickTimer);
  suppressVideoClickTimer = 0;
}

function bindVideo(nextVideo) {
  if (video === nextVideo) {
    applyTransform();
    return;
  }

  if (video) {
    cancelPanGesture();
    video.removeEventListener("pointerdown", onPointerDown);
    video.removeEventListener("pointermove", onPointerMove);
    video.removeEventListener("pointerup", endDrag);
    video.removeEventListener("pointercancel", endDrag);
    video.removeEventListener("click", onVideoClick, true);
    videoStyleObserver?.disconnect();
    videoStyleObserver = null;
  }

  video = nextVideo;
  video.addEventListener("pointerdown", onPointerDown);
  video.addEventListener("pointermove", onPointerMove);
  video.addEventListener("pointerup", endDrag);
  video.addEventListener("pointercancel", endDrag);
  video.addEventListener("click", onVideoClick, true);
  videoStyleObserver = new MutationObserver(() => {
    scheduleTransformReapply();
  });
  videoStyleObserver.observe(video, { attributes: true, attributeFilter: ["style"] });
  applyTransform();
}

function bindWheelTarget(nextPlayer) {
  if (wheelTarget === nextPlayer) {
    return;
  }

  wheelTarget?.removeEventListener("wheel", onWheel, true);
  wheelTarget?.removeEventListener("pointermove", onPlayerPointerMove);
  wheelTarget = nextPlayer;
  wheelTarget.addEventListener("wheel", onWheel, { capture: true, passive: false });
  wheelTarget.addEventListener("pointermove", onPlayerPointerMove);
}

function sync() {
  if (!isWatchPage()) {
    clearTransform();
    toolbar?.remove();
    toolbar = null;
    videoStyleObserver?.disconnect();
    videoStyleObserver = null;
    if (reapplyFrame) {
      cancelAnimationFrame(reapplyFrame);
      reapplyFrame = 0;
    }
    wheelTarget?.removeEventListener("wheel", onWheel, true);
    wheelTarget?.removeEventListener("pointermove", onPlayerPointerMove);
    wheelTarget = null;
    state = createDefaultState();
    isMenuOpen = false;
    currentVideoKey = "";
    return;
  }

  const nextPlayer = findPlayer();
  const nextVideo = findVideo();

  if (!nextPlayer || !nextVideo) {
    return;
  }

  player = nextPlayer;
  bindWheelTarget(nextPlayer);
  ensureToolbar();
  bindVideo(nextVideo);

  const nextVideoKey = getVideoKey();
  if (shouldResetForVideoKey(currentVideoKey, nextVideoKey)) {
    resetState();
  }
  currentVideoKey = nextVideoKey;
}

function observePlayerSize() {
  if (!document.documentElement) {
    window.addEventListener("DOMContentLoaded", observePlayerSize, { once: true });
    return;
  }

  if (resizeObserver) {
    resizeObserver.disconnect();
  }

  resizeObserver = new ResizeObserver(sync);
  resizeObserver.observe(document.documentElement);
}

function start() {
  sync();
  observePlayerSize();
  setInterval(sync, 800);
  window.addEventListener("yt-navigate-finish", sync);
  window.addEventListener("popstate", sync);
  window.addEventListener("keydown", blockYouTubeShortcutFromZoomInput, true);
  window.addEventListener("keyup", blockYouTubeShortcutFromZoomInput, true);
  window.addEventListener("keypress", blockYouTubeShortcutFromZoomInput, true);
  window.addEventListener("keydown", onShortcutKeyDown, true);
  document.addEventListener("keydown", onShortcutKeyDown, true);
  document.addEventListener("pointerdown", closeMenuOnOutsidePointer, true);
  document.addEventListener("keydown", closeMenuOnEscape);
  document.addEventListener("fullscreenchange", () => scheduleTransformReapply(12));
  document.addEventListener("webkitfullscreenchange", () => scheduleTransformReapply(12));
}

start();
