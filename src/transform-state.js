(() => {
  const ALLOWED_ROTATIONS = new Set([0, 90, 180, 270]);
  const ZOOM_STEP = 5;
  const MIN_ZOOM = 100;
  const MAX_ZOOM = 500;
  const DEFAULT_VIEWPORT_MAP_SIZE = {
    width: 160,
    height: 90,
  };
  const VIEWPORT_MAP_BOUNDS = {
    maxWidth: 160,
    maxHeight: 96,
    minWidth: 44,
    minHeight: 44,
  };

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function createDefaultState() {
    return {
      zoom: 100,
      rotation: 0,
      flipX: false,
      flipY: false,
      panX: 0,
      panY: 0,
      panMode: false,
    };
  }

  function normalizeRotation(rotation) {
    if (!ALLOWED_ROTATIONS.has(rotation)) {
      throw new Error(`Unsupported rotation: ${rotation}`);
    }

    return rotation;
  }

  function getRotationFitScale(rotation, width = 0, height = 0) {
    const normalizedRotation = normalizeRotation(rotation);
    if (normalizedRotation === 0 || normalizedRotation === 180 || width <= 0 || height <= 0) {
      return 1;
    }

    return Number(Math.min(width / height, height / width).toFixed(4));
  }

  function getEffectiveScale(state, width, height) {
    return (state.zoom / 100) * getRotationFitScale(state.rotation, width, height);
  }

  function createTransformStyle(state, width = 0, height = 0) {
    const scale = getEffectiveScale(state, width, height);
    const scaleX = state.flipX ? -scale : scale;
    const scaleY = state.flipY ? -scale : scale;

    return {
      transform: `translate(${state.panX}px, ${state.panY}px) rotate(${normalizeRotation(state.rotation)}deg) scale(${scaleX}, ${scaleY})`,
      transformOrigin: "center center",
    };
  }

  function createImportantTransformCssText(state, width = 0, height = 0) {
    const style = createTransformStyle(state, width, height);
    return `transform: ${style.transform} !important; transform-origin: ${style.transformOrigin} !important;`;
  }

  function applyZoomDelta(zoom, direction) {
    return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom + direction * ZOOM_STEP));
  }

  function createViewportCenteredZoomState(state, zoom) {
    const nextZoom = clamp(zoom, MIN_ZOOM, MAX_ZOOM);
    if (nextZoom === MIN_ZOOM || state.zoom <= 0) {
      return { ...state, zoom: nextZoom, panX: 0, panY: 0 };
    }

    const scaleChange = nextZoom / state.zoom;
    return {
      ...state,
      zoom: nextZoom,
      panX: Math.round(state.panX * scaleChange),
      panY: Math.round(state.panY * scaleChange),
    };
  }

  function formatZoomPercent(zoom) {
    return `${Math.round(zoom)}%`;
  }

  function parseZoomPercentInput(value, fallbackZoom) {
    const parsed = Number.parseFloat(String(value).replace("%", "").trim());
    if (!Number.isFinite(parsed)) {
      return fallbackZoom;
    }

    return Math.round(clamp(parsed, MIN_ZOOM, MAX_ZOOM));
  }

  function shouldBlockYouTubeShortcutForZoomInput({ target, activeElement }) {
    return target === activeElement && target?.classList?.contains("ytvt-zoom-value") === true;
  }

  function shouldRenderToolbarOnEnsure({ hasExistingToolbar }) {
    return !hasExistingToolbar;
  }

  function shouldRenderMenuOnToolbarEnsure({ hasExistingMenu }) {
    return !hasExistingMenu;
  }

  function getZoomFromPointerPosition(rect, clientX, fallbackZoom = MIN_ZOOM) {
    if (!rect || rect.width <= 0) {
      return fallbackZoom;
    }

    const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
    return Math.round(MIN_ZOOM + ratio * (MAX_ZOOM - MIN_ZOOM));
  }

  function createFittedSourceSize(sourceWidth, sourceHeight, viewportWidth, viewportHeight) {
    if (sourceWidth <= 0 || sourceHeight <= 0 || viewportWidth <= 0 || viewportHeight <= 0) {
      return null;
    }

    const fitScale = Math.min(viewportWidth / sourceWidth, viewportHeight / sourceHeight);
    return {
      width: sourceWidth * fitScale,
      height: sourceHeight * fitScale,
    };
  }

  function createDisplayedSourceSize(sourceWidth, sourceHeight, rotation = 0) {
    const normalizedRotation = normalizeRotation(rotation);
    const isSideways = normalizedRotation === 90 || normalizedRotation === 270;

    return {
      width: isSideways ? sourceHeight : sourceWidth,
      height: isSideways ? sourceWidth : sourceHeight,
    };
  }

  function clampPanState(state, width, height) {
    const scale = getEffectiveScale(state, width, height);
    if (scale <= 1 || width <= 0 || height <= 0) {
      return { ...state, panX: 0, panY: 0 };
    }

    const isSideways = state.rotation === 90 || state.rotation === 270;
    const scaledWidth = (isSideways ? height : width) * scale;
    const scaledHeight = (isSideways ? width : height) * scale;
    const maxPanX = Math.max(0, (scaledWidth - width) / 2);
    const maxPanY = Math.max(0, (scaledHeight - height) / 2);

    return {
      ...state,
      panX: Math.round(clamp(state.panX, -maxPanX, maxPanX)),
      panY: Math.round(clamp(state.panY, -maxPanY, maxPanY)),
    };
  }

  function clampPanStateToViewport(state, sourceWidth, sourceHeight, viewportWidth, viewportHeight) {
    const scale = state.zoom / 100;
    const displayedSource = createDisplayedSourceSize(sourceWidth, sourceHeight, state.rotation);
    const fittedSource = createFittedSourceSize(displayedSource.width, displayedSource.height, viewportWidth, viewportHeight);
    if (!fittedSource || scale <= 1) {
      return { ...state, panX: 0, panY: 0 };
    }

    const maxPanX = Math.max(0, (fittedSource.width * scale - viewportWidth) / 2);
    const maxPanY = Math.max(0, (fittedSource.height * scale - viewportHeight) / 2);

    return {
      ...state,
      panX: Math.round(clamp(state.panX, -maxPanX, maxPanX)),
      panY: Math.round(clamp(state.panY, -maxPanY, maxPanY)),
    };
  }

  function shouldResetForVideoKey(currentVideoKey, nextVideoKey) {
    return Boolean(currentVideoKey && currentVideoKey !== nextVideoKey);
  }

  function shouldInterceptPanWheel(state) {
    return state.panMode === true;
  }

  function shouldShowTransientViewportControls({ isPanMode, isMenuOpen, isDragging, lastActivityAt, now, delayMs }) {
    if (isPanMode === false) {
      return false;
    }

    if (isMenuOpen) {
      return true;
    }

    if (isDragging) {
      return true;
    }

    return lastActivityAt > 0 && now - lastActivityAt < delayMs;
  }

  function getViewportControlsActivityAfterPanToggle({ isPanMode, now }) {
    return isPanMode ? now : 0;
  }

  function shouldStartPanDrag({ elapsedMs, distancePx, longPressMs, moveThresholdPx }) {
    return elapsedMs >= longPressMs || distancePx >= moveThresholdPx;
  }

  function shouldShowZoomTriggerText(state) {
    return state.panMode === true || state.zoom !== 100;
  }

  function shouldShowZoomTriggerActive(state) {
    return state.panMode === true;
  }

  function shouldSuppressClickAfterPanEnd({ wasDragging }) {
    return wasDragging === true;
  }

  function toggleMirrorState(state) {
    return {
      ...state,
      flipX: !state.flipX,
    };
  }

  function isEditableShortcutTarget(target) {
    const tagName = target?.tagName?.toUpperCase();
    return (
      target?.isContentEditable === true ||
      tagName === "INPUT" ||
      tagName === "TEXTAREA" ||
      tagName === "SELECT" ||
      target?.getAttribute?.("role") === "textbox"
    );
  }

  function shouldTogglePanShortcut(event) {
    const isPanKey = event?.code === "KeyP" || event?.key?.toLowerCase() === "p";
    return (
      isPanKey &&
      event?.altKey === true &&
      event?.shiftKey === true &&
      event?.ctrlKey !== true &&
      event?.metaKey !== true &&
      event?.repeat !== true &&
      !isEditableShortcutTarget(event?.target)
    );
  }

  function shouldReapplyTransformAfterMutation(state) {
    const defaultState = createDefaultState();
    return (
      state.zoom !== defaultState.zoom ||
      state.rotation !== defaultState.rotation ||
      state.flipX !== defaultState.flipX ||
      state.flipY !== defaultState.flipY ||
      state.panX !== defaultState.panX ||
      state.panY !== defaultState.panY
    );
  }

  function createViewportMapSize(width, height, rotation = 0) {
    if (width <= 0 || height <= 0) {
      return DEFAULT_VIEWPORT_MAP_SIZE;
    }

    const displayedSource = createDisplayedSourceSize(width, height, rotation);
    const aspect = displayedSource.width / displayedSource.height;
    let mapWidth = VIEWPORT_MAP_BOUNDS.maxWidth;
    let mapHeight = mapWidth / aspect;

    if (mapHeight > VIEWPORT_MAP_BOUNDS.maxHeight) {
      mapHeight = VIEWPORT_MAP_BOUNDS.maxHeight;
      mapWidth = mapHeight * aspect;
    }

    return {
      width: Math.round(clamp(mapWidth, VIEWPORT_MAP_BOUNDS.minWidth, VIEWPORT_MAP_BOUNDS.maxWidth)),
      height: Math.round(clamp(mapHeight, VIEWPORT_MAP_BOUNDS.minHeight, VIEWPORT_MAP_BOUNDS.maxHeight)),
    };
  }

  function createViewportIndicator(state, width, height, viewportWidth = width, viewportHeight = height) {
    const scale = state.zoom / 100;
    const displayedSource = createDisplayedSourceSize(width, height, state.rotation);
    const fittedSource = createFittedSourceSize(displayedSource.width, displayedSource.height, viewportWidth, viewportHeight);
    if (scale <= 0 || !fittedSource) {
      return { x: 0, y: 0, width: 1, height: 1 };
    }

    const indicatorWidth = viewportWidth / (fittedSource.width * scale);
    const indicatorHeight = viewportHeight / (fittedSource.height * scale);
    const x = 0.5 - state.panX / (fittedSource.width * scale) - indicatorWidth / 2;
    const y = 0.5 - state.panY / (fittedSource.height * scale) - indicatorHeight / 2;

    return {
      x: Number(x.toFixed(4)),
      y: Number(y.toFixed(4)),
      width: Number(indicatorWidth.toFixed(4)),
      height: Number(indicatorHeight.toFixed(4)),
    };
  }

  function createViewportOverlayLayout({
    mapSize,
    indicator,
    anchorIndicator = indicator,
    anchorTop = 50,
    anchorRight = 22,
    settingsButtonSize = 32,
    settingsGap = 8,
  }) {
    const indicatorLeft = anchorIndicator.x * mapSize.width;
    const indicatorTop = anchorIndicator.y * mapSize.height;
    const indicatorRight = (anchorIndicator.x + anchorIndicator.width) * mapSize.width;
    const indicatorBottom = (anchorIndicator.y + anchorIndicator.height) * mapSize.height;
    const overflowTop = Math.max(0, -indicatorTop);
    const overflowRight = Math.max(0, indicatorRight - mapSize.width);
    const overlayBottom = Math.max(mapSize.height, indicatorBottom);
    const indicatorCenterX = indicatorLeft + (anchorIndicator.width * mapSize.width) / 2;

    const mapTop = Math.ceil(anchorTop + overflowTop);
    const mapRight = Math.ceil(anchorRight + overflowRight);

    return {
      mapTop,
      mapRight,
      settingsTop: Math.ceil(mapTop + overlayBottom + settingsGap),
      settingsRight: Math.round(mapRight + mapSize.width - indicatorCenterX - settingsButtonSize / 2),
    };
  }

  function createTransformMenuTop({ settingsTop, settingsButtonHeight, menuGap = 8 }) {
    return Math.ceil(settingsTop + settingsButtonHeight + menuGap);
  }

  globalThis.YTVTTransform = {
    applyZoomDelta,
    clampPanState,
    clampPanStateToViewport,
    createDisplayedSourceSize,
    createViewportCenteredZoomState,
    createViewportIndicator,
    createViewportOverlayLayout,
    createViewportMapSize,
    createTransformMenuTop,
    createDefaultState,
    createImportantTransformCssText,
    createTransformStyle,
    formatZoomPercent,
    getViewportControlsActivityAfterPanToggle,
    getRotationFitScale,
    getZoomFromPointerPosition,
    normalizeRotation,
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
  };
})();
