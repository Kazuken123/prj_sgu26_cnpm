(() => {
  "use strict";
  let recover = () => {};
  try {
    const root = document.documentElement, body = document.body;
    const disposers = [], animations = new Set(), pending = new Set();
    let failed = false, revealObserver = null;
    const reduced = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : { matches: true };
    const mobile = window.matchMedia ? window.matchMedia("(max-width: 800px)") : { matches: false };
    const tokens = getComputedStyle(root);
    function milliseconds(name, fallback) {
      const value = tokens.getPropertyValue(name).trim();
      const number = Number.parseFloat(value);
      return Number.isFinite(number) ? number * (value.endsWith("ms") ? 1 : 1000) : fallback;
    }
    const fast = milliseconds("--dur-fast", 150), base = milliseconds("--dur-base", 300), slow = milliseconds("--dur-slow", 600), stagger = milliseconds("--stagger", 60);
    const ease = tokens.getPropertyValue("--ease-out").trim() || "ease-out";
    const sheet = document.getElementById("poiSheet"), sheetBody = document.getElementById("poiSheetBody"), sheetControls = document.getElementById("sheetControls");
    const tablists = [];
    recover = () => {
      if (failed) return; failed = true;
      for (const dispose of disposers) { try { dispose(); } catch {} }
      for (const animation of animations) { try { animation.cancel(); } catch {} }
      for (const node of pending) { try { node.classList.remove("reveal-pending"); node.style.removeProperty("--reveal-delay"); } catch {} }
      root.classList.remove("motion-ready"); body.classList.remove("sheet-enhanced", "sheet-map-visible");
      if (sheetBody) sheetBody.hidden = false;
      if (sheetControls) sheetControls.hidden = true;
      for (const list of tablists) list.classList.remove("tabs-enhanced");
      for (const copy of document.querySelectorAll(".motion-toast-copy")) copy.remove();
    };
    function guard(fn) {
      return function(...args) {
        if (failed) return;
        try { return fn.apply(this, args); }
        catch { recover(); }
      };
    }
    function listen(target, name, fn, options) {
      const handler = guard(fn); target.addEventListener(name, handler, options);
      disposers.push(() => target.removeEventListener(name, handler, options));
    }
    function animate(node, frames, duration = base, onFinish) {
      if (reduced.matches || !node || typeof node.animate !== "function") { if (onFinish) onFinish(); return; }
      const animation = node.animate(frames, { duration, easing: ease, fill: "none" });
      animations.add(animation);
      const done = guard(() => { animations.delete(animation); if (onFinish) onFinish(); });
      animation.finished.then(done, done);
    }
    function later(fn, duration) {
      const id = setTimeout(guard(fn), duration); disposers.push(() => clearTimeout(id));
    }
    const reveal = node => {
      node.classList.remove("reveal-pending"); pending.delete(node);
      if (revealObserver) revealObserver.unobserve(node);
    };
    function enableReveal() {
      if (reduced.matches || !body.classList.contains("guest-page") || body.classList.contains("explore-page") || !("IntersectionObserver" in window)) return;
      revealObserver = new IntersectionObserver(guard(entries => {
        for (const entry of entries) if (entry.isIntersecting) reveal(entry.target);
      }), { threshold: .05, rootMargin: "0px 0px 64px 0px" });
      disposers.push(() => revealObserver.disconnect());
      const nodes = [...document.querySelectorAll(".guest-columns > .card,.guest-section.card,.feature-item")].filter(node => !node.closest("[hidden]") && !node.classList.contains("poi-sheet") && !node.classList.contains("explore-tools"));
      nodes.forEach((node, index) => {
        if (node.getBoundingClientRect().top <= window.innerHeight) return;
        node.classList.add("motion-reveal");
        node.style.setProperty("--reveal-delay", Math.min(index % 4, 3) * stagger + "ms");
        revealObserver.observe(node);
        pending.add(node); node.classList.add("reveal-pending");
      });
      // A bounded fail-open watchdog: no content remains hidden if observations stall.
      later(() => { for (const node of [...pending]) reveal(node); }, 8000);
      listen(document, "focusin", event => {
        const node = event.target.closest && event.target.closest(".motion-reveal");
        if (node) { node.classList.add("reveal-focus"); reveal(node); }
      });
    }
    if (!reduced.matches) root.classList.add("motion-ready");
    enableReveal();
    function mediaChange() {
      if (reduced.matches) {
        root.classList.remove("motion-ready");
        for (const node of [...pending]) reveal(node);
        for (const animation of animations) animation.cancel();
        animations.clear();
      }
    }
    if (reduced.addEventListener) listen(reduced, "change", mediaChange);
    function measureFixedUI() {
      const player = document.getElementById("visitPlayer"), nav = document.getElementById("guestNav"), banner = document.getElementById("demoBanner");
      const set = (name, value) => { const next = Math.ceil(value) + "px"; if (body.style.getPropertyValue(name) !== next) body.style.setProperty(name, next); };
      if (player) set("--player-height", player.getBoundingClientRect().height);
      if (nav) set("--guest-nav-height", mobile.matches ? nav.getBoundingClientRect().height : 0);
      if (banner && !banner.hidden) set("--demo-height", banner.getBoundingClientRect().height);
    }
    const fixed = ["visitPlayer", "guestNav", "demoBanner"].map(id => document.getElementById(id)).filter(Boolean);
    if (window.ResizeObserver) {
      const sizeObserver = new ResizeObserver(guard(measureFixedUI));
      for (const node of fixed) sizeObserver.observe(node);
      disposers.push(() => sizeObserver.disconnect());
    }
    listen(window, "resize", measureFixedUI);
    measureFixedUI();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(guard(measureFixedUI), () => {});
    if (sheet && sheetBody && sheetControls) {
      let level = "summary";
      const buttons = [...sheetControls.querySelectorAll("[data-sheet-target]")];
      function setLevel(next, move = true) {
        if (!["summary", "medium", "full"].includes(next)) return;
        const oldTop = sheet.getBoundingClientRect().top;
        level = next;
        if (mobile.matches && next === "summary" && sheetBody.contains(document.activeElement)) buttons[0].focus();
        sheetBody.hidden = mobile.matches && next === "summary";
        sheet.dataset.sheetLevel = next;
        sheetControls.hidden = !mobile.matches;
        for (const button of buttons) {
          button.setAttribute("aria-pressed", String(button.dataset.sheetTarget === next));
          button.setAttribute("aria-expanded", String(next !== "summary"));
        }
        const delta = oldTop - sheet.getBoundingClientRect().top;
        if (move && mobile.matches && Math.abs(delta) > 1) animate(sheet, [{ transform: "translateY(" + delta + "px)", opacity: .94 }, { transform: "translateY(0)", opacity: 1 }]);
      }
      for (const button of buttons) {
        listen(button, "click", () => setLevel(button.dataset.sheetTarget));
        listen(button, "keydown", event => {
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
          event.preventDefault();
          const index = buttons.indexOf(button);
          const target = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + buttons.length) % buttons.length;
          buttons[target].focus(); setLevel(buttons[target].dataset.sheetTarget);
        });
      }
      listen(document.getElementById("poiList"), "click", event => {
        if (event.target.closest("button")) setLevel("medium");
      });
      if (mobile.addEventListener) listen(mobile, "change", () => { setLevel(level, false); measureFixedUI(); });
      body.classList.add("sheet-enhanced"); setLevel(level, false);
      // Presentation only: dock once the map enters the usable viewport.
      // No guest/business function is called; coordinates and data stay untouched.
      const mapArea = document.querySelector(".explore-grid");
      function syncSheetDock() {
        if (!mapArea) return;
        const rect = mapArea.getBoundingClientRect();
        const playerSize = document.getElementById("visitPlayer")?.getBoundingClientRect().height || 0;
        const navSize = mobile.matches ? (document.getElementById("guestNav")?.getBoundingClientRect().height || 0) : 0;
        body.classList.toggle("sheet-map-visible", rect.top < window.innerHeight - playerSize - navSize - 160 && rect.bottom > 0);
      }
      listen(window, "scroll", syncSheetDock, { passive: true });
      listen(window, "resize", syncSheetDock);
      syncSheetDock();
    }
    for (const list of document.querySelectorAll('.guest-tabs[role="tablist"]')) {
      const tabs = [...list.querySelectorAll('[role="tab"]')];
      if (!tabs.length || !window.MutationObserver) continue;
      const indicator = document.createElement("span"); indicator.className = "tab-indicator"; indicator.setAttribute("aria-hidden", "true"); list.prepend(indicator);
      function positionIndicator() {
        const active = tabs.find(tab => tab.getAttribute("aria-selected") === "true"); if (!active) return;
        // Width is set for layout only. Its change is never animated.
        indicator.style.width = active.offsetWidth + "px";
        indicator.style.transform = "translateX(" + (active.offsetLeft - 4) + "px)";
      }
      const observer = new MutationObserver(guard(positionIndicator));
      observer.observe(list, { subtree: true, attributes: true, attributeFilter: ["aria-selected"] });
      disposers.push(() => observer.disconnect()); tablists.push(list);
      list.classList.add("tabs-enhanced"); positionIndicator(); listen(window, "resize", positionIndicator);
    }
    if (window.MutationObserver) {
      const seen = new WeakSet(), rectangles = new WeakMap();
      function enterToast(toast) {
        if (seen.has(toast) || toast.classList.contains("motion-toast-copy")) return;
        seen.add(toast); rectangles.set(toast, toast.getBoundingClientRect());
        animate(toast, [{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "translateY(0)" }], base, () => rectangles.set(toast, toast.getBoundingClientRect()));
      }
      function exitToast(toast) {
        if (reduced.matches || toast.classList.contains("motion-toast-copy") || typeof toast.animate !== "function") return;
        const rect = rectangles.get(toast); if (!rect || !rect.width || !rect.height) return;
        // A noninteractive snapshot exits after the old script removes the real toast.
        // No event is intercepted, delayed or removed from the business scripts.
        const copy = toast.cloneNode(true); copy.classList.add("motion-toast-copy"); copy.setAttribute("aria-hidden", "true"); copy.removeAttribute("role"); copy.removeAttribute("aria-live"); copy.inert = true;
        copy.removeAttribute("id"); for (const node of copy.querySelectorAll("[id]")) node.removeAttribute("id");
        Object.assign(copy.style, { position: "fixed", top: rect.top + "px", left: rect.left + "px", width: rect.width + "px", height: rect.height + "px", margin: "0", zIndex: "5001", pointerEvents: "none" });
        body.append(copy);
        animate(copy, [{ opacity: 1, transform: "translateY(0)" }, { opacity: 0, transform: "translateY(8px)" }], fast, () => copy.remove());
        later(() => copy.remove(), base + fast);
      }
      const scan = (node, action) => {
        if (node.nodeType !== 1 || node.classList.contains("motion-toast-copy")) return;
        if (node.matches(".toast")) action(node);
        for (const toast of node.querySelectorAll(".toast:not(.motion-toast-copy)")) action(toast);
      };
      const observer = new MutationObserver(guard(records => {
        for (const record of records) {
          for (const node of record.addedNodes) scan(node, enterToast);
          for (const node of record.removedNodes) scan(node, exitToast);
        }
      }));
      observer.observe(body, { childList: true, subtree: true }); disposers.push(() => observer.disconnect());
    }
    listen(window, "pagehide", () => {
      for (const node of [...pending]) reveal(node);
      for (const animation of animations) animation.cancel();
      for (const copy of document.querySelectorAll(".motion-toast-copy")) copy.remove();
    });
  } catch {
    try { recover(); } catch {}
    // The enhancement fails open; existing page handlers remain untouched.
  }
})();

