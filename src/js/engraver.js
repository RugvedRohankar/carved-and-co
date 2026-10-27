// Live preview: type a few words and see them "engraved" on a blank slice.

const SVG_NS = 'http://www.w3.org/2000/svg';
const CENTER = { x: 600, y: 680 }; // middle of the slice in custom-blank.webp (1200 x 1200)
const MAX_WIDTH = 520;
const MAX_SIZE = 150;
const MIN_SIZE = 50;
const EMPTY = 'Your words';

function toLines(text) {
  const words = text.split(/\s+/);
  if (text.length <= 13 || words.length < 2) return [text];
  // Break at the space nearest the middle so the two lines balance.
  let best = 1;
  let bestGap = Infinity;
  for (let i = 1; i < words.length; i++) {
    const gap = Math.abs(words.slice(0, i).join(' ').length - words.slice(i).join(' ').length);
    if (gap < bestGap) {
      bestGap = gap;
      best = i;
    }
  }
  return [words.slice(0, best).join(' '), words.slice(best).join(' ')];
}

export function initEngraver() {
  const root = document.querySelector('[data-engraver]');
  if (!root) return;

  const input = root.querySelector('[data-engraver-input]');
  const out = root.querySelector('[data-engraver-out]');
  const chips = [...root.querySelectorAll('[data-sample]')];

  function draw() {
    const text = input.value.trim().replace(/\s+/g, ' ') || EMPTY;
    const lines = toLines(text);
    const longest = Math.max(...lines.map((line) => line.length));
    let size = Math.max(MIN_SIZE, Math.min(MAX_SIZE, MAX_WIDTH / (longest * 0.44)));

    const place = () => {
      const first = lines.length === 1 ? CENTER.y + size * 0.3 : CENTER.y - size * 0.24;
      out.setAttribute('font-size', size.toFixed(1));
      out.replaceChildren(
        ...lines.map((line, i) => {
          const tspan = document.createElementNS(SVG_NS, 'tspan');
          tspan.setAttribute('x', CENTER.x);
          tspan.setAttribute('y', (first + i * size * 1.08).toFixed(1));
          tspan.textContent = line;
          return tspan;
        }),
      );
    };

    place();
    // Correct the estimate against the real rendered width when we can measure it.
    const width = out.getBBox?.().width ?? 0;
    if (width > MAX_WIDTH) {
      size = Math.max(MIN_SIZE * 0.7, size * (MAX_WIDTH / width));
      place();
    }
  }

  input.addEventListener('input', () => {
    chips.forEach((chip) => chip.setAttribute('aria-pressed', String(chip.dataset.sample === input.value)));
    draw();
  });

  chips.forEach((chip) => {
    chip.setAttribute('aria-pressed', 'false');
    chip.addEventListener('click', () => {
      input.value = chip.dataset.sample;
      chips.forEach((other) => other.setAttribute('aria-pressed', String(other === chip)));
      draw();
    });
  });

  draw();
}
