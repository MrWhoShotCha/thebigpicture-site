// Full-size viewer (lightbox) shared by the home page lens gallery and the category pages.
window.TBP = window.TBP || {};
(() => {
  const $ = (id) => document.getElementById(id);

  TBP.ytEmbed = (id) => `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1&playsinline=1&enablejsapi=1&origin=${encodeURIComponent(location.origin)}`;

  TBP.makeMedia = (it, { lens = false } = {}) => {
    let el;
    if (it.youtube) {
      // YouTube videos show their thumbnail; the video itself plays in the viewer.
      el = document.createElement("img");
      el.src = it.src;
      el.alt = it.alt || it.title || "";
      el.decoding = "async";
      el.onerror = () => { el.onerror = null; el.src = `https://i.ytimg.com/vi/${it.youtube}/hqdefault.jpg`; };
      if (it.lb) el.classList.add("lb");
    } else if (it.video) {
      el = document.createElement("video");
      el.src = it.src;
      el.poster = it.poster || "";
      el.muted = true;
      el.loop = true;
      el.playsInline = true;
      el.setAttribute("playsinline", "");
      el.setAttribute("muted", "");
      if (lens) el.autoplay = true;
    } else {
      el = document.createElement("img");
      el.src = it.src;
      el.alt = it.alt || "";
      el.decoding = "async";
    }
    el.style.objectPosition = it.pos || "50% 50%";
    return el;
  };

  const viewer = $("viewer");
  if (!viewer) return;
  let list = [];
  let index = 0;
  let returnFocus = null;
  let ytFrame = null;

  // When a video finishes, move on to the next video in the same list (photos are skipped).
  const isVideo = (it) => it && (it.youtube || it.video);
  function playNextVideo() {
    if (!TBP.viewerOpen) return;
    for (let k = 1; k < list.length; k++) {
      const j = (index + k) % list.length;
      if (isVideo(list[j])) { show(j); return; }
    }
  }
  // YouTube tells the page when its player state changes; state 0 means the video ended.
  window.addEventListener("message", (e) => {
    if (!ytFrame || e.source !== ytFrame.contentWindow || !/youtube/.test(e.origin)) return;
    let d; try { d = typeof e.data === "string" ? JSON.parse(e.data) : e.data; } catch (_) { return; }
    const st = d && d.info && d.info.playerState;
    if ((d.event === "onStateChange" && d.info === 0) || st === 0) playNextVideo();
  });

  function show(i) {
    index = i;
    const it = list[i];
    const stage = $("vStage");
    stage.innerHTML = "";
    ytFrame = null;
    if (it.youtube) {
      const f = document.createElement("iframe");
      ytFrame = f;
      f.addEventListener("load", () => {
        const hello = () => f.contentWindow && f.contentWindow.postMessage(JSON.stringify({ event: "listening", id: it.youtube, channel: "widget" }), "*");
        hello(); setTimeout(hello, 1000);
      });
      f.src = TBP.ytEmbed(it.youtube);
      f.title = it.title || "Video";
      f.allow = "autoplay; encrypted-media; fullscreen; picture-in-picture";
      f.allowFullscreen = true;
      stage.appendChild(f);
      $("vPrev").style.display = $("vNext").style.display = list.length > 1 ? "" : "none";
      return;
    }
    const m = TBP.makeMedia(it);
    if (it.video) {
      m.controls = true;
      m.muted = false;
      m.loop = false;
      m.addEventListener("ended", playNextVideo);
      m.play().catch(() => { m.muted = true; m.play().catch(() => {}); });
    }
    stage.appendChild(m);
    const many = list.length > 1;
    $("vPrev").style.display = $("vNext").style.display = many ? "" : "none";
  }

  TBP.openViewer = (items, i) => {
    list = items;
    returnFocus = document.activeElement;
    show(i);
    viewer.classList.add("open");
    TBP.viewerOpen = true;
    $("vClose").focus();
  };

  function close() {
    ytFrame = null;
    $("vStage").querySelectorAll("video").forEach((v) => v.pause());
    $("vStage").innerHTML = "";
    viewer.classList.remove("open");
    TBP.viewerOpen = false;
    if (returnFocus) returnFocus.focus();
  }
  const step = (d) => { if (list.length > 1) show((index + d + list.length) % list.length); };

  $("vClose").addEventListener("click", close);
  $("vPrev").addEventListener("click", () => step(-1));
  $("vNext").addEventListener("click", () => step(1));
  viewer.addEventListener("click", (e) => { if (e.target === viewer) close(); });
  document.addEventListener("keydown", (e) => {
    if (!TBP.viewerOpen) return;
    if (e.key === "Escape") close();
    if (e.key === "ArrowRight") step(1);
    if (e.key === "ArrowLeft") step(-1);
  });

  // Category pages: tiles open the viewer.
  document.querySelectorAll("[data-gallery]").forEach((grid) => {
    const src = document.getElementById(grid.dataset.gallery);
    if (!src) return;
    const items = JSON.parse(src.textContent);
    grid.addEventListener("click", (e) => {
      const b = e.target.closest(".tile-m");
      if (b) TBP.openViewer(items, Number(b.dataset.i));
    });
  });
})();
