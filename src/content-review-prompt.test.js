import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const REVIEW_STORAGE_KEY = "focusview-review-prompt-v2";
const CHROME_REVIEW_URL = "https://chromewebstore.google.com/detail/jbdndcjclbghkmbiehjigaapembpbgdb/reviews";
const SAFARI_REVIEW_URL = "https://apps.apple.com/us/app/focusview-zoom-for-youtube/id6786108302?action=write-review";

class FakeElement {
  constructor(tagName, ownerDocument = null) {
    this.tagName = tagName.toUpperCase();
    this.ownerDocument = ownerDocument;
    this.children = [];
    this.parentElement = null;
    this.attributes = {};
    this.dataset = {};
    this.style = {};
    this.eventListeners = new Map();
    this.className = "";
    this.textContent = "";
    this._innerHTML = "";
    this.id = "";
    this.href = "";
    this.target = "";
    this.rel = "";
    this.tabIndex = 0;
  }

  get firstElementChild() {
    return this.children[0] || null;
  }

  get isConnected() {
    return this === this.ownerDocument?.documentElement || Boolean(this.parentElement?.isConnected);
  }

  get classList() {
    return {
      add: (...names) => {
        const current = new Set(this.className.split(/\s+/).filter(Boolean));
        names.forEach((name) => current.add(name));
        this.className = [...current].join(" ");
      },
      toggle: (name, enabled) => {
        const current = new Set(this.className.split(/\s+/).filter(Boolean));
        if (enabled) {
          current.add(name);
        } else {
          current.delete(name);
        }
        this.className = [...current].join(" ");
      },
      contains: (name) => this.className.split(/\s+/).includes(name),
    };
  }

  get innerHTML() {
    return this._innerHTML;
  }

  set innerHTML(value) {
    this._innerHTML = String(value);
    this.children.forEach((child) => {
      child.parentElement = null;
    });
    this.children = [];
    if (this._innerHTML.includes("ytvt-viewport-indicator")) {
      const indicator = new FakeElement("div", this.ownerDocument);
      indicator.className = "ytvt-viewport-indicator";
      this.append(indicator);
    }
    if (this._innerHTML.includes("ytvt-settings-icon")) {
      const icon = new FakeElement("svg", this.ownerDocument);
      icon.className = "ytvt-settings-icon";
      this.append(icon);
    }
  }

  append(...nodes) {
    nodes.forEach((node) => {
      node.remove?.();
      node.parentElement = this;
      this.children.push(node);
    });
  }

  prepend(node) {
    node.remove?.();
    node.parentElement = this;
    this.children.unshift(node);
  }

  replaceChildren(...nodes) {
    this.children.forEach((child) => {
      child.parentElement = null;
    });
    this.children = [];
    this.append(...nodes);
  }

  remove() {
    if (!this.parentElement) {
      return;
    }
    this.parentElement.children = this.parentElement.children.filter((child) => child !== this);
    this.parentElement = null;
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
    if (name === "id") {
      this.id = String(value);
    }
    if (name === "href") {
      this.href = String(value);
    }
  }

  addEventListener(type, listener) {
    const listeners = this.eventListeners.get(type) || [];
    listeners.push(listener);
    this.eventListeners.set(type, listeners);
  }

  removeEventListener(type, listener) {
    const listeners = this.eventListeners.get(type) || [];
    this.eventListeners.set(type, listeners.filter((current) => current !== listener));
  }

  dispatchEvent(event) {
    event.target ||= this;
    const listeners = this.eventListeners.get(event.type) || [];
    listeners.forEach((listener) => listener.call(this, event));
    return !event.defaultPrevented;
  }

  click() {
    this.dispatchEvent({
      type: "click",
      target: this,
      defaultPrevented: false,
      preventDefault() {
        this.defaultPrevented = true;
      },
      stopPropagation() {},
      stopImmediatePropagation() {},
    });
  }

  focus() {
    if (this.ownerDocument) {
      this.ownerDocument.activeElement = this;
    }
  }

  contains(node) {
    return node === this || this.children.some((child) => child.contains(node));
  }

  closest(selector) {
    let current = this;
    while (current) {
      if (current.matches(selector)) {
        return current;
      }
      current = current.parentElement;
    }
    return null;
  }

  matches(selector) {
    if (selector.includes(",")) {
      return selector.split(",").some((part) => this.matches(part.trim()));
    }
    if (selector === "*") {
      return true;
    }
    if (selector === '[data-ytvt-toolbar="true"]') {
      return this.dataset.ytvtToolbar === "true";
    }
    if (selector === "video.html5-main-video") {
      return this.tagName === "VIDEO" && this.classList.contains("html5-main-video");
    }
    if (selector === "a[href]") {
      return this.tagName === "A" && Boolean(this.href);
    }
    if (selector === "button:not([disabled])") {
      return this.tagName === "BUTTON" && !this.attributes.disabled;
    }
    if (selector.startsWith(".")) {
      return this.classList.contains(selector.slice(1));
    }
    return this.tagName.toLowerCase() === selector.toLowerCase();
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }

  querySelectorAll(selector) {
    const matches = [];
    const visit = (node) => {
      node.children.forEach((child) => {
        if (child.matches(selector)) {
          matches.push(child);
        }
        visit(child);
      });
    };
    visit(this);
    return matches;
  }

  getBoundingClientRect() {
    return { left: 0, top: 0, width: 1280, height: 720, right: 1280, bottom: 720 };
  }
}

class FakeDocument {
  constructor() {
    this.documentElement = new FakeElement("html", this);
    this.body = new FakeElement("body", this);
    this.documentElement.append(this.body);
    this.activeElement = this.body;
  }

  createElement(tagName) {
    return new FakeElement(tagName, this);
  }

  createElementNS(_namespace, tagName) {
    return this.createElement(tagName);
  }

  getElementById(id) {
    return this.documentElement.querySelectorAll("*").find((element) => element.id === id) || null;
  }

  querySelector(selector) {
    return this.documentElement.querySelector(selector);
  }

  querySelectorAll(selector) {
    return this.documentElement.querySelectorAll(selector);
  }

  addEventListener() {}

  removeEventListener() {}
}

function createFakeStorage() {
  const data = {};
  return {
    data,
    area: {
      async get(key) {
        return key in data ? { [key]: data[key] } : {};
      },
      async set(entries) {
        Object.assign(data, entries);
      },
    },
    pageStorage: {
      getItem: (key) => data[key] || null,
      setItem: (key, value) => {
        data[key] = value;
      },
      removeItem: (key) => {
        delete data[key];
      },
    },
  };
}

async function loadContentScript({ userAgent, reviewState = null }) {
  const document = new FakeDocument();
  const storage = createFakeStorage();
  if (reviewState) {
    storage.data[REVIEW_STORAGE_KEY] = reviewState;
  }
  const player = document.createElement("div");
  player.className = "html5-video-player";
  const controls = document.createElement("div");
  controls.className = "ytp-right-controls";
  const video = document.createElement("video");
  video.className = "html5-main-video";
  video.videoWidth = 1280;
  video.videoHeight = 720;
  video.playbackRate = 1;
  video.addEventListener = FakeElement.prototype.addEventListener.bind(video);
  video.removeEventListener = FakeElement.prototype.removeEventListener.bind(video);
  player.append(video, controls);
  document.body.append(player);

  const context = vm.createContext({
    document,
    window: {
      document,
      location: { pathname: "/watch", search: "?v=test" },
      localStorage: storage.pageStorage,
      addEventListener() {},
      removeEventListener() {},
    },
    navigator: { userAgent },
    chrome: {
      runtime: { getURL: (path) => `chrome-extension://focusview/${path}` },
      storage: { local: storage.area },
    },
    browser: undefined,
    Element: FakeElement,
    MouseEvent: class {
      constructor(type, init = {}) {
        this.type = type;
        Object.assign(this, init);
      }
    },
    MutationObserver: class {
      observe() {}
      disconnect() {}
    },
    ResizeObserver: class {
      observe() {}
      disconnect() {}
    },
    URLSearchParams,
    clearTimeout,
    setTimeout,
    requestAnimationFrame: (callback) => {
      callback();
      return 1;
    },
    cancelAnimationFrame() {},
  });

  for (const sourcePath of ["src/transform-state.js", "src/review-prompt-state.js", "src/content.js"]) {
    vm.runInContext(await readFile(new URL(`../${sourcePath}`, import.meta.url), "utf8"), context);
  }

  return { document, storage };
}

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
  await new Promise((resolve) => setImmediate(resolve));
}

function zoomAndExit(document) {
  document.querySelector(".ytvt-trigger").click();
  document.querySelector(".html5-video-player").dispatchEvent({
    type: "wheel",
    deltaY: -100,
    deltaMode: 0,
    clientX: 640,
    clientY: 360,
    preventDefault() {},
    stopPropagation() {},
    stopImmediatePropagation() {},
  });
  document.querySelector(".ytvt-trigger").click();
}

test("review card appears after the third meaningful use exits and Chrome Rate opens the product page", async () => {
  const { document, storage } = await loadContentScript({
    userAgent: "Mozilla/5.0 Chrome/120 Safari/537.36",
    reviewState: { meaningfulUseCount: 2, status: "active" },
  });

  zoomAndExit(document);
  await flushPromises();

  let prompt = document.querySelector(".ytvt-review-card");
  assert.ok(prompt, "review prompt should render after a third meaningful zoom session exits");

  document.querySelector(".ytvt-trigger").click();
  assert.equal(document.querySelector(".ytvt-review-card"), null, "re-entering Zoom mode removes the card");
  document.querySelector(".ytvt-trigger").click();
  await flushPromises();

  prompt = document.querySelector(".ytvt-review-card");
  assert.ok(prompt, "an unanswered card should retry after Zoom mode exits again");
  const rate = prompt.querySelector(".ytvt-review-primary");
  assert.equal(rate.href, CHROME_REVIEW_URL);

  rate.click();
  await flushPromises();

  assert.equal(storage.data[REVIEW_STORAGE_KEY].status, "rated");
  assert.equal(document.querySelector(".ytvt-review-card"), null);
});

test("Safari Rate opens the App Store product review page", async () => {
  const { document } = await loadContentScript({
    userAgent: "Mozilla/5.0 Version/17.0 Safari/605.1.15",
    reviewState: { meaningfulUseCount: 3, status: "prompted" },
  });

  zoomAndExit(document);
  await flushPromises();

  assert.equal(document.querySelector(".ytvt-review-primary").href, SAFARI_REVIEW_URL);
});

test("opening Zoom mode alone never shows or counts a review use", async () => {
  const { document, storage } = await loadContentScript({
    userAgent: "Mozilla/5.0 Chrome/120 Safari/537.36",
  });

  document.querySelector(".ytvt-trigger").click();
  document.querySelector(".ytvt-trigger").click();
  await flushPromises();

  assert.equal(document.querySelector(".ytvt-review-card"), null);
  assert.equal(storage.data[REVIEW_STORAGE_KEY], undefined);
});
