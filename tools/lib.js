// 작품별 씬 데이터 읽기/쓰기 공용 모듈 (페이지 코드와 AI 도구가 함께 사용)
//
// 폴더 구조 (작품마다 works/<작품ID>/ 아래에 독립적으로 보관)
//   works/works.js                         작품 목록 (tools/work.js sync 로 자동 생성)
//   works/<작품ID>/work.json               작품 ID·표시 이름
//   works/<작품ID>/data/index.js           메타 정보 + 화자 목록 + 씬 목록(종류·설명·단계·진행 통계)
//   works/<작품ID>/data/scenes/<씬ID>.js   해당 씬의 행 목록 (한 줄에 한 행)
//   works/<작품ID>/data/changes/<씬ID>.js  해당 씬의 변경 기록 (수정 전·후, 도구가 자동으로 기록)
//   works/<작품ID>/data/prompts.js         프롬프트 템플릿 목록 (tools/prompt.js 로 관리)
//
// 행 필드: rowNumber(엑셀 행 번호), id, kind, speaker, english, korean, recordingScript, prompt, memo, voice, phaseId
// 씬 종류·씬 설명·단계명·단계 상세는 index.js의 씬 정보에 한 번만 저장한다.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const WORKS_DIR = path.join(__dirname, '..', 'works');

// review: 검수 표시 메모 (비어 있으면 정상, 글자가 있으면 검수가 필요한 줄 + 그 이유). 비어 있으면 파일에 쓰지 않는다.
const ROW_FIELDS = ['rowNumber', 'id', 'kind', 'speaker', 'english', 'korean', 'recordingScript', 'prompt', 'memo', 'voice', 'phaseId', 'review'];
// AI/도구가 수정할 수 있는 필드 (rowNumber, id, phaseId는 구조 식별용이라 수정 불가)
const EDITABLE_FIELDS = ['kind', 'speaker', 'english', 'korean', 'recordingScript', 'prompt', 'memo', 'voice', 'review'];

const ID_PATTERN = /^[A-Za-z0-9_-]+$/;
let work = null; // useWork()로 선택한 작품의 경로 정보

function listWorks() {
  if (!fs.existsSync(WORKS_DIR)) return [];
  return fs.readdirSync(WORKS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(WORKS_DIR, entry.name, 'work.json')))
    .map((entry) => entry.name)
    .sort();
}

// 작품 선택. 작품이 하나뿐이면 ID를 생략할 수 있고, 둘 이상이면 반드시 지정해야 한다.
function useWork(id) {
  const works = listWorks();
  let target = id;
  if (!target || target === true) {
    if (works.length === 1) [target] = works;
    else throw new Error(`작품을 지정하세요: --work <작품ID>  (사용 가능: ${works.join(', ') || '없음'})`);
  }
  if (!ID_PATTERN.test(target) || !works.includes(target)) {
    throw new Error(`없는 작품: ${target}  (사용 가능: ${works.join(', ') || '없음'})`);
  }
  const dir = path.join(WORKS_DIR, target);
  work = { id: target, dir, dataDir: path.join(dir, 'data'), scenesDir: path.join(dir, 'data', 'scenes'), indexFile: path.join(dir, 'data', 'index.js') };
  return work;
}

function current() {
  if (!work) throw new Error('useWork()로 작품을 먼저 선택하세요.');
  return work;
}

function loadJs(file, key) {
  const ctx = { window: {} };
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), ctx, { filename: file });
  return ctx.window[key];
}

function writeAtomic(file, text) {
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, text, 'utf8');
  fs.renameSync(tmp, file);
}

function sceneFile(sceneId) {
  if (!ID_PATTERN.test(sceneId)) throw new Error(`허용되지 않는 씬 ID: ${sceneId}`);
  return path.join(current().scenesDir, `${sceneId}.js`);
}

function loadIndex() {
  return loadJs(current().indexFile, 'PROJECT_H_INDEX');
}

function loadSceneRows(sceneId) {
  const rows = (loadJs(sceneFile(sceneId), 'PROJECT_H_SCENES') || {})[sceneId];
  if (!rows) throw new Error(`씬 파일에 ${sceneId} 데이터가 없습니다.`);
  // 새 필드가 추가되어도 기존 씬 파일은 빈 문자열로 즉시 호환한다.
  return rows.map((row) => ({ ...slimRow(row), review: row.review || '' }));
}

// ---- 변경 기록 (AI가 set/revert 할 때마다 쌓이는 수정 전·후 기록, 씬별 파일) ----
// 항목: { t(ISO 시각), batch(한 번의 set/revert 묶음 ID), note, id, rowNumber, field, before, after, revert?(되돌린 대상 batch) }
function changesFile(sceneId) {
  if (!ID_PATTERN.test(sceneId)) throw new Error(`허용되지 않는 씬 ID: ${sceneId}`);
  return path.join(current().dataDir, 'changes', `${sceneId}.js`);
}

function loadChanges(sceneId) {
  const file = changesFile(sceneId);
  if (!fs.existsSync(file)) return [];
  return (loadJs(file, 'PROJECT_H_CHANGES') || {})[sceneId] || [];
}

function writeChanges(sceneId, entries) {
  fs.mkdirSync(path.dirname(changesFile(sceneId)), { recursive: true });
  const lines = entries.map((entry) => JSON.stringify(entry));
  const text = `window.PROJECT_H_CHANGES=window.PROJECT_H_CHANGES||{};\nwindow.PROJECT_H_CHANGES[${JSON.stringify(sceneId)}]=[\n${lines.join(',\n')}\n];\n`;
  writeAtomic(changesFile(sceneId), text);
}

function newBatchId(existingEntries) {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const base = `b${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  const used = new Set(existingEntries.map((entry) => entry.batch));
  let id = base;
  for (let n = 2; used.has(id); n += 1) id = `${base}-${n}`;
  return id;
}

// 여러 행의 필드를 한 번에 수정하고 변경 기록·통계를 갱신한다 (tools/scene.js 의 set 과 같은 규칙, 저장 서버가 사용).
// patch: [{ id, 필드: 값, … }]. 잘못된 id·필드가 하나라도 있으면 아무것도 쓰지 않고 Error 를 던진다.
function applyPatch(sceneId, patch, note) {
  const index = loadIndex();
  if (!index.scenes.some((scene) => scene.id === sceneId)) throw new Error(`없는 씬 ID: ${sceneId}`);
  if (!Array.isArray(patch) || !patch.length) throw new Error('수정할 내용이 없습니다.');
  const rows = loadSceneRows(sceneId);
  const byId = new Map(rows.map((row) => [row.id, row]));
  const entries = [];
  const fieldCounts = {};
  const seen = new Set();
  let unchangedRows = 0;
  patch.forEach((item, i) => {
    if (!item || typeof item.id !== 'string') throw new Error(`#${i + 1}: id가 없습니다.`);
    if (seen.has(item.id)) throw new Error(`#${i + 1}: 같은 id가 두 번 있습니다 (${item.id}).`);
    seen.add(item.id);
    const row = byId.get(item.id);
    if (!row) throw new Error(`#${i + 1}: ${sceneId}에 없는 id (${item.id}).`);
    let changed = false;
    Object.entries(item).forEach(([key, value]) => {
      if (key === 'id') return;
      if (!EDITABLE_FIELDS.includes(key)) throw new Error(`#${i + 1}: 수정할 수 없는 필드 ${key}.`);
      if (typeof value !== 'string') throw new Error(`#${i + 1}: ${key} 값은 문자열이어야 합니다.`);
      if (row[key] !== value) {
        entries.push({ id: row.id, rowNumber: row.rowNumber, field: key, before: row[key], after: value });
        fieldCounts[key] = (fieldCounts[key] || 0) + 1;
        changed = true;
      }
    });
    if (!changed) unchangedRows += 1;
  });
  const summary = { scene: sceneId, patchedRows: patch.length, changedRows: new Set(entries.map((entry) => entry.id)).size, unchangedRows, fields: fieldCounts };
  if (!entries.length) return summary;
  entries.forEach((entry) => { byId.get(entry.id)[entry.field] = entry.after; });
  writeSceneRows(sceneId, rows);
  const log = loadChanges(sceneId);
  const batch = newBatchId(log);
  const t = new Date().toISOString();
  writeChanges(sceneId, [...log, ...entries.map((entry) => ({ t, batch, note: note || '', ...entry }))]);
  summary.batch = batch;
  const rowsByScene = { [sceneId]: rows };
  if (fieldCounts.speaker) {
    index.scenes.forEach((scene) => { if (!rowsByScene[scene.id]) rowsByScene[scene.id] = loadSceneRows(scene.id); });
    index.speakers = computeSpeakers(rowsByScene);
  }
  writeIndex(index, rowsByScene);
  return summary;
}

// ---- 줄 추가·삭제 (원본 엑셀 없이 이 데이터가 원본인 작품용: newfamily 등) ----
// - 행 번호(rowNumber)가 첫 행부터 1씩 이어지는 씬에서만 가능하다 (끝나면 행 번호를 다시 매긴다). 엑셀 행 번호와 짝이 있는 씬은 거부한다.
// - 새 줄 ID는 `<파일>#<번호>` 형식으로 그 씬의 가장 큰 번호 + 1 (위치와 상관없이 고유). 단계(phaseId)는 앞 줄을 따른다.
// - 변경 기록에는 field `+row`(추가) / `-row`(삭제)로 남아 scene.js revert 로 되돌릴 수 있다.
const NEW_ROW_FIELDS = ['kind', 'speaker', 'english', 'korean', 'recordingScript', 'prompt', 'memo', 'review'];
function isContiguous(rows) {
  return rows.length > 0 && rows.every((row, i) => row.rowNumber === rows[0].rowNumber + i);
}
function renumberRows(rows, start) {
  rows.forEach((row, i) => { row.rowNumber = start + i; });
}
function nextRowId(rows) {
  const parts = rows.map((row) => /^(.*)#(\d+)$/.exec(String(row.id)));
  if (!parts.length || parts.some((part) => !part)) throw new Error('이 씬은 ID가 `파일#번호` 형식이 아니라 줄을 추가할 수 없습니다.');
  const stem = parts[0][1];
  if (parts.some((part) => part[1] !== stem)) throw new Error('이 씬의 ID 앞부분이 서로 달라 줄을 추가할 수 없습니다.');
  return `${stem}#${Math.max(...parts.map((part) => Number(part[2]))) + 1}`;
}
function finishRowOps(index, sceneId, rows, entries, note) {
  renumberRows(rows, entries.start);
  entries.list.forEach((entry) => { const row = rows.find((item) => item.id === entry.id); if (row) entry.rowNumber = row.rowNumber; });
  writeSceneRows(sceneId, rows);
  const log = loadChanges(sceneId);
  const batch = newBatchId(log);
  const t = new Date().toISOString();
  writeChanges(sceneId, [...log, ...entries.list.map((entry) => ({ t, batch, note: note || '', ...entry }))]);
  const rowsByScene = { [sceneId]: rows };
  index.scenes.forEach((scene) => { if (!rowsByScene[scene.id]) rowsByScene[scene.id] = loadSceneRows(scene.id); });
  index.speakers = computeSpeakers(rowsByScene);
  writeIndex(index, rowsByScene);
  return batch;
}

// specs: [{ after: 앞 줄 ID, speaker, korean, kind?, english?, … }]. 같은 after 가 여러 개면 적은 순서대로 이어서 들어간다.
function insertRows(sceneId, specs, note, dry) {
  const index = loadIndex();
  if (!index.scenes.some((scene) => scene.id === sceneId)) throw new Error(`없는 씬 ID: ${sceneId}`);
  if (!Array.isArray(specs) || !specs.length) throw new Error('추가할 줄이 없습니다.');
  const rows = loadSceneRows(sceneId);
  if (!isContiguous(rows)) throw new Error(`${sceneId}: 행 번호가 연속이 아니라(엑셀 행 번호와 짝이 있음) 줄을 추가할 수 없습니다.`);
  const start = rows[0].rowNumber;
  const list = [];
  const added = new Map();
  specs.forEach((spec, i) => {
    if (!spec || typeof spec.after !== 'string') throw new Error(`#${i + 1}: after(앞 줄 ID)가 없습니다.`);
    Object.keys(spec).forEach((key) => { if (key !== 'after' && !NEW_ROW_FIELDS.includes(key)) throw new Error(`#${i + 1}: 쓸 수 없는 필드 ${key}.`); });
    if (typeof spec.speaker !== 'string' || !spec.speaker.trim() || typeof spec.korean !== 'string' || !spec.korean.trim()) throw new Error(`#${i + 1}: speaker 와 korean 이 필요합니다.`);
    const at = rows.findIndex((row) => row.id === spec.after);
    if (at < 0) throw new Error(`#${i + 1}: ${sceneId}에 없는 앞 줄 ID (${spec.after}).`);
    const offset = added.get(spec.after) || 0;
    const row = { rowNumber: 0, id: nextRowId(rows), kind: 'text', english: '', recordingScript: '', prompt: '', memo: '', voice: '', phaseId: rows[at].phaseId, review: '' };
    NEW_ROW_FIELDS.forEach((key) => { if (typeof spec[key] === 'string') row[key] = spec[key]; });
    rows.splice(at + 1 + offset, 0, row);
    added.set(spec.after, offset + 1);
    list.push({ id: row.id, rowNumber: 0, field: '+row', before: '', after: { prev: rows[at + offset].id, row: { ...row } } });
  });
  const summary = { scene: sceneId, inserted: list.length, newIds: list.map((entry) => entry.id), dryRun: Boolean(dry) };
  if (!dry) summary.batch = finishRowOps(index, sceneId, rows, { start, list }, note);
  return summary;
}

function deleteRows(sceneId, ids, note, dry) {
  const index = loadIndex();
  if (!index.scenes.some((scene) => scene.id === sceneId)) throw new Error(`없는 씬 ID: ${sceneId}`);
  if (!Array.isArray(ids) || !ids.length) throw new Error('삭제할 줄 ID가 없습니다.');
  const rows = loadSceneRows(sceneId);
  if (!isContiguous(rows)) throw new Error(`${sceneId}: 행 번호가 연속이 아니라(엑셀 행 번호와 짝이 있음) 줄을 삭제할 수 없습니다.`);
  const start = rows[0].rowNumber;
  const list = [];
  ids.forEach((id) => {
    const at = rows.findIndex((row) => row.id === id);
    if (at < 0) throw new Error(`${sceneId}에 없는 ID: ${id}`);
    if (list.some((entry) => entry.id === id)) throw new Error(`같은 ID가 두 번 있습니다: ${id}`);
    const [row] = rows.splice(at, 1);
    list.push({ id: row.id, rowNumber: row.rowNumber, field: '-row', before: { prev: at > 0 ? rows[at - 1].id : '', row: { ...row } }, after: '' });
  });
  if (!rows.length) throw new Error('씬의 모든 줄을 지울 수는 없습니다.');
  const summary = { scene: sceneId, deleted: list.length, dryRun: Boolean(dry) };
  if (!dry) summary.batch = finishRowOps(index, sceneId, rows, { start, list }, note);
  return summary;
}

// ---- 프롬프트 템플릿 (작품별 data/prompts.js, 페이지의 `프롬프트 관리/삽입`이 목록으로 보여 줌) ----
// 항목: { id(영문·숫자·_·-), name(표시 이름), text(행의 prompt 필드에 들어갈 내용), group(분류) }
// 분류 탭은 작품마다 다를 수 있다: prompts.js 의 groups([[키, 이름], …]). 없으면 기본 탭
// (act=행위, phase=단계, arousal=흥분도, emotion=추가 감정). 없거나 모르는 group 값은 마지막 탭으로 간다.
const DEFAULT_PROMPT_GROUPS = [['act', '행위'], ['phase', '단계'], ['arousal', '흥분도'], ['emotion', '추가 감정']];
const PROMPT_GROUPS = DEFAULT_PROMPT_GROUPS.map(([key]) => key); // (이전 버전 호환용: 기본 탭 키)
function promptsFile() {
  return path.join(current().dataDir, 'prompts.js');
}

function loadPromptData() {
  const file = promptsFile();
  return fs.existsSync(file) ? (loadJs(file, 'PROJECT_H_PROMPTS') || {}) : {};
}

function loadPromptGroups() {
  const groups = work ? loadPromptData().groups : null;
  return Array.isArray(groups) && groups.length ? groups : DEFAULT_PROMPT_GROUPS;
}

function promptGroupKeys() {
  return loadPromptGroups().map(([key]) => key);
}

function promptGroup(value) {
  const keys = promptGroupKeys();
  return keys.includes(value) ? value : keys[keys.length - 1];
}

function loadPrompts() {
  return loadPromptData().templates || [];
}

function writePrompts(templates, groups = loadPromptGroups()) {
  const lines = templates.map((item) => `  ${JSON.stringify({ id: item.id, group: promptGroup(item.group), name: item.name, text: item.text })}`);
  const custom = JSON.stringify(groups) !== JSON.stringify(DEFAULT_PROMPT_GROUPS);
  const head = custom ? `"groups":${JSON.stringify(groups)},\n` : '';
  const text = `window.PROJECT_H_PROMPTS={${head}"templates":[\n${lines.join(',\n')}\n]};\n`;
  fs.mkdirSync(current().dataDir, { recursive: true });
  writeAtomic(promptsFile(), text);
}

function slimRow(row) {
  const out = {};
  ROW_FIELDS.forEach((key) => {
      if (key === 'review' && !row.review) return; // 검수 표시가 없는 줄은 이 키를 쓰지 않는다 (파일이 불어나지 않게)
      if (key === 'prompt' && !Object.prototype.hasOwnProperty.call(row, key)) return; // 원래 없는 빈 프롬프트 키를 새로 만들지 않는다
    out[key] = row[key] ?? (key === 'rowNumber' ? 0 : '');
  });
  return out;
}

function writeSceneRows(sceneId, rows) {
  fs.mkdirSync(current().scenesDir, { recursive: true });
  const lines = rows.map((row) => JSON.stringify(slimRow(row)));
  const text = `window.PROJECT_H_SCENES=window.PROJECT_H_SCENES||{};\nwindow.PROJECT_H_SCENES[${JSON.stringify(sceneId)}]=[\n${lines.join(',\n')}\n];\n`;
  writeAtomic(sceneFile(sceneId), text);
}

function sceneStats(rows) {
  const stats = { korean: 0, voice: 0, script: 0, review: 0 };
  rows.forEach((row) => {
    if (row.review) stats.review += 1;
    if (row.korean) stats.korean += 1;
    if (row.voice) stats.voice += 1;
    if (row.recordingScript) stats.script += 1;
  });
  return stats;
}

// 대사 ID → 씬 검색 키: `파일.ks#22` → `파일.ks`, `1011000042_1` → `1011000042` (app.js 의 idStem 과 같은 규칙)
function idStem(id) {
  return String(id).trim().replace(/(#\d+|_\d+)$/, '');
}

// 씬 파일이 바뀐 뒤 index.js의 개수·진행 통계를 다시 계산해 저장한다.
function writeIndex(index, rowsByScene) {
  let total = 0, voice = 0, script = 0;
  index.scenes.forEach((scene) => {
    const rows = rowsByScene[scene.id] || loadSceneRows(scene.id);
    scene.count = rows.length;
    scene.stats = sceneStats(rows);
    total += rows.length; voice += scene.stats.voice; script += scene.stats.script;
    const counts = {};
    rows.forEach((row) => { counts[row.phaseId] = (counts[row.phaseId] || 0) + 1; });
    scene.phases.forEach((phase) => { phase.count = counts[phase.id] || 0; });
    // 씬 목록 검색에서 대사 ID로 씬을 찾기 위한 키 (ID 끝의 #줄번호·_창번호를 뗀 것, 중복 제거)
    scene.idKeys = [...new Set(rows.map((row) => idStem(row.id)))];
    const changes = loadChanges(scene.id);
    if (changes.length) scene.changes = { entries: changes.length, rows: new Set(changes.map((entry) => entry.id)).size, last: changes[changes.length - 1].t };
    else delete scene.changes;
  });
  index.meta.rowCount = total;
  index.meta.sceneCount = index.scenes.length;
  index.meta.voiceCheckedCount = voice;
  index.meta.recordingScriptCount = script;
  index.meta.builtAt = new Date().toISOString();
  const head = JSON.stringify({ meta: index.meta, speakers: index.speakers }, null, 1);
  const sceneLines = index.scenes.map((scene) => `  ${JSON.stringify(scene)}`).join(',\n');
  const text = `window.PROJECT_H_INDEX=Object.assign(${head},{scenes:[\n${sceneLines}\n]});\n`;
  fs.mkdirSync(current().dataDir, { recursive: true });
  writeAtomic(current().indexFile, text);
}

// 화자 목록(이름·개수)을 전체 행 기준으로 다시 계산
function computeSpeakers(rowsByScene) {
  const counts = new Map();
  Object.values(rowsByScene).forEach((rows) => rows.forEach((row) => counts.set(row.speaker, (counts.get(row.speaker) || 0) + 1)));
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));
}

// 슬림 행 + 씬 정보 → 원본 엑셀 열 구성의 전체 행 (엑셀 반영·페이지 표시용)
function fullRow(scene, row) {
  const phase = scene.phases.find((item) => item.id === row.phaseId);
  return {
    id: row.id, kind: row.kind, speaker: row.speaker, english: row.english, korean: row.korean, memo: row.memo,
    voice: row.voice, sceneType: scene.type, sceneId: scene.id, sceneDetail: scene.detail,
    phaseId: row.phaseId, phase: phase ? phase.name : '', phaseDetail: phase ? phase.detail : '',
    recordingScript: row.recordingScript, prompt: row.prompt, rowNumber: row.rowNumber,
  };
}

module.exports = {
  WORKS_DIR, ID_PATTERN, ROW_FIELDS, EDITABLE_FIELDS,
  listWorks, useWork, current, loadJs, writeAtomic, loadIndex, loadSceneRows, writeSceneRows, writeIndex,
  loadChanges, writeChanges, newBatchId, loadPrompts, writePrompts, PROMPT_GROUPS, DEFAULT_PROMPT_GROUPS,
  loadPromptGroups, promptGroupKeys, promptGroup, applyPatch,
  insertRows, deleteRows, isContiguous, renumberRows,
  computeSpeakers, sceneStats, fullRow, slimRow, sceneFile,
};
