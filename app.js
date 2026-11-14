const works = window.PROJECT_H_WORKS || [];
const work = window.PROJECT_H_WORK; // loader.js가 정한 현재 작품 { id, name, path }
const data = window.PROJECT_H_INDEX; // works/<작품ID>/data/index.js: 메타 + 씬 목록 (본문 행은 씬 선택 시 data/scenes/<씬ID>.js에서 불러옴)
const storageKey = `project_h_local_edits_v1:${work?.id || ''}`; // 작품마다 로컬 수정 내용을 따로 보관
const fields = [
  ['rowNumber', '원본 행'], ['id', 'ID'], ['kind', '종류'], ['speaker', '화자'],
  ['english', '영어 원문'], ['korean', '한국어 대사'], ['review', '검수'], ['prompt', '프롬프트'],
  ['recordingScript', '녹음용 대본'], ['copy', '복사'], ['sceneType', '씬 종류'], ['sceneId', '씬 ID'],
  ['sceneDetail', '씬 상세'], ['phaseId', '단계 ID'], ['phase', '단계'], ['phaseDetail', '단계 상세'],
];
const tableFields = fields.map(([key]) => key);
const multilineFields = new Set(['english', 'korean', 'recordingScript', 'prompt', 'memo', 'sceneDetail', 'phaseDetail']);
// 열 너비(px). 한국어 대사가 가장 중요해서 가장 넓게 둔다.
const COLUMN_WIDTHS = {
  rowNumber: 56, id: 130, kind: 40, speaker: 76, english: 280, korean: 400, review: 190, prompt: 260, recordingScript: 300, copy: 64, memo: 220,
  voice: 60, sceneType: 72, sceneId: 64, sceneDetail: 260, phaseId: 64, phase: 72, phaseDetail: 260,
};
// 원문 열: 기본으로 숨기고 `영어 원문 표시`를 켜면 보인다. 일본어 원문 열이 생기면 fields와 이 목록에 추가한다.
const SOURCE_COLUMNS = ['english'];
const sourceKey = 'project_h_show_source_v1';
// 표에서 뺀 열 (행 상세 패널에서는 그대로 보이고 고칠 수 있다). 지금은 없음.
const TABLE_HIDDEN_COLUMNS = [];
// 접어 두는 열: 복사 열 오른쪽의 씬·단계 정보. 머리글 맨 끝 ▶ 버튼으로 펼치고 ◀ 로 접는다 (선택은 이 브라우저에 기억)
const EXTRA_COLUMNS = ['sceneType', 'sceneId', 'sceneDetail', 'phaseId', 'phase', 'phaseDetail'];
const extraKey = 'project_h_show_extra_v1';
const EXPAND_WIDTH = 30; // 펼치기 버튼 열 너비(px)
// 표에서 약어로 보여줄 값 (원래 값은 마우스를 올리면 보이고, 상세 패널에는 원래 값 그대로)
const CELL_ABBR = { kind: { text: 'T', choice: 'C' } };
const fieldLabels = Object.fromEntries(fields);

const el = Object.fromEntries([
  'workSelect', 'saveState', 'resetLocal', 'sceneCount', 'sceneSearch', 'sceneTypeFilter',
  'sceneList', 'totalRows', 'voiceRows', 'sceneTypeLabel', 'sceneBreadcrumb', 'sceneTitle', 'sceneDetail', 'speakerLegend',
  'visibleCount', 'statsStrip', 'phaseTabs', 'lineSearch', 'speakerFilter', 'voiceFilter', 'scriptOnly',
  'missingKorean', 'lineTableBody', 'tableRows', 'statusText', 'lineTable', 'lineHead', 'showSource',
  'selectCount', 'selVisible', 'selPhase', 'selScene', 'selClear', 'copySelected', 'playAll',
  'templateList', 'promptCombined', 'sectionTabs', 'groupTabs', 'applyWrap', 'applyPrompt', 'applyNote', 'resetPrompt', 'editBanner', 'editText', 'editCancel',
  'saveNote', 'dialogueScenePanel', 'dialogueWorkspace', 'dialogueDetailPanel',
  'cgView', 'cgPath', 'cgCount', 'cgStatus', 'cgSearch', 'cgReload', 'cgGrid', 'cgEmpty',
  'cgSceneDetail', 'cgBack', 'cgSceneTitle', 'cgSceneCount', 'cgScenePrev', 'cgSceneNext', 'cgSceneOpen',
  'cgSceneImage', 'cgSceneName', 'cgScenePosition', 'cgThumbnails',
  'cgLightbox', 'cgClose', 'cgPrev', 'cgNext', 'cgLarge', 'cgCaption', 'cgPosition',
  'mobileScenes', 'mobilePrompt', 'sheetClose', 'mobileBackdrop',
  'reviewOnly', 'reviewOpen', 'reviewClear', 'reviewDialog', 'reviewHint', 'reviewText', 'reviewCopy', 'reviewApply', 'reviewClose',
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
let showExtra = (() => { try { return localStorage.getItem(extraKey) === '1'; } catch { return false; } })();
const SELECT_WIDTH = 32; // 맨 앞 선택 체크박스 열 너비(px)
let promptTemplates = [...(window.PROJECT_H_PROMPTS?.templates || [])]; // works/<작품ID>/data/prompts.js
// 저장 서버(node tools/server.js)로 열었을 때만 true: 수정이 브라우저가 아니라 데이터 파일에 바로 저장된다
let serverMode = false;
const selected = new Set(); // 선택한 대본 행의 rowNumber (현재 씬 안에서만 유지, 씬을 바꾸면 비움)
let headBox = null; // 표 머리의 `표시된 행 전체` 체크박스
// 프롬프트 분류 탭: 작품의 prompts.js 에 groups([[키, 이름], …])가 있으면 그것, 없으면 기본 탭 (tools/lib.js 의 DEFAULT_PROMPT_GROUPS 와 같음)
const DEFAULT_PROMPT_GROUPS = [['act', '행위'], ['phase', '단계'], ['arousal', '흥분도'], ['emotion', '추가 감정']];
const PROMPT_GROUPS = Array.isArray(window.PROJECT_H_PROMPTS?.groups) && window.PROJECT_H_PROMPTS.groups.length
  ? window.PROJECT_H_PROMPTS.groups : DEFAULT_PROMPT_GROUPS;
const FALLBACK_GROUP = PROMPT_GROUPS[PROMPT_GROUPS.length - 1][0]; // 분류가 없거나 모르는 템플릿은 마지막 탭
const groupOf = (item) => (PROMPT_GROUPS.some(([key]) => key === item.group) ? item.group : FALLBACK_GROUP);
// 윗줄 구분 탭(예: 일반 / 행위): prompts.js 에 sections([[키, 이름], …])가 있고 각 분류가 세 번째 값으로 소속 구분을 가지면 켜진다. 없으면 구분 탭 없이 분류 탭만 보인다.
const PROMPT_SECTIONS = Array.isArray(window.PROJECT_H_PROMPTS?.sections) && window.PROJECT_H_PROMPTS.sections.length
  ? window.PROJECT_H_PROMPTS.sections : [];
const sectionOfGroup = (groupKey) => {
  const found = PROMPT_GROUPS.find(([key]) => key === groupKey);
  return (found && PROMPT_SECTIONS.some(([key]) => key === found[2])) ? found[2] : (PROMPT_SECTIONS[0] || [''])[0];
};
const groupsOfSection = (sectionKey) => PROMPT_GROUPS.filter(([key]) => !PROMPT_SECTIONS.length || sectionOfGroup(key) === sectionKey);
let activeGroup = PROMPT_GROUPS[0][0];
let activeSection = PROMPT_SECTIONS.length ? sectionOfGroup(activeGroup) : '';
let promptTemplateIds = [];
let editingRowNumber = null; // 프롬프트 수정 중인 줄 (없으면 null) // 선택한 템플릿 ID (누른 순서). 여러 개면 내용을 이 순서대로 이어 붙인다
let activeModule = '대사집';
let cgFiles = [];
let cgLoaded = false;
let cgActiveIndex = -1;
let cgSceneKey = '';
let cgSceneIndex = 0;
let cgLightboxFiles = [];

function loadShowSource() {
  try { return localStorage.getItem(sourceKey) === '1'; } catch { return false; }
}

// 지금 화면에 보여줄 열 (원문 열은 `영어 원문 표시`가 켜져 있을 때만)
function visibleFields() {
  return tableFields.filter((key) => !TABLE_HIDDEN_COLUMNS.includes(key) && (showSource || !SOURCE_COLUMNS.includes(key))
    && (showExtra || !EXTRA_COLUMNS.includes(key)));
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
  headCells = {};
  visible.forEach((key) => {
    const th = make('th', '', fieldLabels[key]);
    th.style.width = `${COLUMN_WIDTHS[key]}px`;
    headCells[key] = th;
    el.lineHead.append(th);
  });
  // 맨 끝: 씬·단계 정보 열 펼치기/접기 버튼
  const expandTh = make('th', 'th-expand');
  expandTh.style.width = `${EXPAND_WIDTH}px`;
  const expand = make('button', 'expand-button', showExtra ? '◀' : '▶');
  expand.type = 'button';
  expand.title = showExtra ? '씬·단계 정보 열 접기' : '씬·단계 정보 열 펼치기 (씬 종류·씬 ID·씬 상세·단계 ID·단계·단계 상세)';
  expand.setAttribute('aria-label', expand.title);
  expand.setAttribute('aria-expanded', String(showExtra));
  expand.addEventListener('click', () => {
    showExtra = !showExtra;
    try { localStorage.setItem(extraKey, showExtra ? '1' : '0'); } catch { /* 이번 화면에서만 적용 */ }
    renderHead();
    renderTable();
  });
  expandTh.append(expand);
  el.lineHead.append(expandTh);
  fitColumns();
}

// 열 너비 맞추기.
// - 접힌 상태(기본): 표가 화면 폭에 꽉 차고 가로 스크롤이 생기지 않게, 좁은 열은 고정 폭 그대로 두고
//   글이 긴 열(FLEX_COLUMNS)이 남는 폭을 원래 너비 비율대로 나눠 갖는다.
// - 펼친 상태(▶): 원래 열 너비(COLUMN_WIDTHS) 그대로, 넘치면 가로 스크롤.
const FLEX_COLUMNS = ['english', 'korean', 'review', 'prompt', 'recordingScript'];
const FLEX_MIN = 90; // 글 열의 최소 폭(px)
let headCells = {};
function fitColumns() {
  const visible = Object.keys(headCells);
  if (!visible.length) return;
  const natural = SELECT_WIDTH + EXPAND_WIDTH + visible.reduce((sum, key) => sum + COLUMN_WIDTHS[key], 0);
  const wrap = el.lineTable.parentElement;
  const available = wrap ? wrap.clientWidth : 0;
  if (showExtra || !available) {
    visible.forEach((key) => { headCells[key].style.width = `${COLUMN_WIDTHS[key]}px`; });
    el.lineTable.style.width = `${natural}px`; // 고정 레이아웃: 보이는 열 너비의 합
    return;
  }
  const flex = visible.filter((key) => FLEX_COLUMNS.includes(key));
  const fixed = SELECT_WIDTH + EXPAND_WIDTH + visible.filter((key) => !flex.includes(key)).reduce((sum, key) => sum + COLUMN_WIDTHS[key], 0);
  // 남는 폭을 비율대로 나누되, 최소 폭보다 작아지는 열은 최소 폭으로 고정하고 나머지를 다시 나눈다
  let remaining = Math.max(available - fixed, flex.length * FLEX_MIN);
  let rest = [...flex];
  const flexWidth = {};
  for (let changed = true; changed && rest.length;) {
    changed = false;
    const weight = rest.reduce((sum, key) => sum + COLUMN_WIDTHS[key], 0);
    const small = rest.find((key) => (remaining * COLUMN_WIDTHS[key]) / weight < FLEX_MIN);
    if (small) { flexWidth[small] = FLEX_MIN; remaining -= FLEX_MIN; rest = rest.filter((key) => key !== small); changed = true; }
  }
  const weight = rest.reduce((sum, key) => sum + COLUMN_WIDTHS[key], 0) || 1;
  rest.forEach((key) => { flexWidth[key] = Math.floor((remaining * COLUMN_WIDTHS[key]) / weight); });
  const leftover = remaining - rest.reduce((sum, key) => sum + flexWidth[key], 0);
  if (rest.length) flexWidth[rest.includes('korean') ? 'korean' : rest[0]] += leftover; // 반올림으로 남은 몇 px
  let used = SELECT_WIDTH + EXPAND_WIDTH;
  visible.forEach((key) => {
    const width = flex.includes(key) ? flexWidth[key] : COLUMN_WIDTHS[key];
    headCells[key].style.width = `${width}px`;
    used += width;
  });
  el.lineTable.style.width = `${used}px`;
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
  return { ...row, ...(edits[row.rowNumber] || {}), review: reviewValue(row) };
}

// ---- 🚩 검수 표시 ----
// 저장 서버로 열었으면 데이터 파일(row.review)에 바로 저장한다.
// 서버 없이 열었으면(폰 등) 이 브라우저에만 남기고 `🚩 검수 목록`으로 복사해 전달한다: { 줄ID: { scene, review } }
// review 값: 빈 문자열 = 표시 없음, 글자 = 표시 + 메모, REVIEW_EMPTY = 메모 없이 표시만
const REVIEW_EMPTY = '검수 필요';
const reviewKey = `project_h_review_v1:${work?.id || ''}`;
let reviewLocal = loadReviewLocal();

function loadReviewLocal() {
  try { return JSON.parse(localStorage.getItem(reviewKey) || '{}') || {}; } catch { return {}; }
}

function persistReviewLocal() {
  try { localStorage.setItem(reviewKey, JSON.stringify(reviewLocal)); }
  catch { el.statusText.textContent = '브라우저 저장소에 쓸 수 없어 검수 표시가 유지되지 않습니다.'; }
}

function reviewValue(raw) {
  if (!serverMode && reviewLocal[raw.id]) return reviewLocal[raw.id].review || '';
  return raw.review || '';
}

const reviewNote = (value) => (value === REVIEW_EMPTY ? '' : value);

function localReviewCount() {
  return Object.values(reviewLocal).filter((item) => item.review).length;
}

// 씬에 있는 검수 표시 수: 불러온 씬은 실제 줄 기준, 아직 안 불러온 씬은 파일 통계(또는 이 브라우저의 표시 수 중 큰 값)
function sceneReviewCount(scene) {
  if (sceneCache.has(scene.id)) return sceneRows(scene.id).filter((row) => row.review).length;
  const local = Object.values(reviewLocal).filter((item) => item.scene === scene.id && item.review).length;
  return Math.max(scene.stats?.review || 0, serverMode ? 0 : local);
}

// 줄 하나의 표시/메모를 바꾼다 (서버: 파일, 아니면 이 브라우저)
async function setReview(raw, value) {
  if (serverMode) {
    const patch = [{ id: raw.id, review: value }];
    await api('/api/set', { scene: activeSceneId, patch, note: '검수 표시 (페이지)' });
    applySavedToCache(activeSceneId, patch);
  } else {
    if (value === (raw.review || '')) delete reviewLocal[raw.id];
    else reviewLocal[raw.id] = { scene: activeSceneId, review: value };
    persistReviewLocal();
  }
}

function refreshReviewUi() {
  updateSaveState();
  renderSceneList();
  renderStats();
  updateReviewButtons();
}

function updateReviewButtons() {
  el.reviewClear.classList.toggle('hidden', serverMode || !Object.keys(reviewLocal).length);
}

function makeReviewCell(row, tr) {
  const td = make('td', 'cell-review');
  td.addEventListener('click', (event) => event.stopPropagation()); // 줄 체크(프롬프트 대상)는 바뀌지 않게
  const raw = (sceneCache.get(activeSceneId) || []).find((item) => item.id === row.id) || row;
  let value = row.review || '';
  const flag = make('button', 'flag-button');
  flag.append(flagIcon());
  flag.type = 'button';
  const input = make('input', 'review-input');
  input.type = 'text';
  input.placeholder = '어디가 이상한지 메모';
  input.maxLength = 300;
  input.setAttribute('aria-label', `${row.rowNumber}행 검수 메모`);
  const paint = () => {
    const on = Boolean(value);
    flag.classList.toggle('on', on);
    flag.setAttribute('aria-pressed', String(on));
    flag.title = on ? '검수 표시 해제' : '검수 표시 (이상한 줄에 표시하고 메모)';
    input.classList.toggle('hidden', !on);
    input.value = reviewNote(value);
    tr.classList.toggle('flagged', on);
  };
  const save = async (next) => {
    const before = value;
    value = next;
    paint();
    try {
      await setReview(raw, next);
      refreshReviewUi();
    } catch (error) {
      value = before;
      paint();
      el.statusText.textContent = `검수 표시를 저장하지 못했습니다: ${error.message}`;
    }
  };
  flag.addEventListener('click', () => {
    if (!value) { save(REVIEW_EMPTY); input.focus(); return; } // save 가 먼저 입력칸을 펼친다
    if (reviewNote(value) && !window.confirm('검수 표시와 메모를 지울까요?')) return;
    save('');
  });
  const commit = () => {
    if (!value) return;
    const next = input.value.trim() || REVIEW_EMPTY;
    if (next !== value) save(next);
  };
  input.addEventListener('change', commit);
  input.addEventListener('keydown', (event) => { if (event.key === 'Enter') { event.preventDefault(); input.blur(); } });
  td.append(flag, input);
  paint();
  return td;
}

// 🚩 검수 목록: 표시한 줄을 JSON 줄 목록으로 모아 보여 준다 (AI에게 그대로 전달 / 저장 서버에서는 붙여 넣어 반영)
async function openReviewDialog() {
  el.reviewHint.textContent = '목록을 만드는 중…';
  el.reviewText.value = '';
  el.reviewApply.classList.toggle('hidden', !serverMode);
  if (!el.reviewDialog.open) el.reviewDialog.showModal();
  const ids = new Set(scenes.filter((scene) => (scene.stats?.review || 0) > 0 || sceneCache.has(scene.id)).map((scene) => scene.id));
  Object.values(reviewLocal).forEach((item) => { if (item.scene && sceneById.has(item.scene)) ids.add(item.scene); });
  const items = [];
  for (const sceneId of ids) {
    try { await loadScene(sceneId); } catch { continue; }
    sceneRows(sceneId).filter((row) => row.review).forEach((row) => {
      items.push({
        scene: sceneId, id: row.id, rowNumber: row.rowNumber, speaker: row.speaker,
        english: row.english, korean: row.korean, recordingScript: row.recordingScript, review: reviewNote(row.review),
      });
    });
  }
  items.sort((a, b) => scenes.findIndex((s) => s.id === a.scene) - scenes.findIndex((s) => s.id === b.scene) || a.rowNumber - b.rowNumber);
  el.reviewText.value = items.length ? `[\n${items.map((item) => JSON.stringify(item)).join(',\n')}\n]` : '';
  el.reviewHint.textContent = items.length
    ? `검수 표시 ${items.length}줄. 복사해서 AI에게 전달하세요 (review 는 메모, 비어 있으면 메모 없이 표시만).`
    : '검수 표시한 줄이 없습니다.';
  if (serverMode) el.reviewHint.textContent += ' 폰에서 복사한 목록은 아래 칸에 붙여 넣고 `붙여 넣은 목록 반영`을 누르세요.';
  el.reviewCopy.disabled = !items.length;
}

async function copyReviewText() {
  const text = el.reviewText.value;
  if (!text.trim()) return;
  let ok = false;
  try { await navigator.clipboard.writeText(text); ok = true; } catch { /* 아래 방법으로 다시 시도 */ }
  if (!ok) { el.reviewText.focus(); el.reviewText.select(); try { ok = document.execCommand('copy'); } catch { ok = false; } }
  el.reviewCopy.textContent = ok ? '복사됨 ✓' : '길게 눌러 직접 복사';
  window.setTimeout(() => { el.reviewCopy.textContent = '복사'; }, 1800);
}

// 붙여 넣은 목록(JSON)의 표시·메모를 데이터 파일에 저장 (저장 서버에서만)
async function applyReviewText() {
  if (!serverMode) return;
  const text = el.reviewText.value;
  let list;
  try { list = JSON.parse(text.slice(text.indexOf('['), text.lastIndexOf(']') + 1)); } catch { list = null; }
  if (!Array.isArray(list) || !list.length) { el.reviewHint.textContent = '목록을 읽을 수 없습니다. 복사한 내용을 그대로 붙여 넣으세요.'; return; }
  const byScene = new Map();
  for (const item of list) {
    if (!item || typeof item.scene !== 'string' || typeof item.id !== 'string' || typeof item.review !== 'string') {
      el.reviewHint.textContent = '목록 형식이 맞지 않습니다 (scene, id, review 필요).';
      return;
    }
    if (!byScene.has(item.scene)) byScene.set(item.scene, []);
    byScene.get(item.scene).push({ id: item.id, review: item.review.trim() || REVIEW_EMPTY });
  }
  let changed = 0;
  const errors = [];
  for (const [sceneId, patch] of byScene) {
    try {
      const summary = await api('/api/set', { scene: sceneId, patch, note: '검수 표시 가져오기 (페이지)' });
      applySavedToCache(sceneId, patch);
      changed += summary.changedRows;
    } catch (error) { errors.push(`${sceneId}: ${error.message}`); }
  }
  refreshReviewUi();
  renderTable();
  el.reviewHint.textContent = errors.length ? `일부만 반영됨 (${changed}줄). ${errors.join(' / ')}` : `${changed}줄에 검수 표시를 반영했습니다.`;
}

function clearReviewLocal() {
  const count = Object.keys(reviewLocal).length;
  if (!count || !window.confirm(`이 브라우저에 남긴 검수 표시 ${count}건을 모두 지울까요? (목록을 이미 전달했을 때 사용)`)) return;
  reviewLocal = {};
  persistReviewLocal();
  refreshReviewUi();
  renderTable();
  el.statusText.textContent = '이 브라우저의 검수 표시를 비웠습니다.';
}

// 검수 표시 아이콘 (이모지 🚩 대신 SVG: 글꼴·OS마다 모양이 달라지지 않게). 색은 글자색(currentColor)을 따른다.
const FLAG_SVG = '<svg class="flag-icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false">'
  + '<path d="M3.5 14.5V1.8" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>'
  + '<path d="M4.3 2.3h8.4l-2 3.3 2 3.3H4.3z" fill="currentColor"/></svg>';
function flagIcon() {
  const box = document.createElement('span');
  box.innerHTML = FLAG_SVG; // 고정 문자열이라 안전
  return box.firstChild;
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
    // 새가족: 주인공은 흐리게, 여주인공은 진한 색·짙은 배경으로 눈에 띄게
    '진선후': ['#9aa3ad', '#fbfbfc'],
    '진소영': ['#3346c4', '#dfe5ff'],
    '임신혜': ['#c2410c', '#ffe6d5'],
    '진미소': ['#d0287a', '#ffdcee'],
    '윤서아': ['#0f7f74', '#d5f5ef'],
    '김선하': ['#7a35c2', '#ece0ff'],
    '작성 메모': ['#8a7a2c', '#fbf7e3'],
  };
  if (fixed[speaker]) return fixed[speaker];
  let hash = 0;
  for (const char of speaker || '') hash = ((hash * 31) + char.codePointAt(0)) >>> 0;
  const hue = hash % 360;
  // 단역은 채도를 낮춰 여주인공보다 덜 띄게
  return [`hsl(${hue} 30% 45%)`, `hsl(${hue} 30% 97%)`];
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
  const stats = { total: rows.length, korean: 0, voice: 0, script: 0, review: 0 };
  rows.forEach((row) => {
    if (row.review) stats.review += 1;
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
  const flags = serverMode ? 0 : localReviewCount();
  el.saveState.textContent = count ? `로컬 수정 ${count}건` : (flags ? `검수 표시 ${flags}건 (이 브라우저)` : (serverMode ? '저장 서버 연결됨' : '원본 데이터'));
  el.saveState.classList.toggle('changed', count > 0 || flags > 0);
  el.saveState.classList.toggle('connected', serverMode && count === 0);
}

const SPEAKER_SET = '\u0000화자있음';
const SPEAKER_UNSET = '\u0000화자없음';

function populateFilters() {
  [...new Set(scenes.map((scene) => scene.type))].forEach((value) => {
    const option = make('option', '', value);
    option.value = value;
    el.sceneTypeFilter.append(option);
  });
  // 화자가 정해진 줄 / 비어 있는 줄을 한 번에 고르는 항목 (빈 화자는 목록에 따로 넣지 않음: 값이 ''이면 '전체'와 구분이 안 됨)
  const blank = data.speakers.find(({ name }) => !name)?.count || 0;
  const named = data.speakers.reduce((sum, { name, count }) => sum + (name ? count : 0), 0);
  [[SPEAKER_SET, `화자 있음 (${named})`], [SPEAKER_UNSET, `화자 없음 (${blank})`]].forEach(([value, label]) => {
    const option = make('option', '', label);
    option.value = value;
    el.speakerFilter.append(option);
  });
  data.speakers.forEach(({ name, count }) => {
    if (!name) return;
    const option = make('option', '', `${name} (${count})`);
    option.value = name;
    el.speakerFilter.append(option);
  });
}

// 대사 ID로 씬 찾기: `파일.ks#22` → `파일.ks`, `1011000042_1` → `1011000042` (tools/lib.js 의 idStem 과 같은 규칙)
const idStem = (id) => String(id).trim().replace(/(#\d+|_\d+)$/, '').toLowerCase();
function sceneHasId(scene, query) {
  if (!query || !Array.isArray(scene.idKeys)) return false;
  const stem = idStem(query);
  return scene.idKeys.some((key) => key.toLowerCase() === stem);
}

function renderSceneList() {
  const query = el.sceneSearch.value.trim().toLowerCase();
  const type = el.sceneTypeFilter.value;
  const visible = scenes.filter((scene) => {
    const text = `${scene.id} ${scene.type} ${scene.detail}`.toLowerCase();
    return (!query || text.includes(query) || sceneHasId(scene, query)) && (!type || scene.type === type);
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
    const flagged = sceneReviewCount(scene);
    if (flagged) {
      const badge = make('b', 'scene-flag', String(flagged));
      badge.prepend(flagIcon());
      badge.title = `검수 표시 ${flagged}줄`;
      meta.append(badge);
    }
    meta.append(make('em', '', String(scene.count)), bar);
    button.append(main, meta);
    button.addEventListener('click', () => {
      // 대사 ID로 찾아 들어온 경우: 표 검색에도 그 ID를 넣어 해당 줄만 바로 보이게
      if (sceneHasId(scene, query)) el.lineSearch.value = el.sceneSearch.value.trim();
      selectScene(scene.id);
    });
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
    ['검수 표시', stats.review.toLocaleString(), null, true],
  ];
  items.forEach(([label, value, progress, flag]) => {
    const card = make('div', 'stat-card');
    const labelNode = make('span', 'stat-label', label);
    if (flag) labelNode.prepend(flagIcon());
    card.append(labelNode, make('strong', 'stat-value', value));
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

// ---- 모바일: 씬 목록 서랍 / 프롬프트 시트 (화면이 좁을 때만 CSS로 보임) ----
function closeMobilePanels() {
  document.body.classList.remove('scene-open', 'prompt-open');
}

function toggleMobilePanel(name) {
  const open = !document.body.classList.contains(`${name}-open`);
  closeMobilePanels();
  if (open) document.body.classList.add(`${name}-open`);
}

async function selectScene(sceneId) {
  const token = ++selectToken;
  activeSceneId = sceneId;
  closeMobilePanels();
  el.mobileScenes.textContent = `☰ ${sceneId}`;
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
    if (speaker === SPEAKER_SET) { if (!row.speaker) return false; }
    else if (speaker === SPEAKER_UNSET) { if (row.speaker) return false; }
    else if (speaker && row.speaker !== speaker) return false;
    if (voice === 'checked' && !row.voice) return false;
    if (voice === 'empty' && row.voice) return false;
    if (el.scriptOnly.checked && !row.recordingScript) return false;
    if (el.missingKorean.checked && row.korean) return false;
    if (el.reviewOnly.checked && !row.review) return false;
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
    td.colSpan = visibleFields().length + 2; // 선택 칸 + 보이는 열 + 펼치기 버튼 칸
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
        if (field === 'review') { tr.append(makeReviewCell(row, tr)); return; }
        const td = make('td', `cell-${field}`, field === 'speaker' ? '' : (abbr || raw));
        if (abbr) td.title = raw;
        if (field === 'speaker') td.append(make('span', 'speaker-badge', row.speaker));
        if (multilineFields.has(field)) td.classList.add('cell-wrap');
        tr.append(td);
      });
      tr.append(make('td', 'cell-expand')); // 머리글의 펼치기 버튼 칸과 줄 맞춤
      tr.addEventListener('click', () => togglePick(row, tr)); // 줄 어디를 눌러도 체크를 켜고 끈다
      fragment.append(tr);
    });
  }
  el.lineTableBody.append(fragment);
  fitColumns(); // 줄 수가 바뀌면 세로 스크롤바가 생기거나 없어져서 쓸 수 있는 폭이 달라진다
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
// 한국어 더빙은 Project_H/voice/<음성ID>.wav, 일본어 원본은 저장 서버의 /media/voice-ja/<음성ID>.ogg.
// 둘 다 사용자가 재생 버튼을 누를 때만 재생한다.
const VOICES = window.PROJECT_H_VOICES || {};
// 작품마다 음성 폴더가 다를 수 있음: work.json 의 voiceDir (없으면 Project_H/voice/)
const VOICE_DIR = (window.PROJECT_H_WORK && window.PROJECT_H_WORK.voiceDir) || 'voice/';
const ORIGINAL_VOICE_DIR = '/media/voice-ja/';
const player = new Audio();

let playQueue = null; // 연속 재생: { rows, index } (없으면 한 줄 재생 또는 정지 상태)
let playingRow = null;
let playingSource = 'ko';

function rowElement(rowNumber) {
  return el.lineTableBody.querySelector(`tr[data-row="${rowNumber}"]`);
}

function markPlaying(rowNumber, on, source = playingSource) {
  const tr = rowElement(rowNumber);
  if (!tr) return;
  tr.classList.toggle('now-playing', on);
  const button = tr.querySelector(`.play-button-${source}`);
  if (button) {
    const label = source === 'ja' ? '일' : '한';
    button.textContent = `${label} ${on ? '■' : '▶'}`;
    button.classList.toggle('playing', on);
  }
}

function stopVoice() {
  player.pause();
  if (playingRow !== null) markPlaying(playingRow, false, playingSource);
  playingRow = null;
  playingSource = 'ko';
  if (playQueue) { playQueue = null; updatePlayAll(); }
}

// 한 줄 재생 (연속 재생 중이면 다음 줄로 이어진다). 소리 확인용 자동 재생은 하지 않는다 — 사용자가 누를 때만 재생
function startRow(row, source = 'ko') {
  const voiceId = VOICES[row.id];
  if (playingRow !== null) markPlaying(playingRow, false, playingSource);
  playingRow = row.rowNumber;
  playingSource = source;
  markPlaying(row.rowNumber, true, source);
  const tr = rowElement(row.rowNumber);
  if (tr && playQueue) tr.scrollIntoView({ block: 'nearest' });
  const isOriginal = source === 'ja';
  const file = isOriginal
    ? `${ORIGINAL_VOICE_DIR}${encodeURIComponent(voiceId)}.ogg`
    : `${VOICE_DIR}${encodeURIComponent(voiceId)}.wav`;
  player.src = file;
  player.play().then(() => {
    el.statusText.textContent = playQueue
      ? `연속 재생 ${playQueue.index + 1}/${playQueue.rows.length} · ${row.rowNumber}행 (${voiceId})`
      : `${row.rowNumber}행 ${isOriginal ? '일본어 원본' : '한국어 더빙'} 재생: ${voiceId}`;
  }).catch(() => {
    if (playQueue) { nextInQueue(); return; }
    stopVoice();
    el.statusText.textContent = `${row.rowNumber}행 음성 파일이 없습니다: ${file}`;
  });
  updatePlayAll();
}

function playVoice(row, button, source = 'ko') {
  if (playingRow === row.rowNumber && playingSource === source && !playQueue) { stopVoice(); return; } // 재생 중에 다시 누르면 정지
  stopVoice();
  startRow(row, source);
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
    if (await voiceExists(VOICES[row.id], 'ko')) { if (queue === playQueue) startRow(row, 'ko'); return; }
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
function voiceExists(voiceId, source = 'ko') {
  const key = `${source}:${voiceId}`;
  const file = source === 'ja'
    ? `${ORIGINAL_VOICE_DIR}${encodeURIComponent(voiceId)}.ogg`
    : `${VOICE_DIR}${encodeURIComponent(voiceId)}.wav`;
  if (!voiceChecks.has(key)) {
    voiceChecks.set(key, fetch(file, { method: 'HEAD', cache: 'no-store' })
      .then((response) => response.ok)
      .catch(() => false));
  }
  return voiceChecks.get(key);
}

function makeCopyCell(row) {
  const td = make('td', 'cell-copy');
  td.addEventListener('click', (event) => event.stopPropagation()); // 복사·재생해도 줄 체크는 바뀌지 않게
  if (VOICES[row.id]) {
    const sources = [['ko', '한', '한국어 더빙'], ['ja', '일', '일본어 원본']]
      .filter(([source]) => source !== 'ja' || work?.originalVoice !== false); // 일본어 원본이 없는 작품은 `일 ▶` 없음
    sources.forEach(([source, shortLabel, label]) => {
      const isPlaying = row.rowNumber === playingRow && playingSource === source;
      const play = make('button', `copy-button play-button play-button-${source}${isPlaying ? ' playing' : ''}`, `${shortLabel} ${isPlaying ? '■' : '▶'}`);
      play.type = 'button';
      play.title = `${label} 재생 (${VOICES[row.id]})`;
      play.addEventListener('click', () => playVoice(row, play, source));
      voiceExists(VOICES[row.id], source).then((ok) => {
        if (ok) return;
        play.classList.add('missing');
        play.disabled = true;
        play.title = `${label} 파일 없음 (${VOICES[row.id]})`;
      });
      td.append(play);
    });
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
  if (first) { activeGroup = groupOf(first); if (PROMPT_SECTIONS.length) activeSection = sectionOfGroup(activeGroup); }
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
  el.mobilePrompt.textContent = selected.size ? `프롬프트 (${selected.size})` : '프롬프트';
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
  // 구분 탭 (일반 / 행위): 누르면 그 구분의 분류 탭만 보이고, 켜 둔 템플릿은 구분을 넘어 유지된다. 숫자 = 그 구분에서 켠 템플릿 수
  el.sectionTabs.classList.toggle('hidden', !PROMPT_SECTIONS.length);
  el.sectionTabs.replaceChildren();
  PROMPT_SECTIONS.forEach(([sectionKey, sectionLabel]) => {
    const picked = promptTemplateIds.filter((id) => sectionOfGroup(groupOf(promptTemplates.find((item) => item.id === id) || {})) === sectionKey).length;
    const tab = make('button', 'section-tab', sectionLabel);
    tab.type = 'button';
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-selected', String(sectionKey === activeSection));
    if (picked) tab.append(make('b', 'group-count', String(picked)));
    tab.addEventListener('click', () => {
      activeSection = sectionKey;
      activeGroup = (groupsOfSection(sectionKey)[0] || PROMPT_GROUPS[0])[0];
      renderTemplateList();
    });
    el.sectionTabs.append(tab);
  });
  el.groupTabs.replaceChildren();
  const visibleGroups = PROMPT_SECTIONS.length ? groupsOfSection(activeSection) : PROMPT_GROUPS;
  if (PROMPT_SECTIONS.length && !visibleGroups.some(([key]) => key === activeGroup)) activeGroup = (visibleGroups[0] || PROMPT_GROUPS[0])[0];
  visibleGroups.forEach(([key, label]) => {
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

// ---- CG 갤러리 ----
function filteredCgFiles() {
  const query = (el.cgSearch.value || '').trim().toLowerCase();
  return query ? cgFiles.filter((file) => file.name.toLowerCase().includes(query)) : cgFiles;
}

function cgKey(file) {
  return file.name.match(/^(ev\d+)/i)?.[1].toLowerCase() || '기타';
}

function groupedCgFiles() {
  const groups = new Map();
  cgFiles.forEach((file) => {
    const key = cgKey(file);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(file);
  });
  return [...groups.entries()].map(([key, files]) => ({ key, files }));
}

function filteredCgGroups() {
  const query = (el.cgSearch.value || '').trim().toLowerCase();
  const groups = groupedCgFiles();
  return query ? groups.filter((group) => group.key.includes(query) || group.files.some((file) => file.name.toLowerCase().includes(query))) : groups;
}

function renderCg() {
  const groups = filteredCgGroups();
  cgSceneKey = '';
  el.cgSceneDetail.classList.add('hidden');
  el.cgGrid.classList.remove('hidden');
  el.cgGrid.replaceChildren();
  const fragment = document.createDocumentFragment();
  groups.forEach((group) => {
    const file = group.files[0];
    const card = make('button', 'cg-scene-card');
    card.type = 'button';
    card.title = `${group.key.toUpperCase()} · ${group.files.length}장`;
    const thumb = make('span', 'cg-scene-thumb');
    const img = make('img');
    img.src = file.url;
    img.alt = `${group.key.toUpperCase()} 대표 이미지`;
    img.loading = 'lazy';
    img.decoding = 'async';
    thumb.append(img, make('b', '', `${group.files.length}장`));
    const label = make('span', 'cg-scene-label');
    label.append(make('strong', '', group.key.toUpperCase()), make('small', '', `${group.files[0].name} – ${group.files[group.files.length - 1].name}`));
    card.append(thumb, label);
    card.addEventListener('click', () => openCgScene(group.key));
    fragment.append(card);
  });
  el.cgGrid.append(fragment);
  el.cgCount.textContent = `${groups.length.toLocaleString()}씬`;
  el.cgStatus.textContent = cgLoaded ? `전체 ${groupedCgFiles().length.toLocaleString()}씬 · ${cgFiles.length.toLocaleString()}장` : '연결 대기';
  el.cgEmpty.classList.toggle('hidden', groups.length > 0);
  if (!groups.length && cgLoaded) el.cgEmpty.textContent = cgFiles.length ? '검색 결과가 없습니다.' : 'CG 이미지가 없습니다.';
}

function activeCgSceneFiles() {
  return groupedCgFiles().find((group) => group.key === cgSceneKey)?.files || [];
}

function showCgSceneImage(index) {
  const files = activeCgSceneFiles();
  if (!files.length) return;
  cgSceneIndex = (index + files.length) % files.length;
  const file = files[cgSceneIndex];
  el.cgSceneImage.src = file.url;
  el.cgSceneImage.alt = file.name;
  el.cgSceneName.textContent = file.name;
  el.cgScenePosition.textContent = `${cgSceneIndex + 1} / ${files.length}`;
  el.cgScenePrev.disabled = files.length < 2;
  el.cgSceneNext.disabled = files.length < 2;
  el.cgThumbnails.querySelectorAll('button').forEach((button, i) => button.classList.toggle('active', i === cgSceneIndex));
  el.cgThumbnails.querySelector(`button:nth-child(${cgSceneIndex + 1})`)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

function openCgScene(key) {
  const group = groupedCgFiles().find((item) => item.key === key);
  if (!group) return;
  cgSceneKey = key;
  cgSceneIndex = 0;
  el.cgGrid.classList.add('hidden');
  el.cgEmpty.classList.add('hidden');
  el.cgSceneDetail.classList.remove('hidden');
  el.cgSceneTitle.textContent = key.toUpperCase();
  el.cgSceneCount.textContent = `${group.files.length}장`;
  el.cgThumbnails.replaceChildren();
  const fragment = document.createDocumentFragment();
  group.files.forEach((file, index) => {
    const button = make('button', 'cg-thumb');
    button.type = 'button';
    button.title = file.name;
    const img = make('img');
    img.src = file.url;
    img.alt = file.name;
    img.loading = 'lazy';
    button.append(img, make('span', '', file.name));
    button.addEventListener('click', () => showCgSceneImage(index));
    fragment.append(button);
  });
  el.cgThumbnails.append(fragment);
  showCgSceneImage(0);
  el.cgSceneDetail.scrollTop = 0;
  el.statusText.textContent = `${key.toUpperCase()} CG ${group.files.length}장을 표시합니다.`;
}

async function loadCg(force = false) {
  if (cgLoaded && !force) { renderCg(); return; }
  el.cgStatus.textContent = '불러오는 중...';
  el.cgEmpty.classList.add('hidden');
  try {
    const response = await fetch(`/api/cg?work=${encodeURIComponent(work?.id || '')}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`서버 오류 (${response.status})`);
    const json = await response.json();
    if (!json.available) {
      cgFiles = [];
      cgLoaded = true;
      el.cgPath.textContent = `CG 폴더를 찾지 못했습니다: ${json.path || '-'}`;
      el.cgEmpty.textContent = 'CG 폴더가 연결되지 않았습니다. 저장 서버를 확인하세요.';
      renderCg();
      el.statusText.textContent = 'CG 폴더를 찾지 못했습니다.';
      return;
    }
    cgFiles = Array.isArray(json.files) ? json.files : [];
    cgLoaded = true;
    el.cgPath.textContent = json.path;
    renderCg();
    el.statusText.textContent = `CG ${cgFiles.length.toLocaleString()}장을 연결했습니다.`;
  } catch (error) {
    cgLoaded = false;
    cgFiles = [];
    el.cgCount.textContent = '0장';
    el.cgStatus.textContent = '연결 실패';
    el.cgPath.textContent = 'CG는 저장 서버로 페이지를 열었을 때 사용할 수 있습니다.';
    el.cgGrid.replaceChildren();
    el.cgEmpty.textContent = `CG를 불러오지 못했습니다: ${error.message}`;
    el.cgEmpty.classList.remove('hidden');
    el.statusText.textContent = 'CG 연결에 실패했습니다. 저장 서버로 페이지를 열어 주세요.';
  }
}

function openCg(name, sourceFiles = filteredCgFiles()) {
  const files = sourceFiles;
  const index = files.findIndex((file) => file.name === name);
  if (index < 0) return;
  cgLightboxFiles = files;
  cgActiveIndex = index;
  const file = files[index];
  el.cgLarge.src = file.url;
  el.cgLarge.alt = file.name;
  el.cgCaption.textContent = file.name;
  el.cgPosition.textContent = `${index + 1} / ${files.length}`;
  el.cgPrev.disabled = files.length < 2;
  el.cgNext.disabled = files.length < 2;
  el.cgLightbox.classList.remove('hidden');
  document.body.classList.add('lightbox-open');
  el.cgClose.focus();
}

function closeCg() {
  el.cgLightbox.classList.add('hidden');
  el.cgLarge.removeAttribute('src');
  document.body.classList.remove('lightbox-open');
  cgActiveIndex = -1;
  cgLightboxFiles = [];
}

function moveCg(delta) {
  const files = cgLightboxFiles;
  if (!files.length || cgActiveIndex < 0) return;
  cgActiveIndex = (cgActiveIndex + delta + files.length) % files.length;
  const file = files[cgActiveIndex];
  el.cgLarge.src = file.url;
  el.cgLarge.alt = file.name;
  el.cgCaption.textContent = file.name;
  el.cgPosition.textContent = `${cgActiveIndex + 1} / ${files.length}`;
}

function setModule(module) {
  if (module === 'CG' && work?.cg === false) module = '대사집'; // CG가 없는 작품
  activeModule = module;
  closeMobilePanels();
  const dialogue = module === '대사집';
  el.dialogueScenePanel.classList.toggle('hidden', !dialogue);
  el.dialogueWorkspace.classList.toggle('hidden', !dialogue);
  el.dialogueDetailPanel.classList.toggle('hidden', !dialogue);
  el.cgView.classList.toggle('hidden', dialogue);
  document.querySelectorAll('.module-button').forEach((item) => item.classList.toggle('active', item.dataset.module === module));
  if (dialogue) el.statusText.textContent = '대사집 화면입니다.';
  else loadCg();
}

function bindEvents() {
  [el.sceneSearch, el.sceneTypeFilter].forEach((node) => node.addEventListener('input', renderSceneList));
  [el.lineSearch, el.speakerFilter, el.voiceFilter, el.scriptOnly, el.missingKorean, el.reviewOnly].forEach((node) => node.addEventListener('input', renderTable));
  el.reviewOpen.addEventListener('click', openReviewDialog);
  el.reviewClear.addEventListener('click', clearReviewLocal);
  el.reviewCopy.addEventListener('click', copyReviewText);
  el.reviewApply.addEventListener('click', applyReviewText);
  el.reviewClose.addEventListener('click', () => el.reviewDialog.close());
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
  el.mobileScenes.addEventListener('click', () => toggleMobilePanel('scene'));
  el.mobilePrompt.addEventListener('click', () => toggleMobilePanel('prompt'));
  el.sheetClose.addEventListener('click', closeMobilePanels);
  el.mobileBackdrop.addEventListener('click', closeMobilePanels);
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeMobilePanels(); });
  el.cgSearch.addEventListener('input', renderCg);
  el.cgReload.addEventListener('click', () => loadCg(true));
  el.cgBack.addEventListener('click', renderCg);
  el.cgScenePrev.addEventListener('click', () => showCgSceneImage(cgSceneIndex - 1));
  el.cgSceneNext.addEventListener('click', () => showCgSceneImage(cgSceneIndex + 1));
  el.cgSceneOpen.addEventListener('click', () => {
    const files = activeCgSceneFiles();
    if (files[cgSceneIndex]) openCg(files[cgSceneIndex].name, files);
  });
  el.cgClose.addEventListener('click', closeCg);
  el.cgPrev.addEventListener('click', () => moveCg(-1));
  el.cgNext.addEventListener('click', () => moveCg(1));
  el.cgLightbox.addEventListener('click', (event) => { if (event.target === el.cgLightbox) closeCg(); });
  document.addEventListener('keydown', (event) => {
    if (el.cgLightbox.classList.contains('hidden')) return;
    if (event.key === 'Escape') closeCg();
    else if (event.key === 'ArrowLeft') moveCg(-1);
    else if (event.key === 'ArrowRight') moveCg(1);
  });
  document.querySelectorAll('.module-button').forEach((button) => button.addEventListener('click', () => setModule(button.dataset.module)));
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
  document.title = `${work.name || work.id} · 더빙 작업실`;
  el.totalRows.textContent = `${data.meta.rowCount.toLocaleString()}개 행`;
  el.voiceRows.textContent = `음성 ${data.meta.voiceCheckedCount.toLocaleString()}`;
  el.statusText.textContent = `${data.meta.sceneCount}개 씬 데이터 연결 완료`;
  populateFilters();
  // CG가 없는 작품(work.json "cg": false)은 왼쪽 CG 메뉴를 숨긴다
  if (work.cg === false) document.querySelectorAll('.module-button[data-module="CG"]').forEach((node) => node.classList.add('hidden'));
  // 작품별 화자 필터 기본값 (work.json 의 speakerFilter: "set" = 화자 있음만, "unset" = 화자 없음만)
  const startSpeaker = { set: SPEAKER_SET, unset: SPEAKER_UNSET }[work.speakerFilter];
  if (startSpeaker) el.speakerFilter.value = startSpeaker;
  el.showSource.checked = showSource;
  renderHead();
  // 창 크기·패널이 바뀌면 열 너비를 다시 맞춘다 (접힌 상태에서 표를 화면 폭에 꽉 차게)
  if (window.ResizeObserver && el.lineTable.parentElement) {
    let pending = 0;
    new ResizeObserver(() => { cancelAnimationFrame(pending); pending = requestAnimationFrame(fitColumns); }).observe(el.lineTable.parentElement);
  } else window.addEventListener('resize', fitColumns);
  bindEvents();
  renderTemplateList();
  updateSaveState();
  selectScene(activeSceneId);
  updateReviewButtons();
  detectServer().then((connected) => {
    serverMode = connected;
    if (connected) { applyServerMode(); renderSceneList(); renderStats(); if (sceneCache.has(activeSceneId)) renderTable(); }
    updateReviewButtons();
    renderTemplateList();
    renderCombined();
  });
}

init();
