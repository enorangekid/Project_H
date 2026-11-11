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
  'selectCount', 'selVisible', 'selPhase', 'selScene', 'selClear', 'openPrompt', 'promptDialog', 'promptClose', 'promptCancel',
  'promptCopy', 'templateList', 'promptSummary', 'confirmWrap', 'promptConfirm', 'confirmText', 'requestPreview', 'promptValidity',
  'saveRow', 'saveNote', 'promptApply', 'tplNew', 'templateEditor', 'tplName', 'tplText', 'tplDelete', 'tplCancel', 'tplSave', 'templateNote',
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
const SELECT_WIDTH = 42; // 맨 앞 선택 체크박스 열 너비(px)
let promptTemplates = [...(window.PROJECT_H_PROMPTS?.templates || [])]; // works/<작품ID>/data/prompts.js
// 저장 서버(node tools/server.js)로 열었을 때만 true: 수정이 브라우저가 아니라 데이터 파일에 바로 저장된다
let serverMode = false;
let editingTemplateId = null; // null = 새 템플릿
const EDITABLE_FIELDS = ['kind', 'speaker', 'english', 'korean', 'recordingScript', 'prompt', 'memo', 'voice']; // tools/lib.js 와 같은 목록
const selected = new Set(); // 선택한 대본 행의 rowNumber (현재 씬 안에서만 유지, 씬을 바꾸면 비움)
let headBox = null; // 표 머리의 `표시된 행 전체` 체크박스
let promptTemplateId = '';

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
  selectedRowNumber = null;
  selected.clear(); // 씬을 바꾸면 행 선택은 해제된다
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
      const tr = make('tr', selectedRowNumber === row.rowNumber ? 'selected' : '');
      tr.dataset.row = row.rowNumber;
      applySpeakerStyle(tr, row.speaker);
      if (edits[row.rowNumber]) tr.classList.add('modified');
      if (selected.has(row.rowNumber)) tr.classList.add('picked');
      tr.append(makePickCell(row, tr));
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
  if (headBox) {
    const picked = visibleScript.filter((row) => selected.has(row.rowNumber)).length;
    headBox.disabled = !visibleScript.length;
    headBox.checked = picked > 0 && picked === visibleScript.length;
    headBox.indeterminate = picked > 0 && picked < visibleScript.length;
  }
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

// ---- 프롬프트 관리/삽입 ----
function currentPlan() {
  const action = document.querySelector('input[name="promptAction"]:checked').value;
  const template = promptTemplates.find((item) => item.id === promptTemplateId) || null;
  const rows = scriptRows(sceneRows()).filter((row) => selected.has(row.rowNumber));
  let targets;
  if (action === 'fill') targets = rows.filter((row) => !row.prompt);
  else if (action === 'replace') targets = template ? rows.filter((row) => row.prompt !== template.text) : [];
  else targets = rows.filter((row) => row.prompt);
  // 기존 값이 사라지는 행 수 (교체·삭제 때 확인 필요)
  const overwritten = action === 'fill' ? 0 : targets.filter((row) => row.prompt).length;
  return { action, template, rows, targets, overwritten };
}

// 선택한 행 번호를 "22-30,35" 형태로 줄인다. 대본이 없는 행은 도구가 알아서 건너뛰므로 범위가 끊기지 않게 이어 붙인다.
function rowSpec() {
  const eligible = scriptRows(sceneRows()).map((row) => row.rowNumber).sort((a, b) => a - b);
  const ranges = [];
  let start = null;
  let last = null;
  eligible.forEach((number) => {
    if (selected.has(number)) {
      if (start === null) start = number;
      last = number;
    } else if (start !== null) {
      ranges.push(start === last ? `${start}` : `${start}-${last}`);
      start = null;
    }
  });
  if (start !== null) ranges.push(start === last ? `${start}` : `${start}-${last}`);
  return ranges.join(',');
}

function buildRequest(plan) {
  const base = `node tools/prompt.js --work ${work.id}`;
  const scope = `작품 ${work.id} · 씬 ${activeSceneId} · 선택 ${plan.rows.length}행 (실제 변경 예정 ${plan.targets.length}행)`;
  if (plan.action === 'clear') {
    return `프롬프트 일괄 삭제 요청\n- ${scope}\n\n${base} clear ${activeSceneId} --rows ${rowSpec()}`;
  }
  const modeLabel = plan.action === 'fill' ? '빈 칸만 적용' : '기존 값 교체';
  return `프롬프트 일괄 적용 요청\n- ${scope}\n- 템플릿 「${plan.template.name}」(${plan.template.id}) · ${modeLabel}\n\n`
    + `${base} apply ${activeSceneId} --template ${plan.template.id} --mode ${plan.action} --rows ${rowSpec()}`;
}

function renderTemplateList() {
  el.templateList.replaceChildren();
  if (!promptTemplates.length) {
    el.templateList.append(make('p', 'prompt-note', '등록된 템플릿이 없습니다. 채팅으로 AI에게 템플릿 추가를 요청하세요.'));
    return;
  }
  promptTemplates.forEach((item) => {
    const row = make('div', 'template-row');
    const label = make('label', 'template-item');
    const radio = make('input');
    radio.type = 'radio';
    radio.name = 'promptTemplate';
    radio.value = item.id;
    radio.checked = item.id === promptTemplateId;
    radio.addEventListener('change', () => { promptTemplateId = item.id; updatePromptDialog(true); });
    const body = make('span', 'template-body');
    body.append(make('strong', '', item.name), make('small', '', item.text));
    label.append(radio, body);
    row.append(label);
    if (serverMode) {
      const edit = make('button', 'template-edit', '수정');
      edit.type = 'button';
      edit.addEventListener('click', () => openTemplateEditor(item.id));
      row.append(edit);
    }
    el.templateList.append(row);
  });
}

// ---- 템플릿 편집 (저장 서버가 켜져 있을 때) ----
function openTemplateEditor(id) {
  editingTemplateId = id;
  const item = promptTemplates.find((entry) => entry.id === id);
  el.tplName.value = item ? item.name : '';
  el.tplText.value = item ? item.text : '';
  el.tplDelete.classList.toggle('hidden', !item);
  el.templateEditor.classList.remove('hidden');
  el.tplName.focus();
}

function closeTemplateEditor() {
  editingTemplateId = null;
  el.templateEditor.classList.add('hidden');
}

async function saveTemplates(next, doneMessage) {
  try {
    const result = await api('/api/templates', { templates: next });
    promptTemplates = result.templates;
    if (!promptTemplates.some((item) => item.id === promptTemplateId)) promptTemplateId = '';
    closeTemplateEditor();
    renderTemplateList();
    updatePromptDialog(true);
    el.statusText.textContent = doneMessage;
  } catch (error) {
    el.statusText.textContent = `템플릿을 저장하지 못했습니다: ${error.message}`;
  }
}

function saveTemplateFromEditor() {
  const name = el.tplName.value.trim();
  const text = el.tplText.value.trim();
  if (!name || !text) { el.statusText.textContent = '템플릿 이름과 프롬프트 내용을 모두 적어 주세요.'; return; }
  const existing = promptTemplates.find((item) => item.id === editingTemplateId);
  const next = existing
    ? promptTemplates.map((item) => (item === existing ? { ...item, name, text } : item))
    : [...promptTemplates, { id: `t${Date.now().toString(36)}`, name, text }];
  saveTemplates(next, `템플릿 「${name}」을 저장했습니다. (이미 적용한 행의 프롬프트는 바뀌지 않습니다)`);
}

function deleteTemplateFromEditor() {
  const existing = promptTemplates.find((item) => item.id === editingTemplateId);
  if (!existing || !window.confirm(`템플릿 「${existing.name}」을 삭제할까요? (이미 적용한 행의 프롬프트는 그대로 남습니다)`)) return;
  saveTemplates(promptTemplates.filter((item) => item !== existing), `템플릿 「${existing.name}」을 삭제했습니다.`);
}

// 선택한 행에 지금 바로 적용(또는 삭제)하고 데이터 파일에 저장한다
async function applyPromptNow() {
  const plan = currentPlan();
  if (el.promptApply.disabled || !plan.targets.length) return;
  const value = plan.action === 'clear' ? '' : plan.template.text;
  const label = plan.action === 'clear' ? '프롬프트 일괄 삭제' : `프롬프트 ${plan.action === 'fill' ? '빈 칸 적용' : '교체'}: ${plan.template.name}`;
  const patch = plan.targets.map((row) => ({ id: row.id, prompt: value }));
  el.promptApply.disabled = true;
  try {
    const summary = await api('/api/set', { scene: activeSceneId, patch, note: `${label} (페이지)` });
    applySavedToCache(activeSceneId, patch);
    renderTable();
    closePromptDialog();
    el.statusText.textContent = `${summary.changedRows}행에 ${plan.action === 'clear' ? '프롬프트를 삭제했습니다' : '프롬프트를 적용했습니다'}${summary.batch ? ` (변경 묶음 ${summary.batch}, 되돌리기는 AI에게 요청)` : ''}.`;
  } catch (error) {
    el.statusText.textContent = `적용하지 못했습니다: ${error.message}`;
  } finally {
    updatePromptDialog(false);
  }
}

function updatePromptDialog(resetConfirm = false) {
  if (resetConfirm) el.promptConfirm.checked = false;
  const plan = currentPlan();
  const needsTemplate = plan.action !== 'clear';
  el.templateList.classList.toggle('dimmed', !needsTemplate);
  const name = plan.template ? `「${plan.template.name}」` : '템플릿';
  let summary;
  if (!plan.rows.length) summary = '선택된 대본 행이 없습니다. 표에서 행을 체크하거나 위쪽 선택 버튼을 먼저 사용하세요.';
  else if (plan.action === 'fill') summary = `선택 ${plan.rows.length}행 중 프롬프트가 빈 ${plan.targets.length}행에 ${name}을 넣습니다. 이미 값이 있는 ${plan.rows.length - plan.targets.length}행은 그대로 둡니다.`;
  else if (plan.action === 'replace') summary = `선택 ${plan.rows.length}행에 ${name}을 넣습니다. 바뀌는 행 ${plan.targets.length}행 중 기존 프롬프트가 사라지는 행은 ${plan.overwritten}행입니다.`;
  else summary = `선택 ${plan.rows.length}행 중 프롬프트가 있는 ${plan.targets.length}행의 프롬프트를 삭제합니다.`;
  el.promptSummary.textContent = summary;

  const needsConfirm = plan.overwritten > 0;
  el.confirmWrap.classList.toggle('hidden', !needsConfirm);
  el.confirmText.textContent = plan.action === 'clear'
    ? `${plan.overwritten}행의 프롬프트를 삭제하는 것을 확인했습니다`
    : `기존 프롬프트 ${plan.overwritten}행을 교체하는 것을 확인했습니다`;

  let problem = '';
  if (!plan.rows.length) problem = '대본 행을 먼저 선택하세요';
  else if (needsTemplate && !plan.template) problem = '템플릿을 선택하세요';
  else if (!plan.targets.length) problem = '바뀌는 행이 없습니다';
  else if (needsConfirm && !el.promptConfirm.checked) problem = '위 확인란을 체크하세요';
  el.promptValidity.textContent = problem;
  el.promptCopy.disabled = Boolean(problem);
  el.promptApply.disabled = Boolean(problem);
  el.requestPreview.value = problem ? '' : buildRequest(plan);
}

function openPromptDialog() {
  closeTemplateEditor();
  renderTemplateList();
  updatePromptDialog(true);
  if (typeof el.promptDialog.showModal === 'function') el.promptDialog.showModal();
  else el.promptDialog.setAttribute('open', '');
}

function closePromptDialog() {
  if (typeof el.promptDialog.close === 'function') el.promptDialog.close();
  else el.promptDialog.removeAttribute('open');
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
    if (key === 'rowNumber' || (serverMode && !EDITABLE_FIELDS.includes(key))) input.readOnly = true; // 저장 서버는 수정 가능한 필드만 받는다
    wrapper.append(input);
    el.detailGrid.append(wrapper);
  });
  renderTable();
}

// ---- 참조 복사 · 시간 표시 ----
function rowRef(row) {
  return `${row.sceneId} · 행 ${row.rowNumber} · ${row.id}`;
}

async function copyText(text, button, label = text) {
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
  el.statusText.textContent = ok ? `복사했습니다: ${label}` : `복사하지 못했습니다. 아래 글자를 직접 선택해서 복사하세요 → ${label}`;
  if (!ok && button === el.promptCopy) el.requestPreview.select(); // 자동 복사가 막히면 요청 글자를 선택해 둔다
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
  el.restoreRow.classList.toggle('hidden', serverMode);
  el.saveRow.textContent = serverMode ? '파일에 저장' : '로컬 저장';
  el.saveNote.textContent = serverMode ? '저장 서버 연결됨 · 수정 내용이 데이터 파일에 바로 저장됩니다 (변경 기록 자동)' : '수정 내용은 이 브라우저에만 저장됩니다';
  el.promptApply.classList.toggle('hidden', !serverMode);
  el.promptCopy.classList.toggle('primary', !serverMode);
  el.tplNew.classList.toggle('hidden', !serverMode);
  el.templateNote.classList.toggle('hidden', serverMode);
  updateSaveState();
  if (serverMode) el.statusText.textContent = '저장 서버에 연결되었습니다. 행 상세의 `파일에 저장`과 `프롬프트 관리/삽입`의 `지금 적용`이 데이터 파일에 바로 저장됩니다.';
}

// 서버에 저장한 뒤 화면의 원본 행도 같은 값으로 맞춘다
function applySavedToCache(sceneId, changes) {
  const rows = sceneCache.get(sceneId) || [];
  const byId = new Map(rows.map((row) => [row.id, row]));
  changes.forEach(({ id, ...fieldsChanged }) => Object.assign(byId.get(id) || {}, fieldsChanged));
}

async function saveRowToServer(base) {
  const values = Object.fromEntries(new FormData(el.detailForm).entries());
  const patch = { id: base.id };
  EDITABLE_FIELDS.forEach((key) => {
    if (key in values && values[key] !== String(base[key] ?? '')) patch[key] = values[key];
  });
  if (Object.keys(patch).length === 1) { el.statusText.textContent = '바뀐 내용이 없습니다.'; return; }
  el.saveRow.disabled = true;
  try {
    const summary = await api('/api/set', { scene: activeSceneId, patch: [patch], note: '페이지에서 직접 수정' });
    applySavedToCache(activeSceneId, [patch]);
    renderStats();
    renderSpeakerLegend();
    selectRow(selectedRowNumber);
    el.statusText.textContent = `${selectedRowNumber}행을 파일에 저장했습니다${summary.batch ? ` (변경 묶음 ${summary.batch})` : ''}.`;
  } catch (error) {
    el.statusText.textContent = `저장하지 못했습니다: ${error.message}`;
  } finally {
    el.saveRow.disabled = false;
  }
}

function saveSelectedRow(event) {
  event.preventDefault();
  if (!selectedRowNumber) return;
  const base = baseRow(selectedRowNumber);
  if (!base) return;
  if (serverMode) { saveRowToServer(base); return; }
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
  el.selVisible.addEventListener('click', () => pickScope('visible'));
  el.selPhase.addEventListener('click', () => pickScope('phase'));
  el.selScene.addEventListener('click', () => pickScope('scene'));
  el.selClear.addEventListener('click', () => { selected.clear(); renderTable(); el.statusText.textContent = '행 선택을 해제했습니다.'; });
  el.openPrompt.addEventListener('click', openPromptDialog);
  el.promptClose.addEventListener('click', closePromptDialog);
  el.promptCancel.addEventListener('click', closePromptDialog);
  document.querySelectorAll('input[name="promptAction"]').forEach((node) => node.addEventListener('change', () => updatePromptDialog(true)));
  el.promptConfirm.addEventListener('change', () => updatePromptDialog(false));
  el.promptApply.addEventListener('click', applyPromptNow);
  el.tplNew.addEventListener('click', () => openTemplateEditor(null));
  el.tplCancel.addEventListener('click', closeTemplateEditor);
  el.tplSave.addEventListener('click', saveTemplateFromEditor);
  el.tplDelete.addEventListener('click', deleteTemplateFromEditor);
  el.promptCopy.addEventListener('click', () => {
    const plan = currentPlan();
    if (el.requestPreview.value) copyText(el.requestPreview.value, el.promptCopy, plan.action === 'clear' ? '프롬프트 일괄 삭제 요청' : '프롬프트 일괄 적용 요청');
  });
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
  detectServer().then((connected) => { serverMode = connected; if (connected) applyServerMode(); });
}

init();
