const data = window.PROJECT_H_DATA;
const storageKey = 'project_h_local_edits_v1';
const fields = [
  ['rowNumber', '원본 행'], ['id', 'ID'], ['kind', '종류'], ['speaker', '화자'],
  ['english', '영어 원문'], ['korean', '한국어 대사'], ['recordingScript', '녹음용 대본'],
  ['memo', '메모'], ['voice', '음성'], ['sceneType', '씬 종류'], ['sceneId', '씬 ID'],
  ['sceneDetail', '씬 상세'], ['phaseId', '단계 ID'], ['phase', '단계'], ['phaseDetail', '단계 상세'],
];
const tableFields = fields.map(([key]) => key);
const multilineFields = new Set(['english', 'korean', 'recordingScript', 'memo', 'sceneDetail', 'phaseDetail']);

const el = Object.fromEntries([
  'sourceInfo', 'saveState', 'resetLocal', 'sceneCount', 'sceneSearch', 'sceneTypeFilter', 'sceneList',
  'totalRows', 'voiceRows', 'sceneTypeLabel', 'sceneBreadcrumb', 'sceneTitle', 'sceneDetail', 'visibleCount',
  'phaseTabs', 'lineSearch', 'speakerFilter', 'voiceFilter', 'scriptOnly', 'missingKorean', 'lineTableBody',
  'tableRows', 'selectedRowLabel', 'detailEmpty', 'detailForm', 'detailGrid', 'restoreRow', 'statusText',
].map((id) => [id, document.getElementById(id)]));

let edits = loadEdits();
let activeSceneId = data.scenes[0]?.id || '';
let activePhase = '';
let selectedRowNumber = null;

function loadEdits() {
  try { return JSON.parse(localStorage.getItem(storageKey) || '{}'); }
  catch { return {}; }
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

function sceneRows(sceneId = activeSceneId) {
  return data.rows.filter((row) => row.sceneId === sceneId).map(currentRow);
}

function updateSaveState() {
  const count = Object.keys(edits).length;
  el.saveState.textContent = count ? `로컬 수정 ${count}건` : '원본 데이터';
  el.saveState.classList.toggle('changed', count > 0);
}

function populateFilters() {
  const sceneTypes = [...new Set(data.scenes.map((scene) => scene.type))];
  sceneTypes.forEach((value) => {
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
  const scenes = data.scenes.filter((scene) => {
    const text = `${scene.id} ${scene.type} ${scene.detail}`.toLowerCase();
    return (!query || text.includes(query)) && (!type || scene.type === type);
  });
  el.sceneList.replaceChildren();
  const fragment = document.createDocumentFragment();
  scenes.forEach((scene) => {
    const button = make('button', `scene-item${scene.id === activeSceneId ? ' active' : ''}`);
    button.type = 'button';
    button.dataset.scene = scene.id;
    const main = make('span', 'scene-main');
    main.append(make('strong', '', scene.id), make('small', '', scene.type));
    button.append(main, make('em', '', String(scene.count)));
    button.addEventListener('click', () => selectScene(scene.id));
    fragment.append(button);
  });
  el.sceneList.append(fragment);
  el.sceneCount.textContent = `${scenes.length}/${data.scenes.length}`;
}

function selectScene(sceneId) {
  activeSceneId = sceneId;
  activePhase = '';
  selectedRowNumber = null;
  const scene = data.scenes.find((item) => item.id === sceneId);
  el.sceneTypeLabel.textContent = scene?.type || '-';
  el.sceneBreadcrumb.textContent = sceneId;
  el.sceneTitle.textContent = `${sceneId} 대사 편집`;
  el.sceneDetail.textContent = scene?.detail || '';
  renderSceneList();
  renderPhases(scene);
  renderTable();
  clearDetail();
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
    return tableFields.some((field) => String(row[field] ?? '').toLowerCase().includes(query));
  });
}

function renderTable() {
  const rows = filteredRows();
  el.lineTableBody.replaceChildren();
  const fragment = document.createDocumentFragment();
  if (!rows.length) {
    const tr = make('tr', 'empty-row');
    const td = make('td', '', '조건에 맞는 데이터가 없습니다.');
    td.colSpan = tableFields.length;
    tr.append(td);
    fragment.append(tr);
  } else {
    rows.forEach((row) => {
      const tr = make('tr', selectedRowNumber === row.rowNumber ? 'selected' : '');
      tr.dataset.row = row.rowNumber;
      if (edits[row.rowNumber]) tr.classList.add('modified');
      tableFields.forEach((field) => {
        const td = make('td', `cell-${field}`, row[field] || '');
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
  const base = data.rows.find((row) => row.rowNumber === Number(rowNumber));
  return base ? currentRow(base) : null;
}

function selectRow(rowNumber) {
  selectedRowNumber = Number(rowNumber);
  const row = findRow(selectedRowNumber);
  if (!row) return;
  el.detailEmpty.classList.add('hidden');
  el.detailForm.classList.remove('hidden');
  el.selectedRowLabel.textContent = `${row.rowNumber}행`;
  el.detailGrid.replaceChildren();
  fields.forEach(([key, label]) => {
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

function clearDetail() {
  el.detailEmpty.classList.remove('hidden');
  el.detailForm.classList.add('hidden');
  el.selectedRowLabel.textContent = '선택 없음';
  el.detailGrid.replaceChildren();
}

function saveSelectedRow(event) {
  event.preventDefault();
  if (!selectedRowNumber) return;
  const values = Object.fromEntries(new FormData(el.detailForm).entries());
  delete values.rowNumber;
  edits[selectedRowNumber] = values;
  localStorage.setItem(storageKey, JSON.stringify(edits));
  updateSaveState();
  renderTable();
  el.statusText.textContent = `${selectedRowNumber}행을 브라우저에 저장했습니다.`;
}

function restoreSelectedRow() {
  if (!selectedRowNumber) return;
  delete edits[selectedRowNumber];
  localStorage.setItem(storageKey, JSON.stringify(edits));
  updateSaveState();
  selectRow(selectedRowNumber);
  el.statusText.textContent = `${selectedRowNumber}행을 원본으로 복원했습니다.`;
}

function resetAllEdits() {
  if (!Object.keys(edits).length) return;
  if (!window.confirm('브라우저에 저장한 모든 수정 내용을 삭제하시겠습니까?')) return;
  edits = {};
  localStorage.removeItem(storageKey);
  updateSaveState();
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
  document.querySelectorAll('.module-button').forEach((button) => button.addEventListener('click', () => {
    document.querySelectorAll('.module-button').forEach((item) => item.classList.toggle('active', item === button));
  }));
}

function init() {
  if (!data) {
    el.statusText.textContent = '데이터 파일을 불러오지 못했습니다.';
    return;
  }
  el.sourceInfo.textContent = `${data.meta.source} · ${data.meta.rowCount.toLocaleString()}행`;
  el.totalRows.textContent = `${data.meta.rowCount.toLocaleString()}개 행`;
  el.voiceRows.textContent = `음성 ${data.meta.voiceCheckedCount.toLocaleString()}`;
  el.statusText.textContent = `${data.meta.sceneCount}개 씬 데이터 연결 완료`;
  populateFilters();
  bindEvents();
  updateSaveState();
  selectScene(activeSceneId);
}

init();
