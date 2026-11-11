#!/usr/bin/env node
// AI/작업자용 씬 조회·수정 도구. 필요한 씬과 필드만 읽고, 바뀐 행만 반영해 토큰과 시간을 아낀다.
//
//   node tools/scene.js [--work 작품ID] list
//   node tools/scene.js [--work 작품ID] get <씬ID> [--fields id,korean] [--from 행번호] [--to 행번호] [--phase 단계ID]
//                                  [--ids id1,id2] [--empty korean] [--search 문자열] [--limit N] [--tsv]
//   node tools/scene.js [--work 작품ID] set <씬ID> <patch.json | -> [--dry]
//
//   --work 는 작품이 하나뿐이면 생략할 수 있고, 둘 이상이면 반드시 지정해야 한다. (작품 목록: node tools/work.js list)
//
//   patch.json 예: [{"id":"01姉_00_01.ks#22","korean":"수정한 대사"}, ...]  (바뀐 필드만 적는다)
//   수정 가능 필드: kind, speaker, english, korean, recordingScript, memo, voice
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
    patch = JSON.parse(fs.readFileSync(patchPath === '-' ? 0 : patchPath, 'utf8'));
  } catch (error) { fail(`패치 파일을 읽을 수 없습니다: ${error.message}`); }
  if (!Array.isArray(patch)) fail('패치는 [{"id": ..., 필드: 값}, ...] 형태의 배열이어야 합니다.');

  const rows = lib.loadSceneRows(sceneId);
  const byId = new Map(rows.map((row) => [row.id, row]));
  const errors = [];
  const fieldCounts = {};
  let changedRows = 0;
  let unchangedRows = 0;
  const seen = new Set();
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
    const rowsByScene = { [sceneId]: rows };
    if (fieldCounts.speaker) {
      index.scenes.forEach((scene) => { if (!rowsByScene[scene.id]) rowsByScene[scene.id] = lib.loadSceneRows(scene.id); });
      index.speakers = lib.computeSpeakers(rowsByScene);
    }
    lib.writeIndex(index, rowsByScene);
  }
  console.log(JSON.stringify(summary));
}

const { positional, options } = parseArgs(process.argv.slice(2));
const [command, ...args] = positional;
if (!['list', 'get', 'set'].includes(command)) {
  console.error('사용법: node tools/scene.js [--work 작품ID] <list | get | set> ...  (자세한 내용은 파일 상단 주석 참고)');
  process.exit(command ? 1 : 0);
}
try { lib.useWork(options.work); } catch (error) { fail(error.message); }
if (command === 'list') list();
else if (command === 'get') get(args[0], options);
else set(args[0], args[1], options);
