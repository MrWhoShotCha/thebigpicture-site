// Temporary click diagnostics: only runs when the page URL contains ?debug
(() => {
  if (!/[?&]debug/.test(location.search)) return;
  const box = document.createElement("pre");
  box.style.cssText = "position:fixed;left:8px;bottom:8px;z-index:2147483647;max-width:46vw;max-height:40vh;overflow:auto;margin:0;padding:10px;background:#000;color:#0f0;font:12px/1.35 monospace;border:1px solid #0f0;pointer-events:none;white-space:pre-wrap";
  const lines = [];
  const log = (s) => { lines.push(new Date().toTimeString().slice(0, 8) + " " + s); while (lines.length > 18) lines.shift(); box.textContent = lines.join("\n"); if (typeof clock !== "undefined") box.prepend(clock); };
  const desc = (el) => el ? (el.tagName + (el.id ? "#" + el.id : "") + (el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\s+/).join(".") : "")).slice(0, 60) : "null";
  addEventListener("DOMContentLoaded", () => document.body.appendChild(box));
  if (document.body) document.body.appendChild(box);
  log("debug on · " + navigator.userAgent.match(/(OPR|OPX|Chrome|Firefox|Edg)\/[\d.]+/g));
  ["pointerdown", "mousedown", "click"].forEach((t) => addEventListener(t, (e) => {
    const top = document.elementFromPoint(e.clientX, e.clientY);
    log(`${t} @${e.clientX},${e.clientY} target=${desc(e.target)} top=${desc(top)} trusted=${e.isTrusted}`);
  }, true));
  addEventListener("keydown", (e) => log("keydown " + e.key), true);
  addEventListener("error", (e) => log("ERROR " + e.message + " @" + (e.filename || "").split("/").pop() + ":" + e.lineno));
  addEventListener("unhandledrejection", (e) => log("REJECT " + (e.reason && e.reason.message || e.reason)));
  let moves = 0;
  addEventListener("mousemove", () => { moves++; }, true);
  addEventListener("wheel", (e) => log("wheel " + Math.round(e.deltaY)), { capture: true, passive: true });
  addEventListener("focus", () => log("window focus"));
  addEventListener("blur", () => log("window blur"));
  document.addEventListener("visibilitychange", () => log("visibility " + document.visibilityState));
  const clock = document.createElement("div");
  clock.style.cssText = "color:#ff0";
  setInterval(() => { clock.textContent = "alive " + new Date().toTimeString().slice(0, 8) + " · mouse moves " + moves; if (!clock.isConnected) box.prepend(clock); }, 250);
  setInterval(() => {
    const v = document.getElementById("viewer"), g = document.getElementById("lensgal");
    box.dataset.state = (v ? "viewer=" + v.className : "") + (g ? " gal=" + g.className : "");
  }, 500);
  const obs = new MutationObserver(() => {
    const v = document.getElementById("viewer"); if (v) log("viewer class -> " + v.className);
  });
  addEventListener("load", () => { const v = document.getElementById("viewer"); if (v) obs.observe(v, { attributes: true, attributeFilter: ["class"] }); });
})();
