(() => {
  const ALLOWED_ROTATIONS = new Set([0, 90, 180, 270]);
  const ZOOM_STEP = 5;
  const WHEEL_ZOOM_SENSITIVITY = 0.001;
  const WHEEL_DELTA_LINE_HEIGHT = 16;
  const WHEEL_DELTA_PAGE_HEIGHT = 800;
  const MAX_WHEEL_DELTA = 140;
  const WHEEL_ZOOM_ANIMATION_FOLLOW_RATIO = 0.35;
  const MIN_ZOOM = 100;
  const MAX_ZOOM = 500;
  const DEFAULT_MINIMAP_SIZE = {
    width: 160,
    height: 90,
  };
  const MINIMAP_BOUNDS = {
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
      panX: 0,
      panY: 0,
      panMode: false,
    };
  }

  function resetTransformState() {
    return createDefaultState();
  }

  function normalizeRotation(rotation) {
    if (!ALLOWED_ROTATIONS.has(rotation)) {
      throw new Error(`Unsupported rotation: ${rotation}`);
    }

    return rotation;
  }

  function getRotationFitScale(rotation, sourceWidth = 0, sourceHeight = 0, viewportWidth = sourceWidth, viewportHeight = sourceHeight) {
    const normalizedRotation = normalizeRotation(rotation);
    if (normalizedRotation === 0 || normalizedRotation === 180) {
      return 1;
    }

    const fittedSource = createFittedSourceSize(sourceWidth, sourceHeight, viewportWidth, viewportHeight);
    if (!fittedSource) {
      return 1;
    }

    return Number(Math.min(viewportWidth / fittedSource.height, viewportHeight / fittedSource.width).toFixed(4));
  }

  function getEffectiveScale(state, sourceWidth, sourceHeight, viewportWidth, viewportHeight) {
    return (state.zoom / 100) * getRotationFitScale(state.rotation, sourceWidth, sourceHeight, viewportWidth, viewportHeight);
  }

  function createTransformStyle(state, sourceWidth = 0, sourceHeight = 0, viewportWidth = sourceWidth, viewportHeight = sourceHeight) {
    const scale = getEffectiveScale(state, sourceWidth, sourceHeight, viewportWidth, viewportHeight);
    const scaleX = state.flipX ? -scale : scale;

    return {
      transform: `translate(${state.panX}px, ${state.panY}px) rotate(${normalizeRotation(state.rotation)}deg) scale(${scaleX}, ${scale})`,
      transformOrigin: "center center",
    };
  }

  function createImportantTransformCssText(state, sourceWidth = 0, sourceHeight = 0, viewportWidth = sourceWidth, viewportHeight = sourceHeight) {
    const style = createTransformStyle(state, sourceWidth, sourceHeight, viewportWidth, viewportHeight);
    return `transform: ${style.transform} !important; transform-origin: ${style.transformOrigin} !important;`;
  }

  function applyZoomDelta(zoom, direction) {
    return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom + direction * ZOOM_STEP));
  }

  function normalizeWheelDelta(event) {
    const deltaY = Number.isFinite(event?.deltaY) ? event.deltaY : 0;
    const deltaMode = event?.deltaMode ?? 0;
    const pixelDelta =
      deltaMode === 1 ? deltaY * WHEEL_DELTA_LINE_HEIGHT : deltaMode === 2 ? deltaY * WHEEL_DELTA_PAGE_HEIGHT : deltaY;

    return clamp(pixelDelta, -MAX_WHEEL_DELTA, MAX_WHEEL_DELTA);
  }

  function applyWheelZoomDelta(zoom, event) {
    const wheelDelta = normalizeWheelDelta(event);
    const scale = Math.exp(-wheelDelta * WHEEL_ZOOM_SENSITIVITY);
    const nextZoom = Math.round(clamp(zoom * scale, MIN_ZOOM, MAX_ZOOM));
    if (wheelDelta !== 0 && nextZoom === zoom) {
      const direction = wheelDelta < 0 ? 1 : -1;
      return clamp(zoom + direction, MIN_ZOOM, MAX_ZOOM);
    }

    return nextZoom;
  }

  function getWheelZoomAnimationStep(currentZoom, targetZoom) {
    if (currentZoom === targetZoom) {
      return targetZoom;
    }

    const remaining = Math.abs(targetZoom - currentZoom);
    if (remaining <= 1) {
      return targetZoom;
    }

    const direction = targetZoom > currentZoom ? 1 : -1;
    const step = Math.max(1, Math.round(remaining * WHEEL_ZOOM_ANIMATION_FOLLOW_RATIO));
    return currentZoom + direction * step;
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

  function createFillScreenZoom(sourceWidth, sourceHeight, viewportWidth, viewportHeight, rotation = 0) {
    const displayedSource = createDisplayedSourceSize(sourceWidth, sourceHeight, rotation);
    const fittedSource = createFittedSourceSize(displayedSource.width, displayedSource.height, viewportWidth, viewportHeight);
    if (!fittedSource) {
      return MIN_ZOOM;
    }

    const coverZoom = Math.ceil(Math.max(viewportWidth / fittedSource.width, viewportHeight / fittedSource.height) * 100);
    return clamp(coverZoom, MIN_ZOOM, MAX_ZOOM);
  }

  function createCursorCenteredZoomState(state, zoom, cursorOffsetX, cursorOffsetY) {
    const nextZoom = clamp(zoom, MIN_ZOOM, MAX_ZOOM);
    if (nextZoom === MIN_ZOOM || state.zoom <= 0) {
      return { ...state, zoom: nextZoom, panX: 0, panY: 0 };
    }

    const scaleChange = nextZoom / state.zoom;
    return {
      ...state,
      zoom: nextZoom,
      panX: Math.round(state.panX * scaleChange + cursorOffsetX * (1 - scaleChange)),
      panY: Math.round(state.panY * scaleChange + cursorOffsetY * (1 - scaleChange)),
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

  function getZoomFromSliderKey(key, currentZoom) {
    if (key === "Home") {
      return MIN_ZOOM;
    }
    if (key === "End") {
      return MAX_ZOOM;
    }
    if (key === "ArrowLeft" || key === "ArrowDown") {
      return applyZoomDelta(currentZoom, -1);
    }
    if (key === "ArrowRight" || key === "ArrowUp") {
      return applyZoomDelta(currentZoom, 1);
    }

    return null;
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

  function shouldUseBlockingWheelListener(state) {
    return shouldInterceptPanWheel(state);
  }

  function shouldHandlePlayerWheel(state, clientX, clientY, rect) {
    if (!shouldInterceptPanWheel(state) || !rect || rect.width <= 0 || rect.height <= 0) {
      return false;
    }

    if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) {
      return false;
    }

    return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
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

  function shouldCancelYouTubeHoldGesture({ isDragging, nativePressCanceled }) {
    return isDragging === true && nativePressCanceled !== true;
  }

  function shouldRestoreYouTubeLongPressPlaybackRate({ isDragging, currentRate, panStartRate }) {
    return isDragging === true && Number.isFinite(currentRate) && Number.isFinite(panStartRate) && currentRate !== panStartRate;
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
    const isPanKey = event?.code === "KeyZ" || event?.key?.toLowerCase() === "z";
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
      state.panX !== defaultState.panX ||
      state.panY !== defaultState.panY
    );
  }

  function createMinimapSize(width, height, rotation = 0, viewportWidth = 0, viewportHeight = 0) {
    if (width <= 0 || height <= 0) {
      return DEFAULT_MINIMAP_SIZE;
    }

    const displayedSource = createDisplayedSourceSize(width, height, rotation);
    if (viewportWidth > 0 && viewportHeight > 0) {
      const viewportPreviewSize = createMinimapSize(viewportWidth, viewportHeight);
      const fittedSource = createFittedSourceSize(
        displayedSource.width,
        displayedSource.height,
        viewportPreviewSize.width,
        viewportPreviewSize.height
      );
      if (fittedSource) {
        return {
          width: Math.round(clamp(fittedSource.width, MINIMAP_BOUNDS.minWidth, viewportPreviewSize.width)),
          height: Math.round(clamp(fittedSource.height, MINIMAP_BOUNDS.minHeight, viewportPreviewSize.height)),
        };
      }
    }

    const aspect = displayedSource.width / displayedSource.height;
    let mapWidth = MINIMAP_BOUNDS.maxWidth;
    let mapHeight = mapWidth / aspect;

    if (mapHeight > MINIMAP_BOUNDS.maxHeight) {
      mapHeight = MINIMAP_BOUNDS.maxHeight;
      mapWidth = mapHeight * aspect;
    }

    return {
      width: Math.round(clamp(mapWidth, MINIMAP_BOUNDS.minWidth, MINIMAP_BOUNDS.maxWidth)),
      height: Math.round(clamp(mapHeight, MINIMAP_BOUNDS.minHeight, MINIMAP_BOUNDS.maxHeight)),
    };
  }

  function createViewportIndicator(state, width, height, viewportWidth = width, viewportHeight = height) {
    const scale = state.zoom / 100;
    const displayedSource = createDisplayedSourceSize(width, height, state.rotation);
    const fittedSource = createFittedSourceSize(displayedSource.width, displayedSource.height, viewportWidth, viewportHeight);
    if (scale <= 0 || !fittedSource) {
      return { x: 0, y: 0, width: 1, height: 1 };
    }

    let indicatorWidth = viewportWidth / (fittedSource.width * scale);
    let indicatorHeight = viewportHeight / (fittedSource.height * scale);
    if (state.rotation === 90 || state.rotation === 270) {
      const minimapSize = createMinimapSize(width, height, state.rotation, viewportWidth, viewportHeight);
      const viewportPreviewSize = createMinimapSize(viewportWidth, viewportHeight);
      indicatorWidth = viewportPreviewSize.width / minimapSize.width / scale;
      indicatorHeight = viewportPreviewSize.height / minimapSize.height / scale;
    }
    const x = 0.5 - state.panX / (fittedSource.width * scale) - indicatorWidth / 2;
    const y = 0.5 - state.panY / (fittedSource.height * scale) - indicatorHeight / 2;

    return {
      x: Number(x.toFixed(4)),
      y: Number(y.toFixed(4)),
      width: Number(indicatorWidth.toFixed(4)),
      height: Number(indicatorHeight.toFixed(4)),
    };
  }

  function createViewportIndicatorRect(indicator, minimapSize, viewportPreviewSize = null, scale = 1) {
    const width = viewportPreviewSize?.width > 0 ? viewportPreviewSize.width / scale : indicator.width * minimapSize.width;
    const height = viewportPreviewSize?.height > 0 ? viewportPreviewSize.height / scale : indicator.height * minimapSize.height;
    const centerX = (indicator.x + indicator.width / 2) * minimapSize.width;
    const centerY = (indicator.y + indicator.height / 2) * minimapSize.height;

    return {
      left: Math.round(centerX - width / 2),
      top: Math.round(centerY - height / 2),
      width: Math.round(width),
      height: Math.round(height),
    };
  }

  function createViewportOverlayLayout({
    minimapSize,
    indicator,
    anchorIndicator = indicator,
    indicatorRect = null,
    anchorIndicatorRect = indicatorRect,
    anchorTop = 50,
    anchorRight = 22,
    settingsButtonSize = 32,
    settingsGap = 8,
  }) {
    if (anchorIndicatorRect) {
      const minimapTop = Math.ceil(anchorTop - anchorIndicatorRect.top);
      const minimapRight = Math.ceil(anchorRight + anchorIndicatorRect.left + anchorIndicatorRect.width - minimapSize.width);

      return {
        minimapTop,
        minimapRight,
        settingsTop: Math.ceil(anchorTop + anchorIndicatorRect.height + settingsGap),
        settingsRight: Math.round(anchorRight + anchorIndicatorRect.width / 2 - settingsButtonSize / 2),
      };
    }

    const indicatorLeft = anchorIndicator.x * minimapSize.width;
    const indicatorTop = anchorIndicator.y * minimapSize.height;
    const indicatorRight = (anchorIndicator.x + anchorIndicator.width) * minimapSize.width;
    const indicatorBottom = (anchorIndicator.y + anchorIndicator.height) * minimapSize.height;
    const overflowTop = Math.max(0, -indicatorTop);
    const overflowRight = Math.max(0, indicatorRight - minimapSize.width);
    const overlayBottom = Math.max(minimapSize.height, indicatorBottom);
    const indicatorCenterX = indicatorLeft + (anchorIndicator.width * minimapSize.width) / 2;

    const minimapTop = Math.ceil(anchorTop + overflowTop);
    const minimapRight = Math.ceil(anchorRight + overflowRight);

    return {
      minimapTop,
      minimapRight,
      settingsTop: Math.ceil(minimapTop + overlayBottom + settingsGap),
      settingsRight: Math.round(minimapRight + minimapSize.width - indicatorCenterX - settingsButtonSize / 2),
    };
  }

  function createTransformMenuTop({ settingsTop, settingsButtonHeight, menuGap = 8 }) {
    return Math.ceil(settingsTop + settingsButtonHeight + menuGap);
  }

  globalThis.YTVTTransform = {
    applyZoomDelta,
    applyWheelZoomDelta,
    clampPanStateToViewport,
    createDisplayedSourceSize,
    createCursorCenteredZoomState,
    createFillScreenZoom,
    createViewportCenteredZoomState,
    createViewportIndicator,
    createViewportIndicatorRect,
    createViewportOverlayLayout,
    createMinimapSize,
    createTransformMenuTop,
    createDefaultState,
    resetTransformState,
    createImportantTransformCssText,
    createTransformStyle,
    formatZoomPercent,
    getViewportControlsActivityAfterPanToggle,
    getRotationFitScale,
    getWheelZoomAnimationStep,
    getZoomFromSliderKey,
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
  };
})();
