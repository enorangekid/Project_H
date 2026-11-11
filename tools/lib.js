// 작품별 씬 데이터 읽기/쓰기 공용 모듈 (페이지 코드와 AI 도구가 함께 사용)
//
// 폴더 구조 (작품마다 works/<작품ID>/ 아래에 독립적으로 보관)
//   works/works.js                         작품 목록 (tools/work.js sync 로 자동 생성)
//   works/<작품ID>/work.json               작품 ID·표시 이름
//   works/<작품ID>/data/index.js           메타 정보 + 화자 목록 + 씬 목록(종류·설명·단계·진행 통계)
//   works/<작품ID>/data/scenes/<씬ID>.js   해당 씬의 행 목록 (한 줄에 한 행)
//   works/<작품ID>/data/changes/<씬ID>.js  해당 씬의 변경 기록 (수정 전·후, 도구가 자동으로 기록)
//
// 행 필드: rowNumber(엑셀 행 번호), id, kind, speaker, english, korean, recordingScript, memo, voice, phaseId
// 씬 종류·씬 설명·단계명·단계 상세는 index.js의 씬 정보에 한 번만 저장한다.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const WORKS_DIR = path.join(__dirname, '..', 'works');

const ROW_FIELDS = ['rowNumber', 'id', 'kind', 'speaker', 'english', 'korean', 'recordingScript', 'memo', 'voice', 'phaseId'];
// AI/도구가 수정할 수 있는 필드 (rowNumber, id, phaseId는 구조 식별용이라 수정 불가)
const EDITABLE_FIELDS = ['kind', 'speaker', 'english', 'korean', 'recordingScript', 'memo', 'voice'];

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
  return rows;
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

function slimRow(row) {
  const out = {};
  ROW_FIELDS.forEach((key) => { out[key] = row[key] ?? (key === 'rowNumber' ? 0 : ''); });
  return out;
}

function writeSceneRows(sceneId, rows) {
  fs.mkdirSync(current().scenesDir, { recursive: true });
  const lines = rows.map((row) => JSON.stringify(slimRow(row)));
  const text = `window.PROJECT_H_SCENES=window.PROJECT_H_SCENES||{};\nwindow.PROJECT_H_SCENES[${JSON.stringify(sceneId)}]=[\n${lines.join(',\n')}\n];\n`;
  writeAtomic(sceneFile(sceneId), text);
}

function sceneStats(rows) {
  const stats = { korean: 0, voice: 0, script: 0 };
  rows.forEach((row) => {
    if (row.korean) stats.korean += 1;
    if (row.voice) stats.voice += 1;
    if (row.recordingScript) stats.script += 1;
  });
  return stats;
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
    recordingScript: row.recordingScript, rowNumber: row.rowNumber,
  };
}

module.exports = {
  WORKS_DIR, ID_PATTERN, ROW_FIELDS, EDITABLE_FIELDS,
  listWorks, useWork, current, loadJs, writeAtomic, loadIndex, loadSceneRows, writeSceneRows, writeIndex,
  loadChanges, writeChanges, newBatchId,
  computeSpeakers, sceneStats, fullRow, slimRow, sceneFile,
};
