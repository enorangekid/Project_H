#!/usr/bin/env node
// AI/작업자용 씬 조회·수정 도구. 필요한 씬과 필드만 읽고, 바뀐 행만 반영해 토큰과 시간을 아낀다.
//
//   node tools/scene.js [--work 작품ID] list
//   node tools/scene.js [--work 작품ID] get <씬ID> [--fields id,korean] [--from 행번호] [--to 행번호] [--phase 단계ID]
//                                  [--ids id1,id2] [--empty korean] [--search 문자열] [--limit N] [--tsv]
//   node tools/scene.js [--work 작품ID] set <씬ID> <patch.json | -> [--note "수정 사유"] [--dry]
//   node tools/scene.js [--work 작품ID] insert <씬ID> <rows.json | -> [--note "사유"] [--dry]   줄 추가 (원본 엑셀 없이 이 데이터가 원본인 씬만)
//   node tools/scene.js [--work 작품ID] delete <씬ID> --ids id1,id2 [--note "사유"] [--dry]       줄 삭제 (같은 조건)
//   node tools/scene.js [--work 작품ID] log [씬ID] [--limit N] [--batch 묶음ID] [--detail]
//   node tools/scene.js [--work 작품ID] revert <씬ID> (--last | --batch 묶음ID) [--ids id1,id2] [--dry]
//
//   set 은 수정 전·후를 data/changes/<씬ID>.js 에 자동 기록한다 (--note 는 페이지의 변경 내역 화면에 함께 표시됨).
//   revert 는 기록의 수정 전 값으로 복구하며, 그 뒤 다른 수정이 있었던 항목은 건너뛰고 conflicts 로 알려준다.
//
//   --work 는 작품이 하나뿐이면 생략할 수 있고, 둘 이상이면 반드시 지정해야 한다. (작품 목록: node tools/work.js list)
//
//   insert 의 rows.json 예: [{"after":"EP1#148","speaker":"나레이션","korean":"새 줄"}, ...]  (after = 앞 줄 ID, 같은 after 는 적은 순서대로 이어서 들어감.
//     새 줄 ID 는 그 씬의 가장 큰 번호 + 1, 단계는 앞 줄을 따르고, 끝나면 행 번호를 다시 매긴다. 엑셀 행 번호와 짝이 있어 번호가 띄엄띄엄인 씬은 거부한다.)
//   insert/delete 도 변경 기록에 남아(`+row`/`-row`) revert 로 되돌릴 수 있다.
//   patch.json 예: [{"id":"01姉_00_01.ks#22","korean":"수정한 대사"}, ...]  (바뀐 필드만 적는다)
//   수정 가능 필드: kind, speaker, english, korean, recordingScript, prompt, memo, voice, review(🚩 검수 표시·메모 — tools/review.js 참고)
//   id·rowNumber·phaseId와 씬 정보(종류·설명·단계명)는 이 도구로 바꾸지 않는다.
const fs = require('fs');
const lib = require('./lib');

function parseArgs(args) {
  const positional = [];
  const options = {};
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '-') { positional.push(arg); continue; }
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next === undefined || next.startsWith('--')) options[key] = true;
      else { options[key] = next; i += 1; }
    } else positional.push(arg);
  }
  return { positional, options };
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function requireScene(index, sceneId) {
  if (!sceneId) fail('씬 ID를 지정하세요. 예: node tools/scene.js get N1');
  const scene = index.scenes.find((item) => item.id === sceneId);
  if (!scene) fail(`없는 씬 ID: ${sceneId}  (사용 가능: ${index.scenes.map((s) => s.id).join(', ')})`);
  return scene;
}

function pct(part, total) {
  return total ? `${Math.round((part / total) * 100)}%` : '0%';
}

function list() {
  const index = lib.loadIndex();
  console.log(`씬\t종류\t행\t한국어\t음성\t녹음대본`);
  index.scenes.forEach((scene) => {
    console.log([scene.id, scene.type, scene.count, pct(scene.stats.korean, scene.count), pct(scene.stats.voice, scene.count), scene.stats.script].join('\t'));
  });
  console.log(`합계\t-\t${index.meta.rowCount}\t-\t음성 ${index.meta.voiceCheckedCount}\t${index.meta.recordingScriptCount}`);
}

function get(sceneId, options) {
  const index = lib.loadIndex();
  requireScene(index, sceneId);
  const fields = (options.fields ? String(options.fields).split(',') : ['id', 'speaker', 'english', 'korean']).map((f) => f.trim());
  fields.forEach((field) => { if (!lib.ROW_FIELDS.includes(field)) fail(`알 수 없는 필드: ${field}  (사용 가능: ${lib.ROW_FIELDS.join(', ')})`); });
  if (!fields.includes('id')) fields.unshift('id');
  let rows = lib.loadSceneRows(sceneId);
  if (options.ids) { const set = new Set(String(options.ids).split(',')); rows = rows.filter((row) => set.has(row.id)); }
  if (options.from) rows = rows.filter((row) => row.rowNumber >= Number(options.from));
  if (options.to) rows = rows.filter((row) => row.rowNumber <= Number(options.to));
  if (options.phase !== undefined && options.phase !== true) rows = rows.filter((row) => row.phaseId === String(options.phase));
  if (options.empty) {
    const field = String(options.empty);
    if (!lib.ROW_FIELDS.includes(field)) fail(`알 수 없는 필드: ${field}`);
    rows = rows.filter((row) => !row[field]);
  }
  if (options.search && options.search !== true) {
    const needle = String(options.search).toLowerCase();
    rows = rows.filter((row) => lib.ROW_FIELDS.some((field) => String(row[field]).toLowerCase().includes(needle)));
  }
  const total = rows.length;
  if (options.limit) rows = rows.slice(0, Number(options.limit));
  rows.forEach((row) => {
    if (options.tsv) console.log(fields.map((field) => String(row[field]).replace(/\t/g, ' ').replace(/\r?\n/g, '\\n')).join('\t'));
    else console.log(JSON.stringify(Object.fromEntries(fields.map((field) => [field, row[field]]))));
  });
  console.error(`# ${sceneId}: ${rows.length}/${total}행 출력`);
}

function set(sceneId, patchPath, options) {
  const index = lib.loadIndex();
  requireScene(index, sceneId);
  if (!patchPath) fail('패치 파일 경로를 지정하세요. 예: node tools/scene.js set N1 patch.json  (표준입력은 -)');
  let patch;
  try {
    patch = JSON.parse(fs.readFileSync(patchPath === '-' ? 0 : patchPath, 'utf8').replace(/^﻿/, ''));
  } catch (error) { fail(`패치 파일을 읽을 수 없습니다: ${error.message}`); }
  if (!Array.isArray(patch)) fail('패치는 [{"id": ..., 필드: 값}, ...] 형태의 배열이어야 합니다.');

  const rows = lib.loadSceneRows(sceneId);
  const byId = new Map(rows.map((row) => [row.id, row]));
  const errors = [];
  const fieldCounts = {};
  let changedRows = 0;
  let unchangedRows = 0;
  const seen = new Set();
  const pendingEntries = [];
  patch.forEach((item, i) => {
    if (!item || typeof item.id !== 'string') { errors.push(`#${i + 1}: id가 없습니다.`); return; }
    if (seen.has(item.id)) { errors.push(`#${i + 1}: 같은 id가 패치에 두 번 있습니다 (${item.id}).`); return; }
    seen.add(item.id);
    const row = byId.get(item.id);
    if (!row) { errors.push(`#${i + 1}: ${sceneId}에 없는 id (${item.id}).`); return; }
    const changes = {};
    Object.entries(item).forEach(([key, value]) => {
      if (key === 'id') return;
      if (!lib.EDITABLE_FIELDS.includes(key)) { errors.push(`#${i + 1}: 수정할 수 없는 필드 ${key}.`); return; }
      if (typeof value !== 'string') { errors.push(`#${i + 1}: ${key} 값은 문자열이어야 합니다.`); return; }
      if (row[key] !== value) changes[key] = value;
    });
    if (Object.keys(changes).length) {
      changedRows += 1;
      Object.keys(changes).forEach((key) => { fieldCounts[key] = (fieldCounts[key] || 0) + 1; });
      Object.entries(changes).forEach(([field, after]) => pendingEntries.push({ id: row.id, rowNumber: row.rowNumber, field, before: row[field], after }));
      row.__pending = changes;
    } else unchangedRows += 1;
  });
  if (errors.length) {
    console.error(`패치를 적용하지 않았습니다. 오류 ${errors.length}건:`);
    errors.slice(0, 20).forEach((message) => console.error(`  - ${message}`));
    if (errors.length > 20) console.error(`  … 외 ${errors.length - 20}건`);
    process.exit(1);
  }
  rows.forEach((row) => { if (row.__pending) { Object.assign(row, row.__pending); delete row.__pending; } });
  const summary = { scene: sceneId, patchedRows: patch.length, changedRows, unchangedRows, fields: fieldCounts, dryRun: Boolean(options.dry) };
  if (!options.dry && changedRows) {
    lib.writeSceneRows(sceneId, rows);
    // 수정 전·후를 변경 기록에 남긴다 (페이지의 변경 내역 화면과 되돌리기에 사용)
    const log = lib.loadChanges(sceneId);
    const batch = lib.newBatchId(log);
    const t = new Date().toISOString();
    const note = typeof options.note === 'string' ? options.note : '';
    lib.writeChanges(sceneId, [...log, ...pendingEntries.map((entry) => ({ t, batch, note, ...entry }))]);
    summary.batch = batch;
    const rowsByScene = { [sceneId]: rows };
    if (fieldCounts.speaker) {
      index.scenes.forEach((scene) => { if (!rowsByScene[scene.id]) rowsByScene[scene.id] = lib.loadSceneRows(scene.id); });
      index.speakers = lib.computeSpeakers(rowsByScene);
    }
    lib.writeIndex(index, rowsByScene);
  }
  console.log(JSON.stringify(summary));
}

function insert(sceneId, rowsPath, options) {
  const index = lib.loadIndex();
  requireScene(index, sceneId);
  if (!rowsPath) fail('추가할 줄 파일 경로를 지정하세요. 예: node tools/scene.js insert EP1 rows.json  (표준입력은 -)');
  let specs;
  try { specs = JSON.parse(fs.readFileSync(rowsPath === '-' ? 0 : rowsPath, 'utf8').replace(/^﻿/, '')); } catch (error) { fail(`파일을 읽을 수 없습니다: ${error.message}`); }
  try { console.log(JSON.stringify(lib.insertRows(sceneId, specs, typeof options.note === 'string' ? options.note : '', options.dry))); } catch (error) { fail(error.message); }
}

function remove(sceneId, options) {
  const index = lib.loadIndex();
  requireScene(index, sceneId);
  if (!options.ids || options.ids === true) fail('삭제할 줄 ID를 --ids id1,id2 로 지정하세요.');
  const ids = String(options.ids).split(',').map((id) => id.trim()).filter(Boolean);
  try { console.log(JSON.stringify(lib.deleteRows(sceneId, ids, typeof options.note === 'string' ? options.note : '', options.dry))); } catch (error) { fail(error.message); }
}

// 변경 기록 요약 (본문 없이 묶음 단위). --detail 을 주면 수정 전·후 값까지 출력
function log(sceneArg, options) {
  const index = lib.loadIndex();
  const sceneIds = sceneArg ? [requireScene(index, sceneArg).id] : index.scenes.filter((scene) => scene.changes).map((scene) => scene.id);
  const limit = options.limit ? Number(options.limit) : 20;
  const batches = [];
  sceneIds.forEach((sceneId) => {
    const byBatch = new Map();
    lib.loadChanges(sceneId).forEach((entry) => {
      if (options.batch && options.batch !== true && entry.batch !== options.batch) return;
      if (!byBatch.has(entry.batch)) byBatch.set(entry.batch, { scene: sceneId, batch: entry.batch, t: entry.t, note: entry.note || '', revert: entry.revert || undefined, rows: new Set(), fields: {}, entries: [] });
      const item = byBatch.get(entry.batch);
      item.rows.add(entry.id);
      item.fields[entry.field] = (item.fields[entry.field] || 0) + 1;
      item.entries.push(entry);
    });
    batches.push(...byBatch.values());
  });
  batches.sort((a, b) => (a.t < b.t ? 1 : -1));
  batches.slice(0, limit).forEach((item) => {
    const summary = { scene: item.scene, batch: item.batch, t: item.t, note: item.note, revert: item.revert, rows: item.rows.size, fields: item.fields };
    if (options.detail) summary.entries = item.entries.map(({ id, field, before, after }) => ({ id, field, before, after }));
    console.log(JSON.stringify(summary));
  });
  console.error(`# 변경 묶음 ${Math.min(limit, batches.length)}/${batches.length}개 출력`);
}

// 변경 되돌리기: 기록의 수정 전 값으로 복구한다. 그 뒤에 다른 수정이 있었던 항목은 건드리지 않고 건너뛴다(충돌).
//   revert <씬ID> --last | --batch <묶음ID> [--ids id1,id2] [--note 메모] [--dry]
function revert(sceneId, options) {
  const index = lib.loadIndex();
  requireScene(index, sceneId);
  const log = lib.loadChanges(sceneId);
  if (!log.length) fail(`${sceneId}에 변경 기록이 없습니다.`);
  // 항목(묶음+행+필드) 단위로 이미 되돌려졌는지 판단한다. 충돌로 일부만 되돌려진 묶음은 남은 항목을 다시 되돌릴 수 있다.
  const keyOf = (batch, entry) => `${batch}|${entry.id}|${entry.field}`;
  const revertedKeys = new Set(log.filter((entry) => entry.revert).map((entry) => keyOf(entry.revert, entry)));
  const pending = (entry) => !entry.revert && !revertedKeys.has(keyOf(entry.batch, entry));
  let target = options.batch && options.batch !== true ? String(options.batch) : null;
  if (!target) {
    if (!options.last) fail('--last 또는 --batch <묶음ID>를 지정하세요. (묶음 목록: node tools/scene.js log <씬ID>)');
    const candidates = [...new Set(log.filter(pending).map((entry) => entry.batch))];
    target = candidates[candidates.length - 1];
    if (!target) fail('되돌릴 수 있는 변경이 없습니다 (모두 이미 되돌려졌습니다).');
  }
  if (!log.some((entry) => entry.batch === target)) fail(`없는 변경 묶음: ${target}`);
  let entries = log.filter((entry) => entry.batch === target && !revertedKeys.has(keyOf(entry.batch, entry)));
  if (!entries.length) fail(`${target}의 항목은 모두 이미 되돌려졌습니다.`);
  if (options.ids && options.ids !== true) { const wanted = new Set(String(options.ids).split(',')); entries = entries.filter((entry) => wanted.has(entry.id)); }
  const rows = lib.loadSceneRows(sceneId);
  const byId = new Map(rows.map((row) => [row.id, row]));
  const reverted = [];
  const conflicts = [];
  const rowOps = entries.some((entry) => entry.field === '+row' || entry.field === '-row');
  const contiguous = lib.isContiguous(rows);
  const start = rows.length ? rows[0].rowNumber : 0;
  // 줄 추가·삭제를 되돌릴 때는 뒤에서부터 처리해야 앞 줄 위치가 맞는다
  [...entries].reverse().forEach((entry) => {
    const row = byId.get(entry.id);
    if (entry.field === '+row') { // 추가를 취소 = 그 줄 삭제 (그 뒤에 내용이 바뀌었으면 충돌)
      const snapshot = entry.after && entry.after.row;
      if (!row || !snapshot || lib.ROW_FIELDS.some((key) => key !== 'rowNumber' && String(row[key] || '') !== String(snapshot[key] || ''))) { conflicts.push(entry.id); return; }
      rows.splice(rows.indexOf(row), 1);
      byId.delete(entry.id);
      reverted.push({ id: entry.id, rowNumber: entry.rowNumber, field: '+row', before: entry.after, after: entry.before });
      return;
    }
    if (entry.field === '-row') { // 삭제를 취소 = 앞 줄 뒤에 다시 끼워 넣기
      const saved = entry.before && entry.before.row;
      if (row || !saved) { conflicts.push(entry.id); return; }
      const prevAt = entry.before.prev ? rows.findIndex((item) => item.id === entry.before.prev) : -1;
      if (entry.before.prev && prevAt < 0) { conflicts.push(entry.id); return; }
      const restored = { ...saved };
      rows.splice(prevAt + 1, 0, restored);
      byId.set(restored.id, restored);
      reverted.push({ id: entry.id, rowNumber: entry.rowNumber, field: '-row', before: entry.after, after: entry.before });
      return;
    }
    if (!row) { conflicts.push(entry.id); return; }
    if (row[entry.field] !== entry.after) { conflicts.push(entry.id); return; }
    reverted.push({ id: entry.id, rowNumber: entry.rowNumber, field: entry.field, before: entry.after, after: entry.before });
    row[entry.field] = entry.before;
  });
  if (rowOps && contiguous && !options.dry) lib.renumberRows(rows, start);
  const summary = { scene: sceneId, revertedBatch: target, revertedItems: reverted.length, conflicts: conflicts.length, dryRun: Boolean(options.dry) };
  if (conflicts.length) summary.conflictIds = [...new Set(conflicts)].slice(0, 20);
  if (!options.dry && reverted.length) {
    lib.writeSceneRows(sceneId, rows);
    const batch = lib.newBatchId(log);
    const t = new Date().toISOString();
    const note = typeof options.note === 'string' ? options.note : `되돌림 (${target})`;
    lib.writeChanges(sceneId, [...log, ...reverted.map((entry) => ({ t, batch, note, ...entry, revert: target }))]);
    summary.batch = batch;
    const rowsByScene = { [sceneId]: rows };
    if (reverted.some((entry) => entry.field === 'speaker' || entry.field === '+row' || entry.field === '-row')) {
      index.scenes.forEach((scene) => { if (!rowsByScene[scene.id]) rowsByScene[scene.id] = lib.loadSceneRows(scene.id); });
      index.speakers = lib.computeSpeakers(rowsByScene);
    }
    lib.writeIndex(index, rowsByScene);
  }
  console.log(JSON.stringify(summary));
}

const { positional, options } = parseArgs(process.argv.slice(2));
const [command, ...args] = positional;
if (!['list', 'get', 'set', 'insert', 'delete', 'log', 'revert'].includes(command)) {
  console.error('사용법: node tools/scene.js [--work 작품ID] <list | get | set | insert | delete | log | revert> ...  (자세한 내용은 파일 상단 주석 참고)');
  process.exit(command ? 1 : 0);
}
try { lib.useWork(options.work); } catch (error) { fail(error.message); }
if (command === 'list') list();
else if (command === 'get') get(args[0], options);
else if (command === 'set') set(args[0], args[1], options);
else if (command === 'insert') insert(args[0], args[1], options);
else if (command === 'delete') remove(args[0], options);
else if (command === 'log') log(args[0], options);
else revert(args[0], options);
