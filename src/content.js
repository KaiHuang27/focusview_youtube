const ROTATIONS = [0, 90, 180, 270];
const {
  applyZoomDelta,
  createViewportFrame,
  createDefaultState,
  createTransformStyle,
  shouldResetForVideoKey,
} = globalThis.YTVTTransform;

let state = createDefaultState();
let video = null;
let player = null;
let toolbar = null;
let viewportMap = null;
let resizeObserver = null;
let currentVideoKey = "";
let dragStart = null;

function resetState() {
  state = createDefaultState();
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
  return document.querySelector(".html5-video-player");
}

function findVideo() {
  return document.querySelector("video.html5-main-video");
}

function applyTransform() {
  if (!video) {
    return;
  }

  const style = createTransformStyle(state);
  video.style.transform = style.transform;
  video.style.transformOrigin = style.transformOrigin;
  video.style.cursor = state.panMode ? "grab" : "";
  renderViewportMap();
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

  const frame = createViewportFrame(state, video.clientWidth, video.clientHeight);
  const frameElement = viewportMap.querySelector(".ytvt-map-frame");
  frameElement.style.left = `${frame.x * 100}%`;
  frameElement.style.top = `${frame.y * 100}%`;
  frameElement.style.width = `${frame.width * 100}%`;
  frameElement.style.height = `${frame.height * 100}%`;
  viewportMap.hidden = state.zoom === 100 && state.panX === 0 && state.panY === 0;
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

function renderToolbar() {
  if (!toolbar) {
    return;
  }

  toolbar.replaceChildren();

  const zoomLabel = document.createElement("span");
  zoomLabel.className = "ytvt-label";
  zoomLabel.textContent = `${state.zoom}%`;

  const zoom = document.createElement("input");
  zoom.className = "ytvt-slider";
  zoom.type = "range";
  zoom.min = "100";
  zoom.max = "500";
  zoom.step = "1";
  zoom.value = String(state.zoom);
  zoom.title = "Zoom";
  zoom.addEventListener("input", () => {
    state.zoom = Number(zoom.value);
    zoomLabel.textContent = `${state.zoom}%`;
    applyTransform();
  });

  const rotationGroup = document.createElement("div");
  rotationGroup.className = "ytvt-segment";
  ROTATIONS.forEach((rotation) => rotationGroup.append(createSegment(rotation)));

  toolbar.append(
    zoomLabel,
    zoom,
    rotationGroup,
    createButton("H", "Mirror horizontally", state.flipX, () => {
      state.flipX = !state.flipX;
      renderToolbar();
      applyTransform();
    }),
    createButton("V", "Mirror vertically", state.flipY, () => {
      state.flipY = !state.flipY;
      renderToolbar();
      applyTransform();
    }),
    createButton("Pan", "Drag video while enabled", state.panMode, () => {
      state.panMode = !state.panMode;
      renderToolbar();
      applyTransform();
    }),
    createButton("Reset", "Reset video transform", false, resetState)
  );
}

function ensureToolbar() {
  if (!player) {
    return;
  }

  const existing = player.querySelector(".ytvt-toolbar");
  toolbar = existing || document.createElement("div");
  toolbar.className = "ytvt-toolbar";
  toolbar.setAttribute("aria-label", "YouTube video transform controls");

  if (!existing) {
    toolbar.addEventListener("click", (event) => event.stopPropagation());
    toolbar.addEventListener("pointerdown", (event) => event.stopPropagation());
    player.append(toolbar);
  }

  renderToolbar();
}

function onPointerDown(event) {
  if (!state.panMode || event.button !== 0) {
    return;
  }

  dragStart = {
    pointerId: event.pointerId,
    x: event.clientX,
    y: event.clientY,
    panX: state.panX,
    panY: state.panY,
  };
  video.setPointerCapture(event.pointerId);
  video.style.cursor = "grabbing";
  event.preventDefault();
}

function onPointerMove(event) {
  if (!dragStart || event.pointerId !== dragStart.pointerId) {
    return;
  }

  state.panX = Math.round(dragStart.panX + event.clientX - dragStart.x);
  state.panY = Math.round(dragStart.panY + event.clientY - dragStart.y);
  applyTransform();
  event.preventDefault();
}

function onWheel(event) {
  if (!state.panMode) {
    return;
  }

  const direction = event.deltaY < 0 ? 1 : -1;
  state.zoom = applyZoomDelta(state.zoom, direction);
  renderToolbar();
  applyTransform();
  event.preventDefault();
}

function endDrag(event) {
  if (!dragStart || event.pointerId !== dragStart.pointerId) {
    return;
  }

  dragStart = null;
  video.style.cursor = state.panMode ? "grab" : "";
}

function bindVideo(nextVideo) {
  if (video === nextVideo) {
    applyTransform();
    return;
  }

  if (video) {
    video.removeEventListener("pointerdown", onPointerDown);
    video.removeEventListener("pointermove", onPointerMove);
    video.removeEventListener("pointerup", endDrag);
    video.removeEventListener("pointercancel", endDrag);
    video.removeEventListener("wheel", onWheel);
  }

  video = nextVideo;
  video.addEventListener("pointerdown", onPointerDown);
  video.addEventListener("pointermove", onPointerMove);
  video.addEventListener("pointerup", endDrag);
  video.addEventListener("pointercancel", endDrag);
  video.addEventListener("wheel", onWheel, { passive: false });
  applyTransform();
}

function sync() {
  if (!isWatchPage()) {
    clearTransform();
    toolbar?.remove();
    toolbar = null;
    viewportMap?.remove();
    viewportMap = null;
    state = createDefaultState();
    currentVideoKey = "";
    return;
  }

  const nextPlayer = findPlayer();
  const nextVideo = findVideo();

  if (!nextPlayer || !nextVideo) {
    return;
  }

  player = nextPlayer;
  ensureToolbar();
  bindVideo(nextVideo);

  const nextVideoKey = getVideoKey();
  if (shouldResetForVideoKey(currentVideoKey, nextVideoKey)) {
    resetState();
  }
  currentVideoKey = nextVideoKey;
}

function observePlayerSize() {
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
}

start();
