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
