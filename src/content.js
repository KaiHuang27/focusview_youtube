const ROTATIONS = [0, 90, 180, 270];
const {
  applyZoomDelta,
  clampPanState,
  createViewportFrame,
  createDefaultState,
  createTransformStyle,
  shouldInterceptPanWheel,
  shouldReapplyTransformAfterMutation,
  shouldResetForVideoKey,
  shouldTogglePanShortcut,
} = globalThis.YTVTTransform;

let state = createDefaultState();
let video = null;
let player = null;
let wheelTarget = null;
let toolbar = null;
let viewportMap = null;
let resizeObserver = null;
let videoStyleObserver = null;
let reapplyFrame = 0;
let currentVideoKey = "";
let dragStart = null;
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
  return document.querySelector(".html5-video-player");
}

function findVideo() {
  return document.querySelector("video.html5-main-video");
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
  renderToolbar();
  applyTransform();
}

function renderToolbar() {
  if (!toolbar) {
    return;
  }

  toolbar.replaceChildren();

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = isMenuOpen ? "ytvt-trigger is-active" : "ytvt-trigger";
  trigger.textContent = `${state.zoom}%`;
  trigger.setAttribute("aria-haspopup", "menu");
  trigger.setAttribute("aria-expanded", String(isMenuOpen));
  trigger.title = "Open video transform menu";
  trigger.addEventListener("click", () => {
    isMenuOpen = !isMenuOpen;
    renderToolbar();
  });

  toolbar.append(trigger);

  if (!isMenuOpen) {
    return;
  }

  const menu = document.createElement("div");
  menu.className = "ytvt-menu";
  menu.setAttribute("role", "menu");

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
    state = clampPanState(state, video.clientWidth, video.clientHeight);
    renderToolbar();
    applyTransform();
  });

  const rotationGroup = document.createElement("div");
  rotationGroup.className = "ytvt-segment";
  ROTATIONS.forEach((rotation) => rotationGroup.append(createSegment(rotation)));

  menu.append(
    createMenuRow("Zoom", zoom, `${state.zoom}%`),
    createMenuRow("Rotation", rotationGroup, `${state.rotation}`),
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
    createMenuRow("Pan", createToggle("Pan mode", state.panMode, togglePanMode)),
    createMenuRow("Reset", createButton("Reset", "Reset video transform", false, resetState))
  );

  toolbar.append(menu);
}

function closeMenuOnOutsidePointer(event) {
  if (!isMenuOpen || !toolbar || toolbar.contains(event.target)) {
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

  const existing = player.querySelector(".ytvt-toolbar");
  toolbar = existing || document.createElement("div");
  toolbar.className = "ytvt-toolbar";
  toolbar.setAttribute("aria-label", "YouTube video transform controls");

  if (!existing) {
    toolbar.addEventListener("click", (event) => event.stopPropagation());
    toolbar.addEventListener("pointerdown", (event) => event.stopPropagation());
    toolbar.addEventListener("wheel", (event) => {
      event.preventDefault();
      event.stopPropagation();
    }, { passive: false });
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
  state = clampPanState(state, video.clientWidth, video.clientHeight);
  applyTransform();
  event.preventDefault();
}

function onWheel(event) {
  if (!shouldInterceptPanWheel(state) || !video) {
    return;
  }

  if (toolbar?.contains(event.target)) {
    blockYouTubeWheel(event);
    return;
  }

  blockYouTubeWheel(event);
  const direction = event.deltaY < 0 ? 1 : -1;
  state.zoom = applyZoomDelta(state.zoom, direction);
  state = clampPanState(state, video.clientWidth, video.clientHeight);
  renderToolbar();
  applyTransform();
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
    videoStyleObserver?.disconnect();
    videoStyleObserver = null;
  }

  video = nextVideo;
  video.addEventListener("pointerdown", onPointerDown);
  video.addEventListener("pointermove", onPointerMove);
  video.addEventListener("pointerup", endDrag);
  video.addEventListener("pointercancel", endDrag);
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
  wheelTarget = nextPlayer;
  wheelTarget.addEventListener("wheel", onWheel, { capture: true, passive: false });
}

function sync() {
  if (!isWatchPage()) {
    clearTransform();
    toolbar?.remove();
    toolbar = null;
    viewportMap?.remove();
    viewportMap = null;
    videoStyleObserver?.disconnect();
    videoStyleObserver = null;
    if (reapplyFrame) {
      cancelAnimationFrame(reapplyFrame);
      reapplyFrame = 0;
    }
    wheelTarget?.removeEventListener("wheel", onWheel, true);
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
  window.addEventListener("keydown", onShortcutKeyDown, true);
  document.addEventListener("keydown", onShortcutKeyDown, true);
  document.addEventListener("pointerdown", closeMenuOnOutsidePointer, true);
  document.addEventListener("keydown", closeMenuOnEscape);
  document.addEventListener("fullscreenchange", () => scheduleTransformReapply(12));
  document.addEventListener("webkitfullscreenchange", () => scheduleTransformReapply(12));
}

start();
