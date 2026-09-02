const ROTATIONS = [0, 90, 180, 270];
const TOOLBAR_SELECTOR = '[data-ytvt-toolbar="true"]';
const TRANSFORM_STYLE_ID = "ytvt-transform-style";
const TRANSFORM_SELECTOR = "video.html5-main-video";
const TRANSFORM_PROPERTY = "--ytvt-transform";
const PLAYER_STRUCTURE_SELECTOR = ".html5-video-player, video.html5-main-video, .ytp-right-controls";
const {
  applyZoomDelta,
  applyWheelZoomDelta,
  clampPanStateToViewport,
  createViewportIndicator,
  createViewportIndicatorRect,
  createCursorCenteredZoomState,
  createFillScreenZoom,
  createViewportCenteredZoomState,
  createViewportOverlayLayout,
  createMinimapSize,
  createTransformMenuTop,
  createDefaultState,
  resetTransformState,
  createTransformStyle,
  formatZoomPercent,
  getViewportControlsActivityAfterPanToggle,
  getWheelZoomAnimationStep,
  getZoomFromSliderKey,
  getZoomFromPointerPosition,
  parseZoomPercentInput,
  shouldBlockYouTubeShortcutForZoomInput,
  shouldInterceptPanWheel,
  shouldRenderMenuOnToolbarEnsure,
  shouldRenderToolbarOnEnsure,
  shouldReapplyTransformAfterMutation,
  shouldResetForVideoKey,
  shouldStartPanDrag,
  shouldCancelYouTubeHoldGesture,
  shouldHandlePlayerWheel,
  shouldRestoreYouTubeLongPressPlaybackRate,
  shouldShowZoomTriggerActive,
  shouldShowZoomTriggerText,
  shouldShowTransientViewportControls,
  shouldSuppressClickAfterPanEnd,
  shouldTogglePanShortcut,
  shouldUseBlockingWheelListener,
  toggleMirrorState,
} = globalThis.YTVTTransform;
const VIEWPORT_CONTROLS_HIDE_DELAY_MS = 3000;
const WHEEL_UI_UPDATE_INTERVAL_MS = 1000 / 30;
const PAN_LONG_PRESS_MS = 220;
const PAN_MOVE_THRESHOLD_PX = 6;

let state = createDefaultState();
let video = null;
let player = null;
let wheelTarget = null;
let wheelTargetUsesBlockingListener = false;
let documentWheelListenerBound = false;
let isPointerInPlayer = false;
let toolbar = null;
let minimap = null;
let settingsButton = null;
let transformMenu = null;
let resizeObserver = null;
let playerStructureObserver = null;
let observedPlayer = null;
let syncFrame = 0;
let wheelZoomFrame = 0;
let wheelTargetZoom = null;
let wheelAnchorClientX = 0;
let wheelAnchorClientY = 0;
let wheelLastFrameTime = 0;
let wheelLastUiUpdateTime = 0;
let currentVideoKey = "";
let dragStart = null;
let panLongPressTimer = 0;
let suppressNextVideoClick = false;
let suppressVideoClickTimer = 0;
let viewportControlsLastActivityAt = 0;
let viewportControlsHideTimer = 0;
let isMenuOpen = false;
let lastTransformValue = "";
let lastPointerClientX = 0;
let lastPointerClientY = 0;
let hasLastPointerPosition = false;
let pointerTrackingBound = false;
let cleanupActiveSliderDrag = null;
let isCancelingNativePress = false;

function getTransformStyleElement() {
  let styleElement = document.getElementById(TRANSFORM_STYLE_ID);
  if (!styleElement) {
    styleElement = document.createElement("style");
    styleElement.id = TRANSFORM_STYLE_ID;
    document.documentElement.append(styleElement);
  }
  if (!styleElement.textContent) {
    styleElement.textContent = `${TRANSFORM_SELECTOR} { transform: var(${TRANSFORM_PROPERTY}) !important; transform-origin: center center !important; will-change: transform; }`;
  }

  return styleElement;
}

function updateTransformRule({ sourceWidth, sourceHeight, viewportWidth, viewportHeight }) {
  if (!video) {
    return;
  }

  let transformValue = "";
  if (shouldReapplyTransformAfterMutation(state)) {
    transformValue = createTransformStyle(state, sourceWidth, sourceHeight, viewportWidth, viewportHeight).transform;
  }

  if (transformValue === lastTransformValue) {
    return;
  }

  if (transformValue) {
    getTransformStyleElement();
    video.style.setProperty(TRANSFORM_PROPERTY, transformValue);
  } else {
    clearTransformRule();
  }
  lastTransformValue = transformValue;
}

function clearTransformRule() {
  const styleElement = document.getElementById(TRANSFORM_STYLE_ID);
  video?.style.removeProperty(TRANSFORM_PROPERTY);
  if (styleElement?.textContent) {
    styleElement.textContent = "";
  }
  lastTransformValue = "";
}

function resetState() {
  cancelWheelZoomAnimation();
  state = resetTransformState();
  syncWheelTargetListenerMode();
  syncPointerTracking();
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

function getViewportGeometry(playerRect = null) {
  return {
    sourceWidth: video?.videoWidth || video?.clientWidth || 0,
    sourceHeight: video?.videoHeight || video?.clientHeight || 0,
    viewportWidth: playerRect?.width || player?.clientWidth || video?.clientWidth || 0,
    viewportHeight: playerRect?.height || player?.clientHeight || video?.clientHeight || 0,
  };
}

function blockYouTubeWheel(event) {
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation?.();
}

function applyTransform({ shouldRenderMinimap = true, geometry = getViewportGeometry() } = {}) {
  if (!video) {
    return;
  }

  const { sourceWidth, sourceHeight, viewportWidth, viewportHeight } = geometry;
  state = clampPanStateToViewport(state, sourceWidth, sourceHeight, viewportWidth, viewportHeight);
  updateTransformRule(geometry);
  const cursor = state.panMode ? "grab" : "";
  if (video.style.cursor !== cursor) {
    video.style.cursor = cursor;
  }
  if (shouldRenderMinimap) {
    renderMinimap(geometry);
  }
}

function cancelWheelZoomAnimation() {
  if (wheelZoomFrame) {
    cancelAnimationFrame(wheelZoomFrame);
    wheelZoomFrame = 0;
  }
  wheelTargetZoom = null;
  wheelLastFrameTime = 0;
  wheelLastUiUpdateTime = 0;
}

function clearTransform() {
  if (video) {
    clearTransformRule();
    video.style.cursor = "";
  }

  cancelWheelZoomAnimation();
  clearOverlayElements();
  cancelPanGesture();
  clearClickSuppression();
}

function clearOverlayElements() {
  cleanupSliderDrag();
  minimap?.remove();
  minimap = null;
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

function cleanupSliderDrag() {
  const cleanup = cleanupActiveSliderDrag;
  cleanupActiveSliderDrag = null;
  cleanup?.({ shouldSyncControls: false });
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
  if (dragStart?.video?.hasPointerCapture?.(dragStart.pointerId)) {
    dragStart.video.releasePointerCapture(dragStart.pointerId);
  }
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

function onViewportControlsHideTimer() {
  viewportControlsHideTimer = 0;
  const elapsedSinceActivityMs = Date.now() - viewportControlsLastActivityAt;
  const remainingDelayMs = Math.max(0, VIEWPORT_CONTROLS_HIDE_DELAY_MS - elapsedSinceActivityMs);
  if (remainingDelayMs > 0) {
    viewportControlsHideTimer = setTimeout(onViewportControlsHideTimer, remainingDelayMs);
    return;
  }

  renderMinimap();
}

function scheduleViewportControlsHide() {
  if (viewportControlsHideTimer) {
    return;
  }

  viewportControlsHideTimer = setTimeout(onViewportControlsHideTimer, VIEWPORT_CONTROLS_HIDE_DELAY_MS);
}

function markViewportControlsActivity({ shouldRender = true } = {}) {
  const controlsWereVisible = areViewportControlsVisible();
  viewportControlsLastActivityAt = Date.now();
  if (shouldRender || !controlsWereVisible) {
    renderMinimap();
  }
  scheduleViewportControlsHide();
}

function startPanDrag() {
  if (!dragStart?.video) {
    return;
  }

  dragStart.isDragging = true;
  cancelYouTubeHoldGesture();
  if (!dragStart.video.hasPointerCapture?.(dragStart.pointerId)) {
    dragStart.video.setPointerCapture(dragStart.pointerId);
  }
  dragStart.video.style.cursor = "grabbing";
  markViewportControlsActivity();
  restorePanPlaybackRate();
}

function renderMinimap(geometry = getViewportGeometry()) {
  if (!player || !video) {
    return;
  }

  const shouldShowControls = areViewportControlsVisible();
  if (!shouldShowControls) {
    if (minimap) {
      minimap.hidden = true;
    }
    if (settingsButton) {
      settingsButton.hidden = true;
    }
    return;
  }

  if (!minimap) {
    minimap = document.createElement("div");
    minimap.className = "ytvt-minimap";
    minimap.setAttribute("aria-label", "Video position preview");
    minimap.innerHTML = '<div class="ytvt-viewport-indicator"></div>';
    player.append(minimap);
  } else if (minimap.parentElement !== player) {
    player.append(minimap);
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
      renderMinimap();
    });
    player.append(settingsButton);
  } else if (settingsButton.parentElement !== player) {
    player.append(settingsButton);
  }

  settingsButton.classList.toggle("is-active", isMenuOpen);
  settingsButton.setAttribute("aria-expanded", String(isMenuOpen));

  const { sourceWidth, sourceHeight, viewportWidth, viewportHeight } = geometry;
  const minimapSize = createMinimapSize(sourceWidth, sourceHeight, state.rotation, viewportWidth, viewportHeight);
  const viewportPreviewSize = createMinimapSize(viewportWidth, viewportHeight);
  const indicator = createViewportIndicator(state, sourceWidth, sourceHeight, viewportWidth, viewportHeight);
  const anchorIndicator = createViewportIndicator(
    { ...state, zoom: 100, panX: 0, panY: 0 },
    sourceWidth,
    sourceHeight,
    viewportWidth,
    viewportHeight
  );
  const indicatorRect = createViewportIndicatorRect(indicator, minimapSize, viewportPreviewSize, state.zoom / 100);
  const anchorIndicatorRect = createViewportIndicatorRect(anchorIndicator, minimapSize, viewportPreviewSize);
  const overlayLayout = createViewportOverlayLayout({ minimapSize, indicator, anchorIndicator, indicatorRect, anchorIndicatorRect });
  const indicatorElement = minimap.querySelector(".ytvt-viewport-indicator");
  minimap.style.top = `${overlayLayout.minimapTop}px`;
  minimap.style.right = `${overlayLayout.minimapRight}px`;
  minimap.style.width = `${minimapSize.width}px`;
  minimap.style.height = `${minimapSize.height}px`;
  settingsButton.style.top = `${overlayLayout.settingsTop}px`;
  settingsButton.style.right = `${overlayLayout.settingsRight}px`;
  positionTransformMenu();
  indicatorElement.style.left = `${indicatorRect.left}px`;
  indicatorElement.style.top = `${indicatorRect.top}px`;
  indicatorElement.style.width = `${indicatorRect.width}px`;
  indicatorElement.style.height = `${indicatorRect.height}px`;
  minimap.hidden = !shouldShowControls;
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

  cancelWheelZoomAnimation();
  state = createViewportCenteredZoomState(state, zoom);
  if (shouldRender) {
    renderToolbar();
  }
  applyTransform();
}

function syncWheelUi(timestamp, geometry, force = false) {
  if (!force && timestamp - wheelLastUiUpdateTime < WHEEL_UI_UPDATE_INTERVAL_MS) {
    return;
  }

  wheelLastUiUpdateTime = timestamp;
  syncToolbarTrigger();
  syncOpenZoomPanelControls();
  renderMinimap(geometry);
}

function animateWheelZoom(timestamp) {
  wheelZoomFrame = 0;
  if (!video || wheelTargetZoom === null) {
    return;
  }

  const rect = player?.getBoundingClientRect?.();
  if (!rect || rect.width <= 0 || rect.height <= 0) {
    const targetZoom = wheelTargetZoom;
    wheelTargetZoom = null;
    wheelLastFrameTime = 0;
    state = createViewportCenteredZoomState(state, targetZoom);
    applyTransform({ shouldRenderMinimap: false });
    syncWheelUi(timestamp, getViewportGeometry(), true);
    return;
  }

  const eventPointIsInsidePlayer =
    wheelAnchorClientX >= rect.left && wheelAnchorClientX <= rect.right
    && wheelAnchorClientY >= rect.top && wheelAnchorClientY <= rect.bottom;
  const fallbackPointIsInsidePlayer =
    hasLastPointerPosition
    && lastPointerClientX >= rect.left && lastPointerClientX <= rect.right
    && lastPointerClientY >= rect.top && lastPointerClientY <= rect.bottom;
  const anchorClientX = eventPointIsInsidePlayer
    ? wheelAnchorClientX
    : fallbackPointIsInsidePlayer ? lastPointerClientX : rect.left + rect.width / 2;
  const anchorClientY = eventPointIsInsidePlayer
    ? wheelAnchorClientY
    : fallbackPointIsInsidePlayer ? lastPointerClientY : rect.top + rect.height / 2;
  const elapsedMs = wheelLastFrameTime ? timestamp - wheelLastFrameTime : 1000 / 60;
  wheelLastFrameTime = timestamp;

  const nextZoom = getWheelZoomAnimationStep(state.zoom, wheelTargetZoom, elapsedMs);
  state = createCursorCenteredZoomState(
    state,
    nextZoom,
    anchorClientX - (rect.left + rect.width / 2),
    anchorClientY - (rect.top + rect.height / 2)
  );
  const geometry = getViewportGeometry(rect);
  applyTransform({ shouldRenderMinimap: false, geometry });

  const isComplete = state.zoom === wheelTargetZoom;
  syncWheelUi(timestamp, geometry, isComplete);
  if (isComplete) {
    wheelTargetZoom = null;
    wheelLastFrameTime = 0;
    return;
  }

  wheelZoomFrame = requestAnimationFrame(animateWheelZoom);
}

function setWheelZoom(event) {
  if (!video) {
    return;
  }

  wheelTargetZoom = applyWheelZoomDelta(wheelTargetZoom ?? state.zoom, event);
  wheelAnchorClientX = Number.isFinite(event.clientX) ? event.clientX : lastPointerClientX;
  wheelAnchorClientY = Number.isFinite(event.clientY) ? event.clientY : lastPointerClientY;
  if (!wheelZoomFrame && wheelTargetZoom !== state.zoom) {
    wheelZoomFrame = requestAnimationFrame(animateWheelZoom);
  }
}

function fillScreen() {
  const { sourceWidth, sourceHeight, viewportWidth, viewportHeight } = getViewportGeometry();
  setZoom(createFillScreenZoom(sourceWidth, sourceHeight, viewportWidth, viewportHeight, state.rotation));
}

function createZoomPanel() {
  const panel = document.createElement("div");
  panel.className = "ytvt-zoom-panel";
  let isSliderDragging = false;
  let activeSliderPointerId = null;
  let ignoreSliderMouseUpUntil = 0;
  let sliderDragRect = null;
  let pendingSliderClientX = null;
  let sliderZoomFrame = 0;

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
    sliderHitArea.setAttribute("aria-valuenow", String(Math.round(state.zoom)));
    sliderHitArea.setAttribute("aria-valuetext", formatZoomPercent(state.zoom));
    if (document.activeElement !== value) {
      value.value = formatZoomPercent(state.zoom);
    }

    const triggerLabel = toolbar.querySelector(".ytvt-trigger-label");
    if (triggerLabel) {
      triggerLabel.textContent = formatZoomPercent(state.zoom);
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
  sliderHitArea.setAttribute("aria-orientation", "horizontal");
  sliderHitArea.tabIndex = 0;

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

  const applyZoomFromClientX = (clientX) => {
    setZoom(getZoomFromPointerPosition(sliderDragRect, clientX, state.zoom), false);
    syncZoomControls();
  };

  const scheduleZoomFromPointer = (event) => {
    pendingSliderClientX = event.clientX;
    if (sliderZoomFrame) {
      return;
    }

    sliderZoomFrame = requestAnimationFrame(() => {
      sliderZoomFrame = 0;
      const clientX = pendingSliderClientX;
      pendingSliderClientX = null;
      if (!isSliderDragging) {
        return;
      }
      applyZoomFromClientX(clientX);
    });
  };

  const onSliderMouseMove = (event) => {
    if (!isSliderDragging || activeSliderPointerId !== null) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    scheduleZoomFromPointer(event);
  };

  const onSliderPointerMove = (event) => {
    if (!isSliderDragging || event.pointerId !== activeSliderPointerId) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    scheduleZoomFromPointer(event);
  };

  const cleanupDrag = ({ shouldSyncControls = true } = {}) => {
    isSliderDragging = false;
    activeSliderPointerId = null;
    ignoreSliderMouseUpUntil = 0;
    if (sliderZoomFrame) {
      cancelAnimationFrame(sliderZoomFrame);
      sliderZoomFrame = 0;
    }
    pendingSliderClientX = null;
    sliderDragRect = null;
    document.removeEventListener("pointermove", onSliderPointerMove, true);
    document.removeEventListener("pointerup", stopSliderDrag, true);
    document.removeEventListener("pointercancel", onSliderPointerCancel, true);
    document.removeEventListener("mousemove", onSliderMouseMove, true);
    document.removeEventListener("mouseup", stopSliderDrag, true);
    document.removeEventListener("selectstart", blockSliderGesture, true);
    document.removeEventListener("dragstart", blockSliderGesture, true);
    document.removeEventListener("contextmenu", blockSliderGesture, true);
    if (cleanupActiveSliderDrag === cleanupDrag) {
      cleanupActiveSliderDrag = null;
    }
    if (shouldSyncControls) {
      syncZoomControls();
    }
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
    cleanupDrag();
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
    cleanupActiveSliderDrag = cleanupDrag;
    document.addEventListener("pointermove", onSliderPointerMove, true);
    document.addEventListener("pointerup", stopSliderDrag, true);
    document.addEventListener("pointercancel", onSliderPointerCancel, true);
    document.addEventListener("selectstart", blockSliderGesture, true);
    document.addEventListener("dragstart", blockSliderGesture, true);
    document.addEventListener("contextmenu", blockSliderGesture, true);
    sliderDragRect = sliderHitArea.getBoundingClientRect();
    applyZoomFromClientX(event.clientX);
  });

  sliderHitArea.addEventListener("mousedown", (event) => {
    if (event.button !== 0 || isSliderDragging) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    isSliderDragging = true;
    cleanupActiveSliderDrag = cleanupDrag;
    document.addEventListener("mousemove", onSliderMouseMove, true);
    document.addEventListener("mouseup", stopSliderDrag, true);
    document.addEventListener("selectstart", blockSliderGesture, true);
    document.addEventListener("dragstart", blockSliderGesture, true);
    document.addEventListener("contextmenu", blockSliderGesture, true);
    sliderDragRect = sliderHitArea.getBoundingClientRect();
    applyZoomFromClientX(event.clientX);
  });
  sliderHitArea.addEventListener("keydown", (event) => {
    const nextZoom = getZoomFromSliderKey(event.key, state.zoom);
    if (nextZoom === null) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    setZoom(nextZoom, false);
    syncZoomControls();
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

function createMenuRow(label, control) {
  const row = document.createElement("div");
  row.className = "ytvt-menu-row";

  const labelElement = document.createElement("span");
  labelElement.className = "ytvt-menu-label";
  labelElement.textContent = label;

  const controlWrap = document.createElement("div");
  controlWrap.className = "ytvt-menu-control";
  controlWrap.append(control);

  row.append(labelElement, controlWrap);
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
  syncWheelTargetListenerMode();
  syncPointerTracking();
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

function getTriggerTitle() {
  return state.panMode ? "Turn off zoom mode" : "Turn on zoom mode";
}

function syncToolbarTrigger() {
  const trigger = toolbar?.querySelector(".ytvt-trigger");
  const label = trigger?.querySelector(".ytvt-trigger-label");
  if (!trigger || !label) {
    renderToolbar();
    return;
  }

  const title = getTriggerTitle();
  trigger.setAttribute("aria-label", title);
  trigger.title = title;
  label.textContent = formatZoomPercent(state.zoom);
}

function syncOpenZoomPanelControls() {
  if (!transformMenu) {
    return;
  }

  const progress = getSliderProgress();
  const sliderFill = transformMenu.querySelector(".ytvt-slider-fill");
  const sliderThumb = transformMenu.querySelector(".ytvt-slider-thumb");
  const sliderHitArea = transformMenu.querySelector(".ytvt-slider-hit-area");
  const zoomValue = transformMenu.querySelector(".ytvt-zoom-value");

  if (sliderFill) {
    sliderFill.style.width = progress;
  }
  if (sliderThumb) {
    sliderThumb.style.left = progress;
  }
  if (sliderHitArea) {
    sliderHitArea.setAttribute("aria-valuenow", String(Math.round(state.zoom)));
    sliderHitArea.setAttribute("aria-valuetext", formatZoomPercent(state.zoom));
  }
  if (zoomValue && document.activeElement !== zoomValue) {
    zoomValue.value = formatZoomPercent(state.zoom);
  }
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
    label.textContent = formatZoomPercent(state.zoom);
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

  toolbar.append(trigger);
  if (shouldRenderMenu) {
    renderMenu();
  }
}

function renderMenu() {
  if (!isMenuOpen) {
    cleanupSliderDrag();
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
  reset.title = "Reset view and turn off zoom mode";
  reset.addEventListener("click", () => resetState());

  const fill = document.createElement("button");
  fill.type = "button";
  fill.className = "ytvt-menu-fill";
  fill.textContent = "Fill";
  fill.title = "Zoom to fill the player";
  fill.addEventListener("click", fillScreen);

  const rotationGroup = document.createElement("div");
  rotationGroup.className = "ytvt-segment";
  ROTATIONS.forEach((rotation) => rotationGroup.append(createSegment(rotation)));

  cleanupSliderDrag();
  transformMenu.replaceChildren(
    fill,
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
  renderMinimap();
}

function closeMenuOnEscape(event) {
  if (!isMenuOpen || event.key !== "Escape") {
    return;
  }

  isMenuOpen = false;
  renderToolbar();
  renderMinimap();
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

function isCurrentVideoPointerEvent(event) {
  return Boolean(video && (event.target === video || event.composedPath?.().includes(video)));
}

function onPointerDown(event) {
  if (!state.panMode || event.button !== 0) {
    return;
  }

  if (!isCurrentVideoPointerEvent(event)) {
    return;
  }

  clearPanLongPressTimer();
  dragStart = {
    pointerId: event.pointerId,
    pointerType: event.pointerType,
    x: event.clientX,
    y: event.clientY,
    panX: state.panX,
    panY: state.panY,
    playbackRate: video.playbackRate,
    nativePressCanceled: false,
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
  viewportControlsLastActivityAt = Date.now();
  applyTransform();
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation?.();
}

function restorePanPlaybackRate() {
  if (!dragStart?.video) {
    return;
  }

  if (shouldRestoreYouTubeLongPressPlaybackRate({
    isDragging: dragStart.isDragging,
    currentRate: dragStart.video.playbackRate,
    panStartRate: dragStart.playbackRate,
  })) {
    dragStart.video.playbackRate = dragStart.playbackRate;
  }
}

function createPanPointerEvent(type) {
  if (typeof PointerEvent === "function") {
    return new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      pointerId: dragStart.pointerId,
      pointerType: dragStart.pointerType || "mouse",
      clientX: dragStart.x,
      clientY: dragStart.y,
      button: 0,
      buttons: 0,
    });
  }

  return new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: dragStart.x,
    clientY: dragStart.y,
    button: 0,
    buttons: 0,
  });
}

function cancelYouTubeHoldGesture() {
  if (!dragStart?.video || !shouldCancelYouTubeHoldGesture({
    isDragging: dragStart.isDragging,
    nativePressCanceled: dragStart.nativePressCanceled,
  })) {
    return;
  }

  dragStart.nativePressCanceled = true;
  isCancelingNativePress = true;
  try {
    dragStart.video.dispatchEvent(createPanPointerEvent("pointercancel"));
  } finally {
    isCancelingNativePress = false;
  }
  dragStart.video.dispatchEvent(new MouseEvent("mouseup", {
    bubbles: true,
    cancelable: true,
    clientX: dragStart.x,
    clientY: dragStart.y,
    button: 0,
    buttons: 0,
  }));
}

function onPlayerPointerEnter() {
  isPointerInPlayer = true;
}

function onPlayerPointerLeave() {
  isPointerInPlayer = false;
}

function applyWheelZoomFromEvent(event) {
  blockYouTubeWheel(event);
  viewportControlsLastActivityAt = Date.now();
  scheduleViewportControlsHide();
  setWheelZoom(event);
}

function updateLastPointerPosition(event) {
  if (!Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) {
    return;
  }

  lastPointerClientX = event.clientX;
  lastPointerClientY = event.clientY;
  hasLastPointerPosition = true;
  const eventPath = event.composedPath?.() || [];
  isPointerInPlayer = Boolean(player && (event.target === player || player.contains(event.target) || eventPath.includes(player)));
  if (isPointerInPlayer) {
    markViewportControlsActivity({ shouldRender: false });
  }
}

function syncPointerTracking() {
  const shouldTrackPointer = state.panMode && isWatchPage();
  if (pointerTrackingBound === shouldTrackPointer) {
    return;
  }

  window.removeEventListener("pointermove", updateLastPointerPosition);
  window.removeEventListener("mousemove", updateLastPointerPosition);
  if (shouldTrackPointer) {
    const eventName = "PointerEvent" in window ? "pointermove" : "mousemove";
    window.addEventListener(eventName, updateLastPointerPosition, { passive: true });
  } else {
    hasLastPointerPosition = false;
  }
  pointerTrackingBound = shouldTrackPointer;
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

  applyWheelZoomFromEvent(event);
}

function onDocumentWheel(event) {
  if (!video) {
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

  const rect = player?.getBoundingClientRect?.();
  const eventPath = event.composedPath?.() || [];
  const isEventInPlayer = Boolean(player && (event.target === player || player.contains(event.target) || eventPath.includes(player)));
  const isWheelPointInPlayer = shouldHandlePlayerWheel(state, event.clientX, event.clientY, rect);
  const isLastPointerInPlayer = hasLastPointerPosition && shouldHandlePlayerWheel(state, lastPointerClientX, lastPointerClientY, rect);
  if (!isEventInPlayer && !isPointerInPlayer && !isWheelPointInPlayer && !isLastPointerInPlayer) {
    return;
  }

  applyWheelZoomFromEvent(event);
}

function endDrag(event) {
  if (isCancelingNativePress && event.type === "pointercancel") {
    return;
  }

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

function onVideoRateChange() {
  restorePanPlaybackRate();
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

function unbindVideo() {
  cleanupSliderDrag();
  cancelPanGesture();
  clearClickSuppression();
  if (video) {
    video.style.removeProperty(TRANSFORM_PROPERTY);
    lastTransformValue = "";
    video.removeEventListener("pointermove", onPointerMove);
    video.removeEventListener("pointerup", endDrag);
    video.removeEventListener("pointercancel", endDrag);
    video.removeEventListener("click", onVideoClick, true);
    video.removeEventListener("ratechange", onVideoRateChange);
    video.style.cursor = "";
  }
  video = null;
}

function bindVideo(nextVideo) {
  if (video === nextVideo) {
    applyTransform();
    return;
  }

  unbindVideo();
  video = nextVideo;
  video.addEventListener("pointermove", onPointerMove);
  video.addEventListener("pointerup", endDrag);
  video.addEventListener("pointercancel", endDrag);
  video.addEventListener("click", onVideoClick, true);
  video.addEventListener("ratechange", onVideoRateChange);
  applyTransform();
}

function bindWheelTarget(nextPlayer) {
  if (wheelTarget === nextPlayer) {
    syncWheelTargetListenerMode();
    return;
  }

  wheelTarget?.removeEventListener("wheel", onWheel, true);
  wheelTarget?.removeEventListener("pointerenter", onPlayerPointerEnter);
  wheelTarget?.removeEventListener("pointerleave", onPlayerPointerLeave);
  wheelTarget = nextPlayer;
  wheelTargetUsesBlockingListener = false;
  isPointerInPlayer = false;
  syncWheelTargetListenerMode();
  wheelTarget.addEventListener("pointerenter", onPlayerPointerEnter);
  wheelTarget.addEventListener("pointerleave", onPlayerPointerLeave);
}

function syncDocumentWheelListener(shouldBlockWheel) {
  if (documentWheelListenerBound === shouldBlockWheel) {
    return;
  }

  window.removeEventListener("wheel", onDocumentWheel, true);
  document.removeEventListener("wheel", onDocumentWheel, true);
  if (shouldBlockWheel) {
    window.addEventListener("wheel", onDocumentWheel, { capture: true, passive: false });
    document.addEventListener("wheel", onDocumentWheel, { capture: true, passive: false });
  }
  documentWheelListenerBound = shouldBlockWheel;
}

function syncWheelTargetListenerMode() {
  const shouldBlockWheel = Boolean(wheelTarget && shouldUseBlockingWheelListener(state));
  syncDocumentWheelListener(shouldBlockWheel);

  if (!wheelTarget) {
    wheelTargetUsesBlockingListener = false;
    return;
  }

  if (wheelTargetUsesBlockingListener === shouldBlockWheel) {
    return;
  }

  wheelTarget.removeEventListener("wheel", onWheel, true);
  if (shouldBlockWheel) {
    wheelTarget.addEventListener("wheel", onWheel, { capture: true, passive: false });
  }
  wheelTargetUsesBlockingListener = shouldBlockWheel;
}

function sync() {
  if (!isWatchPage()) {
    stopObservingPlayerStructure();
    clearTransform();
    toolbar?.remove();
    toolbar = null;
    unbindVideo();
    wheelTarget?.removeEventListener("wheel", onWheel, true);
    wheelTarget?.removeEventListener("pointerenter", onPlayerPointerEnter);
    wheelTarget?.removeEventListener("pointerleave", onPlayerPointerLeave);
    wheelTarget = null;
    isPointerInPlayer = false;
    syncWheelTargetListenerMode();
    state = createDefaultState();
    syncPointerTracking();
    isMenuOpen = false;
    currentVideoKey = "";
    observePlayerSize(null);
    player = null;
    return;
  }

  observePlayerStructure();

  const nextPlayer = findPlayer();
  const nextVideo = findVideo();

  if (!nextPlayer || !nextVideo) {
    return;
  }

  player = nextPlayer;
  observePlayerSize(nextPlayer);
  bindWheelTarget(nextPlayer);
  ensureToolbar();
  bindVideo(nextVideo);

  const nextVideoKey = getVideoKey();
  if (shouldResetForVideoKey(currentVideoKey, nextVideoKey)) {
    resetState();
  }
  currentVideoKey = nextVideoKey;
}

function scheduleSync() {
  if (syncFrame) {
    return;
  }

  syncFrame = requestAnimationFrame(() => {
    syncFrame = 0;
    sync();
  });
}

function containsPlayerStructure(node) {
  return node instanceof Element
    && (node.matches(PLAYER_STRUCTURE_SELECTOR) || Boolean(node.querySelector(PLAYER_STRUCTURE_SELECTOR)));
}

function observePlayerStructure() {
  if (!isWatchPage() || !document.documentElement || playerStructureObserver) {
    return;
  }

  playerStructureObserver = new MutationObserver((mutations) => {
    const playerWasReplaced = Boolean(player && !player.isConnected) || Boolean(video && !video.isConnected);
    const playerStructureChanged = mutations.some(({ addedNodes, removedNodes }) =>
      [...addedNodes, ...removedNodes].some(containsPlayerStructure));
    if (playerWasReplaced || playerStructureChanged) {
      scheduleSync();
    }
  });
  playerStructureObserver.observe(document.documentElement, { childList: true, subtree: true });
}

function stopObservingPlayerStructure() {
  playerStructureObserver?.disconnect();
  playerStructureObserver = null;
}

function observePlayerSize(nextPlayer) {
  if (observedPlayer === nextPlayer) {
    return;
  }

  resizeObserver?.disconnect();
  resizeObserver = null;
  observedPlayer = nextPlayer;
  if (!nextPlayer) {
    return;
  }

  resizeObserver = new ResizeObserver(() => applyTransform());
  resizeObserver.observe(nextPlayer);
}

function start() {
  sync();
  window.addEventListener("DOMContentLoaded", () => {
    scheduleSync();
  }, { once: true });
  window.addEventListener("yt-navigate-finish", scheduleSync);
  window.addEventListener("popstate", scheduleSync);
  window.addEventListener("keydown", blockYouTubeShortcutFromZoomInput, true);
  window.addEventListener("keyup", blockYouTubeShortcutFromZoomInput, true);
  window.addEventListener("keypress", blockYouTubeShortcutFromZoomInput, true);
  window.addEventListener("keydown", onShortcutKeyDown, true);
  window.addEventListener("pointerdown", onPointerDown, true);
  document.addEventListener("keydown", onShortcutKeyDown, true);
  document.addEventListener("pointerdown", closeMenuOnOutsidePointer, true);
  document.addEventListener("keydown", closeMenuOnEscape);
  document.addEventListener("fullscreenchange", scheduleSync);
  document.addEventListener("webkitfullscreenchange", scheduleSync);
}

start();
