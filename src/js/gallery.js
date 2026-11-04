// Full-size viewer (lightbox) shared by the home page lens gallery and the category pages.
window.TBP = window.TBP || {};
(() => {
  const $ = (id) => document.getElementById(id);

  TBP.makeMedia = (it, { lens = false } = {}) => {
    let el;
    if (it.video) {
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

  function show(i) {
    index = i;
    const it = list[i];
    const stage = $("vStage");
    stage.innerHTML = "";
    const m = TBP.makeMedia(it);
    if (it.video) {
      m.controls = true;
      m.muted = false;
      m.loop = false;
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
    $("vStage").querySelectorAll("video").forEach((v) => v.pause());
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
