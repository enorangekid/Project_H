// 게임 소개 페이지. 데이터: window.PROJECT_H_WORK(loader.js) · PROJECT_H_INTRO(작품 intro.js) · PROJECT_H_INDEX(data/index.js)
// 이미지는 저장 서버(/media/cg/…)로 열었을 때만 보인다. 서버 없이 열면 글만 보인다.
(function () {
  const work = window.PROJECT_H_WORK;
  const intro = window.PROJECT_H_INTRO;
  const index = window.PROJECT_H_INDEX || { scenes: [] };
  const $ = (id) => document.getElementById(id);
  const make = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };

  if (!work || !intro) {
    document.body.innerHTML = '<p style="padding:80px 24px;text-align:center;color:#c9bfb8">이 작품에는 게임 소개 페이지가 없습니다. 작품 폴더의 work.json 에 "intro" 를 지정하세요.</p>';
    return;
  }

  const q = `?work=${encodeURIComponent(work.id)}`;
  const cgUrl = (rel) => `/media/cg/${String(rel).split('/').map(encodeURIComponent).join('/')}${q}`;
  const readerUrl = (sceneId) => `reader.html${q}${sceneId ? `#${encodeURIComponent(sceneId)}` : ''}`;
  // 인물별 색 (작업실 화자 색과 같은 계열)
  const TINT = {
    임신혜: ['rgba(234,140,98,.42)', '#f0a07a'], 진소영: ['rgba(110,128,236,.42)', '#9aa8f5'], 진미소: ['rgba(236,112,170,.42)', '#f39cc4'],
    윤서아: ['rgba(64,180,165,.42)', '#7fd4c6'], 김선하: ['rgba(160,110,230,.4)', '#c3a3f2'], 루시: ['rgba(120,120,130,.4)', '#c8c8d0'],
  };

  document.title = `${intro.title} — 게임 소개`;
  $('navTitle').textContent = intro.title;
  $('toWorkroom').href = `index.html${q}`;
  $('toReader').href = readerUrl();
  $('heroRead').href = readerUrl((index.scenes.find((s) => s.type === '본편') || {}).id);

  // ── 첫 화면
  const badges = $('heroBadges');
  if (intro.rating) badges.append(make('span', 'g-badge adult', intro.rating));
  if (intro.genre) intro.genre.split('·').forEach((g) => badges.append(make('span', 'g-badge', g.trim())));
  $('heroTitle').textContent = intro.title;
  $('heroTitleEn').textContent = intro.titleEn || '';
  $('heroLogline').textContent = intro.logline || '';

  // ── 스토리
  (intro.synopsis || []).forEach((p) => $('storyBody').append(make('p', null, p)));

  // ── 특징
  (intro.features || []).forEach((f) => {
    const card = make('div', 'g-feature reveal');
    card.append(make('h3', null, f.title), make('p', null, f.text));
    $('featureGrid').append(card);
  });

  // ── 제작 현황
  const main = index.scenes.filter((s) => s.type === '본편');
  const sides = index.scenes.filter((s) => s.type === '외전');
  const written = (s) => s.count > 3;
  const lastWritten = [...main].reverse().find(written);
  const mainDone = main.filter(written).length;
  const lines = index.scenes.filter(written).reduce((sum, s) => sum + s.count, 0);
  const voiced = index.scenes.reduce((sum, s) => sum + (s.stats?.script || 0), 0);
  [[`${mainDone}`, `본편 원고 (전 ${main.length}화 예정)`], [`${sides.filter(written).length}`, '외전 원고'],
    [lines.toLocaleString(), '원고 줄 수'], [voiced.toLocaleString(), '히로인 녹음 대사']].forEach(([n, label]) => {
    const box = make('div', 'g-stat reveal'); box.append(make('b', null, n), make('span', null, label)); $('stats').append(box);
  });
  const epCard = (s, title, sub) => {
    const a = make('a', `g-ep${written(s) ? '' : ' empty'}`);
    a.href = readerUrl(s.id);
    const state = !written(s) ? '준비 중' : s === lastWritten ? `작성 중 · ${s.count}줄` : `${s.count}줄`;
    a.append(make('b', null, title), make('small', null, sub || state));
    if (sub) a.append(make('small', null, state));
    const bar = make('div', 'g-ep-bar'); const fill = make('i'); fill.style.width = !written(s) ? '6%' : s === lastWritten ? '55%' : '100%';
    bar.append(fill); a.append(bar);
    return a;
  };
  main.forEach((s) => $('episodes').append(epCard(s, `${(s.detail || s.id).replace(/편$/, '화')}`, s.phases.filter((p) => !/^\(/.test(p.name)).slice(0, 2).map((p) => p.name).join(' · '))));
  sides.forEach((s) => $('sides').append(epCard(s, s.detail || s.id)));

  // ── 갤러리
  // 인물별 걸러 보기 단추 + 확대 보기(←/→로 넘김)
  let shots = [];
  let shown = shots;
  let lbIndex = 0;
  function showLightbox(i) {
    lbIndex = (i + shown.length) % shown.length;
    const g = shown[lbIndex];
    $('lightboxImg').src = cgUrl(g.image);
    $('lightboxCaption').textContent = [g.who, g.caption].filter(Boolean).join(' · ');
    if (!$('lightbox').open) $('lightbox').showModal();
  }
  function renderGallery(who) {
    shown = who ? shots.filter((g) => g.who === who) : shots;
    const grid = $('galleryGrid');
    grid.innerHTML = '';
    shown.forEach((g, i) => {
      const fig = make('figure', 'g-shot'); fig.tabIndex = 0;
      const img = make('img'); img.loading = 'lazy'; img.alt = g.caption || ''; img.src = cgUrl(g.image);
      const cap = make('figcaption'); if (g.who) cap.append(make('b', null, g.who)); cap.append(document.createTextNode(g.caption || ''));
      fig.append(img, cap);
      fig.addEventListener('click', () => showLightbox(i));
      fig.addEventListener('keydown', (e) => { if (e.key === 'Enter') showLightbox(i); });
      grid.append(fig);
    });
  }
  function initGallery(files) {
  // 캐릭터 폴더 자동 이미지(galleryAuto) + intro.gallery 직접 지정 이미지, 인물 순서는 galleryOrder
  const auto = intro.galleryAuto ? files.filter((f) => f.category === intro.galleryAuto.tab && f.sub && f.name.includes(intro.galleryAuto.match) && !(intro.galleryExclude || []).includes(f.name))
    .map((f) => ({ image: `${f.category}/${f.sub}/${f.name}`, who: f.sub, caption: '', v: Number((/(\d+)\.\w+$/.exec(f.name) || [])[1] || 1) }))
    .sort((a, b) => a.v - b.v) : [];
  const order = intro.galleryOrder || [];
  const rank = (w) => { const i = order.indexOf(w); return i < 0 ? order.length : i; };
  shots = [...(intro.gallery || []), ...auto].map((g, i) => ({ ...g, i })).sort((a, b) => rank(a.who) - rank(b.who) || a.i - b.i);
  const whos = [...new Set(shots.map((g) => g.who).filter(Boolean))];
  if (whos.length > 1) {
    const chips = $('galleryChips');
    const chip = (label, who) => {
      const b = make('button', 'g-chip', label); b.type = 'button';
      b.setAttribute('aria-pressed', String(!who));
      b.addEventListener('click', () => { chips.querySelectorAll('.g-chip').forEach((c) => c.setAttribute('aria-pressed', String(c === b))); renderGallery(who); });
      chips.append(b);
    };
    chip('전체', '');
    whos.forEach((w) => chip(w, w));
  }
  renderGallery('');
  }
  document.addEventListener('keydown', (e) => {
    if (!$('lightbox').open) return;
    if (e.key === 'ArrowRight') showLightbox(lbIndex + 1);
    if (e.key === 'ArrowLeft') showLightbox(lbIndex - 1);
  });
  $('lightboxClose').addEventListener('click', () => $('lightbox').close());
  $('lightbox').addEventListener('click', (e) => { if (e.target === $('lightbox')) $('lightbox').close(); });

  $('footerText').textContent = `${intro.title}${intro.titleEn ? ` · ${intro.titleEn}` : ''} — 제작 중`;

  // ── 등장인물 (프로필·스탠딩은 서버에서 읽음)
  // intro.characters = [{ key, role, group }] — group 마다 탭 줄이 나뉜다. 프로필은 cg_profiles.json, 없으면 intro.extraProfiles
  // 스탠딩은 인물 폴더의 *_standing*.png 를 번호 순서대로 모두 모아, 몇 초마다 다음 번호로 넘긴다
  const rowsOf = (profile) => (profile?.rows || []).filter(([k]) => (intro.profileRows || []).includes(k));
  let slideTimer = null;
  function renderChar(h, profile, list) {
    const stage = $('charStage');
    stage.innerHTML = '';
    clearInterval(slideTimer);
    const [tint, tintInk] = TINT[h.key] || [];
    stage.style.setProperty('--tint', tint || 'rgba(227,168,161,.3)');
    stage.style.setProperty('--tint-ink', tintInk || '#e3a8a1');
    const art = make('div', 'g-char-art');
    const imgs = (list || []).map((p, i) => { const img = make('img', i === 0 ? 'on' : ''); img.alt = h.key; img.src = cgUrl(p); art.append(img); return img; });
    if (!imgs.length) art.append(make('div', 'g-char-empty', h.noImage || '스탠딩 이미지 준비 중'));
    let at = 0;
    const dots = make('div', 'g-char-dots');
    const go = (n) => { imgs[at].classList.remove('on'); dots.children[at].classList.remove('on'); at = (n + imgs.length) % imgs.length; imgs[at].classList.add('on'); dots.children[at].classList.add('on'); };
    if (imgs.length > 1) {
      imgs.forEach((_, i) => { const d = make('button', i === 0 ? 'on' : ''); d.type = 'button'; d.setAttribute('aria-label', `스탠딩 ${i + 1}`); d.addEventListener('click', () => { go(i); restart(); }); dots.append(d); });
      art.append(dots);
      const restart = () => { clearInterval(slideTimer); slideTimer = setInterval(() => go(at + 1), intro.standingInterval || 3500); };
      art.addEventListener('mouseenter', () => clearInterval(slideTimer));
      art.addEventListener('mouseleave', restart);
      restart();
    }
    const info = make('div', 'g-char-info');
    info.append(make('div', 'g-char-role', h.role || ''), make('h3', 'g-char-name', h.key), make('div', 'g-char-kana', profile?.kana || ''));
    if (profile?.tagline) info.append(make('p', 'g-char-tagline', profile.tagline));
    const dl = make('dl', 'g-char-rows');
    rowsOf(profile).forEach(([k, v]) => dl.append(make('dt', null, k), make('dd', null, v)));
    if (dl.childNodes.length) info.append(dl);
    if (profile?.summary) info.append(make('p', 'g-char-summary', profile.summary));
    stage.append(art, info);
  }

  function setupCharacters(profiles, standings) {
    const tabs = $('charTabs');
    const list = intro.characters || [];
    const prof = (key) => profiles[key] || intro.extraProfiles?.[key];
    let first = null;
    [...new Set(list.map((c) => c.group || ''))].forEach((group) => {
      const row = make('div', 'g-tab-row');
      if (group) row.append(make('span', 'g-tab-group', group));
      list.filter((c) => (c.group || '') === group).forEach((c) => {
        const tab = make('button', 'g-tab'); tab.type = 'button'; tab.setAttribute('role', 'tab');
        tab.append(document.createTextNode(c.key), make('small', null, c.role || ''));
        tab.addEventListener('click', () => {
          tabs.querySelectorAll('.g-tab').forEach((t) => t.setAttribute('aria-selected', String(t === tab)));
          renderChar(c, prof(c.key), standings[c.key]);
        });
        if (!first) { first = c; tab.setAttribute('aria-selected', 'true'); }
        row.append(tab);
      });
      tabs.append(row);
    });
    if (first) renderChar(first, prof(first.key), standings[first.key]);
    observe();
  }

  // 인물 폴더의 스탠딩을 번호 순서대로: <이름>_standing.png → _standing_v2 → _v3 …
  function pickStandings(files) {
    const by = {};
    files.filter((f) => f.category === '캐릭터' && f.sub).forEach((f) => {
      const m = /_standing(?:_v(\d+))?\.(png|jpe?g|webp)$/i.exec(f.name);
      if (m) (by[f.sub] = by[f.sub] || []).push({ v: Number(m[1] || 1), path: `캐릭터/${f.sub}/${f.name}` });
    });
    return Object.fromEntries(Object.entries(by).map(([k, arr]) => [k, arr.sort((x, y) => x.v - y.v).map((o) => o.path)]));
  }

  async function boot() {
    let server = false;
    try { server = /^https?:$/.test(location.protocol) && (await (await fetch('/api/ping', { cache: 'no-store' })).json()).ok === true; } catch { server = false; }
    if (server && intro.keyVisual?.image) {
      const art = $('heroArt');
      const img = new Image();
      img.onload = () => { art.style.backgroundImage = `url("${img.src}")`; };
      img.src = cgUrl(intro.keyVisual.image);
      if (intro.keyVisual.focus) art.style.backgroundPosition = intro.keyVisual.focus;
    }
    // 타이틀 로고: 불러오면 제목 글자를 로고로 바꾼다 (실패하면 글자 그대로)
    if (server && intro.logo) {
      const logo = new Image();
      logo.alt = intro.title;
      logo.className = 'g-logo';
      logo.onload = () => {
        const h1 = $('heroTitle');
        h1.textContent = '';
        h1.classList.add('has-logo');
        h1.append(logo);
        const small = logo.cloneNode(); small.className = 'g-nav-logo';
        $('navTitle').textContent = ''; $('navTitle').append(small);
      };
      logo.src = cgUrl(intro.logo);
    }
    let profiles = {};
    let standings = {};
    if (server) {
      try { profiles = work.cgProfiles ? await (await fetch(work.cgProfiles, { cache: 'no-store' })).json() : {}; } catch { profiles = {}; }
      let files = [];
      try { files = (await (await fetch(`/api/cg${q}`, { cache: 'no-store' })).json()).files || []; } catch { files = []; }
      standings = pickStandings(files);
      initGallery(files);
    } else {
      $('serverNote').textContent = '이미지와 인물 프로필은 저장 서버(저장서버 켜기.bat)로 열었을 때 보입니다.';
      $('gallery').hidden = true;
    }
    setupCharacters(profiles, standings);
  }

  // 스크롤: 메뉴 배경, 등장 애니메이션
  const nav = $('gNav');
  const onScroll = () => nav.classList.toggle('solid', window.scrollY > 40);
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  let io = null;
  function observe() {
    if (!('IntersectionObserver' in window)) { document.querySelectorAll('.reveal').forEach((n) => n.classList.add('in')); return; }
    io = io || new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12 });
    document.querySelectorAll('.reveal:not(.in)').forEach((n) => io.observe(n));
  }
  observe();
  boot();
}());
