(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- selected papers: one open at a time ---------- */
  const papers = [...document.querySelectorAll('.paper')];
  papers.forEach(p => {
    const btn = p.querySelector('.paper-row');
    btn.addEventListener('click', () => {
      const willOpen = !p.classList.contains('is-open');
      papers.forEach(o => {
        o.classList.remove('is-open');
        o.querySelector('.paper-row').setAttribute('aria-expanded', 'false');
        o.querySelector('.paper-body').hidden = true;
      });
      if (willOpen) {
        p.classList.add('is-open');
        btn.setAttribute('aria-expanded', 'true');
        p.querySelector('.paper-body').hidden = false;
      }
    });
  });

  /* ---------- one demo per paper, every number from that paper ---------- */
  const pct = (v, int) => (int && Number.isInteger(v) ? String(v) : v.toFixed(1)) + '%';
  const demos = {
    // AeroVerify-VLM, Table 2 (EVAL); threshold chosen on DEV
    aero: {
      int: true,
      state: { set: 'fs', on: false },
      data: { fm: [71.9, 82.1, 84.3], fs: [75.1, 84.0, 83.4], rm: [58.6, 62.9, 86.3], rs: [58.1, 58.1, 100] },
      render(s) {
        const [all, sel, cov] = this.data[s.set];
        const acc = s.on ? sel : all, ans = s.on ? cov : 100;
        let desc = 'correct, answering every question.';
        if (s.on) desc = cov >= 100 ? 'correct. Here the threshold chosen on DEV answers every question.' : `correct on the ${cov}% of questions it chooses to answer.`;
        return { big: pct(acc, true), desc, bars: { a: acc, b: ans } };
      }
    },
    // SemUAV-VLM, transport replay over 1,152 link conditions
    sem: {
      int: true,
      state: { link: 'r01' },
      data: {
        r01: [100, 6, 'at 0.1 Mb/s'], r025: [100, 43, 'at 0.25 Mb/s'],
        loss: [96, 58, 'at 1 Mb/s with 15% packet loss'], all: [98.4, 64.6, 'across all 1,152 link conditions']
      },
      render(s) {
        const [alert, img, where] = this.data[s.link];
        return { big: pct(alert, true), desc: `of 1 kB alerts arrive before the deadline ${where}. The 39 kB image: ${pct(img, true)}.`, bars: { a: alert, b: img } };
      }
    },
    // VIDA+PANDA, Frontiers in Plant Science, Tables 6 and 7
    vida: {
      state: { on: false },
      render(s) {
        const g = s.on ? 37.6 : 36.6, q = s.on ? 30.4 : 18.3, k = s.on ? 32.2 : 32.6, panel = s.on ? 36.0 : 35.9;
        const desc = s.on
          ? `combined accuracy for Qwen-VL after three rounds of debate, up 12.1 points (p < 0.0001). Panel vote: ${pct(panel)}, unchanged.`
          : `combined accuracy for Qwen-VL, the weakest member, on its own. Panel vote: ${pct(panel)}.`;
        return { big: pct(q), desc, bars: { g, q, k }, tick: panel };
      }
    },
    // CoralAgent-TRACE, ablations on the 100-image CoralVQA development set
    coral: {
      state: { cut: 'none' },
      data: {
        none: [55.7, 'with every part in place, 3.7 points above GPT-5.'],
        guard: [43.0, 'without the GUARD verifier: 12.7 points lost, now below GPT-5.'],
        plan: [43.0, 'when every tool runs on every question instead of a planned few.'],
        prior: [46.0, 'without the transparent baseline prior.'],
        rag: [53.5, 'without ecological retrieval: 2.2 points lost.']
      },
      render(s) {
        const [v, d] = this.data[s.cut];
        return { big: pct(v), desc: 'semantic accuracy ' + d, bars: { a: v, b: 52.0 } };
      }
    }
  };

  document.querySelectorAll('[data-demo]').forEach(box => {
    const demo = demos[box.dataset.demo];
    if (!demo) return;
    const big = box.querySelector('[data-big]'), desc = box.querySelector('[data-desc]');
    const draw = () => {
      const r = demo.render(demo.state);
      Object.entries(r.bars).forEach(([k, v]) => {
        box.querySelector(`[data-bar="${k}"]`)?.style.setProperty('--v', v / 100);
        const t = box.querySelector(`[data-val="${k}"]`); if (t) t.textContent = pct(v, demo.int);
      });
      if (r.tick != null) box.querySelectorAll('[data-tick]').forEach(t => t.style.setProperty('--t', r.tick / 100));
      if (reduce || big.textContent === r.big) { big.textContent = r.big; desc.textContent = r.desc; return; }
      big.classList.add('swap');
      clearTimeout(box.t);
      box.t = setTimeout(() => { big.textContent = r.big; desc.textContent = r.desc; big.classList.remove('swap'); }, 170);
    };
    box.querySelectorAll('[data-switch]').forEach(sw => sw.addEventListener('click', () => {
      const k = sw.dataset.switch; demo.state[k] = !demo.state[k];
      sw.setAttribute('aria-checked', String(demo.state[k])); draw();
    }));
    box.querySelectorAll('[data-seg]').forEach(seg => {
      const opts = [...seg.querySelectorAll('[role="radio"]')];
      const pick = b => {
        opts.forEach(o => { const on = o === b; o.setAttribute('aria-checked', String(on)); o.tabIndex = on ? 0 : -1; });
        demo.state[seg.dataset.seg] = b.dataset.v; draw();
      };
      opts.forEach(b => { b.tabIndex = b.getAttribute('aria-checked') === 'true' ? 0 : -1; b.addEventListener('click', () => pick(b)); });
      seg.addEventListener('keydown', e => {
        const fwd = e.key === 'ArrowRight' || e.key === 'ArrowDown', back = e.key === 'ArrowLeft' || e.key === 'ArrowUp';
        if (!fwd && !back) return;
        e.preventDefault();
        const i = opts.findIndex(b => b.getAttribute('aria-checked') === 'true');
        const n = opts[(i + (fwd ? 1 : opts.length - 1)) % opts.length];
        n.focus(); pick(n);
      });
    });
  });

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

  /* the reef clip plays only while on screen */
  const clip = document.querySelector('.note-clip video');
  if (clip && !reduce) new IntersectionObserver(([e]) => {
    if (e.isIntersecting) { clip.preload = 'auto'; clip.play().catch(() => {}); }
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
