(() => {
  const ALLOWED_ROTATIONS = new Set([0, 90, 180, 270]);

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

  globalThis.YTVTTransform = {
    createDefaultState,
    createTransformStyle,
    normalizeRotation,
  };
})();
