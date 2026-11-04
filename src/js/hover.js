// Work tiles: play the preview clip on hover or focus.
document.querySelectorAll("video[data-hover-play]").forEach((v) => {
  const tile = v.closest(".tile");
  const play = () => v.play().catch(() => {});
  const stop = () => { v.pause(); v.currentTime = 0; };
  tile.addEventListener("mouseenter", play);
  tile.addEventListener("focus", play);
  tile.addEventListener("mouseleave", stop);
  tile.addEventListener("blur", stop);
});
