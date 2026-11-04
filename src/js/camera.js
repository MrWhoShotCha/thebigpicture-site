// Home page camera. The shutter cycles categories: click, flash, the aperture blades close,
// the lens switches, the blades reopen. Tapping the lens opens that category's gallery.
(() => {
  const dataEl = document.getElementById("camera-data");
  if (!dataEl) return;
  const CATS = JSON.parse(dataEl.textContent);
  const $ = (id) => document.getElementById(id);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const glass = $("glass");
  const dial = $("dial");
  const pad = (n) => String(n).padStart(2, "0");
  let cat = 0, item = 0, cycleTimer = null, busy = false;

  // ---------- lens media ----------
  function showInLens(it) {
    const old = [...glass.querySelectorAll(".media")];
    const el = TBP.makeMedia(it, { lens: true });
    el.className = "media";
    glass.insertBefore(el, glass.firstChild);
    const reveal = () => { requestAnimationFrame(() => el.classList.add("on")); if (el.play) el.play().catch(() => {}); };
    if (el.tagName === "IMG") { el.complete ? reveal() : el.addEventListener("load", reveal, { once: true }); }
    else { el.addEventListener("loadeddata", reveal, { once: true }); setTimeout(reveal, 600); }
    old.forEach((o) => { o.classList.remove("on"); setTimeout(() => o.remove(), 950); });
  }
  function startCycle() {
    clearInterval(cycleTimer);
    const items = CATS[cat].items;
    if (items.length < 2 || reduce) return;
    cycleTimer = setInterval(() => { item = (item + 1) % items.length; showInLens(items[item]); }, 4200);
  }
  function preloadNext() {
    const n = CATS[(cat + 1) % CATS.length].items[0];
    if (!n) return;
    const img = new Image();
    img.src = n.video ? n.poster : n.src;
  }
  function renderLabels() {
    const c = CATS[cat];
    $("count").textContent = `${pad(cat + 1)} / ${pad(CATS.length)}`;
    $("catName").textContent = c.name;
    $("catWhat").textContent = `${c.what} · ${c.startingAt}`;
    $("lcdMode").textContent = c.dial;
    $("lcdCount").textContent = pad(cat + 1);
    [...dial.children].forEach((b, i) => b.setAttribute("aria-current", String(i === cat)));
    glass.setAttribute("aria-label", `Open the ${c.name} gallery`);
  }

  // ---------- aperture blades ----------
  // Nine overlapping blades. Each one is a strip whose inner edge forms one side of the opening;
  // as the iris closes the opening shrinks and turns, like a real lens diaphragm.
  const BLADES = 9;
  const NS = "http://www.w3.org/2000/svg";
  const bladeGroup = $("blades");
  const bladeEls = Array.from({ length: BLADES }, (_, i) => {
    const p = document.createElementNS(NS, "path");
    p.setAttribute("fill", "url(#bladeG)");
    p.setAttribute("stroke", i % 2 ? "rgba(150,170,190,.32)" : "rgba(120,140,160,.24)");
    p.setAttribute("stroke-width", ".01");
    p.setAttribute("stroke-linejoin", "round");
    bladeGroup.appendChild(p);
    return p;
  });
  function drawIris(open) { // 1 = fully open (blades hidden outside the glass), 0 = closed
    const r = Math.max(0.0001, open * 1.3);
    const rot = (1 - open) * 1.15;
    const pts = [];
    for (let i = 0; i < BLADES; i++) {
      const a = rot + (i * 2 * Math.PI) / BLADES;
      pts.push([r * Math.cos(a), r * Math.sin(a)]);
    }
    const L = 4;
    bladeEls.forEach((el, i) => {
      const p = pts[i], q = pts[(i + 1) % BLADES];
      let dx = q[0] - p[0], dy = q[1] - p[1];
      const n = Math.hypot(dx, dy) || 1;
      dx /= n; dy /= n;
      const nx = dy, ny = -dx; // outward normal
      const A = p, B = [p[0] + dx * L, p[1] + dy * L];
      const C = [B[0] + nx * L, B[1] + ny * L], D = [A[0] + nx * L, A[1] + ny * L];
      el.setAttribute("d", `M${A[0].toFixed(4)} ${A[1].toFixed(4)}L${B[0].toFixed(4)} ${B[1].toFixed(4)}L${C[0].toFixed(4)} ${C[1].toFixed(4)}L${D[0].toFixed(4)} ${D[1].toFixed(4)}Z`);
    });
    bladeGroup.style.display = open > 0.995 ? "none" : "";
  }
  drawIris(1);
  function animateIris(from, to, ms) {
    return new Promise((res) => {
      if (reduce) { drawIris(to); return res(); }
      const t0 = performance.now();
      const step = (t) => {
        const k = Math.min(1, (t - t0) / ms), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        drawIris(from + (to - from) * e);
        k < 1 ? requestAnimationFrame(step) : res();
      };
      requestAnimationFrame(step);
    });
  }

  // ---------- shutter sound (made in the browser) ----------
  let actx = null;
  function clickSound() {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const burst = (when, dur, freq, gain) => {
        const len = Math.floor(actx.sampleRate * dur), buf = actx.createBuffer(1, len, actx.sampleRate), d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
        const s = actx.createBufferSource(); s.buffer = buf;
        const f = actx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = freq; f.Q.value = 1.2;
        const g = actx.createGain(); g.gain.value = gain;
        s.connect(f).connect(g).connect(actx.destination); s.start(actx.currentTime + when);
      };
      burst(0, 0.045, 2600, 0.55);
      burst(0.075, 0.06, 1500, 0.45);
    } catch (e) {}
  }

  // ---------- fire ----------
  function pressButton() {
    if (reduce) return;
    const g = $("btnGroup");
    g.setAttribute("transform", "translate(0 6)");
    setTimeout(() => g.removeAttribute("transform"), 140);
  }
  async function fire(target) {
    if (busy) return;
    busy = true;
    const next = typeof target === "number" ? target : (cat + 1) % CATS.length;
    pressButton();
    clickSound();
    if (!reduce) { const f = $("flash"); f.classList.remove("go"); void f.offsetWidth; f.classList.add("go"); }
    await animateIris(1, 0, 180);
    cat = next; item = 0;
    glass.querySelectorAll(".media").forEach((m) => m.remove());
    showInLens(CATS[cat].items[0]);
    renderLabels();
    await new Promise((r) => setTimeout(r, reduce ? 0 : 90));
    await animateIris(0, 1, 300);
    startCycle();
    preloadNext();
    busy = false;
  }
  $("shutter").addEventListener("click", () => fire());
  [...dial.children].forEach((b) => b.addEventListener("click", () => fire(Number(b.dataset.i))));

  // Swipe across the lens on a phone = next / previous.
  let sx = null, swiped = false;
  glass.addEventListener("touchstart", (e) => { sx = e.touches[0].clientX; swiped = false; }, { passive: true });
  glass.addEventListener("touchend", (e) => {
    if (sx === null) return;
    const dx = e.changedTouches[0].clientX - sx;
    if (Math.abs(dx) > 40) { swiped = true; fire(dx < 0 ? (cat + 1) % CATS.length : (cat - 1 + CATS.length) % CATS.length); }
    sx = null;
  });

  // ---------- step through the lens into the gallery ----------
  const gal = $("lensgal"), grid = $("grid");
  function buildGrid() {
    const c = CATS[cat];
    $("gTitle").textContent = c.name;
    $("gMeta").textContent = `Category ${pad(cat + 1)} of ${pad(CATS.length)} · ${c.what}`;
    $("gPage").href = `/work/${c.slug}/`;
    $("gBook").href = `/book/?service=${c.slug}`;
    grid.innerHTML = "";
    grid.classList.toggle("solo", c.items.length === 1);
    c.items.forEach((it, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "tile-m" + (it.tall ? "" : " wide");
      b.setAttribute("aria-label", `View ${c.name} ${i + 1}`);
      const m = TBP.makeMedia(it);
      if (it.video) { m.autoplay = true; m.play && m.play().catch(() => {}); }
      b.appendChild(m);
      if (it.video) { const t = document.createElement("span"); t.className = "tag"; t.textContent = "Play with sound"; b.appendChild(t); }
      b.addEventListener("click", () => TBP.openViewer(c.items, i));
      grid.appendChild(b);
    });
  }
  function lensCentre() { const r = glass.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, r: r.width / 2 }; }
  function animateClip(from, to, ms, c) {
    return new Promise((res) => {
      gal.style.setProperty("--x", c.x + "px");
      gal.style.setProperty("--y", c.y + "px");
      if (reduce) { gal.style.setProperty("--r", to + "px"); return res(); }
      const t0 = performance.now();
      const step = (t) => {
        const k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 3);
        gal.style.setProperty("--r", from + (to - from) * e + "px");
        k < 1 ? requestAnimationFrame(step) : res();
      };
      requestAnimationFrame(step);
    });
  }
  let galOpen = false;
  async function openGallery() {
    if (busy || swiped) { swiped = false; return; }
    buildGrid();
    const c = lensCentre(), far = Math.hypot(Math.max(c.x, innerWidth - c.x), Math.max(c.y, innerHeight - c.y));
    gal.classList.add("open");
    gal.setAttribute("aria-hidden", "false");
    galOpen = true;
    await animateClip(c.r, far + 40, 720, c);
    gal.style.setProperty("--r", "200vmax");
    $("gClose").focus();
  }
  async function closeGallery() {
    const c = lensCentre(), far = Math.hypot(innerWidth, innerHeight);
    await animateClip(far, c.r, 520, c);
    gal.classList.remove("open");
    gal.setAttribute("aria-hidden", "true");
    galOpen = false;
    grid.querySelectorAll("video").forEach((v) => v.pause());
    glass.focus();
  }
  glass.addEventListener("click", openGallery);
  $("gClose").addEventListener("click", closeGallery);

  document.addEventListener("keydown", (e) => {
    if (window.TBP.viewerOpen) return;
    if (galOpen) { if (e.key === "Escape") closeGallery(); return; }
    const t = e.target;
    if (t && /INPUT|TEXTAREA|SELECT/.test(t.tagName)) return;
    if (e.key === "ArrowRight") fire((cat + 1) % CATS.length);
    if (e.key === "ArrowLeft") fire((cat - 1 + CATS.length) % CATS.length);
  });

  renderLabels();
  showInLens(CATS[0].items[0]);
  startCycle();
  preloadNext();
})();
