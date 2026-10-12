import '@fontsource-variable/instrument-sans/wght.css';
import '@fontsource/tinos/latin-400.css';
import '@fontsource/tinos/latin-400-italic.css';
import 'lenis/dist/lenis.css';
import './styles/main.css';

import processScene from './process-scene.svg?raw';
import { initNav } from './js/nav.js';
import { initOrderForm } from './js/order-form.js';
import { initEngraver } from './js/engraver.js';
import { initMotion } from './js/motion.js';

// The process illustration is decorative, so it is injected rather than
// sitting in the HTML. Its box is reserved in CSS, so nothing shifts.
document.querySelector('[data-process-visual]').innerHTML = processScene;

const order = initOrderForm();
initEngraver(order);

// Choosing a piece in the collection carries that design into the order form.
document.querySelectorAll('[data-pick]').forEach((link) => {
  link.addEventListener('click', () => order.prefill({ design: link.dataset.pick }));
});

const motion = initMotion();
initNav(motion);
