(() => {
  const ALLOWED_ROTATIONS = new Set([0, 90, 180, 270]);
  const ZOOM_STEP = 10;
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

  function createTransformStyle(state) {
    const scale = state.zoom / 100;
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
    const scale = state.zoom / 100;
    if (scale <= 1 || width <= 0 || height <= 0) {
      return { ...state, panX: 0, panY: 0 };
    }

    const maxPanX = ((scale - 1) * width) / 2;
    const maxPanY = ((scale - 1) * height) / 2;

    return {
      ...state,
      panX: Math.round(clamp(state.panX, -maxPanX, maxPanX)),
      panY: Math.round(clamp(state.panY, -maxPanY, maxPanY)),
    };
  }

  function shouldResetForVideoKey(currentVideoKey, nextVideoKey) {
    return Boolean(currentVideoKey && currentVideoKey !== nextVideoKey);
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
    normalizeRotation,
    shouldResetForVideoKey,
  };
})();
