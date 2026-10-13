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

  /* ---------- Marquee (배너 아이콘 · 후기) ---------- */
  // 같은 그룹을 한 번 더 붙여 -50% 이동으로 끊김 없이 이어지게 한다.
  document.querySelectorAll('.icon-track, .review-track').forEach((track) => {
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

  /* ---------- Contact form (실제 전송 없음) ---------- */
  const form = document.querySelector('.contact-form');
  const done = document.querySelector('.contact-done');

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    form.hidden = true;
    done.hidden = false;
    done.focus({ preventScroll: true });
  });
})();
