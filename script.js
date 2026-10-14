(() => {
  const root = document.documentElement;
  root.classList.add('js');

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- Header ---------- */
  const header = document.querySelector('.site-header');

  const setHeaderHeight = () => {
    root.style.setProperty('--header-h', `${header.offsetHeight}px`);
  };

  setHeaderHeight();
  window.addEventListener('resize', setHeaderHeight);

  /* ---------- Menu panel ---------- */
  const menuToggle = document.querySelector('.menu-toggle');
  const menuPanel = document.getElementById('site-menu');
  const menuLinks = [...menuPanel.querySelectorAll('.menu-link')];
  let menuOpen = false;

  const setMenu = (open, { restoreFocus = true } = {}) => {
    if (open === menuOpen) return;
    menuOpen = open;
    menuPanel.classList.toggle('is-open', open);
    menuPanel.setAttribute('aria-hidden', String(!open));
    header.classList.toggle('is-menu-open', open);
    header.classList.remove('is-hidden');
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
    // 열려 있는 동안 페이지 스크롤 잠금. overflow만 막아서 스크롤 위치는 그대로 유지된다
    if (open) root.style.setProperty('--scrollbar-w', `${window.innerWidth - root.clientWidth}px`);
    root.classList.toggle('is-menu-locked', open);
    if (open) {
      // 패널이 내려오기 시작한 뒤 첫 항목에 포커스 (visibility가 풀린 다음이어야 포커스가 잡힌다)
      window.requestAnimationFrame(() => menuLinks[0].focus({ preventScroll: true }));
    } else if (restoreFocus) {
      menuToggle.focus({ preventScroll: true });
    }
  };

  menuToggle.addEventListener('click', () => setMenu(!menuOpen));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menuOpen) setMenu(false);
  });
  // 메뉴 항목: 닫고(스크롤 잠금 해제) 기본 앵커 이동으로 해당 섹션으로. 헤더 높이는 scroll-padding-top이 보정
  menuLinks.forEach((link) => {
    link.addEventListener('click', () => setMenu(false, { restoreFocus: false }));
  });

  /* ---------- Header: 내리면 숨고 올리면 다시 ---------- */
  let lastY = window.scrollY;
  let headerTicking = false;
  const updateHeader = () => {
    headerTicking = false;
    const y = window.scrollY;
    if (menuOpen) {
      lastY = y;
      return;
    }
    if (y <= header.offsetHeight) header.classList.remove('is-hidden');
    else if (y > lastY + 4) header.classList.add('is-hidden');
    else if (y < lastY - 4) header.classList.remove('is-hidden');
    lastY = y;
  };
  window.addEventListener('scroll', () => {
    if (headerTicking) return;
    headerTicking = true;
    window.requestAnimationFrame(updateHeader);
  }, { passive: true });

  // 로고: 맨 위로 부드럽게
  document.querySelector('.logo').addEventListener('click', (event) => {
    event.preventDefault();
    if (menuOpen) setMenu(false, { restoreFocus: false });
    window.scrollTo({ top: 0, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
  });

  /* ---------- 맨 위로 (와펜 사과) ---------- */
  // 히어로를 다 지나면 나타나고, 히어로가 다시 보이면 사라진다 (style.css .is-shown)
  const toTop = document.querySelector('.to-top');
  const toTopImg = toTop.querySelector('img');
  const hero = document.querySelector('.hero');
  new IntersectionObserver(([entry]) => {
    toTop.classList.toggle('is-shown', !entry.isIntersecting && entry.boundingClientRect.top < 0);
  }).observe(hero);

  // 겹침 방지: 문의 폼 입력칸·제출 버튼, 동화책 원형 버튼·리본과 겹치면 그 구간에서만 위로 비켜 선다.
  // 가장 가까운 빈자리까지만 올리고(최대 DODGE_MAX), 그 안에 빈자리가 없으면(모바일 폼처럼 칸이 화면 폭을 다 채운 구간) 잠시 숨긴다
  const DODGE_MAX = 120;
  const DODGE_MARGIN = 8;
  const obstacleSel = '.contact-form input, .contact-form select, .contact-form textarea, .contact-form .btn, .book-nav-btn, .book-ribbon';
  const obstacles = [...document.querySelectorAll(obstacleSel)];
  let dodgeTicking = false;
  const updateDodge = () => {
    dodgeTicking = false;
    if (!toTop.classList.contains('is-shown')) return;
    const size = toTop.offsetWidth;
    const gap = parseFloat(getComputedStyle(toTop).right);
    const left = root.clientWidth - gap - size;
    const bottom = window.innerHeight - gap;
    // 화면에 보이는 장애물만 (숨김 상태 버튼·리본은 제외)
    const rects = obstacles
      .filter((el) => getComputedStyle(el).visibility === 'visible' && el.offsetParent !== null)
      .map((el) => el.getBoundingClientRect())
      .filter((r) => r.width && r.right > left - DODGE_MARGIN && r.left < left + size + DODGE_MARGIN);
    let lift = 0;
    for (let guard = 0; guard < rects.length + 1; guard += 1) {
      const top = bottom - lift - size;
      const hit = rects.find((r) => r.bottom > top - DODGE_MARGIN && r.top < bottom - lift + DODGE_MARGIN);
      if (!hit) break;
      lift = bottom - (hit.top - DODGE_MARGIN);
    }
    const blocked = lift > DODGE_MAX;
    toTop.classList.toggle('is-dodged-out', blocked);
    toTop.style.setProperty('--dodge', `${blocked ? 0 : Math.round(lift)}px`);
  };
  const queueDodge = () => {
    if (dodgeTicking) return;
    dodgeTicking = true;
    window.requestAnimationFrame(updateDodge);
  };
  window.addEventListener('scroll', queueDodge, { passive: true });
  window.addEventListener('resize', queueDodge);
  // 동화책 버튼·리본은 스크롤 없이도 나타나고 사라진다 (넘김 상태가 바뀔 때)
  const bookShell = document.querySelector('.book-shell');
  if (bookShell) {
    new MutationObserver(() => window.setTimeout(queueDodge, 700)).observe(bookShell, { attributes: true, attributeFilter: ['data-nav'] });
  }
  new MutationObserver(queueDodge).observe(toTop, { attributes: true, attributeFilter: ['class'] });

  // 클릭: 사과가 위로 10px 톡 튀었다가 내려앉은 뒤 맨 위로 부드럽게. reduced-motion이면 바로 맨 위로
  let toTopJumping = false;
  toTop.addEventListener('click', () => {
    if (reduceMotion.matches || !toTopImg.animate) {
      window.scrollTo({ top: 0, behavior: 'auto' });
      return;
    }
    if (toTopJumping) return;
    toTopJumping = true;
    toTopImg.animate(
      [{ transform: 'translateY(0)' }, { transform: 'translateY(-10px)', offset: 0.45 }, { transform: 'translateY(0)' }],
      { duration: 280, easing: 'ease-out' },
    ).finished.then(() => {
      toTopJumping = false;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  /* ---------- Placeholder ---------- */
  // 이미지가 실제로 불러와진 경우에만 플레이스홀더 색 면을 걷어낸다.
  document.querySelectorAll('.ph img').forEach((img) => {
    const markLoaded = () => img.parentElement.classList.add('is-loaded');
    if (img.complete && img.naturalWidth > 0) markLoaded();
    else img.addEventListener('load', markLoaded, { once: true });
  });

  /* ---------- Rotator (히어로 사진) ---------- */
  // items를 interval마다 하나씩 is-active로 바꾸고, 직전 항목은 prevMs 동안 is-prev로 둔다.
  const createRotator = (items, interval, prevMs) => {
    let index = 0;
    let timer = null;

    const next = () => {
      const prev = items[index];
      index = (index + 1) % items.length;
      const current = items[index];

      items.forEach((el) => el.classList.remove('is-prev'));
      prev.classList.remove('is-active');
      prev.classList.add('is-prev');
      current.classList.add('is-active');

      window.setTimeout(() => prev.classList.remove('is-prev'), prevMs);
    };

    const reset = () => {
      index = 0;
      items.forEach((el, i) => {
        el.classList.remove('is-prev');
        el.classList.toggle('is-active', i === 0);
      });
    };

    return {
      start() {
        if (timer || items.length < 2) return;
        timer = window.setInterval(next, interval);
      },
      stop() {
        window.clearInterval(timer);
        timer = null;
        reset();
      },
    };
  };

  /* ---------- 히어로 오른쪽: 계절 디졸브 (WebGL) ---------- */
  // 다음 계절이 노이즈 얼룩을 따라 군데군데 먼저 스며들고 얼룩이 넓어지며 화면을 덮는다 (부드러운 가장자리 약 10%).
  // 한 계절 1.8초 머물고 1.8초 동안 전환(power1.inOut), 전환마다 노이즈 seed가 바뀐다. 전환 시작부터 약 2초 새 계절 입자가 흩날린다.
  // WebGL이 없으면 기존 크로스페이드(6초 · 1.2초), 모션 줄이기면 6초마다 0.6초 크로스페이드만
  const heroRight = document.querySelector('.hero-right');
  const heroSlides = [...document.querySelectorAll('.hero-slide')];
  const SEASON_SRC = ['spring', 'summer', 'autumn', 'winter'].map((k) => `asset/season-${k}.webp`);
  const HOLD_MS = 1800; // 한 계절에 머무는 시간 (1.5~2초)
  const DISSOLVE_MS = 1800;

  const startCrossfade = (prevMs) => {
    heroRight.classList.remove('is-gl');
    createRotator(heroSlides, 6000, prevMs).start();
  };

  const VERT = 'attribute vec2 aPos; varying vec2 vUv; void main(){ vUv = vec2(aPos.x * 0.5 + 0.5, 0.5 - aPos.y * 0.5); gl_Position = vec4(aPos, 0.0, 1.0); }';
  const FRAG = `
    #ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
    #else
    precision mediump float;
    #endif
    varying vec2 vUv;
    uniform sampler2D uA;
    uniform sampler2D uB;
    uniform float uP;
    uniform vec2 uSeed;
    uniform vec2 uRes;
    uniform vec2 uScale;
    uniform vec2 uOffset;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float noise(vec2 p) {
      vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
    }
    float fbm(vec2 p) {
      float v = 0.0; float a = 0.5;
      for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + 17.0; a *= 0.5; }
      return v;
    }
    void main() {
      vec2 iuv = (vUv - uOffset) / uScale;
      vec4 a = texture2D(uA, iuv);
      vec4 b = texture2D(uB, iuv);
      float n = fbm(vUv * vec2(uRes.x / uRes.y, 1.0) * 2.6 + uSeed);
      n = clamp((n - 0.18) / 0.64, 0.0, 1.0);
      float e = 0.1;
      float t = uP * (1.0 + e);
      float m = 1.0 - smoothstep(t - e, t, n);
      gl_FragColor = mix(a, b, m);
    }`;

  const initHeroGL = (images) => {
    const canvas = heroRight.querySelector('.hero-gl');
    const gl = canvas.getContext('webgl', { alpha: false, antialias: false, preserveDrawingBuffer: true });
    if (!gl) return null;
    const compile = (type, src) => {
      const sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      return gl.getShaderParameter(sh, gl.COMPILE_STATUS) ? sh : null;
    };
    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return null;
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    let textures;
    try {
      textures = images.map((img) => {
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
      return tex;
      });
    } catch (err) {
      return null; // file:// 로 열면 보안 정책상 로컬 이미지를 텍스처로 못 올린다 → Canvas 2D로
    }
    if (gl.getError() !== gl.NO_ERROR) return null;
    const u = (name) => gl.getUniformLocation(prog, name);
    const loc = { a: u('uA'), b: u('uB'), p: u('uP'), seed: u('uSeed'), res: u('uRes'), scale: u('uScale'), offset: u('uOffset') };
    gl.uniform1i(loc.a, 0);
    gl.uniform1i(loc.b, 1);

    // object-fit: cover + object-position: 100% max(100%, 24px - 41.25cqw) 와 같은 크롭 (cqw = 오른쪽 면 너비)
    const iw = images[0].naturalWidth;
    const ih = images[0].naturalHeight;
    const resize = () => {
      const w = heroRight.clientWidth;
      const h = heroRight.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
      const k = Math.max(w / iw, h / ih);
      const dw = iw * k;
      const dh = ih * k;
      const ox = w - dw;
      const oy = Math.max(h - dh, 24 - 0.4125 * w);
      gl.uniform2f(loc.res, w, h);
      gl.uniform2f(loc.scale, dw / w, dh / h);
      gl.uniform2f(loc.offset, ox / w, oy / h);
    };
    const draw = (from, to, p, seed) => {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, textures[from]);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, textures[to]);
      gl.uniform1f(loc.p, p);
      gl.uniform2f(loc.seed, seed[0], seed[1]);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
    return { resize, draw };
  };

  // 같은 디졸브를 Canvas 2D로: 노이즈 값을 작은 격자로 계산해 두고, 매 프레임 smoothstep 마스크(작은 캔버스)를
  // 부드럽게 확대해 다음 계절 이미지를 오려 덮는다. 이미지 픽셀을 읽지 않으므로 file:// 에서도 동작한다
  const initHero2D = (images) => {
    // WebGL을 한 번 시도한 캔버스는 2D 컨텍스트를 못 얻으므로 새 캔버스로 바꿔 끼운다
    const old = heroRight.querySelector('.hero-gl');
    const canvas = old.cloneNode(false);
    old.replaceWith(canvas);
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const layer = document.createElement('canvas');
    const lctx = layer.getContext('2d');
    const mask = document.createElement('canvas');
    const mctx = mask.getContext('2d');
    const iw = images[0].naturalWidth;
    const ih = images[0].naturalHeight;
    let crop = null;
    let field = null;
    let fieldSeed = null;
    let mw = 0;
    let mh = 0;
    const hash = (x, y, sx, sy) => {
      const v = Math.sin((x + sx) * 127.1 + (y + sy) * 311.7) * 43758.5453;
      return v - Math.floor(v);
    };
    const vnoise = (x, y, sx, sy) => {
      const ix = Math.floor(x);
      const iy = Math.floor(y);
      const fx = x - ix;
      const fy = y - iy;
      const ux = fx * fx * (3 - 2 * fx);
      const uy = fy * fy * (3 - 2 * fy);
      const a = hash(ix, iy, sx, sy);
      const b = hash(ix + 1, iy, sx, sy);
      const c = hash(ix, iy + 1, sx, sy);
      const d = hash(ix + 1, iy + 1, sx, sy);
      return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
    };
    const buildField = (seed) => {
      field = new Float32Array(mw * mh);
      const aspect = canvas.width / canvas.height;
      for (let y = 0; y < mh; y += 1) {
        for (let x = 0; x < mw; x += 1) {
          let px = (x / mw) * aspect * 2.6;
          let py = (y / mh) * 2.6;
          let v = 0;
          let amp = 0.5;
          for (let o = 0; o < 5; o += 1) {
            v += amp * vnoise(px, py, seed[0], seed[1]);
            px = px * 2.03 + 17;
            py = py * 2.03 + 17;
            amp *= 0.5;
          }
          field[y * mw + x] = Math.min(1, Math.max(0, (v - 0.18) / 0.64));
        }
      }
      fieldSeed = seed;
    };
    const resize = () => {
      const w = heroRight.clientWidth;
      const h = heroRight.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = layer.width = Math.round(w * dpr);
      canvas.height = layer.height = Math.round(h * dpr);
      const k = Math.max(w / iw, h / ih);
      crop = { x: (w - iw * k) * dpr, y: Math.max(h - ih * k, 24 - 0.4125 * w) * dpr, w: iw * k * dpr, h: ih * k * dpr };
      mw = 160;
      mh = Math.round(160 * (h / w));
      mask.width = mw;
      mask.height = mh;
      field = null;
    };
    const draw = (from, to, p, seed) => {
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(images[from], crop.x, crop.y, crop.w, crop.h);
      if (p <= 0) return;
      if (!field || fieldSeed !== seed) buildField(seed);
      const img = mctx.createImageData(mw, mh);
      const e = 0.1;
      const t = p * (1 + e);
      for (let i = 0; i < field.length; i += 1) {
        const k = Math.min(1, Math.max(0, (field[i] - (t - e)) / e));
        img.data[i * 4 + 3] = (1 - k * k * (3 - 2 * k)) * 255;
      }
      mctx.putImageData(img, 0, 0);
      lctx.globalCompositeOperation = 'source-over';
      lctx.clearRect(0, 0, layer.width, layer.height);
      lctx.drawImage(images[to], crop.x, crop.y, crop.w, crop.h);
      lctx.globalCompositeOperation = 'destination-in';
      lctx.imageSmoothingEnabled = true;
      lctx.imageSmoothingQuality = 'high';
      lctx.drawImage(mask, 0, 0, layer.width, layer.height);
      ctx.drawImage(layer, 0, 0);
    };
    return { resize, draw };
  };

  // 계절 입자: 일러스트와 같은 납작한 SVG 도형
  const PARTICLES = [
    { colors: ['#F7C9CF', '#F3B2BC', '#FADADD'], svg: (c) => `<svg viewBox="0 0 20 20"><path d="M10 1C14 5 15 11 10 19 5 11 6 5 10 1Z" fill="${c}"/></svg>`, size: [12, 18] },
    { colors: ['#A9C77A', '#93B866', '#BFD68F'], svg: (c) => `<svg viewBox="0 0 20 20"><path d="M3 17C3 8 9 3 18 2 17 11 12 17 3 17Z" fill="${c}"/><path d="M4 16 13 7" stroke="rgba(60,80,30,.35)" stroke-width="1" fill="none"/></svg>`, size: [14, 20] },
    { colors: ['#E08A3C', '#C9692E', '#A8673A', '#E9A64B'], svg: (c) => `<svg viewBox="0 0 20 20"><path d="M10 1 12.5 6 18 5 15 10 19 13 13 14 12 19 10 15 8 19 7 14 1 13 5 10 2 5 7.5 6Z" fill="${c}"/></svg>`, size: [14, 22] },
    { colors: ['#FFFFFF', '#F4F7FA'], svg: (c) => `<svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="7" fill="${c}" opacity=".95"/></svg>`, size: [6, 11] },
  ];
  const particleLayer = heroRight.querySelector('.hero-particles');
  let particleTweens = [];
  const spawnParticles = (season) => {
    const { gsap } = window;
    if (!gsap) return;
    const kind = PARTICLES[season];
    const W = heroRight.clientWidth;
    const H = heroRight.clientHeight;
    const count = window.matchMedia('(max-width: 760px)').matches ? 5 : 10;
    for (let i = 0; i < count; i += 1) {
      const el = document.createElement('span');
      el.className = 'hero-particle';
      const size = gsap.utils.random(kind.size[0], kind.size[1]);
      el.style.width = `${size}px`;
      el.style.height = `${size}px`;
      el.innerHTML = kind.svg(gsap.utils.random(kind.colors));
      particleLayer.appendChild(el);
      const x0 = gsap.utils.random(0.08, 0.95) * W;
      const y0 = gsap.utils.random(-0.06, 0.18) * H;
      const fall = gsap.utils.random(0.22, 0.4) * H; // 위쪽에서만 흩날려 헤드라인(아래쪽)까지 내려가지 않게
      const dur = gsap.utils.random(1.5, 2.1);
      const delay = gsap.utils.random(0, 0.5);
      const spin = gsap.utils.random(-240, 240);
      const sway = gsap.utils.random(14, 32) * (Math.random() < 0.5 ? -1 : 1);
      gsap.set(el, { x: x0, y: y0, rotation: gsap.utils.random(0, 360), opacity: 0 });
      const tl = gsap.timeline({ delay, onComplete: () => { el.remove(); particleTweens = particleTweens.filter((t) => t !== tl); } })
        .to(el, { y: y0 + fall, rotation: `+=${spin}`, duration: dur, ease: 'sine.in' }, 0)
        .to(el, { keyframes: { x: [x0, x0 + sway, x0 - sway * 0.4, x0 + sway * 0.7] }, duration: dur, ease: 'sine.inOut' }, 0)
        .to(el, { opacity: 0.9, duration: 0.3, ease: 'none' }, 0)
        .to(el, { opacity: 0, duration: 0.5, ease: 'none' }, dur - 0.5);
      particleTweens.push(tl);
    }
  };

  const loadImage = (src) => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

  if (reduceMotion.matches) {
    startCrossfade(600);
  } else {
    // 4장을 미리 불러온 뒤 시작. 준비되기 전에는 첫 슬라이드(봄)가 그대로 보인다
    Promise.all(SEASON_SRC.map(loadImage)).then((images) => {
      const glView = initHeroGL(images) || initHero2D(images);
      if (!glView) {
        startCrossfade(1200);
        return;
      }
      glView.resize();
      let current = 0;
      let seed = [Math.random() * 100, Math.random() * 100];
      glView.draw(0, 0, 0, seed);
      heroRight.classList.add('is-gl');

      let phase = 'hold';
      let elapsed = 0;
      let last = performance.now();
      let visible = true;
      const ease = (x) => (x < 0.5 ? 2 * x * x : 1 - ((-2 * x + 2) ** 2) / 2); // power1.inOut

      const setPaused = (paused) => {
        heroRight.classList.toggle('is-paused', paused);
        particleTweens.forEach((t) => (paused ? t.pause() : t.resume()));
      };
      const tick = (now) => {
        const dt = now - last;
        last = now;
        if (visible && !document.hidden) {
          elapsed += Math.min(dt, 100);
          if (phase === 'hold' && elapsed >= HOLD_MS) {
            phase = 'dissolve';
            elapsed = 0;
            seed = [Math.random() * 100, Math.random() * 100];
            spawnParticles((current + 1) % 4);
          }
          if (phase === 'dissolve') {
            const p = Math.min(1, elapsed / DISSOLVE_MS);
            glView.draw(current, (current + 1) % 4, ease(p), seed);
            if (p >= 1) {
              current = (current + 1) % 4;
              phase = 'hold';
              elapsed = 0;
            }
          }
        }
        window.requestAnimationFrame(tick);
      };
      window.requestAnimationFrame(tick);

      // 히어로가 화면 밖이거나 탭이 숨겨지면 전환·입자·이동 모두 멈춤
      new IntersectionObserver((entries) => {
        visible = entries[0].isIntersecting;
        setPaused(!visible);
      }).observe(heroRight);
      document.addEventListener('visibilitychange', () => setPaused(document.hidden || !visible));

      window.addEventListener('resize', () => {
        glView.resize();
        glView.draw(current, (current + 1) % 4, phase === 'dissolve' ? ease(Math.min(1, elapsed / DISSOLVE_MS)) : 0, seed);
      });
    }).catch(() => startCrossfade(1200));
  }

  /* ---------- 히어로 사과 더미 (나무에 사과가 다 열린 뒤 후두둑 쏟아져 쌓임, GSAP) ---------- */
  // 자리는 미리 계산한 가로 줄로 떨어진다(물리 엔진 없음). 떨어지는 사과·쌓인 사과 모두 나무 뒤 레이어(.hero-pile)라
  // 잎·열린 사과 앞을 지나가지 않고, 줄기·잔디 언덕이 더미 앞에 보인다
  const pile = document.querySelector('.hero-pile');
  if (pile) {
    const heroPanel = pile.closest('.hero-left');
    // 쌓는 자리(줄 간격·낙하 높이) 계산은 와펜 때 비율 그대로 둬서 더미 높이·레이어가 변하지 않게 한다
    const APPLE_RATIO = 800 / 680;
    // 장면 속 사과는 일러스트 사과 4가지 (01·03은 잎 있음). [파일 번호, 가로, 세로]
    const ILLUST = [[1, 420, 417], [2, 420, 378], [3, 420, 367], [4, 375, 336]];
    const PILE_HEIGHT = 0.2; // 더미 윗면 = 면 높이의 20%
    const ROWS = 3;

    // 매번 같은 더미 모양이 나오도록 고정 시드 난수
    const seeded = (seed) => () => {
      seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    // 더미 자리 (px, 왼쪽 면 기준): 가로 줄 3개를 빈틈없이 채우고, 사과마다 x ±8px · y ±4px · 크기 ±6% · 각도 ±18°만 흔든다.
    // 크기·각도 차이를 작게 둬서 윗면이 면 전체 너비에서 고르다. 맨 아랫줄은 면 아래 가장자리 밖으로 살짝 잘린다
    const buildPile = () => {
      const W = heroPanel.clientWidth;
      const H = heroPanel.clientHeight;
      const mobile = window.matchMedia('(max-width: 760px)').matches;
      const rand = seeded(1968);
      const w = H * (mobile ? 0.13 : 0.105);
      const h = w * APPLE_RATIO;
      const base = -w * 0.25;
      // 맨 윗줄 위끝이 면 높이의 20%에 오도록 줄 간격을 정한다
      const step = (H * PILE_HEIGHT - base - h) / (ROWS - 1);
      const gap = w * 0.72;
      const list = [];
      let prevRow = [];
      for (let row = 0; row < ROWS; row += 1) {
        const offset = (row % 2) * gap * 0.5;
        const thisRow = [];
        for (let x = -w * 0.3 + offset; x < W + w * 0.3; x += gap) {
          // 크기는 ±10%만
          const size = w * (0.9 + rand() * 0.2);
          // 모양은 무작위로 섞되, 같은 줄 왼쪽 이웃·바로 아래 줄에서 가장 가까운 사과와는 다른 모양
          const below = prevRow.reduce((best, d) => (!best || Math.abs(d.cx - x) < Math.abs(best.cx - x) ? d : best), null);
          const avoid = [thisRow.at(-1)?.illust, below?.illust];
          const choices = ILLUST.map((_, i) => i).filter((i) => !avoid.includes(i));
          const illust = choices[Math.floor(rand() * choices.length)];
          const d = {
            illust,
            cx: x + (rand() * 2 - 1) * 8,
            bottom: base + row * step + (rand() * 2 - 1) * 4,
            w: size,
            rot: (rand() * 2 - 1) * 18,
            row,
            z: 50 - row * 10 + Math.floor(rand() * 4), // 앞(아래) 줄이 위에 보이게
          };
          thisRow.push(d);
          list.push(d);
        }
        prevRow = thisRow;
      }
      return list;
    };

    let pileApples = [];
    const renderPile = () => {
      pile.replaceChildren();
      pileApples = buildPile().map((d) => {
        const el = document.createElement('span');
        el.className = 'pile-apple';
        el.style.cssText = `left:${d.cx - d.w / 2}px;bottom:${d.bottom}px;width:${d.w}px;z-index:${d.z};--rot:${d.rot.toFixed(1)}deg`;
        const [n, iw, ih] = ILLUST[d.illust];
        el.innerHTML = `<img src="asset/apple-illust-0${n}.webp" alt="" width="${iw}" height="${ih}">`;
        pile.appendChild(el);
        return { el, ...d };
      });
    };

    const { gsap } = window;
    // 나무에 사과가 거의 다 열려 갈 무렵(마지막 사과 1.95초) 바로 시작
    const START_AT = 1800;
    const loadedAt = performance.now();
    let playing = false;

    const settle = () => {
      renderPile();
      pile.classList.add('is-settled');
    };

    if (!gsap || reduceMotion.matches) {
      settle();
    } else {
      renderPile();
      const rand = Math.random;
      const between = (a, b) => a + rand() * (b - a);
      const W = heroPanel.clientWidth;
      const H = heroPanel.clientHeight;
      // 대기: 면 위쪽 바깥(사과 크기 + 40px 위)에 숨기고 자기 낙하가 시작될 때까지 visibility: hidden.
      // 출발 가로 위치는 잎 바로 위보다 양옆(0~25%, 75~100%)에 더 많이
      pileApples.forEach((a) => {
        const h = a.w * APPLE_RATIO;
        const startX = rand() < 0.7
          ? (rand() < 0.5 ? between(0, 0.25) : between(0.75, 1)) * W
          : between(0, 1) * W;
        // 착지 후 구르기는 자기 자리 안에서만 (최대 8px)
        a.roll = rand() < 0.35 ? (rand() < 0.5 ? -1 : 1) * between(4, 8) : 0;
        a.rollRot = (a.roll / (a.w / 2)) * (180 / Math.PI);
        gsap.set(a.el, {
          visibility: 'hidden',
          x: startX - a.cx,
          // 사과 아래끝을 면 맨 위로 올린 뒤(−(H − bottom)) 사과 크기(대각선) + 40px만큼 더 위
          y: -(H - a.bottom) - Math.hypot(a.w, h) - 40 - between(0, 120),
          rotation: (rand() < 0.5 ? -1 : 1) * between(120, 420),
        });
      });

      // 세 번의 물결: 몇 개 → 잠깐 멈춤 → 와르르 → 마지막 후두둑. 아래 줄부터 착지하도록 줄 순서로 시작 시각을 나눈다
      const order = [...pileApples].sort((a, b) => a.row - b.row || rand() - 0.5);
      const n = order.length;
      const w1 = Math.max(3, Math.round(n * 0.15));
      const w3 = Math.max(3, Math.round(n * 0.12));
      const times = (count, from, to) => Array.from({ length: count }, () => between(from, to)).sort((a, b) => a - b);
      // 천천히: 물결 간격과 낙하 시간을 2배로 (전체 약 5초)
      const starts = [...times(w1, 0, 0.7), ...times(n - w1 - w3, 1.24, 2.8), ...times(w3, 3, 3.6)];

      const play = () => {
        playing = true;
        heroPanel.classList.add('is-falling');
        const tl = gsap.timeline({
          onComplete: () => {
            playing = false;
            heroPanel.classList.remove('is-falling');
            pile.classList.add('is-settled');
          },
        });
        order.forEach((a, i) => {
          const t = starts[i];
          const dur = between(0.96, 1.4);
          const h = a.w * APPLE_RATIO;
          const wob = between(6, 14);
          tl.set(a.el, { visibility: 'visible' }, t)
            .to(a.el, { y: 0, duration: dur, ease: 'power2.in' }, t)
            .to(a.el, { x: a.roll, duration: dur, ease: 'sine.inOut' }, t)
            .to(a.el, { rotation: a.rollRot, duration: dur, ease: 'power1.out' }, t)
            // 떨어지는 동안 좌우로 살짝 흔들리며
            .to(a.el, { keyframes: { xPercent: [0, wob, -wob * 0.8, wob * 0.4, 0] }, duration: dur, ease: 'none' }, t)
            // 착지: 짧게 납작 → 복원 + 작게 통통
            .to(a.el, { scaleY: 0.85, scaleX: 1.1, duration: 0.06, ease: 'power1.out' }, t + dur)
            .to(a.el, { scaleY: 1, scaleX: 1, duration: 0.12, ease: 'power1.out' }, t + dur + 0.06)
            .to(a.el, { y: -h * between(0.06, 0.13), duration: 0.13, ease: 'power2.out' }, t + dur + 0.06)
            .to(a.el, { y: 0, duration: 0.13, ease: 'power2.in' }, t + dur + 0.19);
          if (rand() < 0.5) {
            tl.to(a.el, { y: -h * 0.04, duration: 0.08, ease: 'power2.out' }, t + dur + 0.32)
              .to(a.el, { y: 0, duration: 0.08, ease: 'power2.in' }, t + dur + 0.4);
          }
          if (a.roll) tl.to(a.el, { x: 0, rotation: 0, duration: 0.3, ease: 'power2.out' }, t + dur + 0.08);
        });
        // 마지막 사과가 쌓이면 더미 전체가 한 번 살짝 들썩
        tl.to(pileApples.map((a) => a.el), { y: -3, duration: 0.09, ease: 'sine.out', yoyo: true, repeat: 1 }, '+=0.02');
      };

      // 히어로가 화면에 보일 때만, 세션 중 1회. 늦게 보이면 남은 대기 시간만큼만 기다렸다가 재생
      const observer = new IntersectionObserver((entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        window.setTimeout(play, Math.max(0, START_AT - (performance.now() - loadedAt)));
      });
      observer.observe(heroPanel);
    }

    // 화면 크기가 바뀌면(재생 중이 아닐 때) 쌓인 상태로 다시 배치
    let resizeTimer = 0;
    let lastW = heroPanel.clientWidth;
    let lastH = heroPanel.clientHeight;
    window.addEventListener('resize', () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        if (heroPanel.clientWidth === lastW && heroPanel.clientHeight === lastH) return;
        lastW = heroPanel.clientWidth;
        lastH = heroPanel.clientHeight;
        if (!playing && pile.classList.contains('is-settled')) settle();
      }, 200);
    });
  }

  /* ---------- 5. 품종: 사과 한 박스 ---------- */
  // 마우스·키보드 포커스·탭으로 그 사과가 떠오르고 카드가 펼쳐진다.
  // 아무도 건드리지 않으면 섹션이 보이는 동안 홍로 → 시나노골드 → 부사를 3.5초마다 차례로 소개, 손을 떼면 4초 뒤 다시 시작
  const crate = document.querySelector('.crate');
  if (crate) {
    const crateApples = [...crate.querySelectorAll('.crate-apple')];
    const AUTO_MS = 3500;
    const RESUME_MS = 4000;
    let openIndex = -1;
    let autoIndex = -1;
    let autoTimer = null;
    let resumeTimer = null;
    let inView = false;
    let held = false;

    const cards = crateApples.map((btn) => document.getElementById(btn.getAttribute('aria-controls')));
    // 카드는 한 번에 하나만: 이전 카드가 완전히 접힌 뒤(CARD_CLOSE_MS) 다음 카드를 연다.
    // 빠르게 오가도 마지막 요청 하나만 남기므로 빈 틀이나 카드 두 장이 동시에 보이지 않는다
    const CARD_CLOSE_MS = 340; // style.css .variety-paper 접힘 0.3초 + 여유
    let shownCard = -1;
    let closedAt = 0;
    let cardTimer = 0;
    const setCard = (i, on) => {
      cards[i].classList.toggle('is-open', on);
      cards[i].setAttribute('aria-hidden', String(!on));
    };
    const showCard = (index) => {
      window.clearTimeout(cardTimer);
      if (index === shownCard) return;
      if (shownCard >= 0) {
        setCard(shownCard, false);
        shownCard = -1;
        closedAt = performance.now();
      }
      if (index < 0) return;
      const wait = Math.max(0, CARD_CLOSE_MS - (performance.now() - closedAt));
      const open = () => {
        setCard(index, true);
        shownCard = index;
      };
      if (wait) cardTimer = window.setTimeout(open, wait);
      else open();
    };

    const openApple = (index) => {
      openIndex = index;
      crate.classList.toggle('has-open', index >= 0);
      crateApples.forEach((btn, i) => {
        const on = i === index;
        btn.classList.toggle('is-open', on);
        btn.setAttribute('aria-expanded', String(on));
      });
      showCard(index);
      if (index >= 0) autoIndex = index;
    };

    const stopAuto = () => {
      window.clearInterval(autoTimer);
      window.clearTimeout(resumeTimer);
      autoTimer = null;
    };
    const step = () => openApple((autoIndex + 1) % crateApples.length);
    // showNow: 바로 다음 사과를 보여 주고 시작 / 아니면 지금 펼친 사과를 3.5초 더 두고 넘어감
    const startAuto = (showNow) => {
      stopAuto();
      if (!inView || held) return;
      if (showNow) step();
      autoTimer = window.setInterval(step, AUTO_MS);
    };
    const resumeLater = (showNow) => {
      window.clearTimeout(resumeTimer);
      resumeTimer = window.setTimeout(() => startAuto(showNow), RESUME_MS);
    };

    const hold = (index) => {
      held = true;
      stopAuto();
      openApple(index);
    };
    const release = ({ close = true, showNow = true } = {}) => {
      held = false;
      if (close) openApple(-1);
      resumeLater(showNow);
    };

    crateApples.forEach((btn, i) => {
      const cut = btn.querySelector('.crate-apple-body .crate-apple-cut');
      let pointerType = '';
      cut.addEventListener('pointerenter', (event) => {
        if (event.pointerType === 'mouse') hold(i);
      });
      cut.addEventListener('pointerleave', (event) => {
        if (event.pointerType === 'mouse' && document.activeElement !== btn) release();
      });
      btn.addEventListener('pointerdown', (event) => { pointerType = event.pointerType; });
      // 탭: 펼치고, 읽을 시간을 두고(4초 + 3.5초) 다음 사과로. 이미 펼친 사과를 다시 탭하면 접힘
      btn.addEventListener('click', () => {
        if (pointerType !== 'touch' && pointerType !== 'pen') return;
        pointerType = '';
        if (openIndex === i && !autoTimer) {
          release();
        } else {
          hold(i);
          release({ close: false, showNow: false });
        }
      });
      // 키보드 포커스(Tab)로도 펼침. 포커스가 빠지면 접고 4초 뒤 다시 소개
      btn.addEventListener('focus', () => {
        if (btn.matches(':focus-visible')) hold(i);
      });
      btn.addEventListener('blur', () => {
        if (held && openIndex === i) release();
      });
    });

    new IntersectionObserver((entries) => {
      inView = entries[0].isIntersecting;
      if (inView) {
        startAuto(openIndex < 0);
      } else {
        stopAuto();
        held = false;
        openApple(-1);
      }
    }, { threshold: 0.35 }).observe(crate);
  }

  /* ---------- 6. 약속: 나무 도장이 꼬리표 4장을 땅땅땅땅 (GSAP) ---------- */
  // 도장이 오른쪽 위 화면 밖에서 들어와 꼬리표마다 [떠 있음 → 내려감 0.22초 → 땅 0.08초(자국이 나타남) → 들어 올림 0.2초 → 호를 그리며 다음으로 0.3초]
  // = 한 장당 0.8초. 네 번째를 찍으면 오른쪽 아래로 옮겨 12° 기울여 놓는다. 섹션 진입 시 1회, 이후엔 찍힌 상태 + 놓인 도장 유지
  const tagStage = document.querySelector('.tags-stage');
  if (tagStage) {
    const tags = [...tagStage.querySelectorAll('.tag')];
    const marks = tags.map((tag) => tag.querySelector('.tag-mark'));
    const bodies = tags.map((tag) => tag.querySelector('.tag-body'));
    const tool = tagStage.querySelector('.stamp-tool');
    const shadow = tagStage.querySelector('.stamp-shadow');
    const ORIGIN_X = 0.499; // 고무 바닥 중심 (도장 이미지 기준)
    const ORIGIN_Y = 0.812;
    const { gsap } = window;
    let done = false;

    // 무대 기준 좌표: 자국 가운데(찍는 점)와 다 찍은 뒤 놓을 자리(4번째 꼬리표 오른쪽 아래)
    const stageBox = () => tagStage.getBoundingClientRect();
    const markPoint = (i) => {
      const s = stageBox();
      const r = marks[i].getBoundingClientRect();
      return { x: r.left + r.width / 2 - s.left, y: r.top + r.height / 2 - s.top };
    };
    const restPoint = () => {
      const s = stageBox();
      const r = tags[tags.length - 1].getBoundingClientRect();
      const w = tool.offsetWidth;
      // 좁은 화면(2×2)은 오른쪽에 자리가 없어 꼬리표 아래 가운데 빈 공간에 (도장 몸통이 꼬리표 글자를 가리지 않게)
      if (window.matchMedia('(max-width: 1024px)').matches) {
        return { x: s.width / 2, y: r.bottom - s.top + tool.offsetHeight * ORIGIN_Y + 12 };
      }
      return { x: Math.min(r.right - s.left + w * 0.4, s.width - w * 0.55), y: r.bottom - s.top + w * 0.2 };
    };
    // 바닥 기준점이 p에 오도록 한 도장 위치
    const toolAt = (p) => ({ x: p.x - tool.offsetWidth * ORIGIN_X, y: p.y - tool.offsetHeight * ORIGIN_Y });

    const placeRest = () => {
      const rest = restPoint();
      const at = toolAt(rest);
      const set = (el, v) => (gsap ? gsap.set(el, v) : Object.assign(el.style, { transform: `translate(${v.x}px, ${v.y}px) rotate(${v.rotation || 0}deg) scale(${v.scale || 1})` }));
      set(tool, { x: at.x, y: at.y, rotation: 12, scale: 1 });
      if (gsap) gsap.set(shadow, { x: rest.x + 2, y: rest.y + 3, scale: 0.9, opacity: 0.22, filter: 'blur(3px)' });
      tool.classList.add('is-placed', 'is-resting');
    };

    if (!gsap || reduceMotion.matches) {
      // 애니메이션 없이 자국이 찍힌 꼬리표 4장 + 놓인 도장
      placeRest();
      done = true;
    } else {
      gsap.set(marks, { opacity: 0 });

      const stampTags = () => {
        const pts = marks.map((_, i) => markPoint(i));
        const ats = pts.map(toolAt);
        const rest = restPoint();
        const restAt = toolAt(rest);
        const lift = (p) => ({ x: p.x + 16, y: p.y + 20, scale: 1.15, opacity: 0.15, filter: 'blur(18px)' });
        const tl = gsap.timeline({
          onComplete: () => {
            done = true;
            tool.classList.add('is-resting');
          },
        });
        // 오른쪽 위 화면 밖에서 첫 꼬리표 위로 들어와 떠 있음
        gsap.set(tool, { x: stageBox().width + 80, y: -tool.offsetHeight - 120, rotation: 10, scale: 1.15 });
        gsap.set(shadow, { ...lift(pts[0]), x: pts[0].x + 90, y: pts[0].y + 60, opacity: 0 });
        tool.classList.add('is-placed');
        tl.to(tool, { x: ats[0].x, y: ats[0].y, rotation: 0, duration: 0.6, ease: 'power2.out' })
          .to(shadow, { ...lift(pts[0]), duration: 0.6, ease: 'power2.out' }, '<');

        const START = 0.75;
        pts.forEach((p, i) => {
          const t = START + i * 0.8;
          // 내려가기: 1.15 → 1, 그림자는 작고 진하게
          tl.to(tool, { scale: 1, duration: 0.22, ease: 'power2.in' }, t)
            .to(shadow, { x: p.x, y: p.y + 2, scale: 0.85, opacity: 0.3, filter: 'blur(4px)', duration: 0.22, ease: 'power2.in' }, t)
            // 땅: 살짝 눌림 + 자국이 빠르게 나타남 + 꼬리표도 아주 살짝 눌림
            .to(tool, { scaleX: 1.02, scaleY: 0.95, duration: 0.04, ease: 'power1.out' }, t + 0.22)
            .to(tool, { scaleX: 1, scaleY: 1, duration: 0.04, ease: 'power1.in' }, t + 0.26)
            .to(marks[i], { opacity: 0.85, duration: 0.06, ease: 'power1.out' }, t + 0.22)
            .to(bodies[i], { y: 1.5, duration: 0.04, ease: 'power1.out', yoyo: true, repeat: 1 }, t + 0.22)
            // 들어 올리기
            .to(tool, { scale: 1.15, duration: 0.2, ease: 'power2.out' }, t + 0.3)
            .to(shadow, { ...lift(p), duration: 0.2, ease: 'power2.out' }, t + 0.3);
          if (i < pts.length - 1) {
            // 다음 꼬리표 위로 살짝 호를 그리며
            const next = ats[i + 1];
            const top = Math.min(ats[i].y, next.y) - 28;
            tl.to(tool, { x: next.x, duration: 0.3, ease: 'power1.inOut' }, t + 0.5)
              .to(tool, { y: top, duration: 0.15, ease: 'sine.out' }, t + 0.5)
              .to(tool, { y: next.y, duration: 0.15, ease: 'sine.in' }, t + 0.65)
              .to(shadow, { x: pts[i + 1].x + 16, y: pts[i + 1].y + 20, duration: 0.3, ease: 'power1.inOut' }, t + 0.5);
          } else {
            // 다 찍으면 오른쪽 아래 빈 공간에 12° 기울여 내려놓기
            tl.to(tool, { x: restAt.x, y: restAt.y, rotation: 12, duration: 0.5, ease: 'power2.inOut' }, t + 0.5)
              .to(tool, { scale: 1, duration: 0.2, ease: 'power2.in' }, t + 0.8)
              .to(shadow, { x: rest.x + 2, y: rest.y + 3, scale: 0.9, opacity: 0.22, filter: 'blur(3px)', duration: 0.7, ease: 'power2.inOut' }, t + 0.5);
          }
        });
      };

      const tagObserver = new IntersectionObserver((entries) => {
        if (!entries[0].isIntersecting) return;
        tagObserver.disconnect();
        stampTags();
      }, { threshold: 0.45 });
      tagObserver.observe(tagStage);
    }

    // 다 찍은 뒤 화면 크기가 바뀌면 놓인 도장 자리를 다시 맞춘다
    window.addEventListener('resize', () => {
      if (done) placeRest();
    });
  }

  /* ---------- Marquee (후기) ---------- */
  // 같은 그룹을 한 번 더 붙여 -50% 이동으로 끊김 없이 이어지게 한다.
  document.querySelectorAll('.review-track').forEach((track) => {
    const group = track.firstElementChild;
    const clone = group.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    track.appendChild(clone);
  });

  /* ---------- 3. 사계절 동화책 (StPageFlip, 클릭·드래그로 넘기기) ---------- */
  // 페이지 10장: 0 앞표지(하드) / 1·2 봄 그림·글 / 3·4 여름 / 5·6 가을 / 7·8 겨울 / 9 뒤표지(하드).
  // 스크롤과는 연결하지 않는 일반 섹션. 넘김은 라이브러리 기본 마우스·터치 동작(클릭·끌기·스와이프)에 맡기고,
  // 여기서는 hover 힌트 위치, 표지 가운데 맞추기, 종이 묶음 두께, 키보드, 이전·다음 버튼만 더한다.
  const year = document.querySelector('.year');

  if (year && window.gsap && window.St && window.St.PageFlip) {
    const { gsap } = window;
    year.classList.add('is-book');

    const book = year.querySelector('.book');
    const flipEl = year.querySelector('.book-flip');
    const stackLeft = year.querySelector('.book-stack--left');
    const stackRight = year.querySelector('.book-stack--right');
    const FLIP_MS = reduceMotion.matches ? 30 : 900;

    const pageFlip = new window.St.PageFlip(flipEl, {
      width: 550,
      height: 710,
      size: 'stretch',
      // 모바일은 표지 책갈피 탭 자리만큼 책이 좁아지므로 최소 크기를 조금 낮춘다 (360px 화면에서 약 296px)
      minWidth: 280,
      maxWidth: 550,
      minHeight: 360,
      maxHeight: 710,
      showCover: true,
      drawShadow: true,
      maxShadowOpacity: 0.4,
      flippingTime: FLIP_MS,
      usePortrait: true,
      useMouseEvents: true,
      // 책 위에서 위아래로 밀면 페이지가 스크롤되고, 옆으로 밀 때만 넘긴다
      mobileScrollSupport: true,
      showPageCorners: true,
      clickEventForward: true,
      autoSize: false,
    });
    pageFlip.loadFromHTML([...flipEl.querySelectorAll(':scope > .page')]);

    const ui = pageFlip.getUI();
    const render = pageFlip.getRender();
    const controller = pageFlip.getFlipController();
    const state = () => pageFlip.getState();
    const idleState = (now) => ['read', 'fold_corner'].includes(now);
    const isIdle = () => idleState(state());

    // 단계 → 페이지 번호. 펼침(landscape)은 6단계, 한 페이지씩(portrait)은 그림·글이 각각 한 단계라 10단계
    const isPortrait = () => pageFlip.getOrientation() === 'portrait';
    const stepPages = () => (isPortrait() ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] : [0, 1, 3, 5, 7, 9]);
    const lastStep = () => stepPages().length - 1;
    // 지금 펼쳐진 페이지 번호 → 단계
    const stepOfPage = (page) => stepPages().reduce((best, p, i) => (p <= page ? i : best), 0);

    // 덮인 책의 위치·크기 (x, scale)
    // - 펼침: 앞표지는 펼침면 오른쪽 자리라 왼쪽으로, 뒤표지는 오른쪽으로 반 페이지 → 표지가 화면 가운데
    // - 한 페이지(모바일): 표지가 화면 폭을 거의 채워 옆 조작이 들어갈 자리가 없으므로, 표지 상태에서만 책을 줄이고
    //   표지 + 옆 조작 덩어리를 화면 가운데로 (양옆 16px). 펼치면 원래 크기.
    //   앞표지 = 오른쪽 리본(삐져나온 길이 + 당김 12px), 뒤표지 = 왼쪽 원형 이전 버튼(32px 간격 + 지름)
    const shell = year.querySelector('.book-shell');
    const frontRibbon = book.querySelector('.book-ribbon');
    const RIBBON_PULL = 12;
    const BACK_GAP = 32;
    const placeOf = (step) => {
      if (step !== 0 && step !== lastStep()) return { x: 0, scale: 1 };
      const dir = step === 0 ? -1 : 1; // 옆 조작 반대쪽으로
      const pw = pageFlip.getBoundsRect().pageWidth;
      if (!isPortrait()) return { x: (dir * pw) / 2, scale: 1 };
      const reach = step === 0
        ? parseFloat(getComputedStyle(frontRibbon).getPropertyValue('--ribbon-out')) + RIBBON_PULL
        : parseFloat(getComputedStyle(shell).getPropertyValue('--book-ctrl')) + BACK_GAP;
      const scale = Math.min(1, (document.documentElement.clientWidth - 32 - reach) / pw);
      return { x: (dir * reach) / 2, scale };
    };

    // 종이 묶음 두께(보이는 선 수, 0~5): 넘긴 만큼 왼쪽이 두꺼워지고 오른쪽이 얇아진다
    const stackOf = (step) => {
      const last = lastStep();
      if (isPortrait()) return step === last ? { left: 0, right: 4 } : { left: 0, right: Math.max(2, 5 - Math.floor(step / 2)) };
      if (step === 0) return { left: 0, right: 5 };
      if (step === last) return { left: 5, right: 0 };
      return { left: step + 1, right: 6 - step };
    };

    // 선 n개를 바깥(dx 방향)과 아래로 1px씩 비켜 쌓는다. 크림 종이와 옅은 갈색 구분선이 번갈아 보임
    const stackShadow = (n, dx) => {
      if (!n) return 'none';
      const layers = [];
      for (let k = 1; k <= n; k += 1) {
        const color = k % 2 ? 'var(--stack-line)' : 'var(--stack-paper)';
        layers.push(`${dx * k}px ${k}px 0 ${color}`);
      }
      layers.push(`${dx * (n + 1)}px ${n + 1}px 0 var(--stack-line)`);
      // 바로 아래로도 같은 줄을 깔아, 펼친 책 가운데 아래에서 양쪽 묶음 사이가 V자로 비지 않게
      for (let k = 1; k <= n; k += 1) {
        layers.push(`0 ${k}px 0 ${k % 2 ? 'var(--stack-line)' : 'var(--stack-paper)'}`);
      }
      return layers.join(', ');
    };

    // 종이 묶음 모서리는 그 자리에 놓인 페이지와 같은 값 (덮인 책 = 표지 radius, 펼친 책 = 속지 radius)
    const R_COVER = 'var(--r-cover)';
    const R_SPINE = 'var(--r-spine)';
    const R_PAGE = 'var(--r-page)';
    const placeStacks = (counts, closedBack, step) => {
      const rect = pageFlip.getBoundsRect();
      const last = lastStep();
      const place = (el, x) => Object.assign(el.style, {
        left: `${x}px`, top: `${rect.top}px`, width: `${rect.pageWidth}px`, height: `${rect.height}px`,
      });
      place(stackLeft, rect.left);
      place(stackRight, rect.left + rect.pageWidth);
      stackLeft.style.borderRadius = step === last
        ? `${R_COVER} ${R_SPINE} ${R_SPINE} ${R_COVER}` : `${R_PAGE} 0 0 ${R_PAGE}`;
      stackRight.style.borderRadius = step === 0 || (isPortrait() && step === last)
        ? `${R_SPINE} ${R_COVER} ${R_COVER} ${R_SPINE}` : `0 ${R_PAGE} ${R_PAGE} 0`;
      stackLeft.style.boxShadow = stackShadow(counts.left, -1);
      stackLeft.style.visibility = counts.left ? 'visible' : 'hidden';
      // 한 페이지 모드의 뒤표지는 책이 반대로 덮였으니 왼쪽·아래로
      stackRight.style.boxShadow = stackShadow(counts.right, closedBack ? -1 : 1);
      stackRight.style.visibility = counts.right ? 'visible' : 'hidden';
    };
    const updateStacks = (step, other = step) => {
      const a = stackOf(step);
      const b = stackOf(other);
      const last = lastStep();
      placeStacks({ left: Math.min(a.left, b.left), right: Math.min(a.right, b.right) }, isPortrait() && step === last && other === last, step === other ? step : -1);
    };

    let current = 0;
    let bookPlace = { x: 0, scale: 1 };
    const samePlace = (a, b) => Math.abs(a.x - b.x) < 0.5 && Math.abs(a.scale - b.scale) < 0.001;

    // 넘김 조작 상태: 앞표지 = 오른쪽 리본 책갈피 / 펼침면 = 양옆(모바일은 아래) 원형 이전·다음 / 뒤표지 = 왼쪽 원형 이전 하나.
    // 리본과 뒤표지 이전 버튼은 .book 안에 있어 책이 열리고 닫히며 가운데로 옮겨 갈 때 함께 움직인다.
    // 사라질 때는 바로, 나타날 때는 책이 거의 자리 잡은 뒤(--nav-delay) (style.css)
    const nav = year.querySelector('.book-nav');
    const prevBtn = nav.querySelector('.book-nav-btn--prev');
    const nextBtn = nav.querySelector('.book-nav-btn--next');
    const backPrevBtn = book.querySelector('.book-back-prev');
    const controls = [prevBtn, nextBtn, frontRibbon, backPrevBtn];
    nav.hidden = false;
    const navOf = (step) => {
      if (step === 0) return 'front';
      if (step === lastStep()) return 'back';
      return 'spread';
    };
    const setNav = (kind, delayMs = 0) => {
      if (shell.dataset.nav === kind) return;
      // 숨겨지는 버튼·탭에 포커스가 있었으면 책으로 옮겨 키보드 사용자가 길을 잃지 않게 (책에서 ← → 로 계속 넘길 수 있다)
      if (controls.includes(document.activeElement)) flipEl.focus({ preventScroll: true });
      shell.style.setProperty('--nav-delay', `${Math.round(delayMs)}ms`);
      shell.dataset.nav = kind;
    };
    // 덮인 책(펼침 모드의 앞·뒤표지)은 책 영역의 한쪽 반만 보인다 → 포커스 링 자리 (style.css)
    const markClosed = () => {
      book.classList.toggle('is-front', !isPortrait() && current === 0);
      book.classList.toggle('is-back', !isPortrait() && current === lastStep());
    };
    // 리본은 책 안에 있어 책과 함께 줄어드므로, 지금 배율을 CSS에 넘겨 리본만 원래 크기로 되돌린다 (style.css --book-scale)
    const syncScale = () => book.style.setProperty('--book-scale', String(gsap.getProperty(book, 'scale')));
    const moveBook = (step, duration) => {
      const place = placeOf(step);
      if (duration && samePlace(place, bookPlace)) return;
      bookPlace = place;
      gsap.to(book, { ...place, duration: duration || 0, ease: 'power2.inOut', overwrite: 'auto', onUpdate: syncScale, onComplete: syncScale });
    };
    const settle = () => {
      current = stepOfPage(pageFlip.getCurrentPageIndex());
      book.classList.remove('is-cover-turn');
      markClosed();
      moveBook(current, 0);
      updateStacks(current);
      setNav(navOf(current));
    };

    // 넘김 시작(클릭 = flipping, 끌기 = user_fold) → 넘어갈 단계를 보고 표지 그림자·종이 묶음·책 위치를 맞춘다.
    // 다시 read가 되면 실제 페이지로 확정 (끌다가 놓아 제자리로 돌아온 경우도 여기서 정리)
    const beginTurn = (animate) => {
      const calc = controller.getCalculation();
      if (!calc) return;
      const to = current + (calc.getDirection() === 0 ? 1 : -1);
      if (to < 0 || to > lastStep()) return;
      // 표지가 열리고 닫히는 넘김(한쪽이 비어 있는 상태)에는 바깥 그림자를 끈다 (style.css)
      book.classList.toggle('is-cover-turn', !isPortrait() && [current, to].some((k) => k === 0 || k === lastStep()));
      // 넘기는 동안은 두 단계 중 얇은 쪽 두께로 (들려 올라간 쪽 아래가 비어 보이게)
      updateStacks(current, to);
      // 열기·닫기: 넘김과 동시에 책이 반 페이지만큼 옮겨 가 끝나면 화면 가운데
      if (animate) moveBook(to, FLIP_MS / 1000);
      // 클릭 넘김은 끝까지 가므로 도착할 상태로 바로 바꾼다 (새로 나타날 쪽은 넘김 60% 지점부터 페이드인).
      // 끌기는 놓기 전까지 어디로 갈지 모르니 표지 조작만 걷고, 펼침면 버튼은 그대로(비활성) 둔다
      if (animate) setNav(navOf(to), FLIP_MS * 0.6);
      else if (navOf(current) !== 'spread') setNav('none');
    };
    pageFlip.on('changeState', (e) => {
      if (e.data === 'flipping') beginTurn(true);
      // 끌기는 상태가 먼저 바뀌고 넘길 방향은 바로 뒤에 정해진다
      else if (e.data === 'user_fold') Promise.resolve().then(() => beginTurn(false));
      else if (e.data === 'read') {
        const before = bookPlace;
        current = stepOfPage(pageFlip.getCurrentPageIndex());
        book.classList.remove('is-cover-turn');
        markClosed();
        // 끌어서 넘긴 경우는 종이가 내려앉은 뒤 책이 가운데로 미끄러진다
        if (!samePlace(placeOf(current), before)) moveBook(current, reduceMotion.matches ? 0 : 0.45);
        updateStacks(current);
        setNav(navOf(current), shell.dataset.nav === 'none' ? 0 : FLIP_MS * 0.6);
      }
    });

    // 넘기는 중(또는 끌던 종이가 돌아가는 중)에 들어온 클릭·터치는 라이브러리에 닿기 전에 막는다 → 한 번에 한 장씩
    // hover로 말려 있던 모서리는 누르는 순간 걷어 내, 클릭·끌기가 누른 자리 기준으로 새로 시작되게
    const userMove = pageFlip.userMove.bind(pageFlip);
    const FAR = { x: -9999, y: -9999 };
    let hintSide = null;
    const clearHint = () => {
      if (state() === 'fold_corner' || controller.getCalculation()) {
        userMove(FAR, false);
        render.finishAnimation();
      }
      hintSide = null;
    };
    const guard = (event) => {
      if (!isIdle()) {
        event.stopPropagation();
        return;
      }
      if (event.type === 'mousedown') clearHint();
    };
    flipEl.addEventListener('mousedown', guard, true);
    flipEl.addEventListener('touchstart', guard, true);

    // 지금 보이는 페이지 중 마우스 아래 페이지가 넘길 수 있는 쪽인지: 'next' | 'prev' | null.
    // 라이브러리 판정과 같게 — 펼침은 가운데 접힌 선, 한 페이지는 페이지 왼쪽 40%가 이전
    const sideAt = ({ x, y }) => {
      const rect = pageFlip.getBoundsRect();
      const pw = rect.pageWidth;
      if (y < rect.top || y > rect.top + rect.height) return null;
      const page = pageFlip.getCurrentPageIndex();
      const last = pageFlip.getPageCount() - 1;
      if (isPortrait()) {
        const left = rect.left + pw;
        if (x < left || x > left + pw) return null;
        // 한 페이지 모드의 표지는 어디를 눌러도 앞표지 = 열기, 뒤표지 = 되돌아가기
        if (page === 0) return 'next';
        if (page === last) return 'prev';
        return x - left <= pw * 0.4 ? 'prev' : 'next';
      }
      if (x < rect.left || x > rect.left + pw * 2) return null;
      const side = x >= rect.left + pw ? 'next' : 'prev';
      if (side === 'next' && page === last) return null; // 뒤표지 오른쪽은 빈 자리
      if (side === 'prev' && page === 0) return null; // 앞표지 왼쪽은 빈 자리
      return side;
    };

    // hover 힌트: 오른쪽(다음) 페이지 위에서는 오른쪽 아래, 왼쪽(이전) 페이지 위에서는 왼쪽 아래 모서리가 살짝 말려 올라간다.
    // 라이브러리(showPageCorners)는 마우스가 모서리에 있을 때 그 자리까지 접으므로, 페이지 어디에 있든 아래 모서리 56px 안쪽 점을 넘겨 같은 크기로 말리게 한다.
    // 끄는 중(누른 상태)에는 실제 위치를 그대로 넘겨 종이가 손을 따라온다
    const HINT_FOLD = 56;
    pageFlip.userMove = (pos, isTouch) => {
      if (pageFlip.isUserTouch || isTouch) {
        userMove(pos, isTouch);
        return;
      }
      const side = isIdle() ? sideAt(pos) : null;
      flipEl.classList.toggle('is-clickable', Boolean(side));
      if (!isIdle()) return;
      if (!side || reduceMotion.matches) {
        if (hintSide) clearHint();
        return;
      }
      // 반대쪽 페이지로 바로 옮겨 가면 앞쪽 접힘을 먼저 걷어 내야 새 모서리로 시작된다
      if (hintSide && hintSide !== side) clearHint();
      hintSide = side;
      const rect = pageFlip.getBoundsRect();
      const pw = rect.pageWidth;
      const pageLeft = isPortrait() ? rect.left + pw : rect.left;
      const x = side === 'next' ? rect.left + pw * 2 - HINT_FOLD : pageLeft + HINT_FOLD;
      userMove({ x, y: rect.top + rect.height - HINT_FOLD }, false);
    };

    // 한 페이지 모드에서 표지를 누르면: 라이브러리는 페이지 왼쪽 40%를 '이전'으로 보므로 앞표지 왼쪽을 눌러도 열리지 않는다 → 표지는 어디를 눌러도 열기·되돌아가기
    const userStop = pageFlip.userStop.bind(pageFlip);
    pageFlip.userStop = (pos, isSwipe = false) => {
      if (pageFlip.isUserTouch && !pageFlip.isUserMove && !isSwipe && isPortrait()) {
        const page = pageFlip.getCurrentPageIndex();
        const last = pageFlip.getPageCount() - 1;
        if ((page === 0 || page === last) && sideAt(pos)) {
          pageFlip.isUserTouch = false;
          if (page === 0) pageFlip.flipNext('bottom');
          else pageFlip.flipPrev('bottom');
          return;
        }
      }
      userStop(pos, isSwipe);
    };

    // 모바일: 책 위에서 위아래로 밀면 페이지 스크롤로 넘긴다.
    // 라이브러리는 0.25초 넘게 누르고 있으면 '누름'으로 보고 손을 떼는 순간 넘기므로, 세로로 움직였으면 그 누름을 취소한다
    let touchStart = null;
    flipEl.addEventListener('touchstart', (event) => {
      const t = event.changedTouches[0];
      touchStart = t ? { x: t.clientX, y: t.clientY } : null;
    }, { passive: true });
    flipEl.addEventListener('touchmove', (event) => {
      const t = event.changedTouches[0];
      if (!touchStart || !t || state() !== 'read') return;
      const dx = Math.abs(t.clientX - touchStart.x);
      const dy = Math.abs(t.clientY - touchStart.y);
      if (dy > 10 && dy > dx) {
        ui.touchPoint = null;
        pageFlip.isUserTouch = false;
        touchStart = null;
      }
    }, { passive: true });

    // 키보드·이전/다음 버튼: 클릭·드래그와 같은 넘김 애니메이션. 넘기는 중에는 무시
    const turn = (dir) => {
      if (!isIdle()) return;
      clearHint();
      if (dir > 0) pageFlip.flipNext('bottom');
      else pageFlip.flipPrev('bottom');
    };

    // 키보드: 책에 포커스가 있을 때 ← → 로 넘기기
    flipEl.setAttribute('tabindex', '0');
    flipEl.setAttribute('aria-label', '사과의 일 년 동화책. 왼쪽·오른쪽 방향키로 넘겨요.');
    flipEl.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
      event.preventDefault();
      turn(event.key === 'ArrowRight' ? 1 : -1);
    });

    // 버튼·탭: 넘기는 중에는 잠시 비활성. 보이는 쪽은 setNav가, 비활성은 여기서
    // 클릭·드래그·키보드 어느 쪽으로 넘겨도 라이브러리 flip·changeState 이벤트로 늘 현재 페이지에 맞춘다.
    // changeState는 라이브러리 내부 상태가 바뀌기 직전에 오므로 새 상태는 이벤트 값(e.data)으로 받는다
    const syncNav = (now = state()) => {
      const busy = !idleState(now);
      controls.forEach((el) => el.setAttribute('aria-disabled', String(busy)));
    };
    prevBtn.addEventListener('click', () => turn(-1));
    nextBtn.addEventListener('click', () => turn(1));
    backPrevBtn.addEventListener('click', () => turn(-1));
    // 리본: 바깥쪽으로 살짝 잡아당기듯 12px 나왔다 들어간 뒤 열기.
    // 당기는 동안 들어온 클릭은 무시. prefers-reduced-motion이면 당김 없이 바로
    let pulling = false;
    frontRibbon.addEventListener('click', () => {
      if (pulling || !isIdle()) return;
      if (reduceMotion.matches || !frontRibbon.animate) {
        turn(1);
        return;
      }
      pulling = true;
      frontRibbon.querySelector('.book-ribbon-sway').animate(
        [{ transform: 'translateX(0)' }, { transform: `translateX(${RIBBON_PULL}px)`, offset: 0.45 }, { transform: 'translateX(0)' }],
        { duration: 320, easing: 'ease-in-out' },
      ).finished.then(() => {
        pulling = false;
        turn(1);
      });
    });
    pageFlip.on('flip', () => syncNav());
    pageFlip.on('changeState', (e) => syncNav(e.data));

    // 처음 화면에 들어올 때 한 번만 책이 아래에서 살짝 올라오며 나타남 (스크롤과 연결하지 않고 진입 시 재생).
    // 이미 지나간 위치에서 새로고침했으면 바로 보이게
    if (!reduceMotion.matches && 'IntersectionObserver' in window) {
      gsap.set(book, { y: 60, autoAlpha: 0 });
      const bookObserver = new IntersectionObserver((entries) => {
        const entry = entries[0];
        if (!entry.isIntersecting && entry.boundingClientRect.top > 0) return;
        bookObserver.disconnect();
        if (entry.isIntersecting) gsap.to(book, { y: 0, autoAlpha: 1, duration: 0.9, ease: 'power2.out' });
        else gsap.set(book, { y: 0, autoAlpha: 1 });
      }, { rootMargin: '0px 0px -25% 0px' });
      bookObserver.observe(year);
    }

    // 창 크기 변경·회전: 라이브러리가 책 크기를 다시 잰 뒤(200ms) 지금 페이지 기준으로 위치·종이 묶음을 맞춘다.
    // 펼침 ↔ 한 페이지 모드가 바뀌면 단계 수(6 ↔ 10)도 달라진다
    let resizeTimer = 0;
    const relayout = () => {
      pageFlip.update();
      clearHint();
      settle();
    };
    const scheduleRelayout = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(relayout, 200);
    };
    window.addEventListener('resize', scheduleRelayout);
    pageFlip.on('changeOrientation', scheduleRelayout);

    settle();
    syncNav();
  }

  /* ---------- Rolling title (2번 한 문장) ---------- */
  // 글자마다 span으로 나눠 순서대로 굴러 들어오게 한다. 단어는 한 덩어리로 묶어 단어 중간에서 줄이 바뀌지 않게.
  document.querySelectorAll('.roll-title').forEach((title) => {
    let index = 0;
    const splitText = (node) => {
      [...node.childNodes].forEach((child) => {
        if (child.nodeType === Node.ELEMENT_NODE) {
          splitText(child);
          return;
        }
        if (child.nodeType !== Node.TEXT_NODE || !child.textContent.trim()) return;
        const fragment = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) {
            fragment.appendChild(document.createTextNode(part));
            return;
          }
          const word = document.createElement('span');
          word.className = 'roll-word';
          [...part].forEach((ch) => {
            const span = document.createElement('span');
            span.className = 'roll-char';
            span.style.setProperty('--i', index++);
            span.textContent = ch;
            word.appendChild(span);
          });
          fragment.appendChild(word);
        });
        child.replaceWith(fragment);
      });
    };
    title.setAttribute('aria-label', title.innerText.replace(/\s+/g, ' ').trim());
    splitText(title);
    [...title.children].forEach((el) => el.setAttribute('aria-hidden', 'true'));
  });

  /* ---------- Reveal ---------- */
  const revealEls = document.querySelectorAll('.reveal');

  if (reduceMotion.matches || !('IntersectionObserver' in window)) {
    revealEls.forEach((el) => el.classList.add('is-visible'));
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' }
    );
    revealEls.forEach((el) => io.observe(el));
  }

  /* ---------- 8. 문의: 나무가 자라고 사과가 톡톡 (히어로 모션을 짧게, 1회) ---------- */
  const contact = document.querySelector('.contact');
  const contactTree = contact && contact.querySelector('.contact-tree');
  if (contactTree) {
    // 나무 높이가 글 블록(헤드라인·연락처)까지 올라오지 않게 섹션 기준 글 아래끝을 넘겨 준다
    const intro = contact.querySelector('.contact-intro');
    const setIntroBottom = () => {
      const top = contact.getBoundingClientRect().top;
      contact.style.setProperty('--intro-bottom', `${intro.getBoundingClientRect().bottom - top}px`);
    };
    setIntroBottom();
    window.addEventListener('resize', setIntroBottom);
    if (document.fonts) document.fonts.ready.then(setIntroBottom); // 히피체가 늦게 오면 헤드라인 높이가 바뀐다
    if (reduceMotion.matches) {
      contactTree.classList.add('is-grown');
    } else {
      const treeObserver = new IntersectionObserver((entries) => {
        if (!entries[0].isIntersecting) return;
        treeObserver.disconnect();
        contactTree.classList.add('is-grown');
      }, { threshold: 0.3 });
      treeObserver.observe(contactTree);
    }
  }

  /* ---------- Contact form (실제 전송 없음) ---------- */
  const form = document.querySelector('.contact-form');
  const done = document.querySelector('.contact-done');

  // 문의 내용: 기본 리사이즈 핸들 대신 내용에 맞춰 세로로만 늘어남 (최대 높이는 style.css)
  const message = form.querySelector('textarea');
  const fitMessage = () => {
    message.style.height = 'auto';
    message.style.height = `${message.scrollHeight}px`;
  };
  message.addEventListener('input', fitMessage);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    // 폼 자리 높이를 그대로 둬서 섹션(과 바닥의 나무)이 갑자기 줄어들지 않게
    done.style.minHeight = `${form.offsetHeight}px`;
    form.hidden = true;
    done.hidden = false;
    done.focus({ preventScroll: true });
  });
})();
