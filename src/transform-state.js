(() => {
  const ALLOWED_ROTATIONS = new Set([0, 90, 180, 270]);
  const ZOOM_STEP = 5;
  const MIN_ZOOM = 100;
  const MAX_ZOOM = 500;

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

  function applyZoomDelta(zoom, direction) {
    return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom + direction * ZOOM_STEP));
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

  function shouldResetForVideoKey(currentVideoKey, nextVideoKey) {
    return Boolean(currentVideoKey && currentVideoKey !== nextVideoKey);
  }

  function shouldInterceptPanWheel(state) {
    return state.panMode === true;
  }

  function createViewportFrame(state, width, height) {
    const scale = state.zoom / 100;
    if (scale <= 1 || width <= 0 || height <= 0) {
      return { x: 0, y: 0, width: 1, height: 1 };
    }

    const frameWidth = 1 / scale;
    const frameHeight = 1 / scale;
    const x = clamp(0.5 - state.panX / (scale * width) - frameWidth / 2, 0, 1 - frameWidth);
    const y = clamp(0.5 - state.panY / (scale * height) - frameHeight / 2, 0, 1 - frameHeight);

    return {
      x: Number(x.toFixed(4)),
      y: Number(y.toFixed(4)),
      width: Number(frameWidth.toFixed(4)),
      height: Number(frameHeight.toFixed(4)),
    };
  }

  globalThis.YTVTTransform = {
    applyZoomDelta,
    clampPanState,
    createViewportFrame,
    createDefaultState,
    createTransformStyle,
    getRotationFitScale,
    normalizeRotation,
    shouldInterceptPanWheel,
    shouldResetForVideoKey,
  };
})();
