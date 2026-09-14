/**
 * Lightbox for the car gallery, on `<dialog>`: centred, smaller than the
 * screen, counter, caption, buttons AND arrow keys / Esc, body scroll frozen
 * while open (house rules `gallery-lightbox.md`, `modal-scroll-lock.md`).
 * The dialog shows the LARGE variant by switching `sizes`, so the grid keeps
 * loading small ones. Without JavaScript the buttons do nothing and the
 * thumbnails stand as they are.
 */

type Slide = { srcset: string; src: string; alt: string };

const lock = (() => {
  let y = 0;
  let saved: Record<string, string> = {};
  let locked = false;
  return {
    on() {
      if (locked) return;
      y = window.scrollY;
      saved = { overflow: document.documentElement.style.overflow, position: document.body.style.position, top: document.body.style.top, width: document.body.style.width };
      document.documentElement.style.setProperty("overflow", "hidden", "important");
      document.body.style.setProperty("position", "fixed", "important");
      document.body.style.top = `-${y}px`;
      document.body.style.width = "100%";
      locked = true;
    },
    off() {
      if (!locked) return;
      document.documentElement.style.overflow = saved.overflow;
      document.body.style.position = saved.position;
      document.body.style.top = saved.top;
      document.body.style.width = saved.width;
      window.scrollTo(0, y);
      locked = false;
    },
  };
})();

const init = (gallery: HTMLElement) => {
  const dialog = gallery.querySelector<HTMLDialogElement>('dialog[data-bb="lightbox"]');
  const img = dialog?.querySelector<HTMLImageElement>('[data-bb="lightbox-image"]');
  const caption = dialog?.querySelector<HTMLElement>('[data-bb="lightbox-caption"]');
  const counter = dialog?.querySelector<HTMLElement>('[data-bb="lightbox-counter"]');
  const buttons = Array.from(gallery.querySelectorAll<HTMLButtonElement>('button[data-bb="gallery-open"]'));
  if (!dialog || !img || buttons.length === 0 || typeof dialog.showModal !== "function") return;

  const slides: Slide[] = buttons.map((b) => {
    const thumb = b.querySelector("img");
    return { srcset: thumb?.getAttribute("srcset") ?? "", src: thumb?.currentSrc || thumb?.src || "", alt: thumb?.alt ?? "" };
  });
  const sizes = dialog.dataset.bbSizes ?? "min(92vw, 1400px)";
  let index = 0;
  let opener: HTMLElement | null = null;

  const show = (i: number) => {
    index = (i + slides.length) % slides.length;
    const s = slides[index];
    img.srcset = s.srcset;
    img.sizes = sizes;
    img.src = s.src;
    img.alt = s.alt;
    if (caption) caption.textContent = s.alt;
    if (counter) counter.textContent = `${index + 1} / ${slides.length}`;
  };

  const open = (i: number, from: HTMLElement) => {
    opener = from;
    show(i);
    dialog.showModal();
    lock.on();
  };

  buttons.forEach((b, i) => b.addEventListener("click", () => open(i, b)));
  dialog.querySelector('[data-bb="lightbox-prev"]')?.addEventListener("click", () => show(index - 1));
  dialog.querySelector('[data-bb="lightbox-next"]')?.addEventListener("click", () => show(index + 1));
  dialog.querySelector('[data-bb="lightbox-close"]')?.addEventListener("click", () => dialog.close());
  dialog.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") show(index - 1);
    if (e.key === "ArrowRight") show(index + 1);
  });
  // Click on the backdrop closes; click on the panel does not.
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.close();
  });
  dialog.addEventListener("close", () => {
    lock.off();
    opener?.focus();
  });
};

for (const gallery of document.querySelectorAll<HTMLElement>('[data-bb="gallery"]')) init(gallery);

export {};
