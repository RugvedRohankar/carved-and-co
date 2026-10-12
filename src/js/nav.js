// Header state and the small-screen menu.
export function initNav({ getLenis }) {
  const header = document.querySelector('[data-header]');
  const menu = document.querySelector('[data-menu]');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  let lastY = window.scrollY;
  const onScroll = () => {
    const y = window.scrollY;
    const goingDown = y > lastY;
    header.classList.toggle('is-scrolled', y > 24);
    // Tuck the header away while reading down the page; bring it back on the way up.
    if (Math.abs(y - lastY) > 4) {
      header.classList.toggle('is-hidden', !reduceMotion.matches && goingDown && y > window.innerHeight * 0.6);
      lastY = y;
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const closeMenu = () => {
    if (!menu.open) return;
    menu.close();
    getLenis()?.start();
  };

  document.querySelector('[data-menu-open]').addEventListener('click', () => {
    menu.showModal();
    getLenis()?.stop();
  });
  menu.querySelector('[data-menu-close]').addEventListener('click', closeMenu);
  menu.addEventListener('close', () => getLenis()?.start());
  menu.querySelectorAll('a[href^="#"]').forEach((link) => link.addEventListener('click', closeMenu));
}
