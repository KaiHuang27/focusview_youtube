(() => {
  const ALLOWED_ROTATIONS = new Set([0, 90, 180, 270]);
  const ZOOM_STEP = 10;
  const MIN_ZOOM = 50;
  const MAX_ZOOM = 300;

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

  globalThis.YTVTTransform = {
    applyZoomDelta,
    createDefaultState,
    createTransformStyle,
    normalizeRotation,
  };
})();
