const ROTATIONS = [0, 90, 180, 270];
const TOOLBAR_SELECTOR = '[data-ytvt-toolbar="true"]';
const {
  applyZoomDelta,
  clampPanState,
  createViewportFrame,
  createDefaultState,
  createTransformStyle,
  shouldInterceptPanWheel,
  shouldReapplyTransformAfterMutation,
  shouldResetForVideoKey,
  shouldStartPanDrag,
  shouldShowZoomTriggerText,
  shouldShowTransientViewportControls,
  shouldTogglePanShortcut,
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
let ignoreNextStyleMutation = false;
let isMenuOpen = false;

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

function blockYouTubeWheel(event) {
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation?.();
}

function applyTransform() {
  if (!video) {
    return;
  }

  state = clampPanState(state, video.clientWidth, video.clientHeight);
  const style = createTransformStyle(state, video.clientWidth, video.clientHeight);
  ignoreNextStyleMutation = true;
  video.style.transform = style.transform;
  video.style.transformOrigin = style.transformOrigin;
  video.style.cursor = state.panMode ? "grab" : "";
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
  if (!video) {
    return;
  }

  video.style.transform = "";
  video.style.transformOrigin = "";
  video.style.cursor = "";
  viewportMap?.remove();
  viewportMap = null;
  settingsButton?.remove();
  settingsButton = null;
  transformMenu?.remove();
  transformMenu = null;
  cancelPanGesture();
  clearTimeout(viewportControlsHideTimer);
  viewportControlsHideTimer = 0;
  viewportControlsLastActivityAt = 0;
  clearTimeout(suppressVideoClickTimer);
  suppressVideoClickTimer = 0;
  suppressNextVideoClick = false;
}

function areViewportControlsVisible() {
  return shouldShowTransientViewportControls({
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
  suppressUpcomingVideoClick();
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

  if (!viewportMap) {
    viewportMap = document.createElement("div");
    viewportMap.className = "ytvt-map";
    viewportMap.setAttribute("aria-label", "Visible area inside original video");
    viewportMap.innerHTML = '<div class="ytvt-map-frame"></div>';
    player.append(viewportMap);
  }

  if (!settingsButton) {
    settingsButton = document.createElement("button");
    settingsButton.type = "button";
    settingsButton.className = "ytvt-settings";
    settingsButton.title = "Zoom settings";
    settingsButton.setAttribute("aria-label", "Zoom settings");
    settingsButton.innerHTML = '<span aria-hidden="true">⚙</span>';
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
  }

  settingsButton.classList.toggle("is-active", isMenuOpen);
  settingsButton.setAttribute("aria-expanded", String(isMenuOpen));

  const shouldShowControls = areViewportControlsVisible();
  const frame = createViewportFrame(state, video.clientWidth, video.clientHeight);
  const frameElement = viewportMap.querySelector(".ytvt-map-frame");
  frameElement.style.left = `${frame.x * 100}%`;
  frameElement.style.top = `${frame.y * 100}%`;
  frameElement.style.width = `${frame.width * 100}%`;
  frameElement.style.height = `${frame.height * 100}%`;
  viewportMap.hidden = !shouldShowControls;
  settingsButton.hidden = !shouldShowControls;
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

function formatZoomScale() {
  return `${(state.zoom / 100).toFixed(2)}x`;
}

function getSliderProgress() {
  return `${((state.zoom - 100) / 400) * 100}%`;
}

function getZoomFromPointer(slider, clientX) {
  const rect = slider.getBoundingClientRect();
  if (rect.width <= 0) {
    return state.zoom;
  }

  const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  return Math.round(100 + ratio * 400);
}

function setZoom(zoom, shouldRender = true) {
  state.zoom = Math.min(500, Math.max(100, zoom));
  state = clampPanState(state, video.clientWidth, video.clientHeight);
  if (shouldRender) {
    renderToolbar();
  }
  applyTransform();
}

function createZoomPanel() {
  const panel = document.createElement("div");
  panel.className = "ytvt-zoom-panel";
  let activeSliderPointerId = null;

  const value = document.createElement("div");
  value.className = "ytvt-zoom-value";
  value.textContent = formatZoomScale();

  const syncZoomControls = () => {
    zoom.value = String(state.zoom);
    zoom.style.setProperty("--ytvt-slider-progress", getSliderProgress());
    value.textContent = formatZoomScale();

    const triggerLabel = toolbar.querySelector(".ytvt-trigger-label");
    if (triggerLabel) {
      triggerLabel.textContent = `${state.zoom}%`;
    }
  };

  const controls = document.createElement("div");
  controls.className = "ytvt-zoom-controls";

  const zoomOut = document.createElement("button");
  zoomOut.type = "button";
  zoomOut.className = "ytvt-zoom-step";
  zoomOut.textContent = "-";
  zoomOut.title = "Zoom out";
  zoomOut.setAttribute("aria-label", "Zoom out");
  zoomOut.addEventListener("click", () => setZoom(state.zoom - 5));

  const zoom = document.createElement("input");
  zoom.className = "ytvt-slider";
  zoom.type = "range";
  zoom.min = "100";
  zoom.max = "500";
  zoom.step = "1";
  zoom.value = String(state.zoom);
  zoom.title = "Zoom";
  zoom.style.setProperty("--ytvt-slider-progress", getSliderProgress());
  zoom.addEventListener("input", () => {
    setZoom(Number(zoom.value), false);
    syncZoomControls();
  });
  zoom.addEventListener("change", renderToolbar);

  const updateZoomFromPointer = (event) => {
    setZoom(getZoomFromPointer(zoom, event.clientX), false);
    syncZoomControls();
  };

  controls.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) {
      return;
    }

    if (event.target.closest(".ytvt-zoom-step")) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    activeSliderPointerId = event.pointerId;
    controls.setPointerCapture?.(event.pointerId);
    updateZoomFromPointer(event);
  });

  controls.addEventListener("pointermove", (event) => {
    if (event.pointerId !== activeSliderPointerId) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    updateZoomFromPointer(event);
  });

  const endSliderDrag = (event) => {
    if (event.pointerId !== activeSliderPointerId) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    activeSliderPointerId = null;
    controls.releasePointerCapture?.(event.pointerId);
    renderToolbar();
  };

  controls.addEventListener("pointerup", endSliderDrag);
  controls.addEventListener("pointercancel", endSliderDrag);

  const zoomIn = document.createElement("button");
  zoomIn.type = "button";
  zoomIn.className = "ytvt-zoom-step";
  zoomIn.textContent = "+";
  zoomIn.title = "Zoom in";
  zoomIn.setAttribute("aria-label", "Zoom in");
  zoomIn.addEventListener("click", () => setZoom(state.zoom + 5));

  controls.append(zoomOut, zoom, zoomIn);
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

function createToggle(label, active, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = active ? "ytvt-toggle is-active" : "ytvt-toggle";
  button.setAttribute("aria-label", label);
  button.setAttribute("aria-pressed", String(active));
  button.addEventListener("click", onClick);
  button.append(document.createElement("span"));
  return button;
}

function togglePanMode() {
  state.panMode = !state.panMode;
  if (!state.panMode) {
    cancelPanGesture();
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

function renderToolbar() {
  if (!toolbar) {
    return;
  }

  syncSettingsButtonState();
  toolbar.replaceChildren();

  const trigger = document.createElement("button");
  const shouldShowText = shouldShowZoomTriggerText(state);
  trigger.type = "button";
  trigger.className = state.panMode ? "ytvt-trigger ytp-button is-active" : "ytvt-trigger ytp-button";
  trigger.classList.toggle("is-text", shouldShowText);
  trigger.setAttribute("aria-pressed", String(state.panMode));
  trigger.setAttribute("aria-label", getTriggerTitle());
  trigger.title = getTriggerTitle();

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
  renderMenu();
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
    createMenuRow("Mirror H", createToggle("Mirror horizontally", state.flipX, () => {
      state.flipX = !state.flipX;
      renderToolbar();
      applyTransform();
    })),
    createMenuRow("Mirror V", createToggle("Mirror vertically", state.flipY, () => {
      state.flipY = !state.flipY;
      renderToolbar();
      applyTransform();
    })),
    createMenuRow("Pan", createToggle("Pan mode", state.panMode, togglePanMode))
  );

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
}

function closeMenuOnEscape(event) {
  if (!isMenuOpen || event.key !== "Escape") {
    return;
  }

  isMenuOpen = false;
  renderToolbar();
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

function ensureToolbar() {
  if (!player) {
    return;
  }

  const controlsHost = findControlsHost();
  const toolbarHost = controlsHost || player;
  const existing = document.querySelector(TOOLBAR_SELECTOR);
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

  renderToolbar();
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
  state = clampPanState(state, video.clientWidth, video.clientHeight);
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
  state.zoom = applyZoomDelta(state.zoom, direction);
  state = clampPanState(state, video.clientWidth, video.clientHeight);
  markViewportControlsActivity();
  renderToolbar();
  applyTransform();
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
  if (wasDragging) {
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
    if (ignoreNextStyleMutation) {
      ignoreNextStyleMutation = false;
      return;
    }

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
    viewportMap?.remove();
    viewportMap = null;
    settingsButton?.remove();
    settingsButton = null;
    transformMenu?.remove();
    transformMenu = null;
    videoStyleObserver?.disconnect();
    videoStyleObserver = null;
    if (reapplyFrame) {
      cancelAnimationFrame(reapplyFrame);
      reapplyFrame = 0;
    }
    wheelTarget?.removeEventListener("wheel", onWheel, true);
    wheelTarget?.removeEventListener("pointermove", onPlayerPointerMove);
    wheelTarget = null;
    clearTimeout(viewportControlsHideTimer);
    viewportControlsHideTimer = 0;
    viewportControlsLastActivityAt = 0;
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
  window.addEventListener("keydown", onShortcutKeyDown, true);
  document.addEventListener("keydown", onShortcutKeyDown, true);
  document.addEventListener("pointerdown", closeMenuOnOutsidePointer, true);
  document.addEventListener("keydown", closeMenuOnEscape);
  document.addEventListener("fullscreenchange", () => scheduleTransformReapply(12));
  document.addEventListener("webkitfullscreenchange", () => scheduleTransformReapply(12));
}

start();
