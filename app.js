const works = window.PROJECT_H_WORKS || [];
const work = window.PROJECT_H_WORK; // loader.js가 정한 현재 작품 { id, name, path }
const data = window.PROJECT_H_INDEX; // works/<작품ID>/data/index.js: 메타 + 씬 목록 (본문 행은 씬 선택 시 data/scenes/<씬ID>.js에서 불러옴)
const storageKey = `project_h_local_edits_v1:${work?.id || ''}`; // 작품마다 로컬 수정 내용을 따로 보관
const fields = [
  ['rowNumber', '원본 행'], ['id', 'ID'], ['kind', '종류'], ['speaker', '화자'],
  ['english', '영어 원문'], ['korean', '한국어 대사'], ['prompt', '프롬프트'],
  ['recordingScript', '녹음용 대본'], ['copy', '복사'], ['memo', '메모'], ['voice', '음성'], ['sceneType', '씬 종류'], ['sceneId', '씬 ID'],
  ['sceneDetail', '씬 상세'], ['phaseId', '단계 ID'], ['phase', '단계'], ['phaseDetail', '단계 상세'],
];
const tableFields = fields.map(([key]) => key);
const multilineFields = new Set(['english', 'korean', 'recordingScript', 'prompt', 'memo', 'sceneDetail', 'phaseDetail']);
// 열 너비(px). 한국어 대사가 가장 중요해서 가장 넓게 둔다.
const COLUMN_WIDTHS = {
  rowNumber: 56, id: 130, kind: 40, speaker: 76, english: 280, korean: 400, prompt: 260, recordingScript: 300, copy: 64, memo: 220,
  voice: 60, sceneType: 72, sceneId: 64, sceneDetail: 260, phaseId: 64, phase: 72, phaseDetail: 260,
};
// 원문 열: 기본으로 숨기고 `영어 원문 표시`를 켜면 보인다. 일본어 원문 열이 생기면 fields와 이 목록에 추가한다.
const SOURCE_COLUMNS = ['english'];
const sourceKey = 'project_h_show_source_v1';
// 표에서 뺀 열 (행 상세 패널에서는 그대로 보이고 고칠 수 있다). 지금은 없음.
const TABLE_HIDDEN_COLUMNS = [];
// 표에서 약어로 보여줄 값 (원래 값은 마우스를 올리면 보이고, 상세 패널에는 원래 값 그대로)
const CELL_ABBR = { kind: { text: 'T', choice: 'C' } };
const fieldLabels = Object.fromEntries(fields);

const el = Object.fromEntries([
  'workSelect', 'saveState', 'resetLocal', 'sceneCount', 'sceneSearch', 'sceneTypeFilter',
  'sceneList', 'totalRows', 'voiceRows', 'sceneTypeLabel', 'sceneBreadcrumb', 'sceneTitle', 'sceneDetail', 'speakerLegend',
  'visibleCount', 'statsStrip', 'phaseTabs', 'lineSearch', 'speakerFilter', 'voiceFilter', 'scriptOnly',
  'missingKorean', 'lineTableBody', 'tableRows', 'statusText', 'lineTable', 'lineHead', 'showSource',
  'selectCount', 'selVisible', 'selPhase', 'selScene', 'selClear', 'copySelected', 'playAll',
  'templateList', 'promptCombined', 'groupTabs', 'applyWrap', 'applyPrompt', 'applyNote', 'resetPrompt', 'editBanner', 'editText', 'editCancel',
  'saveNote',
].map((id) => [id, document.getElementById(id)]));

const scenes = data?.scenes ?? [];
const sceneById = new Map(scenes.map((scene) => [scene.id, scene]));
const sceneCache = new Map(); // 씬ID → 전체 행 배열 (불러온 씬만)
const sceneLoads = new Map(); // 씬ID → 로딩 Promise

let edits = loadEdits();
let activeSceneId = scenes[0]?.id || '';
let activePhase = '';
let selectToken = 0;
let showSource = loadShowSource();
const SELECT_WIDTH = 32; // 맨 앞 선택 체크박스 열 너비(px)
let promptTemplates = [...(window.PROJECT_H_PROMPTS?.templates || [])]; // works/<작품ID>/data/prompts.js
// 저장 서버(node tools/server.js)로 열었을 때만 true: 수정이 브라우저가 아니라 데이터 파일에 바로 저장된다
let serverMode = false;
const selected = new Set(); // 선택한 대본 행의 rowNumber (현재 씬 안에서만 유지, 씬을 바꾸면 비움)
let headBox = null; // 표 머리의 `표시된 행 전체` 체크박스
// 프롬프트 분류 탭 (prompts.js 의 group 값과 tools/lib.js 의 PROMPT_GROUPS 와 같은 순서)
const PROMPT_GROUPS = [['act', '행위'], ['phase', '단계'], ['arousal', '흥분도'], ['emotion', '추가 감정']];
const groupOf = (item) => (PROMPT_GROUPS.some(([key]) => key === item.group) ? item.group : 'emotion');
let activeGroup = 'act';
let promptTemplateIds = [];
let editingRowNumber = null; // 프롬프트 수정 중인 줄 (없으면 null) // 선택한 템플릿 ID (누른 순서). 여러 개면 내용을 이 순서대로 이어 붙인다

function loadShowSource() {
  try { return localStorage.getItem(sourceKey) === '1'; } catch { return false; }
}

// 지금 화면에 보여줄 열 (원문 열은 `영어 원문 표시`가 켜져 있을 때만)
function visibleFields() {
  return tableFields.filter((key) => !TABLE_HIDDEN_COLUMNS.includes(key) && (showSource || !SOURCE_COLUMNS.includes(key)));
}

function renderHead() {
  const visible = visibleFields();
  el.lineHead.replaceChildren();
  const selectTh = make('th', 'th-select');
  selectTh.style.width = `${SELECT_WIDTH}px`;
  headBox = make('input');
  headBox.type = 'checkbox';
  headBox.setAttribute('aria-label', '화면에 표시된 대본 행 전체 선택/해제');
  headBox.title = '화면에 표시된 대본 행 전체 선택/해제 (필터 적용 결과)';
  headBox.addEventListener('change', () => {
    const rows = scriptRows(filteredRows());
    rows.forEach((row) => (headBox.checked ? selected.add(row.rowNumber) : selected.delete(row.rowNumber)));
    renderTable();
  });
  selectTh.append(headBox);
  el.lineHead.append(selectTh);
  visible.forEach((key) => {
    const th = make('th', '', fieldLabels[key]);
    th.style.width = `${COLUMN_WIDTHS[key]}px`;
    el.lineHead.append(th);
  });
  const total = SELECT_WIDTH + visible.reduce((sum, key) => sum + COLUMN_WIDTHS[key], 0);
  el.lineTable.style.width = `${total}px`; // 고정 레이아웃: 보이는 열 너비의 합
}

function toggleSource() {
  showSource = el.showSource.checked;
  try { localStorage.setItem(sourceKey, showSource ? '1' : '0'); } catch { /* 저장소 사용 불가 시 이번 화면에서만 적용 */ }
  renderHead();
  renderTable();
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
  el.saveState.textContent = count ? `로컬 수정 ${count}건` : (serverMode ? '저장 서버 연결됨' : '원본 데이터');
  el.saveState.classList.toggle('changed', count > 0);
  el.saveState.classList.toggle('connected', serverMode && count === 0);
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
  selected.clear(); // 씬을 바꾸면 행 선택은 해제된다
  stopVoice();
  const scene = sceneById.get(sceneId);
  el.sceneTypeLabel.textContent = scene?.type || '-';
  el.sceneBreadcrumb.textContent = sceneId;
  el.sceneTitle.textContent = `${sceneId} 대사 편집`;
  el.sceneDetail.textContent = scene?.detail || '';
  renderSceneList();
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

function phaseKeyOf(row) {
  return row.phaseId || row.phase || '전체';
}

function filteredRows() {
  const query = el.lineSearch.value.trim().toLowerCase();
  const speaker = el.speakerFilter.value;
  const voice = el.voiceFilter.value;
  return sceneRows().filter((row) => {
    if (activePhase && phaseKeyOf(row) !== activePhase) return false;
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
    td.colSpan = visibleFields().length + 1;
    tr.append(td);
    fragment.append(tr);
  } else {
    rows.forEach((row) => {
      const tr = make('tr', '');
      tr.dataset.row = row.rowNumber;
      applySpeakerStyle(tr, row.speaker);
      if (edits[row.rowNumber]) tr.classList.add('modified');
      if (selected.has(row.rowNumber)) tr.classList.add('picked');
      if (row.rowNumber === editingRowNumber) tr.classList.add('editing');
      if (row.rowNumber === playingRow) tr.classList.add('now-playing');
      tr.append(makePickCell(row, tr));
      visibleFields().forEach((field) => {
        const raw = row[field] || '';
        const abbr = CELL_ABBR[field]?.[raw];
        if (field === 'copy') { tr.append(makeCopyCell(row)); return; }
        const td = make('td', `cell-${field}`, field === 'speaker' ? '' : (abbr || raw));
        if (abbr) td.title = raw;
        if (field === 'speaker') td.append(make('span', 'speaker-badge', row.speaker));
        if (multilineFields.has(field)) td.classList.add('cell-wrap');
        tr.append(td);
      });
      tr.addEventListener('click', () => togglePick(row, tr)); // 줄 어디를 눌러도 체크를 켜고 끈다
      fragment.append(tr);
    });
  }
  el.lineTableBody.append(fragment);
  el.visibleCount.textContent = `${rows.length}개 표시`;
  el.tableRows.textContent = `${rows.length}개 행`;
  updateSelectBar(rows);
}

// ---- 대본 행 선택 (프롬프트 일괄 삽입용) ----
function scriptRows(rows) {
  return rows.filter((row) => row.recordingScript); // 녹음용 대본이 있는 행만 선택 대상
}

function makePickCell(row, tr) {
  const td = make('td', 'cell-select');
  const box = make('input');
  box.type = 'checkbox';
  box.setAttribute('aria-label', `${row.rowNumber}행 선택`);
  if (!row.recordingScript) {
    box.disabled = true;
    box.title = '녹음용 대본이 없어 선택할 수 없습니다';
  } else {
    box.checked = selected.has(row.rowNumber);
    box.addEventListener('change', () => {
      if (box.checked) selected.add(row.rowNumber); else selected.delete(row.rowNumber);
      tr.classList.toggle('picked', box.checked);
      updateSelectBar();
    });
  }
  box.addEventListener('click', (event) => event.stopPropagation()); // 체크해도 행 상세는 바뀌지 않게
  td.addEventListener('click', (event) => event.stopPropagation());
  td.append(box);
  return td;
}

// 복사 칸: `프롬프트`와 `대본`(녹음용 대본) 버튼을 따로 둔다. 각각 그 칸 내용만 클립보드에 복사
// ---- 음성 재생 ----
// 음성 파일은 Project_H/voice/<음성ID>.wav (집 PC에서 실제 음성 폴더로 연결해 둔 폴더, 저장소에는 올리지 않음)
const VOICES = window.PROJECT_H_VOICES || {};
const VOICE_DIR = 'voice/';
const player = new Audio();

let playQueue = null; // 연속 재생: { rows, index } (없으면 한 줄 재생 또는 정지 상태)
let playingRow = null;

function rowElement(rowNumber) {
  return el.lineTableBody.querySelector(`tr[data-row="${rowNumber}"]`);
}

function markPlaying(rowNumber, on) {
  const tr = rowElement(rowNumber);
  if (!tr) return;
  tr.classList.toggle('now-playing', on);
  const button = tr.querySelector('.play-button');
  if (button) { button.textContent = on ? '■' : '▶'; button.classList.toggle('playing', on); }
}

function stopVoice() {
  player.pause();
  if (playingRow !== null) markPlaying(playingRow, false);
  playingRow = null;
  if (playQueue) { playQueue = null; updatePlayAll(); }
}

// 한 줄 재생 (연속 재생 중이면 다음 줄로 이어진다). 소리 확인용 자동 재생은 하지 않는다 — 사용자가 누를 때만 재생
function startRow(row) {
  const voiceId = VOICES[row.id];
  if (playingRow !== null) markPlaying(playingRow, false);
  playingRow = row.rowNumber;
  markPlaying(row.rowNumber, true);
  const tr = rowElement(row.rowNumber);
  if (tr && playQueue) tr.scrollIntoView({ block: 'nearest' });
  player.src = `${VOICE_DIR}${encodeURIComponent(voiceId)}.wav`;
  player.play().then(() => {
    el.statusText.textContent = playQueue
      ? `연속 재생 ${playQueue.index + 1}/${playQueue.rows.length} · ${row.rowNumber}행 (${voiceId})`
      : `${row.rowNumber}행 음성 재생: ${voiceId}`;
  }).catch(() => {
    if (playQueue) { nextInQueue(); return; }
    stopVoice();
    el.statusText.textContent = `${row.rowNumber}행 음성 파일이 없습니다: voice/${voiceId}.wav`;
  });
  updatePlayAll();
}

function playVoice(row, button) {
  if (playingRow === row.rowNumber && !playQueue) { stopVoice(); return; } // 재생 중에 다시 누르면 정지
  stopVoice();
  startRow(row);
}

// 연속 재생: 지금 화면(단계 탭·필터 반영)에 보이는 음성 있는 줄을 위에서부터 차례로 재생, 파일 없는 줄은 건너뜀
async function nextInQueue() {
  if (!playQueue) return;
  const queue = playQueue;
  while (queue === playQueue) {
    queue.index += 1;
    if (queue.index >= queue.rows.length) {
      stopVoice();
      el.statusText.textContent = '연속 재생을 마쳤습니다.';
      return;
    }
    const row = queue.rows[queue.index];
    if (await voiceExists(VOICES[row.id])) { if (queue === playQueue) startRow(row); return; }
  }
}

function playableRows() {
  return filteredRows().filter((row) => VOICES[row.id]);
}

function togglePlayAll() {
  if (playQueue) { stopVoice(); el.statusText.textContent = '연속 재생을 멈췄습니다.'; return; }
  stopVoice();
  const rows = playableRows();
  if (!rows.length) return;
  playQueue = { rows, index: -1 };
  nextInQueue();
}

function updatePlayAll() {
  if (!el.playAll) return;
  if (playQueue) {
    el.playAll.textContent = `■ 연속 재생 정지 (${Math.max(playQueue.index + 1, 0)}/${playQueue.rows.length})`;
    el.playAll.classList.add('playing');
    el.playAll.disabled = false;
    return;
  }
  const count = playableRows().length;
  el.playAll.textContent = `▶ 연속 재생 (${count})`;
  el.playAll.classList.remove('playing');
  el.playAll.disabled = !count;
}

player.addEventListener('ended', () => { if (playQueue) nextInQueue(); else stopVoice(); });

// 음성 파일이 실제로 있는지 (음성ID별로 한 번만 확인). 없으면 재생 버튼을 흐리게 끈다
const voiceChecks = new Map();
function voiceExists(voiceId) {
  if (!voiceChecks.has(voiceId)) {
    voiceChecks.set(voiceId, fetch(`${VOICE_DIR}${encodeURIComponent(voiceId)}.wav`, { method: 'HEAD', cache: 'no-store' })
      .then((response) => response.ok)
      .catch(() => false));
  }
  return voiceChecks.get(voiceId);
}

function makeCopyCell(row) {
  const td = make('td', 'cell-copy');
  td.addEventListener('click', (event) => event.stopPropagation()); // 복사·재생해도 줄 체크는 바뀌지 않게
  if (VOICES[row.id]) {
    const play = make('button', `copy-button play-button${row.rowNumber === playingRow ? ' playing' : ''}`, row.rowNumber === playingRow ? '■' : '▶');
    play.type = 'button';
    play.title = `음성 재생 (${VOICES[row.id]})`;
    play.addEventListener('click', () => playVoice(row, play));
    voiceExists(VOICES[row.id]).then((ok) => {
      if (ok) return;
      play.classList.add('missing');
      play.disabled = true;
      play.title = `음성 파일 없음 (voice/${VOICES[row.id]}.wav)`;
    });
    td.append(play);
  }
  if (!row.recordingScript) return td;
  [['prompt', '프롬프트'], ['recordingScript', '대본']].forEach(([key, label]) => {
    const value = (row[key] || '').trim();
    const button = make('button', 'copy-button', label);
    button.type = 'button';
    button.dataset.label = label;
    button.title = `${fieldLabels[key]} 복사`;
    button.disabled = !value;
    button.addEventListener('click', () => copyText(value, button, `${row.rowNumber}행 ${fieldLabels[key]}`));
    td.append(button);
  });
  if ((row.prompt || '').trim()) {
    const edit = make('button', 'copy-button edit-button', '수정');
    edit.type = 'button';
    edit.title = '이 줄의 프롬프트를 오른쪽 버튼으로 불러와 수정';
    edit.addEventListener('click', () => startPromptEdit(row));
    td.append(edit);
  }
  return td;
}

// 저장된 프롬프트 `[a, b, c]` → 템플릿 ID 목록. 템플릿 내용에 쉼표가 있어도 되도록 긴 템플릿부터 앞에서부터 맞춰 본다
function parsePrompt(prompt) {
  const candidates = promptTemplates
    .map((item) => ({ id: item.id, text: stripBrackets(item.text) }))
    .filter((item) => item.text)
    .sort((a, b) => b.text.length - a.text.length);
  let rest = stripBrackets(prompt || '');
  const ids = [];
  const unknown = [];
  while (rest) {
    const found = candidates.find((item) => rest === item.text || rest.startsWith(`${item.text},`));
    let part;
    if (found) {
      part = found.text;
      if (!ids.includes(found.id)) ids.push(found.id);
    } else {
      const cut = rest.indexOf(',');
      part = cut === -1 ? rest : rest.slice(0, cut);
      if (part.trim()) unknown.push(part.trim());
    }
    rest = rest.slice(part.length).replace(/^\s*,\s*/, '').trim();
  }
  return { ids, unknown };
}

// 수정 시작: 그 줄만 선택하고, 저장된 프롬프트에 해당하는 버튼을 같은 순서로 켠다
function startPromptEdit(row) {
  const { ids, unknown } = parsePrompt(row.prompt);
  selected.clear();
  selected.add(row.rowNumber);
  editingRowNumber = row.rowNumber;
  promptTemplateIds = ids;
  const first = promptTemplates.find((item) => item.id === ids[0]);
  if (first) activeGroup = groupOf(first);
  renderTemplateList();
  renderTable();
  el.statusText.textContent = unknown.length
    ? `${row.rowNumber}행 수정 중 · 템플릿에 없는 항목 ${unknown.length}개는 불러오지 못했습니다 (적용하면 빠집니다): ${unknown.join(', ')}`
    : `${row.rowNumber}행 수정 중 · 버튼을 조정하고 \`수정 적용\`을 누르세요.`;
}

function endPromptEdit() {
  editingRowNumber = null;
}

async function copyText(text, button, label) {
  let ok = false;
  try {
    await navigator.clipboard.writeText(text);
    ok = true;
  } catch {
    // 클립보드 API를 못 쓰는 환경에서는 임시 입력칸으로 복사
    const area = make('textarea');
    area.value = text;
    area.style.cssText = 'position:fixed;left:-9999px;top:0';
    document.body.append(area);
    area.select();
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    area.remove();
  }
  el.statusText.textContent = ok ? `${label}을 복사했습니다.` : `${label}을 복사하지 못했습니다.`;
  button.textContent = ok ? '✓' : '실패';
  button.classList.toggle('copied', ok);
  window.setTimeout(() => { button.textContent = button.dataset.label; button.classList.remove('copied'); }, 1200);
}

function togglePick(row, tr) {
  if (!row.recordingScript) {
    el.statusText.textContent = `${row.rowNumber}행은 녹음용 대본이 없어 프롬프트 대상으로 선택할 수 없습니다.`;
    return;
  }
  const on = !selected.has(row.rowNumber);
  if (on) selected.add(row.rowNumber); else selected.delete(row.rowNumber);
  tr.classList.toggle('picked', on);
  const box = tr.querySelector('td.cell-select input');
  if (box) box.checked = on;
  updateSelectBar();
}

function updateSelectBar(rows = filteredRows()) {
  const all = sceneRows();
  const visibleScript = scriptRows(rows);
  const phaseScript = activePhase ? scriptRows(all.filter((row) => phaseKeyOf(row) === activePhase)) : [];
  const sceneScript = scriptRows(all);
  const visibleSet = new Set(rows.map((row) => row.rowNumber));
  let hidden = 0;
  selected.forEach((number) => { if (!visibleSet.has(number)) hidden += 1; });
  el.selectCount.textContent = selected.size
    ? `선택 ${selected.size}행 (표시 ${selected.size - hidden} · 필터로 숨김 ${hidden})`
    : '선택 0행';
  el.selVisible.textContent = `표시된 행 전체 (${visibleScript.length})`;
  el.selVisible.title = '현재 필터·단계 탭에 보이는 대본 행만 선택 (숨겨진 행은 제외)';
  el.selPhase.textContent = `현재 단계 전체 (${phaseScript.length})`;
  el.selPhase.title = activePhase ? '현재 단계의 대본 행을 필터와 관계없이 모두 선택 (필터로 숨겨진 행 포함)' : '단계 탭에서 단계를 먼저 고르세요';
  el.selScene.textContent = `현재 씬 전체 (${sceneScript.length})`;
  el.selScene.title = '이 씬의 모든 대본 행을 필터·단계와 관계없이 선택 (숨겨진 행 포함)';
  el.selVisible.disabled = !visibleScript.length;
  el.selPhase.disabled = !phaseScript.length;
  el.selScene.disabled = !sceneScript.length;
  el.selClear.disabled = !selected.size;
  const copyCount = pickedRows().length;
  el.copySelected.textContent = copyCount ? `선택 행 복사 (${copyCount})` : '선택 행 복사';
  el.copySelected.dataset.label = el.copySelected.textContent;
  el.copySelected.disabled = !copyCount;
  if (headBox) {
    const picked = visibleScript.filter((row) => selected.has(row.rowNumber)).length;
    headBox.disabled = !visibleScript.length;
    headBox.checked = picked > 0 && picked === visibleScript.length;
    headBox.indeterminate = picked > 0 && picked < visibleScript.length;
  }
  // 수정 중인 줄 말고 다른 줄을 체크하거나 해제하면 수정 모드를 끝낸다
  if (editingRowNumber !== null && !(selected.size === 1 && selected.has(editingRowNumber))) endPromptEdit();
  renderCombined(); // 선택한 줄 수가 바뀌면 `적용` 버튼도 갱신
  updatePlayAll(); // 단계 탭·필터가 바뀌면 연속 재생 대상 수도 갱신
}

function pickScope(kind) {
  const all = sceneRows();
  const rows = kind === 'visible' ? filteredRows()
    : kind === 'phase' ? all.filter((row) => phaseKeyOf(row) === activePhase)
      : all;
  selected.clear();
  scriptRows(rows).forEach((row) => selected.add(row.rowNumber));
  const hidden = selected.size - scriptRows(filteredRows()).filter((row) => selected.has(row.rowNumber)).length;
  const name = { visible: '표시된 행 전체', phase: '현재 단계 전체', scene: '현재 씬 전체' }[kind];
  el.statusText.textContent = `${name} 선택: ${selected.size}행` + (hidden ? ` (필터로 숨겨진 ${hidden}행 포함)` : '');
  renderTable();
}

// 선택한 템플릿들을 하나로 합친 것 (없으면 null). id는 쉼표로 이어 tools/prompt.js --template 에 그대로 쓴다
// 최종 프롬프트 형식: [항목1, 항목2, 항목3] (누른 순서, 쉼표+공백 구분, 대괄호로 감쌈) — tools/prompt.js 의 formatPrompt 와 같음
// 템플릿 내용에 이미 대괄호가 있으면([intense sucking]) 벗겨서 한 겹으로만 감싼다
const stripBrackets = (text) => text.trim().replace(/^\[+\s*/, '').replace(/\s*\]+$/, '').trim();
const formatPrompt = (texts) => `[${texts.map(stripBrackets).filter(Boolean).join(', ')}]`;
function combinedTemplate() {
  const picked = promptTemplateIds.map((id) => promptTemplates.find((item) => item.id === id)).filter(Boolean);
  if (!picked.length) return null;
  return {
    id: picked.map((item) => item.id).join(','),
    name: picked.map((item) => item.name).join(' + '),
    text: formatPrompt(picked.map((item) => item.text)),
  };
}

// 선택한 템플릿을 이어 붙인 결과를 버튼 아래에 보여 준다
function renderCombined() {
  const template = combinedTemplate();
  el.promptCombined.classList.toggle('hidden', !template);
  el.promptCombined.textContent = template ? template.text : '';
  // 템플릿을 하나라도 켜면 `적용` 버튼이 나타난다
  el.applyWrap.classList.toggle('hidden', !template);
  const count = pickedRows().length;
  const editing = editingRowNumber !== null;
  el.editBanner.classList.toggle('hidden', !editing);
  el.editText.textContent = editing ? `${editingRowNumber}행 프롬프트 수정 중` : '';
  el.applyPrompt.textContent = editing ? '수정 적용' : (count ? `적용 (선택 ${count}행)` : '적용');
  let note = '';
  if (!serverMode) note = '저장 서버(저장서버 켜기.bat)로 열어야 파일에 적용됩니다';
  else if (!count) note = '표에서 적용할 줄을 먼저 체크하세요';
  el.applyNote.textContent = note;
  el.applyPrompt.disabled = Boolean(note);
}

// 초기화: 켠 템플릿과 체크한 줄을 모두 해제한다 (데이터 파일은 그대로)
function resetPromptSelection() {
  endPromptEdit();
  promptTemplateIds = [];
  selected.clear();
  renderTemplateList();
  renderTable();
  renderCombined();
  el.statusText.textContent = '템플릿 선택과 줄 체크를 초기화했습니다.';
}

// 선택 행 복사: 체크한 줄을 표 순서대로 `[프롬프트] 녹음용 대본` 한 줄씩, 줄 사이에 빈 줄을 두고 복사 (ID는 넣지 않음)
function copySelectedRows() {
  const rows = pickedRows();
  if (!rows.length) return;
  const text = rows
    .map((row) => [row.prompt, row.recordingScript].map((value) => (value || '').trim()).filter(Boolean).join(' '))
    .join('\n\n');
  const noPrompt = rows.filter((row) => !(row.prompt || '').trim()).length;
  copyText(text, el.copySelected, `선택 ${rows.length}행${noPrompt ? ` (프롬프트 없는 ${noPrompt}행은 대본만)` : ''}`);
}

// 지금 씬에서 체크한 줄 (녹음용 대본이 있는 줄만)
function pickedRows() {
  return scriptRows(sceneRows()).filter((row) => selected.has(row.rowNumber));
}

// 체크한 줄의 프롬프트 칸을 선택한 템플릿(이어 붙인 내용)으로 바꾸고 데이터 파일에 저장한다
async function applyPrompt() {
  const template = combinedTemplate();
  const rows = pickedRows();
  if (!serverMode || !template || !rows.length) return;
  const targets = rows.filter((row) => row.prompt !== template.text);
  if (!targets.length) { el.statusText.textContent = '선택한 줄에 이미 같은 프롬프트가 들어 있습니다.'; return; }
  const overwrite = targets.filter((row) => row.prompt).length;
  if (overwrite && editingRowNumber === null && !window.confirm(`선택 ${rows.length}행 중 ${overwrite}행은 이미 다른 프롬프트가 있습니다. 덮어쓸까요?`)) return;
  const patch = targets.map((row) => ({ id: row.id, prompt: template.text }));
  el.applyPrompt.disabled = true;
  try {
    const editing = editingRowNumber !== null;
    const summary = await api('/api/set', { scene: activeSceneId, patch, note: `프롬프트 ${editing ? '수정' : '적용'}: ${template.name} (페이지)` });
    applySavedToCache(activeSceneId, patch);
    endPromptEdit();
    renderTable();
    el.statusText.textContent = `${summary.changedRows}행에 프롬프트를 ${editing ? '수정' : '적용'}했습니다${summary.batch ? ` (변경 묶음 ${summary.batch}, 되돌리기는 AI에게 요청)` : ''}.`;
  } catch (error) {
    el.statusText.textContent = `적용하지 못했습니다: ${error.message}`;
  } finally {
    renderCombined();
  }
}

function toggleTemplate(id) {
  promptTemplateIds = promptTemplateIds.includes(id) ? promptTemplateIds.filter((x) => x !== id) : [...promptTemplateIds, id];
  renderTemplateList();
  renderCombined();
}

// 템플릿 = 작은 토글 버튼 (설명 없이 이름만, 내용은 마우스를 올리면 보임). 여러 개 켜면 순서 번호가 붙는다
// 분류 탭 4개. 탭 이름 옆 숫자 = 그 분류에서 켠 템플릿 수 (다른 탭에서 켠 것도 유지되어 함께 이어 붙는다)
function renderGroupTabs() {
  el.groupTabs.replaceChildren();
  PROMPT_GROUPS.forEach(([key, label]) => {
    const picked = promptTemplateIds.filter((id) => groupOf(promptTemplates.find((item) => item.id === id) || {}) === key).length;
    const tab = make('button', 'group-tab', label);
    tab.type = 'button';
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-selected', String(key === activeGroup));
    if (picked) tab.append(make('b', 'group-count', String(picked)));
    tab.addEventListener('click', () => { activeGroup = key; renderTemplateList(); });
    el.groupTabs.append(tab);
  });
}

function renderTemplateList() {
  renderGroupTabs();
  el.templateList.replaceChildren();
  const list = promptTemplates.filter((item) => groupOf(item) === activeGroup);
  if (!list.length) {
    el.templateList.append(make('p', 'prompt-note', '이 분류에는 템플릿이 없습니다.'));
    return;
  }
  list.forEach((item) => {
    const order = promptTemplateIds.indexOf(item.id);
    const chip = make('button', 'template-chip');
    chip.type = 'button';
    chip.title = item.text;
    chip.setAttribute('aria-pressed', String(order !== -1));
    if (order !== -1) chip.append(make('b', 'chip-order', String(order + 1)));
    chip.append(item.name);
    chip.addEventListener('click', () => toggleTemplate(item.id));
    el.templateList.append(chip);
  });
}

// ---- 저장 서버 연결 ----
async function api(url, body) {
  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ work: work.id, ...body }) });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json.error || `서버 오류 (${response.status})`);
  return json;
}

async function detectServer() {
  if (!/^https?:$/.test(window.location.protocol)) return false; // 파일로 직접 열면 서버가 없다
  try {
    const response = await fetch('/api/ping', { cache: 'no-store' });
    return response.ok && (await response.json()).ok === true;
  } catch { return false; }
}

function applyServerMode() {
  el.saveNote.textContent = serverMode ? '저장 서버 연결됨 · 수정 내용이 데이터 파일에 바로 저장됩니다 (변경 기록 자동)' : '수정 내용은 이 브라우저에만 저장됩니다';
  updateSaveState();
  if (serverMode) el.statusText.textContent = '저장 서버에 연결되었습니다. `프롬프트 관리/삽입`의 `지금 적용`이 데이터 파일에 바로 저장됩니다.';
}

// 서버에 저장한 뒤 화면의 원본 행도 같은 값으로 맞춘다
function applySavedToCache(sceneId, changes) {
  const rows = sceneCache.get(sceneId) || [];
  const byId = new Map(rows.map((row) => [row.id, row]));
  changes.forEach(({ id, ...fieldsChanged }) => Object.assign(byId.get(id) || {}, fieldsChanged));
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
  el.statusText.textContent = '모든 로컬 수정을 초기화했습니다.';
}

function bindEvents() {
  [el.sceneSearch, el.sceneTypeFilter].forEach((node) => node.addEventListener('input', renderSceneList));
  [el.lineSearch, el.speakerFilter, el.voiceFilter, el.scriptOnly, el.missingKorean].forEach((node) => node.addEventListener('input', renderTable));
  el.resetLocal.addEventListener('click', resetAllEdits);
  el.showSource.addEventListener('change', toggleSource);
  el.selVisible.addEventListener('click', () => pickScope('visible'));
  el.selPhase.addEventListener('click', () => pickScope('phase'));
  el.selScene.addEventListener('click', () => pickScope('scene'));
  el.copySelected.addEventListener('click', copySelectedRows);
  el.playAll.addEventListener('click', togglePlayAll);
  el.selClear.addEventListener('click', () => { selected.clear(); renderTable(); el.statusText.textContent = '행 선택을 해제했습니다.'; });
  el.applyPrompt.addEventListener('click', applyPrompt);
  el.resetPrompt.addEventListener('click', resetPromptSelection);
  el.editCancel.addEventListener('click', () => { resetPromptSelection(); el.statusText.textContent = '프롬프트 수정을 취소했습니다.'; });
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
  el.totalRows.textContent = `${data.meta.rowCount.toLocaleString()}개 행`;
  el.voiceRows.textContent = `음성 ${data.meta.voiceCheckedCount.toLocaleString()}`;
  el.statusText.textContent = `${data.meta.sceneCount}개 씬 데이터 연결 완료`;
  populateFilters();
  el.showSource.checked = showSource;
  renderHead();
  bindEvents();
  renderTemplateList();
  updateSaveState();
  selectScene(activeSceneId);
  detectServer().then((connected) => { serverMode = connected; if (connected) applyServerMode(); renderTemplateList(); renderCombined(); });
}

init();
