// 원고 읽기 (전자책 보기 + 검수 표시). 데이터·검수 저장 방식은 작업실(app.js)과 같다:
//  - 저장 서버로 열면 🚩 표시를 바로 데이터 파일(row.review)에 저장 (/api/set, 변경 기록 남음)
//  - 서버 없이 열면 이 브라우저에만 저장 — 작업실의 `🚩 검수 목록`과 같은 저장소 키를 써서 거기서 그대로 보인다
(function () {
  const work = window.PROJECT_H_WORK;
  const index = window.PROJECT_H_INDEX;
  const $ = (id) => document.getElementById(id);
  const make = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  if (!work || !index) { document.body.textContent = '작품 데이터를 불러오지 못했습니다.'; return; }

  const q = `?work=${encodeURIComponent(work.id)}`;
  const REVIEW_EMPTY = '검수 필요';
  const reviewKey = `project_h_review_v1:${work.id}`;
  const posKey = `project_h_reader_pos:${work.id}`;
  const setKey = 'project_h_reader_v1';
  const store = {
    get(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } },
    set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* 저장 불가 시 무시 */ } },
  };
  const WHO = {
    임신혜: '#c2410c', 진소영: '#3346c4', 진미소: '#d0287a', 윤서아: '#0f7f74', 김선하: '#7a35c2', 루시: '#475569',
    미요시: '#9a3412', 시안: '#be185d', 하람: '#0369a1', 서하람: '#0369a1', '소영 매니저': '#64748b',
  };
  const HERO = '진선후';
  const scenes = index.scenes;
  const sceneById = new Map(scenes.map((s) => [s.id, s]));
  const written = (s) => s.count > 3;
  const chapterLabel = (s) => (s.type === '외전' ? (s.detail || s.id) : `${(s.detail || s.id).replace(/편$/, '화')}`);
  const ROUTE_RE = /\[[^\]]+\]/g;

  let serverMode = false;
  let reviewLocal = store.get(reviewKey, {});
  let current = null; // { scene, rows }
  const cache = new Map();
  const settings = Object.assign({ theme: 'paper', font: 'serif', size: 18, lead: 20, width: 34, memo: false, ids: false, script: false, route: '', pinned: false }, store.get(setKey, {}));

  document.title = `${work.name} — 원고 읽기`;
  $('bookTitle').textContent = work.name;
  $('tocTitle').textContent = work.name;
  $('toIntro').href = `game.html${q}`;
  $('toWorkroom').href = `index.html${q}`;
  if (!work.intro) $('toIntro').hidden = true;

  // ── 설정
  function applySettings() {
    const root = document.documentElement;
    root.dataset.theme = settings.theme;
    root.dataset.font = settings.font;
    root.style.setProperty('--size', `${settings.size}px`);
    root.style.setProperty('--lead', String(settings.lead / 10));
    root.style.setProperty('--measure', `${settings.width}em`);
    document.body.classList.toggle('show-memo', settings.memo);
    document.body.classList.toggle('show-ids', settings.ids);
    document.body.classList.toggle('show-script', settings.script);
    $('themeSeg').querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.theme === settings.theme));
    $('fontSeg').querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.font === settings.font));
    $('sizeRange').value = settings.size; $('leadRange').value = settings.lead; $('widthRange').value = settings.width;
    $('showMemo').checked = settings.memo; $('showIds').checked = settings.ids; $('showScript').checked = settings.script;
    store.set(setKey, settings);
  }
  $('themeSeg').addEventListener('click', (e) => { if (e.target.dataset.theme) { settings.theme = e.target.dataset.theme; applySettings(); } });
  $('fontSeg').addEventListener('click', (e) => { if (e.target.dataset.font) { settings.font = e.target.dataset.font; applySettings(); } });
  [['sizeRange', 'size'], ['leadRange', 'lead'], ['widthRange', 'width']].forEach(([id, key]) => $(id).addEventListener('input', (e) => { settings[key] = Number(e.target.value); applySettings(); }));
  [['showMemo', 'memo'], ['showIds', 'ids'], ['showScript', 'script']].forEach(([id, key]) => $(id).addEventListener('change', (e) => { settings[key] = e.target.checked; applySettings(); }));
  $('settingsToggle').addEventListener('click', (e) => { e.stopPropagation(); $('settings').hidden = !$('settings').hidden; });
  document.addEventListener('click', (e) => { if (!$('settings').hidden && !$('settings').contains(e.target) && e.target !== $('settingsToggle')) $('settings').hidden = true; });
  applySettings();

  // ── 목차
  const wide = () => window.matchMedia('(min-width: 1280px)').matches;
  function setToc(open) {
    if (wide()) { settings.pinned = open; store.set(setKey, settings); $('toc').classList.toggle('pinned', open); document.body.classList.toggle('toc-pinned', open); $('toc').classList.remove('open'); $('scrim').classList.remove('on'); return; }
    $('toc').classList.toggle('open', open); $('scrim').classList.toggle('on', open);
  }
  const tocOpen = () => $('toc').classList.contains('open') || $('toc').classList.contains('pinned');
  $('tocToggle').addEventListener('click', () => setToc(!tocOpen()));
  $('tocClose').addEventListener('click', () => setToc(false));
  $('scrim').addEventListener('click', () => setToc(false));
  if (settings.pinned && wide()) setToc(true);

  function sceneFlags(s) {
    const rows = cache.get(s.id);
    if (rows) return rows.filter((r) => reviewOf(r)).length;
    const local = Object.values(reviewLocal).filter((x) => x.scene === s.id && x.review).length;
    return Math.max(s.stats?.review || 0, serverMode ? 0 : local);
  }
  function renderToc() {
    const list = $('tocList');
    list.innerHTML = '';
    let group = null;
    scenes.forEach((s) => {
      if (s.type !== group) { group = s.type; list.append(make('div', 'r-toc-group', s.type === '외전' ? 'SIDE STORIES · 외전' : s.type === '본편' ? 'MAIN STORY · 본편' : s.type)); }
      const btn = make('button', `r-toc-ch${written(s) ? '' : ' empty'}${current?.scene.id === s.id ? ' active' : ''}`);
      btn.type = 'button';
      const flags = sceneFlags(s);
      if (flags) btn.append(make('span', 'r-toc-flag', `🚩${flags}`));
      btn.append(make('b', null, chapterLabel(s)), document.createTextNode(written(s) ? `${s.count}줄` : '준비 중'));
      btn.append(make('small', null, s.phases.map((p) => p.name).join(' · ')));
      btn.addEventListener('click', () => { openScene(s.id); if (!wide()) setToc(false); });
      list.append(btn);
      if (current?.scene.id === s.id && s.phases.length > 1) {
        const ph = make('div', 'r-toc-phases');
        s.phases.forEach((p) => {
          const pb = make('button', 'r-toc-ph', p.name); pb.type = 'button';
          pb.addEventListener('click', () => { document.getElementById(`ph-${p.id}`)?.scrollIntoView({ behavior: 'smooth' }); if (!wide()) setToc(false); });
          ph.append(pb);
        });
        list.append(ph);
      }
    });
    list.querySelector('.active')?.scrollIntoView({ block: 'center' });
  }

  // ── 루트 강조 목록 (메모 칸의 [루트] 표기)
  function fillRoutes(rows) {
    const sel = $('routeSelect');
    const tags = [...new Set(rows.flatMap((r) => (r.memo || '').match(ROUTE_RE) || []))];
    sel.innerHTML = '';
    sel.append(new Option(tags.length ? '모든 루트' : '루트 표시 없음', ''));
    tags.forEach((t) => sel.append(new Option(t.slice(1, -1), t)));
    sel.disabled = !tags.length;
    sel.value = tags.includes(settings.route) ? settings.route : '';
  }
  $('routeSelect').addEventListener('change', (e) => { settings.route = e.target.value; store.set(setKey, settings); paintRoutes(); });
  function paintRoutes() {
    const route = $('routeSelect').value;
    document.querySelectorAll('.r-line[data-routes]').forEach((n) => {
      const tags = n.dataset.routes.split('|');
      n.classList.toggle('route-on', Boolean(route) && tags.includes(route));
      n.classList.toggle('route-off', Boolean(route) && !tags.includes(route));
    });
  }

  // ── 검수 표시
  const reviewOf = (row) => (!serverMode && reviewLocal[row.id] ? reviewLocal[row.id].review || '' : row.review || '');
  const reviewNote = (v) => (v === REVIEW_EMPTY ? '' : v);
  function updateFlagCount() {
    const n = current ? current.rows.filter((r) => reviewOf(r)).length : 0;
    $('flagCount').textContent = n ? `🚩 ${n}` : '';
  }
  async function saveReview(row, value) {
    if (serverMode) {
      const res = await fetch('/api/set', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ work: work.id, scene: current.scene.id, patch: [{ id: row.id, review: value }], note: '검수 표시 (원고 읽기)' }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `서버 오류 (${res.status})`);
      row.review = value;
    } else {
      if (value === (row.review || '')) delete reviewLocal[row.id];
      else reviewLocal[row.id] = { scene: current.scene.id, review: value };
      store.set(reviewKey, reviewLocal);
    }
  }

  // ── 줄 하나 그리기
  function lineNode(row, prev) {
    const sp = row.speaker || '';
    const text = row.korean || '';
    let node;
    if (sp === '선택지') {
      node = make('div', 'r-line r-choice');
      node.append(make('b', null, 'CHOICE · 선택지'));
      const [head, ...rest] = text.split(/\s—\s/);
      head.split('/').map((t) => t.trim()).filter(Boolean).forEach((t) => node.append(make('span', 'opt', t)));
      if (rest.length) node.append(make('span', 'opt rest', rest.join(' — ')));
    } else if (sp === '연출') {
      // 연출·조사 지점·변수 같은 진행 메모 (엘도르 등 md 대본) — 본문과 구분되게 작게
      node = make('div', 'r-line r-stage', text);
    } else if (sp === '조사') {
      node = make('div', 'r-line r-probe');
      node.append(make('b', null, '조사'), document.createTextNode(text));
    } else if (sp === '작성 메모') {
      node = make('div', 'r-line r-memo-row', `✎ ${text}`);
    } else if (sp === '나레이션' || !sp) {
      node = make('p', 'r-line r-n', text);
    } else {
      const same = prev && prev.speaker === sp;
      node = make('p', `r-line r-d${same ? ' same' : ''}${sp === HERO ? ' hero' : ''}`);
      if (WHO[sp]) node.style.setProperty('--who', WHO[sp]);
      node.append(make('span', 'r-who', sp), make('span', 'r-say', text));
    }
    node.dataset.id = row.id;
    const routes = (row.memo || '').match(ROUTE_RE);
    if (routes) {
      node.dataset.routes = routes.join('|');
      node.classList.add('routed');
      const host = node.querySelector('.r-say') || node;
      routes.forEach((r) => host.append(make('span', 'r-tag', r.slice(1, -1))));
    }
    const memoText = (row.memo || '').replace(ROUTE_RE, '').trim();
    if (memoText) node.append(make('span', 'r-meta memo', `메모: ${memoText}`));
    node.append(make('span', 'r-meta id', row.id));
    if (row.recordingScript || row.prompt) node.append(make('span', 'r-meta script', [row.prompt, row.recordingScript && row.recordingScript !== text ? `대본: ${row.recordingScript}` : ''].filter(Boolean).join('  ')));
    paintFlag(node, row);
    node.addEventListener('click', (e) => { e.stopPropagation(); openPop(node, row); });
    return node;
  }
  function paintFlag(node, row) {
    const value = reviewOf(row);
    node.classList.toggle('flag', Boolean(value));
    node.querySelector('.r-flag-note')?.remove();
    if (value) node.append(make('span', 'r-flag-note', `🚩 ${reviewNote(value) || '검수 필요'}`));
  }

  // ── 챕터 열기
  function loadRows(sceneId) {
    if (cache.has(sceneId)) return Promise.resolve(cache.get(sceneId));
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `${work.path}/data/scenes/${encodeURIComponent(sceneId)}.js?v=${Date.now()}`;
      script.onload = () => { const rows = (window.PROJECT_H_SCENES || {})[sceneId]; if (!rows) { reject(new Error('빈 씬')); return; } cache.set(sceneId, rows); resolve(rows); };
      script.onerror = () => reject(new Error(`${sceneId} 파일을 불러오지 못했습니다.`));
      document.head.append(script);
    });
  }
  async function openScene(sceneId, restoreY) {
    const s = sceneById.get(sceneId) || scenes[0];
    closePop();
    $('page').innerHTML = '<p class="r-loading">불러오는 중…</p>';
    let rows;
    try { rows = await loadRows(s.id); } catch (error) { $('page').innerHTML = `<p class="r-loading">${error.message}</p>`; return; }
    current = { scene: s, rows };
    if (location.hash !== `#${s.id}`) history.replaceState(null, '', `${location.pathname}${location.search}#${encodeURIComponent(s.id)}`);
    const page = $('page');
    page.innerHTML = '';
    const cover = make('header', 'r-cover');
    cover.append(make('div', 'kind', s.type === '외전' ? 'SIDE STORY' : s.type === '본편' ? 'EPISODE' : s.type), make('h1', null, chapterLabel(s)), make('div', 'sub', `${s.count}줄${s.stats?.script ? ` · 녹음 대사 ${s.stats.script}` : ''}`));
    if (s.phases.length > 1) { const ol = make('ol'); s.phases.forEach((p) => ol.append(make('li', null, p.name))); cover.append(ol); }
    page.append(cover);
    let phaseId = null; let prev = null;
    rows.forEach((row) => {
      if (row.phaseId !== phaseId) {
        phaseId = row.phaseId;
        const p = s.phases.find((x) => x.id === phaseId);
        const h = make('section', 'r-phase'); h.id = `ph-${phaseId}`;
        h.append(make('div', 'ornament', '◆ ◆ ◆'), make('h2', null, p ? p.name : phaseId));
        if (p?.detail) h.append(make('div', 'detail', p.detail));
        page.append(h);
        prev = null;
      }
      page.append(lineNode(row, prev));
      prev = row;
    });
    const end = make('nav', 'r-end');
    const i = scenes.indexOf(s);
    const prevS = scenes.slice(0, i).reverse().find(written);
    const nextS = scenes.slice(i + 1).find(written);
    if (prevS) { const b = make('button', 'prev'); b.type = 'button'; b.append(make('small', null, '← 이전'), make('b', null, chapterLabel(prevS))); b.addEventListener('click', () => openScene(prevS.id)); end.append(b); }
    if (nextS) { const b = make('button', 'next'); b.type = 'button'; b.append(make('small', null, '다음 →'), make('b', null, chapterLabel(nextS))); b.addEventListener('click', () => openScene(nextS.id)); end.append(b); }
    page.append(end);
    $('chapterTitle').textContent = chapterLabel(s);
    fillRoutes(rows); paintRoutes(); updateFlagCount(); renderToc();
    window.scrollTo(0, restoreY || 0);
    savePos();
  }

  // ── 검수 팝업
  let popRow = null; let popNode = null;
  function openPop(node, row) {
    document.querySelectorAll('.r-line.sel').forEach((n) => n.classList.remove('sel'));
    node.classList.add('sel');
    popRow = row; popNode = node;
    const pop = $('pop');
    $('popId').textContent = row.id;
    const value = reviewOf(row);
    $('popNote').value = reviewNote(value);
    $('popClear').hidden = !value;
    $('popSave').textContent = value ? '🚩 메모 고치기' : '🚩 검수 표시';
    $('popHint').textContent = serverMode ? '저장 서버에 연결됨 — 바로 데이터 파일에 저장됩니다.' : '서버 없이 열림 — 이 브라우저에만 저장됩니다. 작업실의 🚩 검수 목록으로 전달하세요.';
    pop.hidden = false;
    const r = node.getBoundingClientRect();
    const top = window.scrollY + r.bottom + 6;
    const left = Math.min(Math.max(12, window.scrollX + r.left), window.scrollX + document.documentElement.clientWidth - pop.offsetWidth - 12);
    pop.style.top = `${top}px`; pop.style.left = `${left}px`;
  }
  function closePop() { $('pop').hidden = true; popRow = null; document.querySelectorAll('.r-line.sel').forEach((n) => n.classList.remove('sel')); }
  $('pop').addEventListener('click', (e) => e.stopPropagation());
  document.addEventListener('click', () => { if (!$('pop').hidden) closePop(); });
  $('popCopy').addEventListener('click', async () => { try { await navigator.clipboard.writeText(popRow.id); toast('ID를 복사했습니다'); } catch { toast(popRow.id); } });
  async function commitReview(value) {
    const row = popRow; const node = popNode;
    try { await saveReview(row, value); paintFlag(node, row); updateFlagCount(); renderToc(); toast(value ? '🚩 검수 표시를 남겼습니다' : '표시를 지웠습니다'); closePop(); }
    catch (error) { toast(`저장 실패: ${error.message}`); }
  }
  $('popSave').addEventListener('click', () => commitReview($('popNote').value.trim() || REVIEW_EMPTY));
  $('popClear').addEventListener('click', () => commitReview(''));
  $('popNote').addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) $('popSave').click(); });

  let toastTimer = null;
  function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('on'), 1800); }

  // ── 스크롤: 진행 막대, 위치 기억, 바 숨김
  let lastY = 0; let saveTimer = null;
  function savePos() { if (current) store.set(posKey, { scene: current.scene.id, y: Math.round(window.scrollY) }); }
  window.addEventListener('scroll', () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    $('progressBar').style.width = `${max > 0 ? (window.scrollY / max) * 100 : 0}%`;
    const y = window.scrollY;
    document.querySelector('.r-bar').classList.toggle('hide', y > lastY && y > 200 && $('pop').hidden && $('settings').hidden);
    lastY = y;
    clearTimeout(saveTimer); saveTimer = setTimeout(savePos, 300);
  }, { passive: true });

  // ── 키보드: ←/→ 이전·다음 화, T 목차, Esc 닫기
  document.addEventListener('keydown', (e) => {
    if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName)) return;
    if (e.key === 'Escape') { closePop(); $('settings').hidden = true; if (!wide()) setToc(false); }
    if (e.key === 't' || e.key === 'T') setToc(!tocOpen());
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      const btn = document.querySelector(e.key === 'ArrowRight' ? '.r-end .next' : '.r-end .prev');
      if (btn) btn.click();
    }
  });
  window.addEventListener('hashchange', () => { const id = decodeURIComponent(location.hash.slice(1)); if (id && id !== current?.scene.id && sceneById.has(id)) openScene(id); });

  async function boot() {
    try { serverMode = /^https?:$/.test(location.protocol) && (await (await fetch('/api/ping', { cache: 'no-store' })).json()).ok === true; } catch { serverMode = false; }
    const fromHash = decodeURIComponent(location.hash.slice(1));
    const pos = store.get(posKey, null);
    if (fromHash && sceneById.has(fromHash)) openScene(fromHash, pos && pos.scene === fromHash ? pos.y : 0);
    else if (pos && sceneById.has(pos.scene)) openScene(pos.scene, pos.y);
    else openScene((scenes.find(written) || scenes[0]).id);
  }
  boot();
}());
