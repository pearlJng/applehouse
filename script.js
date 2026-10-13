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
    // 열려 있는 동안 페이지 스크롤 잠금. overflow만 막아서 스크롤 위치(3번 pin 포함)는 그대로 유지된다
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

  const rotators = [
    createRotator([...document.querySelectorAll('.hero-slide')], 6000, 1200),
  ];

  const syncMotion = () => {
    rotators.forEach((r) => (reduceMotion.matches ? r.stop() : r.start()));
  };
  syncMotion();
  reduceMotion.addEventListener('change', syncMotion);

  /* ---------- 히어로 사과 더미 (나무에 사과가 다 열린 뒤 후두둑 쏟아져 쌓임, GSAP) ---------- */
  // 자리는 미리 계산한 가로 줄로 떨어진다(물리 엔진 없음). 떨어지는 사과·쌓인 사과 모두 나무 뒤 레이어(.hero-pile)라
  // 잎·열린 와펜 앞을 지나가지 않고, 줄기·잔디 언덕이 더미 앞에 보인다
  const pile = document.querySelector('.hero-pile');
  if (pile) {
    const heroPanel = pile.closest('.hero-left');
    const APPLE_RATIO = 800 / 680; // 와펜 세로 / 가로
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
      for (let row = 0; row < ROWS; row += 1) {
        const offset = (row % 2) * gap * 0.5;
        for (let x = -w * 0.3 + offset; x < W + w * 0.3; x += gap) {
          const size = w * (0.94 + rand() * 0.12);
          list.push({
            cx: x + (rand() * 2 - 1) * 8,
            bottom: base + row * step + (rand() * 2 - 1) * 4,
            w: size,
            rot: (rand() * 2 - 1) * 18,
            row,
            z: 50 - row * 10 + Math.floor(rand() * 4), // 앞(아래) 줄이 위에 보이게
          });
        }
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
        el.innerHTML = '<img src="asset/apple-patch.webp" alt="" width="680" height="800">';
        pile.appendChild(el);
        return { el, ...d };
      });
    };

    const { gsap } = window;
    // 나무에 와펜이 거의 다 열려 갈 무렵(마지막 와펜 1.95초) 바로 시작
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

  /* ---------- 3. 사계절 동화책 (StPageFlip + GSAP ScrollTrigger) ---------- */
  // 페이지 10장: 0 앞표지(하드) / 1·2 봄 그림·글 / 3·4 여름 / 5·6 가을 / 7·8 겨울 / 9 뒤표지(하드).
  // 섹션을 고정하고 스크롤 한 화면마다 한 단계씩 넘긴다. 넘김은 라이브러리에 맡기고(마우스로 끌기는 끔),
  // 단계가 바뀌는 순간 pageFlip.flip()을 한 번 호출, 넘기는 중 들어온 스크롤은 끝난 뒤 이어서 처리한다.
  const year = document.querySelector('.year');

  if (year && window.gsap && window.ScrollTrigger && window.St && window.St.PageFlip) {
    const { gsap, ScrollTrigger } = window;
    gsap.registerPlugin(ScrollTrigger);
    year.classList.add('is-book');

    const stage = year.querySelector('.year-stage');
    const book = year.querySelector('.book');
    const flipEl = year.querySelector('.book-flip');
    const stackLeft = year.querySelector('.book-stack--left');
    const stackRight = year.querySelector('.book-stack--right');
    const FLIP_MS = reduceMotion.matches ? 30 : 900;

    const pageFlip = new window.St.PageFlip(flipEl, {
      width: 550,
      height: 710,
      size: 'stretch',
      minWidth: 300,
      maxWidth: 550,
      minHeight: 387,
      maxHeight: 710,
      showCover: true,
      drawShadow: true,
      maxShadowOpacity: 0.4,
      flippingTime: FLIP_MS,
      usePortrait: true,
      mobileScrollSupport: false,
      useMouseEvents: false,
      // 마우스 이벤트는 라이브러리에 맡기지 않고(끌어 넘기기 방지), hover 때만 userMove로 넘길 쪽 모서리 힌트를 보여 준다
      showPageCorners: true,
      disableFlipByClick: true,
      autoSize: false,
    });
    pageFlip.loadFromHTML([...flipEl.querySelectorAll(':scope > .page')]);

    // 단계 → 페이지 번호. 펼침(landscape)은 6단계, 한 페이지씩(portrait)은 그림·글이 각각 한 단계라 10단계
    const isPortrait = () => pageFlip.getOrientation() === 'portrait';
    const stepPages = () => (isPortrait() ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] : [0, 1, 3, 5, 7, 9]);

    // 덮인 책을 화면 가운데로: 앞표지는 펼침면 오른쪽 자리라 왼쪽으로, 뒤표지는 오른쪽으로 반 페이지
    const offsetOf = (step) => {
      if (isPortrait()) return 0;
      const half = pageFlip.getBoundsRect().pageWidth / 2;
      if (step === 0) return -half;
      if (step === stepPages().length - 1) return half;
      return 0;
    };

    // 종이 묶음 두께(보이는 선 수, 0~5): 넘긴 만큼 왼쪽이 두꺼워지고 오른쪽이 얇아진다
    const stackOf = (step) => {
      const last = stepPages().length - 1;
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
      const last = stepPages().length - 1;
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
      const last = stepPages().length - 1;
      placeStacks({ left: Math.min(a.left, b.left), right: Math.min(a.right, b.right) }, isPortrait() && step === last && other === last, step === other ? step : -1);
    };

    let current = 0;
    let target = 0;
    let pending = 0;
    let busy = false;
    let ready = false;
    let jumpUntil = 0;
    let safety = 0;

    const settle = (step) => {
      current = step;
      pageFlip.turnToPage(stepPages()[step]);
      gsap.set(book, { x: offsetOf(step) });
      updateStacks(step);
    };

    // 지금 펼쳐진 페이지 번호 → 단계
    const stepOfPage = (page) => stepPages().reduce((best, p, i) => (p <= page ? i : best), 0);

    const done = () => {
      if (!busy) return;
      window.clearTimeout(safety);
      busy = false;
      book.classList.remove('is-cover-turn');
      current = pending;
      // 라이브러리가 넘김을 조용히 건너뛴 경우(내부 try/catch) 책과 단계가 어긋나지 않게 바로 맞춘다
      if (stepOfPage(pageFlip.getCurrentPageIndex()) !== current) pageFlip.turnToPage(stepPages()[current]);
      gsap.set(book, { x: offsetOf(current) });
      updateStacks(current);
      run();
    };

    const flipTo = (to) => {
      busy = true;
      pending = to;
      // 표지가 열리고 닫히는 넘김(한쪽이 비어 있는 상태)에는 바깥 그림자를 끈다 (style.css)
      const last = stepPages().length - 1;
      book.classList.toggle('is-cover-turn', !isPortrait() && [current, to].some((k) => k === 0 || k === last));
      // 넘기는 동안은 두 단계 중 얇은 쪽 두께로 (들려 올라간 쪽 아래가 비어 보이게)
      updateStacks(current, to);
      // 열기·닫기: 넘김과 동시에 책이 반 페이지만큼 옮겨 가 끝나면 화면 가운데
      gsap.to(book, { x: offsetOf(to), duration: FLIP_MS / 1000, ease: 'power2.inOut' });
      pageFlip.flip(stepPages()[to]);
      safety = window.setTimeout(done, FLIP_MS + 400);
    };

    function run() {
      if (busy) return;
      // 첫 계산(새로고침 등)과 앵커 이동 직후에는 넘김 없이 바로 그 단계로
      if (!ready || performance.now() < jumpUntil) {
        ready = true;
        settle(target);
        return;
      }
      if (target === current) return;
      // 넘기는 동안 들어온 입력은 쌓지 않고, 끝난 시점의 마지막 목표 단계로 한 번에 넘긴다
      // (천천히 스크롤하면 목표가 한 단계씩 바뀌므로 한 장씩 넘어간다)
      flipTo(target);
    }

    pageFlip.on('changeState', (e) => {
      if (e.data === 'read') done();
    });

    // 처음 들어올 때 책이 아래에서 살짝 올라오며 나타남
    if (!reduceMotion.matches) {
      gsap.set(book, { y: 60, autoAlpha: 0 });
      // end: 'max' — 섹션보다 아래에서 새로고침해도(이미 지나간 상태) 바로 보이게
      ScrollTrigger.create({
        trigger: year,
        start: 'top 75%',
        end: 'max',
        once: true,
        onEnter: () => gsap.to(book, { y: 0, autoAlpha: 1, duration: 0.9, ease: 'power2.out' }),
      });
    }

    // 고정 + 단계 판단: 한 단계당 한 화면. 마지막(뒤표지) 뒤로 더 내리면 고정이 풀린다
    // 클릭으로 넘긴 뒤 스크롤이 그 단계 위치에 닿을 때까지는 스크롤 진행도로 단계를 바꾸지 않는다
    let clickLock = null;
    const pin = ScrollTrigger.create({
      trigger: year,
      start: 'top top',
      end: () => `+=${window.innerHeight * stepPages().length}`,
      pin: stage,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      // 새로고침·리사이즈로 위치가 다시 계산되면 그 위치의 단계로
      onRefresh: (self) => {
        const count = stepPages().length;
        target = Math.min(count - 1, Math.floor(self.progress * count));
        run();
      },
      onUpdate: (self) => {
        if (clickLock) {
          if (Math.abs(window.scrollY - clickLock.y) > 4) return;
          releaseClick();
        }
        const count = stepPages().length;
        target = Math.min(count - 1, Math.floor(self.progress * count));
        run();
      },
    });

    // 단계 k의 스크롤 위치: 그 단계 구간의 가운데
    const stepScrollY = (step) => {
      const count = stepPages().length;
      return pin.start + ((step + 0.5) / count) * (pin.end - pin.start);
    };
    function releaseClick() {
      if (!clickLock) return;
      window.clearTimeout(clickLock.timer);
      clickLock = null;
    }

    // 클릭으로 넘기기: 오른쪽 페이지(앞표지 포함) → 다음, 왼쪽 페이지(뒤표지 포함) → 이전.
    // 넘김을 바로 시작하고 스크롤도 그 단계 위치로 부드럽게 옮겨 스크롤 상태와 늘 맞춘다. 넘기는 중 클릭은 무시
    const localPoint = (event) => {
      const box = flipEl.getBoundingClientRect();
      return { x: event.clientX - box.left, y: event.clientY - box.top };
    };
    flipEl.addEventListener('click', (event) => {
      if (busy || clickLock || !ready) return;
      const rect = pageFlip.getBoundsRect();
      const { x } = localPoint(event);
      const last = stepPages().length - 1;
      let dir;
      if (current === 0) dir = 1;
      else if (current === last) dir = -1;
      else {
        // 펼침: 가운데 접힌 선 기준 / 한 페이지: 페이지 가운데 기준
        const middle = isPortrait() ? rect.left + rect.pageWidth * 1.5 : rect.left + rect.pageWidth;
        dir = x >= middle ? 1 : -1;
      }
      const to = current + dir;
      if (to < 0 || to > last) return;
      const y = stepScrollY(to);
      clickLock = { y, timer: window.setTimeout(releaseClick, 1800) };
      target = to;
      run();
      window.scrollTo({ top: y, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
    });

    // hover 때 넘길 쪽 모서리가 살짝 말려 올라가는 힌트 (라이브러리 showPageCorners).
    // 라이브러리는 마우스 위치까지 접기 때문에, 넘길 수 있는 쪽 모서리 160px 안에 들어오면 늘 모서리에서 56px 안쪽 점을 넘겨 같은 크기로 말린다
    const HINT_ZONE = 160;
    const HINT_FOLD = 56;
    flipEl.addEventListener('mousemove', (event) => {
      if (busy || reduceMotion.matches) return;
      const rect = pageFlip.getBoundsRect();
      const last = stepPages().length - 1;
      const pageLeft = isPortrait() ? rect.left + rect.pageWidth : rect.left;
      const outerRight = rect.left + rect.pageWidth * 2;
      const corners = [];
      if (current < last) corners.push([outerRight, rect.top, -1, 1], [outerRight, rect.top + rect.height, -1, -1]);
      if (current > 0) corners.push([pageLeft, rect.top, 1, 1], [pageLeft, rect.top + rect.height, 1, -1]);
      const { x, y } = localPoint(event);
      const hit = corners.find(([cx, cy]) => Math.hypot(x - cx, y - cy) < HINT_ZONE);
      pageFlip.userMove(hit ? { x: hit[0] + hit[2] * HINT_FOLD, y: hit[1] + hit[3] * HINT_FOLD } : { x: -9999, y: -9999 }, false);
    });
    flipEl.addEventListener('mouseleave', () => {
      if (busy || reduceMotion.matches) return;
      pageFlip.userMove({ x: -9999, y: -9999 }, false);
    });

    // 헤더 "사과의 일 년"을 누르면 넘김 없이 앞표지에서 시작
    document.querySelectorAll('a[href="#year"]').forEach((link) => {
      link.addEventListener('click', () => {
        jumpUntil = performance.now() + 2000;
      });
    });

    // 창 크기 변경·회전: 크기 변화가 멈춘 뒤(200ms) 책 크기 → 지금 페이지에 맞는 단계 → 고정 위치 순서로 한 번에 다시 계산.
    // (리사이즈 도중에 ScrollTrigger.refresh()를 바로 부르면 고정된 상태에서 시작 위치가 틀어진다)
    // 펼침 ↔ 한 페이지 모드가 바뀌면 단계 수(6 ↔ 10)도 달라진다
    let resizeTimer = 0;
    const relayout = () => {
      pageFlip.update();
      const step = stepOfPage(pageFlip.getCurrentPageIndex());
      window.clearTimeout(safety);
      busy = false;
      book.classList.remove('is-cover-turn');
      settle(step);
      ScrollTrigger.refresh();
    };
    window.addEventListener('resize', () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(relayout, 200);
    });
    pageFlip.on('changeOrientation', () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(relayout, 200);
    });

    // 웹폰트·이미지가 다 불러와진 뒤 위 섹션 높이가 바뀌면 고정 위치를 다시 잰다
    document.fonts.ready.then(() => ScrollTrigger.refresh());
    window.addEventListener('load', () => ScrollTrigger.refresh());
    // 뒤로가기(bfcache)로 돌아왔을 때도 위치와 단계를 다시 맞춘다
    window.addEventListener('pageshow', (event) => {
      if (event.persisted) ScrollTrigger.refresh();
    });
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
