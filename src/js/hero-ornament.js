// The hero ornament: the product photo hanging on its twine, drawn in WebGL.
// It is a small damped pendulum. Scrolling and the pointer nudge it, and it
// always settles back. One textured plane, two strands of twine, no lights.
// A soft shadow falls on the photo's plain backdrop only; the ornament itself
// is shown exactly as photographed.

import {
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  NoColorSpace,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  SRGBColorSpace,
  TextureLoader,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import gsap from 'gsap';

const FOV = 28;
const TWINE_COLOR = 0xb4906b; // sampled from the twine in the photo
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// The same shadow the drawn disc used to cast: a soft disc offset down and to
// the right, solid to 0.7 of the ornament's radius and gone by 1.45. It only
// darkens pixels that match the photo's backdrop, and fades out before the
// photo's edges so it never ends in a line.
const fragmentShader = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec3 uBackdrop;
  uniform vec2 uCentre;
  uniform float uRadius;
  varying vec2 vUv;

  const vec3 SHADOW = vec3(32.0, 18.0, 8.0) / 255.0;

  void main() {
    vec3 colour = texture2D(uMap, vUv).rgb;
    float backdrop = 1.0 - smoothstep(0.03, 0.09, distance(colour, uBackdrop));
    float r = length(vUv - (uCentre + vec2(0.12, -0.17) * uRadius)) / uRadius;
    float shade = 0.3 * clamp((1.45 - r) / 0.75, 0.0, 1.0);
    shade *= 1.0 - smoothstep(0.82, 0.98, length(vUv - 0.5) * 2.0);
    gl_FragColor = vec4(mix(colour, SHADOW, shade * backdrop), 1.0);
  }
`;

// The photo's backdrop colour, read from its top-left corner.
function backdropColour(img) {
  const probe = document.createElement('canvas');
  probe.width = probe.height = 1;
  const ctx = probe.getContext('2d');
  ctx.drawImage(img, 2, 2, 1, 1, 0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return new Vector3(r / 255, g / 255, b / 255);
}

export async function createHeroOrnament({ stage, canvas, photo, lenis }) {
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = SRGBColorSpace;

  const photoTexture = await new TextureLoader().loadAsync(photo.currentSrc || photo.src);
  // Sampled as stored and written out untouched, so colours match the <img>.
  photoTexture.colorSpace = NoColorSpace;
  photoTexture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  const scene = new Scene();
  const camera = new PerspectiveCamera(FOV, 1, 10, 8000);

  // Where the ornament sits inside the photo; shared with the CSS fallback.
  const fraction = (name) => parseFloat(getComputedStyle(stage).getPropertyValue(name));

  const photoMaterial = new ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uMap: { value: photoTexture },
      uBackdrop: { value: backdropColour(photoTexture.image) },
      uCentre: { value: new Vector2(fraction('--photo-x'), 1 - fraction('--photo-y')) },
      uRadius: { value: fraction('--photo-face') / 2 },
    },
  });
  const jute = new MeshBasicMaterial({ color: TWINE_COLOR });
  const geometries = [new PlaneGeometry(1, 1), new CylinderGeometry(1, 1, 1, 8)];
  const [planeGeo, strandGeo] = geometries;

  // pivot (swings) > ornament (twists on the twine) > photo
  const pivot = new Group();
  const ornament = new Group();
  const plane = new Mesh(planeGeo, photoMaterial);
  const strands = [-1, 1].map((side) => {
    const strand = new Mesh(strandGeo, jute);
    strand.userData.side = side;
    return strand;
  });
  ornament.add(plane);
  pivot.add(ornament, ...strands);
  scene.add(pivot);

  let radius = 100;
  let base = { x: 0, y: 0 };
  const drop = { y: 0 };

  // One scene unit is one CSS pixel at the ornament's depth, so the photo can
  // be placed exactly where the fallback image sits.
  function layout() {
    const c = canvas.getBoundingClientRect();
    const p = photo.getBoundingClientRect();
    if (!c.width || !c.height || !p.width) return;
    renderer.setSize(c.width, c.height, false);
    const distance = c.height / 2 / Math.tan((FOV * Math.PI) / 360);
    camera.aspect = c.width / c.height;
    camera.position.set(0, 0, distance);
    camera.near = distance / 20;
    camera.far = distance * 3;
    camera.updateProjectionMatrix();

    const size = p.width;
    const twineWidth = size * fraction('--photo-twine-w');
    const toX = (x) => x - (c.left + c.width / 2);
    const toY = (y) => c.top + c.height / 2 - y;
    radius = (size * fraction('--photo-face')) / 2;

    // The twine leaves the photo's top edge here; the pivot sits just above
    // the canvas, as high above the ornament as it always has.
    const attachX = toX(p.left + size * fraction('--photo-twine-x'));
    const attachY = toY(p.top);
    const pivotY = toY(c.top) + radius * 0.6;
    const length = pivotY - attachY;
    base = { x: attachX, y: pivotY };

    ornament.position.set(0, -length, 0);
    plane.scale.set(size, size, 1);
    plane.position.set(toX(p.left + size / 2) - attachX, -size / 2, 0);

    // Two strands run from the photo's own twine up to the pivot, tucked a few
    // pixels into the photo so there is no seam where they meet.
    const tuck = 3;
    strands.forEach((strand) => {
      const x = strand.userData.side * twineWidth * 0.27;
      const rise = length + tuck;
      strand.scale.set(twineWidth * 0.23, Math.hypot(x, rise), twineWidth * 0.23);
      strand.position.set(x / 2, -rise / 2, 0);
      strand.rotation.z = Math.atan2(x, rise);
    });
  }

  // Pendulum state: theta swings side to side, phi twists around the twine.
  let theta = 0.38;
  let thetaV = 0;
  let phi = -0.95;
  let phiV = 0;
  let kick = 0;
  let twist = 0;
  let lean = 0;
  let clock = 0;

  function tick(_time, deltaMs) {
    const dt = Math.min(0.033, (deltaMs || 16.7) / 1000);
    clock += dt;
    const restTheta = 0.015 * Math.sin(clock * 0.9);
    const restPhi = 0.11 * Math.sin(clock * 0.55 + 1) + lean;
    thetaV += (-11 * (theta - restTheta) - 1.3 * thetaV + kick) * dt;
    phiV += (-6 * (phi - restPhi) - 1.15 * phiV + twist) * dt;
    theta = clamp(theta + thetaV * dt, -0.5, 0.5);
    phi = clamp(phi + phiV * dt, -1.2, 1.2);
    kick *= Math.exp(-dt * 8);
    twist *= Math.exp(-dt * 8);

    pivot.position.set(base.x, base.y + drop.y, 0);
    pivot.rotation.z = theta;
    ornament.rotation.y = phi;
    renderer.render(scene, camera);
  }

  const onScroll = ({ velocity }) => {
    kick = clamp(kick + velocity * 0.03, -7, 7);
    twist = clamp(twist + velocity * 0.05, -9, 9);
  };

  let lastX = null;
  const onPointer = (event) => {
    if (event.pointerType === 'touch') return;
    const p = photo.getBoundingClientRect();
    const dx = event.clientX - (p.left + p.width * fraction('--photo-x'));
    const dy = event.clientY - (p.top + p.width * fraction('--photo-y'));
    const near = clamp(1.7 - Math.hypot(dx, dy) / radius, 0, 1);
    if (lastX !== null) kick = clamp(kick + (event.clientX - lastX) * 0.02 * near, -7, 7);
    lastX = event.clientX;
    lean = clamp(dx / radius, -1, 1) * 0.2 * near;
  };

  let running = false;
  const start = () => {
    if (running) return;
    running = true;
    gsap.ticker.add(tick);
  };
  const stop = () => {
    if (!running) return;
    running = false;
    gsap.ticker.remove(tick);
  };

  // Only render while the hero is on screen.
  const visibility = new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : stop()), {
    rootMargin: '80px',
  });
  const resize = new ResizeObserver(layout);

  layout();
  // Start high and swung out, then let the pendulum settle.
  drop.y = canvas.getBoundingClientRect().height * 0.75;
  const entrance = gsap.to(drop, { y: 0, duration: 1.5, ease: 'power3.out', delay: 0.1 });
  tick(0, 16.7);
  start();

  visibility.observe(stage);
  resize.observe(stage);
  lenis?.on('scroll', onScroll);
  window.addEventListener('pointermove', onPointer, { passive: true });

  return {
    dispose() {
      stop();
      entrance.kill();
      visibility.disconnect();
      resize.disconnect();
      lenis?.off('scroll', onScroll);
      window.removeEventListener('pointermove', onPointer);
      geometries.forEach((geometry) => geometry.dispose());
      [photoMaterial, jute].forEach((material) => material.dispose());
      photoTexture.dispose();
      renderer.dispose();
    },
  };
}
