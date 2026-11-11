const works = window.PROJECT_H_WORKS || [];
const work = window.PROJECT_H_WORK; // loader.js가 정한 현재 작품 { id, name, path }
const data = window.PROJECT_H_INDEX; // works/<작품ID>/data/index.js: 메타 + 씬 목록 (본문 행은 씬 선택 시 data/scenes/<씬ID>.js에서 불러옴)
const storageKey = `project_h_local_edits_v1:${work?.id || ''}`; // 작품마다 로컬 수정 내용을 따로 보관
const fields = [
  ['rowNumber', '원본 행'], ['id', 'ID'], ['kind', '종류'], ['speaker', '화자'],
  ['english', '영어 원문'], ['korean', '한국어 대사'], ['recordingScript', '녹음용 대본'],
  ['prompt', '프롬프트'], ['memo', '메모'], ['voice', '음성'], ['sceneType', '씬 종류'], ['sceneId', '씬 ID'],
  ['sceneDetail', '씬 상세'], ['phaseId', '단계 ID'], ['phase', '단계'], ['phaseDetail', '단계 상세'],
];
const tableFields = fields.map(([key]) => key);
const multilineFields = new Set(['english', 'korean', 'recordingScript', 'prompt', 'memo', 'sceneDetail', 'phaseDetail']);
// 열 너비(px). 한국어 대사가 가장 중요해서 가장 넓게 둔다.
const COLUMN_WIDTHS = {
  rowNumber: 64, id: 170, kind: 70, speaker: 90, english: 300, korean: 420, recordingScript: 300, prompt: 320, memo: 300,
  voice: 95, sceneType: 95, sceneId: 95, sceneDetail: 300, phaseId: 95, phase: 95, phaseDetail: 300,
};
// 원문 열: 기본으로 숨기고 `영어 원문 표시`를 켜면 보인다. 일본어 원문 열이 생기면 fields와 이 목록에 추가한다.
const SOURCE_COLUMNS = ['english'];
const sourceKey = 'project_h_show_source_v1';
const fieldLabels = Object.fromEntries(fields);

const el = Object.fromEntries([
  'workSelect', 'sourceInfo', 'saveState', 'resetLocal', 'sceneCount', 'sceneSearch', 'sceneTypeFilter',
  'sceneList', 'totalRows', 'voiceRows', 'sceneTypeLabel', 'sceneBreadcrumb', 'sceneTitle', 'sceneDetail', 'speakerLegend',
  'visibleCount', 'statsStrip', 'phaseTabs', 'lineSearch', 'speakerFilter', 'voiceFilter', 'scriptOnly',
  'missingKorean', 'lineTableBody', 'tableRows', 'selectedRowLabel', 'detailEmpty', 'detailForm', 'detailGrid',
  'restoreRow', 'statusText', 'refText', 'copyRef', 'lineTable', 'lineHead', 'showSource',
].map((id) => [id, document.getElementById(id)]));

const scenes = data?.scenes ?? [];
const sceneById = new Map(scenes.map((scene) => [scene.id, scene]));
const sceneCache = new Map(); // 씬ID → 전체 행 배열 (불러온 씬만)
const sceneLoads = new Map(); // 씬ID → 로딩 Promise

let edits = loadEdits();
let activeSceneId = scenes[0]?.id || '';
let activePhase = '';
let selectedRowNumber = null;
let selectToken = 0;
let showSource = loadShowSource();

function loadShowSource() {
  try { return localStorage.getItem(sourceKey) === '1'; } catch { return false; }
}

// 지금 화면에 보여줄 열 (원문 열은 `영어 원문 표시`가 켜져 있을 때만)
function visibleFields() {
  return tableFields.filter((key) => showSource || !SOURCE_COLUMNS.includes(key));
}

function renderHead() {
  const visible = visibleFields();
  el.lineHead.replaceChildren();
  visible.forEach((key) => {
    const th = make('th', '', fieldLabels[key]);
    th.style.width = `${COLUMN_WIDTHS[key]}px`;
    el.lineHead.append(th);
  });
  const total = visible.reduce((sum, key) => sum + COLUMN_WIDTHS[key], 0);
  el.lineTable.style.width = `${total}px`; // 고정 레이아웃: 보이는 열 너비의 합
}

function toggleSource() {
  showSource = el.showSource.checked;
  try { localStorage.setItem(sourceKey, showSource ? '1' : '0'); } catch { /* 저장소 사용 불가 시 이번 화면에서만 적용 */ }
  renderHead();
  if (selectedRowNumber) selectRow(selectedRowNumber);
  else renderTable();
}

// 슬림 행 + 씬 정보 → 화면에서 쓰는 전체 행
function expandRow(scene, row) {
  const phase = scene.phases.find((item) => item.id === row.phaseId);
  return {
    ...row,
    prompt: row.prompt ?? '',
    sceneType: scene.type, sceneId: scene.id, sceneDetail: scene.detail,
    phase: phase ? phase.name : '', phaseDetail: phase ? phase.detail : '',
  };
}

function loadScene(sceneId) {
  if (sceneCache.has(sceneId)) return Promise.resolve(sceneCache.get(sceneId));
  if (sceneLoads.has(sceneId)) return sceneLoads.get(sceneId);
  const scene = sceneById.get(sceneId);
  const promise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `${work.path}/data/scenes/${encodeURIComponent(sceneId)}.js?v=${encodeURIComponent(data.meta.builtAt || '')}`;
    script.onload = () => {
      const rows = (window.PROJECT_H_SCENES || {})[sceneId];
      if (!rows) { reject(new Error('씬 데이터가 비어 있습니다.')); return; }
      const full = rows.map((row) => expandRow(scene, row));
      sceneCache.set(sceneId, full);
      resolve(full);
    };
    script.onerror = () => reject(new Error(`${sceneId} 파일을 불러오지 못했습니다.`));
    document.head.append(script);
  }).finally(() => sceneLoads.delete(sceneId));
  sceneLoads.set(sceneId, promise);
  return promise;
}

function loadEdits() {
  try { return JSON.parse(localStorage.getItem(storageKey) || '{}'); }
  catch { return {}; }
}

function persistEdits() {
  try { localStorage.setItem(storageKey, JSON.stringify(edits)); }
  catch { el.statusText.textContent = '브라우저 저장소에 쓸 수 없어 수정 내용이 유지되지 않습니다.'; }
}

function currentRow(row) {
  return { ...row, ...(edits[row.rowNumber] || {}) };
}

function make(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function speakerColors(speaker) {
  const fixed = {
    '나레이션': ['#657182', '#f0f3f6'],
    '준형': ['#2563a7', '#edf5ff'],
    '서희': ['#b82f6b', '#fff0f6'],
  };
  if (fixed[speaker]) return fixed[speaker];
  let hash = 0;
  for (const char of speaker || '') hash = ((hash * 31) + char.codePointAt(0)) >>> 0;
  const hue = hash % 360;
  return [`hsl(${hue} 52% 39%)`, `hsl(${hue} 65% 95%)`];
}

function applySpeakerStyle(node, speaker) {
  const [accent, background] = speakerColors(speaker);
  node.style.setProperty('--speaker-accent', accent);
  node.style.setProperty('--speaker-bg', background);
}

function sceneRows(sceneId = activeSceneId) {
  return (sceneCache.get(sceneId) || []).map(currentRow);
}

function baseRow(rowNumber) {
  return (sceneCache.get(activeSceneId) || []).find((row) => row.rowNumber === Number(rowNumber));
}

function sceneStats(rows) {
  const stats = { total: rows.length, korean: 0, voice: 0, script: 0 };
  rows.forEach((row) => {
    if (row.korean) stats.korean += 1;
    if (row.voice) stats.voice += 1;
    if (row.recordingScript) stats.script += 1;
  });
  return stats;
}

function percent(part, total) {
  return total ? Math.round((part / total) * 100) : 0;
}

function updateSaveState() {
  const count = Object.keys(edits).length;
  el.saveState.textContent = count ? `로컬 수정 ${count}건` : '원본 데이터';
  el.saveState.classList.toggle('changed', count > 0);
}

function populateFilters() {
  [...new Set(scenes.map((scene) => scene.type))].forEach((value) => {
    const option = make('option', '', value);
    option.value = value;
    el.sceneTypeFilter.append(option);
  });
  data.speakers.forEach(({ name, count }) => {
    const option = make('option', '', `${name} (${count})`);
    option.value = name;
    el.speakerFilter.append(option);
  });
}

function renderSceneList() {
  const query = el.sceneSearch.value.trim().toLowerCase();
  const type = el.sceneTypeFilter.value;
  const visible = scenes.filter((scene) => {
    const text = `${scene.id} ${scene.type} ${scene.detail}`.toLowerCase();
    return (!query || text.includes(query)) && (!type || scene.type === type);
  });
  el.sceneList.replaceChildren();
  const fragment = document.createDocumentFragment();
  visible.forEach((scene) => {
    const voicePercent = percent(scene.stats?.voice || 0, scene.count);
    const button = make('button', `scene-item${scene.id === activeSceneId ? ' active' : ''}`);
    button.type = 'button';
    button.dataset.scene = scene.id;
    const main = make('span', 'scene-main');
    main.append(make('strong', '', scene.id), make('small', '', scene.type));
    const meta = make('span', 'scene-meta');
    const bar = make('span', 'scene-bar');
    bar.title = `음성 ${voicePercent}%`;
    const fill = make('span', 'scene-bar-fill');
    fill.style.width = `${voicePercent}%`;
    bar.append(fill);
    meta.append(make('em', '', String(scene.count)), bar);
    button.append(main, meta);
    button.addEventListener('click', () => selectScene(scene.id));
    fragment.append(button);
  });
  el.sceneList.append(fragment);
  el.sceneCount.textContent = `${visible.length}/${scenes.length}`;
}

function renderStats() {
  const stats = sceneStats(sceneRows());
  el.statsStrip.replaceChildren();
  const items = [
    ['전체 행', stats.total.toLocaleString(), null],
    ['한국어 번역', `${percent(stats.korean, stats.total)}%`, percent(stats.korean, stats.total)],
    ['음성 체크', `${percent(stats.voice, stats.total)}%`, percent(stats.voice, stats.total)],
    ['녹음 대본', stats.script.toLocaleString(), null],
  ];
  items.forEach(([label, value, progress]) => {
    const card = make('div', 'stat-card');
    card.append(make('span', 'stat-label', label), make('strong', 'stat-value', value));
    if (progress !== null) {
      const track = make('span', 'stat-track');
      const fill = make('span', 'stat-fill');
      fill.style.width = `${progress}%`;
      track.append(fill);
      card.append(track);
    }
    el.statsStrip.append(card);
  });
}

async function selectScene(sceneId) {
  const token = ++selectToken;
  activeSceneId = sceneId;
  activePhase = '';
  selectedRowNumber = null;
  const scene = sceneById.get(sceneId);
  el.sceneTypeLabel.textContent = scene?.type || '-';
  el.sceneBreadcrumb.textContent = sceneId;
  el.sceneTitle.textContent = `${sceneId} 대사 편집`;
  el.sceneDetail.textContent = scene?.detail || '';
  renderSceneList();
  clearDetail();
  if (!sceneCache.has(sceneId)) {
    el.statusText.textContent = `${sceneId} 불러오는 중…`;
    el.lineTableBody.replaceChildren();
    el.visibleCount.textContent = '불러오는 중';
    el.tableRows.textContent = '';
  }
  try {
    await loadScene(sceneId);
  } catch (error) {
    if (token !== selectToken) return;
    el.statusText.textContent = error.message;
    el.visibleCount.textContent = '불러오기 실패';
    return;
  }
  if (token !== selectToken) return; // 그 사이 다른 씬을 선택함
  el.statusText.textContent = `${sceneId} · ${scene.count.toLocaleString()}개 행`;
  renderSpeakerLegend();
  renderStats();
  renderPhases(scene);
  renderTable();
}

function renderSpeakerLegend() {
  const speakers = [...new Set(sceneRows().map((row) => row.speaker))];
  el.speakerLegend.replaceChildren();
  speakers.forEach((speaker) => {
    const chip = make('span', 'speaker-chip', speaker);
    applySpeakerStyle(chip, speaker);
    el.speakerLegend.append(chip);
  });
}

function renderPhases(scene) {
  el.phaseTabs.replaceChildren();
  const allButton = make('button', 'phase-tab active', `전체 (${scene?.count || 0})`);
  allButton.type = 'button';
  allButton.dataset.phase = '';
  el.phaseTabs.append(allButton);
  (scene?.phases || []).forEach((phase) => {
    if (!phase.id && !phase.name && phase.detail === '') return;
    const key = phase.id || phase.name || '전체';
    const label = [phase.id, phase.name].filter(Boolean).join(' ');
    const button = make('button', 'phase-tab', `${label || '미분류'} (${phase.count})`);
    button.type = 'button';
    button.dataset.phase = key;
    el.phaseTabs.append(button);
  });
  el.phaseTabs.querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', () => {
      activePhase = button.dataset.phase;
      el.phaseTabs.querySelectorAll('button').forEach((item) => item.classList.toggle('active', item === button));
      renderTable();
    });
  });
}

function filteredRows() {
  const query = el.lineSearch.value.trim().toLowerCase();
  const speaker = el.speakerFilter.value;
  const voice = el.voiceFilter.value;
  return sceneRows().filter((row) => {
    const phaseKey = row.phaseId || row.phase || '전체';
    if (activePhase && phaseKey !== activePhase) return false;
    if (speaker && row.speaker !== speaker) return false;
    if (voice === 'checked' && !row.voice) return false;
    if (voice === 'empty' && row.voice) return false;
    if (el.scriptOnly.checked && !row.recordingScript) return false;
    if (el.missingKorean.checked && row.korean) return false;
    if (!query) return true;
    // 화면에 숨겨진 열(영어 원문 등)은 검색 대상에서 제외한다
    return visibleFields().some((field) => String(row[field] ?? '').toLowerCase().includes(query));
  });
}

function renderTable() {
  const rows = filteredRows();
  el.lineTableBody.replaceChildren();
  const fragment = document.createDocumentFragment();
  if (!rows.length) {
    const tr = make('tr', 'empty-row');
    const td = make('td', '', '조건에 맞는 데이터가 없습니다.');
    td.colSpan = visibleFields().length;
    tr.append(td);
    fragment.append(tr);
  } else {
    rows.forEach((row) => {
      const tr = make('tr', selectedRowNumber === row.rowNumber ? 'selected' : '');
      tr.dataset.row = row.rowNumber;
      applySpeakerStyle(tr, row.speaker);
      if (edits[row.rowNumber]) tr.classList.add('modified');
      visibleFields().forEach((field) => {
        const td = make('td', `cell-${field}`, field === 'speaker' ? '' : (row[field] || ''));
        if (field === 'speaker') td.append(make('span', 'speaker-badge', row.speaker));
        if (multilineFields.has(field)) td.classList.add('cell-wrap');
        tr.append(td);
      });
      tr.addEventListener('click', () => selectRow(row.rowNumber));
      fragment.append(tr);
    });
  }
  el.lineTableBody.append(fragment);
  el.visibleCount.textContent = `${rows.length}개 표시`;
  el.tableRows.textContent = `${rows.length}개 행`;
}

function findRow(rowNumber) {
  const base = baseRow(rowNumber);
  return base ? currentRow(base) : null;
}

function selectRow(rowNumber) {
  selectedRowNumber = Number(rowNumber);
  const row = findRow(selectedRowNumber);
  if (!row) return;
  el.detailEmpty.classList.add('hidden');
  el.detailForm.classList.remove('hidden');
  el.selectedRowLabel.textContent = `${row.rowNumber}행`;
  el.refText.textContent = rowRef(row);
  el.detailGrid.replaceChildren();
  fields.filter(([key]) => showSource || !SOURCE_COLUMNS.includes(key)).forEach(([key, label]) => {
    const wrapper = make('label', 'field');
    wrapper.append(make('span', '', label));
    const input = multilineFields.has(key) ? make('textarea') : make('input');
    input.name = key;
    input.value = row[key] ?? '';
    if (key === 'rowNumber') input.readOnly = true;
    wrapper.append(input);
    el.detailGrid.append(wrapper);
  });
  renderTable();
}

// ---- 참조 복사 · 시간 표시 ----
function rowRef(row) {
  return `${row.sceneId} · 행 ${row.rowNumber} · ${row.id}`;
}

async function copyText(text, button) {
  let ok = false;
  try {
    await navigator.clipboard.writeText(text);
    ok = true;
  } catch {
    // 클립보드 API를 쓸 수 없는 환경(권한·비보안 주소 등)에서는 임시 입력칸으로 복사
    const area = make('textarea');
    area.value = text;
    area.style.cssText = 'position:fixed;left:-9999px;top:0';
    document.body.append(area);
    area.select();
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    area.remove();
  }
  el.statusText.textContent = ok ? `복사했습니다: ${text}` : `복사하지 못했습니다. 아래 글자를 직접 선택해서 복사하세요 → ${text}`;
  if (!ok && button === el.copyRef) {
    // 자동 복사가 막힌 환경에서는 참조 글자를 선택해 두어 Ctrl+C 로 바로 복사할 수 있게 한다
    const range = document.createRange();
    range.selectNodeContents(el.refText);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }
  if (button) {
    const original = button.dataset.label || button.textContent;
    button.dataset.label = original;
    button.textContent = ok ? '복사됨 ✓' : '직접 복사';
    button.classList.toggle('copied', ok);
    window.setTimeout(() => { button.textContent = original; button.classList.remove('copied'); }, 1400);
  }
  return ok;
}

function clearDetail() {
  el.detailEmpty.classList.remove('hidden');
  el.detailForm.classList.add('hidden');
  el.selectedRowLabel.textContent = '선택 없음';
  el.detailGrid.replaceChildren();
}

function saveSelectedRow(event) {
  event.preventDefault();
  if (!selectedRowNumber) return;
  const base = baseRow(selectedRowNumber);
  if (!base) return;
  const values = Object.fromEntries(new FormData(el.detailForm).entries());
  delete values.rowNumber;
  // 원본과 달라진 항목만 저장
  const next = {};
  Object.entries(values).forEach(([key, value]) => {
    if (value !== String(base[key] ?? '')) next[key] = value;
  });
  if (Object.keys(next).length) edits[selectedRowNumber] = next;
  else delete edits[selectedRowNumber];
  persistEdits();
  updateSaveState();
  renderSceneList();
  renderSpeakerLegend();
  renderStats();
  renderTable();
  el.statusText.textContent = `${selectedRowNumber}행을 브라우저에 저장했습니다.`;
}

function restoreSelectedRow() {
  if (!selectedRowNumber) return;
  delete edits[selectedRowNumber];
  persistEdits();
  updateSaveState();
  renderSceneList();
  renderSpeakerLegend();
  renderStats();
  selectRow(selectedRowNumber);
  el.statusText.textContent = `${selectedRowNumber}행을 원본으로 복원했습니다.`;
}

function resetAllEdits() {
  if (!Object.keys(edits).length) return;
  if (!window.confirm('브라우저에 저장한 모든 수정 내용을 삭제하시겠습니까?')) return;
  edits = {};
  try { localStorage.removeItem(storageKey); } catch { /* 저장소 사용 불가 시 무시 */ }
  updateSaveState();
  renderSceneList();
  renderSpeakerLegend();
  renderStats();
  renderTable();
  if (selectedRowNumber) selectRow(selectedRowNumber);
  el.statusText.textContent = '모든 로컬 수정을 초기화했습니다.';
}

function bindEvents() {
  [el.sceneSearch, el.sceneTypeFilter].forEach((node) => node.addEventListener('input', renderSceneList));
  [el.lineSearch, el.speakerFilter, el.voiceFilter, el.scriptOnly, el.missingKorean].forEach((node) => node.addEventListener('input', renderTable));
  el.detailForm.addEventListener('submit', saveSelectedRow);
  el.restoreRow.addEventListener('click', restoreSelectedRow);
  el.resetLocal.addEventListener('click', resetAllEdits);
  el.showSource.addEventListener('change', toggleSource);
  el.copyRef.addEventListener('click', () => {
    const row = selectedRowNumber ? findRow(selectedRowNumber) : null;
    if (row) copyText(rowRef(row), el.copyRef);
  });
  document.querySelectorAll('.module-button').forEach((button) => button.addEventListener('click', () => {
    document.querySelectorAll('.module-button').forEach((item) => item.classList.toggle('active', item === button));
    el.statusText.textContent = button.dataset.module === '대사집'
      ? '대사집 화면입니다.'
      : `${button.dataset.module} 모듈은 준비 중입니다.`;
  }));
}

function populateWorks() {
  works.forEach((item) => {
    const option = make('option', '', item.name || item.id);
    option.value = item.id;
    option.selected = item.id === work?.id;
    el.workSelect.append(option);
  });
  if (!works.length) el.workSelect.append(make('option', '', '작품 없음'));
  el.workSelect.addEventListener('change', () => {
    const url = new URL(window.location.href);
    url.searchParams.set('work', el.workSelect.value);
    window.location.href = url.toString(); // 작품이 바뀌면 상태를 초기화하기 위해 새로 불러온다
  });
}

function init() {
  populateWorks();
  if (!work || !data) {
    el.statusText.textContent = '작품 데이터를 불러오지 못했습니다.';
    return;
  }
  document.title = `${work.name || work.id} · Project_H 통합관리`;
  el.sourceInfo.textContent = `${data.meta.source} · ${data.meta.rowCount.toLocaleString()}행`;
  el.totalRows.textContent = `${data.meta.rowCount.toLocaleString()}개 행`;
  el.voiceRows.textContent = `음성 ${data.meta.voiceCheckedCount.toLocaleString()}`;
  el.statusText.textContent = `${data.meta.sceneCount}개 씬 데이터 연결 완료`;
  populateFilters();
  el.showSource.checked = showSource;
  renderHead();
  bindEvents();
  updateSaveState();
  selectScene(activeSceneId);
}

init();
