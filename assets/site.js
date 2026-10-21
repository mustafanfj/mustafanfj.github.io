(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- stage: the fixed half follows the reading ---------- */
  const items = new Map([...document.querySelectorAll('.stage-item')].map(el => [el.dataset.key, el]));
  let current = 'flood-houston';
  function show(key) {
    if (!key || key === current || !items.has(key)) return;
    const prev = items.get(current);
    items.forEach(el => el.classList.remove('is-prev'));
    prev?.classList.replace('is-on', 'is-prev');
    clearTimeout(show.t);
    show.t = setTimeout(() => prev?.classList.remove('is-prev'), reduce ? 0 : 720);
    prev?.querySelector('video')?.pause();
    const next = items.get(key);
    next.classList.add('is-on');
    const v = next.querySelector('video');
    if (v && !reduce) { v.preload = 'auto'; v.play().catch(() => {}); }
    current = key;
  }

  const projects = [...document.querySelectorAll('.project')];
  const openProject = () => projects.find(p => p.classList.contains('is-open'));
  let activeSection = null;

  const sectionKey = sec => {
    if (!sec) return 'flood-houston';
    if (sec.id === 'research') return (openProject() || projects[0]).dataset.stage;
    return sec.dataset.stageSection;
  };

  const sections = [...document.querySelectorAll('[data-stage-section]')];
  if ('IntersectionObserver' in window) {
    const so = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { activeSection = e.target; show(sectionKey(activeSection)); } });
    }, { rootMargin: '-45% 0px -45% 0px' });
    sections.forEach(s => so.observe(s));
    const hero = document.querySelector('.hero');
    new IntersectionObserver(([e]) => { if (e.isIntersecting) { activeSection = null; show('flood-houston'); } },
      { rootMargin: '-45% 0px -45% 0px' }).observe(hero);
  }

  /* ---------- research list: one open at a time ---------- */
  projects.forEach(p => {
    const btn = p.querySelector('.project-row');
    const body = p.querySelector('.project-body');
    btn.addEventListener('click', () => {
      const willOpen = !p.classList.contains('is-open');
      projects.forEach(o => {
        o.classList.remove('is-open');
        o.querySelector('.project-row').setAttribute('aria-expanded', 'false');
        o.querySelector('.project-body').hidden = true;
      });
      if (willOpen) {
        p.classList.add('is-open');
        btn.setAttribute('aria-expanded', 'true');
        body.hidden = false;
      }
      show(p.dataset.stage);
    });
    if (fine) {
      p.addEventListener('pointerenter', () => show(p.dataset.stage));
      p.addEventListener('pointerleave', () => show(sectionKey(activeSection)));
    }
    btn.addEventListener('focus', () => show(p.dataset.stage));
  });

  /* ---------- the live thing: let the model abstain (AeroVerify Table 2, EVAL) ---------- */
  const data = {
    fm: { all: 71.9, sel: 82.1, cov: 84.3 },
    fs: { all: 75.1, sel: 84.0, cov: 83.4 },
    rm: { all: 58.6, sel: 62.9, cov: 86.3 },
    rs: { all: 58.1, sel: 58.1, cov: 100 }
  };
  const box = document.querySelector('[data-abstain]');
  if (box) {
    const seg = [...box.querySelectorAll('[role="radio"]')];
    const sw = box.querySelector('[data-switch]');
    const acc = box.querySelector('[data-acc]');
    const desc = box.querySelector('[data-desc]');
    let set = 'fs', on = false;
    const render = () => {
      const d = data[set];
      const next = (on ? d.sel : d.all).toFixed(1) + '%';
      let text;
      if (!on) text = 'correct, answering every question.';
      else if (d.cov >= 100) text = 'correct. Here the threshold chosen on DEV answers every question.';
      else text = `correct on the ${d.cov}% of questions it chooses to answer.`;
      if (reduce) { acc.textContent = next; desc.textContent = text; return; }
      acc.classList.add('swap');
      setTimeout(() => { acc.textContent = next; desc.textContent = text; acc.classList.remove('swap'); }, 170);
    };
    seg.forEach(b => b.addEventListener('click', () => {
      seg.forEach(o => o.setAttribute('aria-checked', String(o === b)));
      set = b.dataset.set; render();
    }));
    box.querySelector('.seg').addEventListener('keydown', e => {
      if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key)) return;
      e.preventDefault();
      const i = seg.findIndex(b => b.getAttribute('aria-checked') === 'true');
      const n = seg[(i + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : seg.length - 1)) % seg.length];
      n.focus(); n.click();
    });
    seg.forEach(b => b.tabIndex = b.getAttribute('aria-checked') === 'true' ? 0 : -1);
    box.querySelector('.seg').addEventListener('click', () => seg.forEach(b => b.tabIndex = b.getAttribute('aria-checked') === 'true' ? 0 : -1));
    sw.addEventListener('click', () => { on = !on; sw.setAttribute('aria-checked', String(on)); render(); });
  }

  /* ---------- entrances: heading, then text, then picture ---------- */
  const reveals = [...document.querySelectorAll('.reveal')];
  if (!('IntersectionObserver' in window)) { reveals.forEach(r => r.classList.add('in')); return; }
  const groups = new Map();
  reveals.forEach(el => {
    const g = el.closest('section, footer') || document.body;
    const list = groups.get(g) || [];
    el.style.setProperty('--d', Math.min(list.length, 8) * 75 + 'ms');
    list.push(el); groups.set(g, list);
  });
  const ro = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); ro.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -8% 0px' });
  reveals.forEach(r => ro.observe(r));

  /* phone: the clip inside the note plays only while on screen */
  const clip = document.querySelector('.note-clip video');
  if (clip && !reduce) new IntersectionObserver(([e]) => {
    if (e.isIntersecting && getComputedStyle(clip.parentElement).display !== 'none') { clip.preload = 'auto'; clip.play().catch(() => {}); }
    else clip.pause();
  }).observe(clip);
  document.addEventListener('visibilitychange', () => {
    document.querySelectorAll('video').forEach(v => { if (document.hidden) v.pause(); });
  });

  /* pause the photo strip when it is off screen or the tab is hidden */
  const contact = document.querySelector('.contact');
  let visible = false;
  const setPause = () => contact.classList.toggle('paused', document.hidden || !visible);
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; setPause(); }).observe(contact);
  document.addEventListener('visibilitychange', setPause);
})();
