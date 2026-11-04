// Home page camera: the shutter cycles categories, and the lens shows the matching work.
(() => {
  const dataEl = document.getElementById("camera-data");
  const cam = document.getElementById("camera");
  if (!dataEl || !cam) return;

  const cats = JSON.parse(dataEl.textContent);
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (id) => document.getElementById(id);
  const media = $("lens-media");
  const hero = cam.closest(".hero");
  const pad = (n) => String(n).padStart(2, "0");
  let index = 0;
  let busy = false;
  let slideTimer = null;
  let ticks = 0;

  // ---------- sound (off by default) ----------
  const soundBtn = $("sound-toggle");
  let soundOn = false;
  try { soundOn = localStorage.getItem("tbp-sound") === "on"; } catch (e) {}
  let ctx = null;
  const setSoundLabel = () => {
    soundBtn.setAttribute("aria-pressed", String(soundOn));
    soundBtn.textContent = soundOn ? "Sound on" : "Sound off";
  };
  setSoundLabel();
  soundBtn.addEventListener("click", () => {
    soundOn = !soundOn;
    try { localStorage.setItem("tbp-sound", soundOn ? "on" : "off"); } catch (e) {}
    setSoundLabel();
    if (soundOn) click();
  });
  function click() {
    if (!soundOn) return;
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      const now = ctx.currentTime;
      [0, 0.09].forEach((offset, i) => {
        const len = Math.floor(ctx.sampleRate * 0.035);
        const buf = ctx.createBuffer(1, len, ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let j = 0; j < len; j++) d[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / len, 3);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const filter = ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.value = i ? 2400 : 1600;
        const gain = ctx.createGain();
        gain.gain.value = i ? 0.5 : 0.8;
        src.connect(filter).connect(gain).connect(ctx.destination);
        src.start(now + offset);
      });
    } catch (e) {}
  }

  // ---------- lens content ----------
  function lensHTML(c) {
    const esc = (s) => String(s).replace(/[&<>"]/g, (x) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[x]));
    if (c.lensVideo && !reduceMotion) {
      return `<video src="${esc(c.lensVideo)}" ${c.lensPoster ? `poster="${esc(c.lensPoster)}"` : ""} muted loop playsinline autoplay preload="auto"></video>`;
    }
    if (c.lensPoster && reduceMotion) return `<img src="${esc(c.lensPoster)}" alt="" class="on">`;
    if (c.lensImages && c.lensImages.length) {
      return c.lensImages.map((src, i) => `<img src="${esc(src)}" alt=""${i === 0 ? ' class="on"' : ""}>`).join("");
    }
    return `<div class="lens-placeholder" style="--tint:${c.tint}"><div><span>${esc(c.name)}</span><small>CLIP COMING SOON</small></div></div>`;
  }

  function startSlides() {
    clearInterval(slideTimer);
    const imgs = media.querySelectorAll("img");
    if (imgs.length < 2 || reduceMotion) return;
    let k = 0;
    slideTimer = setInterval(() => {
      imgs[k].classList.remove("on");
      k = (k + 1) % imgs.length;
      imgs[k].classList.add("on");
    }, 2600);
  }

  function preload(c) {
    if (!c) return;
    if (c.lensVideo) {
      const v = document.createElement("video");
      v.preload = "auto";
      v.muted = true;
      v.src = c.lensVideo;
    } else if (c.lensImages) {
      c.lensImages.slice(0, 2).forEach((src) => { const i = new Image(); i.src = src; });
    }
  }

  function render(i) {
    const c = cats[i];
    media.innerHTML = lensHTML(c);
    const v = media.querySelector("video");
    if (v) v.play().catch(() => {});
    startSlides();
    $("lcd-mode").textContent = c.dial;
    $("lcd-count").textContent = `${pad(i + 1)}/${pad(cats.length)}`;
    $("cam-name").textContent = c.name;
    $("cam-tag").textContent = c.tagline;
    $("cam-price").textContent = c.startingAt;
    $("cam-see").href = `/work/${c.slug}/`;
    $("cam-book").href = `/book/?service=${c.slug}`;
    $("cam-count").textContent = `${pad(i + 1)} / ${pad(cats.length)}`;
    document.querySelectorAll(".cam-dot").forEach((d, k) => d.setAttribute("aria-current", String(k === i)));
    if (hero) hero.style.setProperty("--cam-tint", c.tint);
    preload(cats[(i + 1) % cats.length]);
  }

  function go(i) {
    if (busy) return;
    const next = (i + cats.length) % cats.length;
    cam.classList.remove("hinting");
    cam.classList.add("used", "pressed");
    setTimeout(() => cam.classList.remove("pressed"), 140);
    ticks += next > index || (index === cats.length - 1 && next === 0) ? 1 : -1;
    const dial = cam.querySelector(".dial-ticks");
    if (dial) dial.setAttribute("transform", `translate(${756 - ((ticks * 8) % 240 + 240) % 240} 104)`);
    click();
    index = next;
    if (reduceMotion) { render(index); return; }
    busy = true;
    cam.classList.add("firing");
    setTimeout(() => render(index), 150);
    setTimeout(() => { cam.classList.remove("firing"); busy = false; }, 330);
  }

  $("shutter").addEventListener("click", () => go(index + 1));
  const big = $("big-shutter");
  if (big) big.addEventListener("click", () => go(index + 1));
  document.querySelectorAll(".cam-dot").forEach((d) => d.addEventListener("click", () => go(Number(d.dataset.i))));

  document.addEventListener("keydown", (e) => {
    const t = e.target;
    if (t && (t.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(t.tagName))) return;
    const rect = cam.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > window.innerHeight) return;
    if (e.key === "ArrowRight") { e.preventDefault(); go(index + 1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); go(index - 1); }
  });

  let startX = null;
  const lens = $("lens");
  lens.addEventListener("touchstart", (e) => { startX = e.touches[0].clientX; }, { passive: true });
  lens.addEventListener("touchend", (e) => {
    if (startX === null) return;
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
    startX = null;
  });
  lens.addEventListener("click", () => go(index + 1));

  // Pause the lens video when the hero is off screen.
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      const v = media.querySelector("video");
      if (!v) return;
      entry.isIntersecting ? v.play().catch(() => {}) : v.pause();
    }).observe(cam);
  }

  startSlides();
  preload(cats[1]);
})();
