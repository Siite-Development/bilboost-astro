/**
 * Horizontal card rail on phone and tablet, with arrows and a progress bar
 * (house rule `mobile-card-rails.md`; mechanics ported from
 * `Masters/tools/SwipeRail.astro`). Below `data-bb-rail-from` the list is a
 * snap-scrolling row; above it the grid stands. No `wheel` listener, no
 * `preventDefault` — the browser scrolls, we read where it got to.
 */

const init = (rail: HTMLElement) => {
  const vp = rail.querySelector<HTMLElement>('[data-bb="rail-viewport"]');
  const list = vp?.firstElementChild as HTMLElement | null;
  const progress = rail.querySelector<HTMLElement>('[data-bb="rail-progress"]');
  const prev = rail.querySelector<HTMLButtonElement>('[data-bb="rail-prev"]');
  const next = rail.querySelector<HTMLButtonElement>('[data-bb="rail-next"]');
  if (!vp || !list || !prev || !next) return;

  const from = Number(rail.dataset.bbRailFrom) || 1024;
  const wide = window.matchMedia(`(min-width: ${from}px)`);
  const calm = window.matchMedia("(prefers-reduced-motion: reduce)");
  const count = list.children.length || 1;
  let ticking = false;

  const step = () => {
    const card = list.firstElementChild as HTMLElement | null;
    const gap = Number.parseFloat(getComputedStyle(list).columnGap) || 0;
    return (card?.getBoundingClientRect().width ?? 300) + gap;
  };

  const draw = () => {
    ticking = false;
    const max = vp.scrollWidth - vp.clientWidth;
    const p = max > 0 ? vp.scrollLeft / max : 0;
    // Floor of one card: a card is already on screen when the rail begins.
    const s = Math.max(1 / count, Math.min(1, p));
    progress?.style.setProperty("--bb-rail-s", s.toFixed(4));
    prev.disabled = vp.scrollLeft <= 1;
    next.disabled = vp.scrollLeft >= max - 1;
  };

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(draw);
  };

  const setup = () => {
    // Switch the rail on BEFORE measuring: as a grid, scrollWidth equals clientWidth.
    rail.classList.toggle("bb-rail--on", !wide.matches);
    if (wide.matches) return;
    if (vp.scrollWidth - vp.clientWidth <= 8) {
      rail.classList.remove("bb-rail--on");
      return;
    }
    draw();
  };

  prev.addEventListener("click", () => vp.scrollBy({ left: -step(), behavior: calm.matches ? "auto" : "smooth" }));
  next.addEventListener("click", () => vp.scrollBy({ left: step(), behavior: calm.matches ? "auto" : "smooth" }));
  vp.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", setup, { passive: true });
  wide.addEventListener("change", setup);
  setup();
};

for (const rail of document.querySelectorAll<HTMLElement>('[data-bb="rail"]')) init(rail);

export {};
